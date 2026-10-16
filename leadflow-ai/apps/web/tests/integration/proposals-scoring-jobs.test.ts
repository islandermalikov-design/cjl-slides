import { ProposalGenerationSchema } from "@leadflow/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { callStructured, getAiStatus } from "@/server/ai/client";
import { LeadScoreResultSchema } from "@leadflow/shared";
import { enqueueJob, retryJob } from "@/server/jobs/queue";
import { createCompany } from "@/server/services/companies";
import { createDeal, moveDealToStage } from "@/server/services/deals";
import { createProposal, getProposalVersion, saveManualVersion, setProposalStatus } from "@/server/services/proposals";
import { scoreCompany } from "@/server/services/scoring";
import { getKpis } from "@/server/services/analytics";
import { createTenant, prisma, resetDb } from "../support/db";

describe("proposals", () => {
  let ctx: { organizationId: string; userId: string };
  beforeEach(async () => {
    await resetDb();
    ctx = await createTenant();
  });

  it("creates a proposal with a valid template version without an AI key, and versions edits", async () => {
    const company = await createCompany(ctx, { name: "Покупатель", marketplace: "WILDBERRIES" });
    const services = await prisma.service.findMany({ where: { organizationId: ctx.organizationId, tier: "BUSINESS" } });
    const p = await createProposal(ctx, { companyId: company.id, serviceIds: [services[0]!.id], totalPrice: 25000 });
    const v1 = await getProposalVersion(ctx.organizationId, p.id);
    expect(v1.version.version).toBe(1);
    expect(v1.version.generatedBy).toBe("TEMPLATE");
    expect(ProposalGenerationSchema.safeParse(v1.data).success).toBe(true);
    expect(v1.data.content.totalPrice).toBe(25000);
    const edited = { ...v1.data, content: { ...v1.data.content, title: "Исправленное КП" } };
    const v2 = await saveManualVersion(ctx, p.id, edited);
    expect(v2.version).toBe(2);
    await expect(saveManualVersion(ctx, p.id, { content: { title: 1 } })).rejects.toThrow();
    await setProposalStatus(ctx, p.id, "SENT");
    const fresh = await prisma.proposal.findUniqueOrThrow({ where: { id: p.id } });
    expect(fresh.status).toBe("SENT");
    expect(fresh.sentAt).not.toBeNull();
    expect((await prisma.company.findUniqueOrThrow({ where: { id: company.id } })).crmStatus).toBe("PROPOSAL_READY");
  });

  it("rejects services from another organization", async () => {
    const other = await createTenant();
    const company = await createCompany(ctx, { name: "К" });
    const foreign = await prisma.service.findFirstOrThrow({ where: { organizationId: other.organizationId } });
    await expect(createProposal(ctx, { companyId: company.id, serviceIds: [foreign.id] })).rejects.toThrow(/Услуга/);
  });
});

describe("AI scoring", () => {
  let ctx: { organizationId: string; userId: string };
  beforeEach(async () => {
    await resetDb();
    ctx = await createTenant();
  });

  it("DEMO_MODE scores with heuristics, stores the result, and caches by input hash", async () => {
    const company = await createCompany(ctx, { name: "Продавец", marketplace: "OZON", niche: "Продавец Ozon", publicEmail: "a@seller.ru" });
    const first = await scoreCompany(ctx, company.id);
    expect(first.cached).toBe(false);
    expect(first.score.generatedBy).toBe("DEMO");
    expect(LeadScoreResultSchema.safeParse({ ...first.score, breakdown: first.score.breakdown, recommendedTier: first.score.recommendedTier }).success).toBe(true);
    const second = await scoreCompany(ctx, company.id);
    expect(second.cached).toBe(true);
    const forced = await scoreCompany(ctx, company.id, { force: true });
    expect(forced.cached).toBe(false);
    expect((await prisma.company.findUniqueOrThrow({ where: { id: company.id } })).aiScore).toBe(forced.score.score);
  });

  it("without key and DEMO_MODE the AI reports unavailability clearly", async () => {
    process.env.DEMO_MODE = "false";
    try {
      const status = await getAiStatus(ctx.organizationId);
      expect(status.mode).toBe("unavailable");
      expect(status.message).toMatch(/DEMO_MODE/);
      const company = await createCompany(ctx, { name: "Z" });
      await expect(scoreCompany(ctx, company.id)).rejects.toThrow(/DEMO_MODE/);
      await expect(callStructured({ organizationId: ctx.organizationId, feature: "t", schema: LeadScoreResultSchema, system: "s", user: "u" })).rejects.toThrow(/ANTHROPIC_API_KEY/);
    } finally {
      process.env.DEMO_MODE = "true";
    }
  });

  it("enforces the monthly AI budget before calling the API", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-a-real-key";
    try {
      await prisma.appSetting.create({ data: { organizationId: ctx.organizationId, key: "ai.monthlyBudgetUsd", value: 1 } });
      await prisma.aiUsage.create({ data: { organizationId: ctx.organizationId, feature: "x", model: "m", costUsd: 1.5 } });
      await expect(callStructured({ organizationId: ctx.organizationId, feature: "t", schema: LeadScoreResultSchema, system: "s", user: "u" })).rejects.toThrow(/лимит/);
    } finally {
      process.env.ANTHROPIC_API_KEY = "";
    }
  });
});

describe("background jobs", () => {
  let ctx: { organizationId: string; userId: string };
  beforeEach(async () => {
    await resetDb();
    ctx = await createTenant();
  });

  it("runs inline without Redis, records result, and is idempotent by key", async () => {
    await createCompany(ctx, { name: "Дубль", city: "Казань" });
    await createCompany(ctx, { name: "ООО Дубль", city: "Казань" }, { allowDuplicate: true });
    const job = await enqueueJob({ ...ctx, type: "DEDUPLICATION", payload: {}, idempotencyKey: "dedup-1", waitInline: true });
    const done = await prisma.backgroundJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(done.status).toBe("SUCCEEDED");
    expect((done.result as { groupsCount: number }).groupsCount).toBe(1);
    expect(done.attempts).toBe(1);
    expect(done.startedAt).not.toBeNull();
    const again = await enqueueJob({ ...ctx, type: "DEDUPLICATION", payload: {}, idempotencyKey: "dedup-1", waitInline: true });
    expect(again.id).toBe(job.id);
  });

  it("retries failing jobs up to maxAttempts and stores the error", async () => {
    const job = await enqueueJob({ ...ctx, type: "ENRICHMENT", payload: { companyId: "missing" }, maxAttempts: 2, waitInline: true });
    const failed = await prisma.backgroundJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(2);
    expect(failed.error).toMatch(/не найдена/);
    await retryJob(ctx.organizationId, job.id);
    await new Promise((r) => setTimeout(r, 4000));
    const retried = await prisma.backgroundJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(retried.status).toBe("FAILED");
  });
});

describe("deals and analytics", () => {
  it("won deals feed revenue KPIs from the database", async () => {
    await resetDb();
    const ctx = await createTenant();
    const company = await createCompany(ctx, { name: "Покупатель" });
    const deal = await createDeal(ctx, { companyId: company.id, title: "BUSINESS", amount: 30000 });
    expect((await prisma.company.findUniqueOrThrow({ where: { id: company.id } })).crmStatus).toBe("NEGOTIATION");
    const won = await prisma.pipelineStage.findFirstOrThrow({ where: { organizationId: ctx.organizationId, isWon: true } });
    await moveDealToStage(ctx, deal.id, won.id);
    const d = await prisma.deal.findUniqueOrThrow({ where: { id: deal.id } });
    expect(d.status).toBe("WON");
    expect(d.closedAt).not.toBeNull();
    expect((await prisma.company.findUniqueOrThrow({ where: { id: company.id } })).crmStatus).toBe("WON");
    const kpis = await getKpis(ctx.organizationId, new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
    expect(kpis.revenue).toBe(30000);
    expect(kpis.wonDeals).toBe(1);
    expect(kpis.averageDeal).toBe(30000);
    expect(kpis.totalCompanies).toBe(1);
  });
});
