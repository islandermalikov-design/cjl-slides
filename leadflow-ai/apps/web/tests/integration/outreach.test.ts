import { beforeEach, describe, expect, it } from "vitest";
import { createCompany } from "@/server/services/companies";
import { approveDraft, checkCompliance, createDraft, optOut, recordReply, sendDraft, submitForReview, updateDraft } from "@/server/services/outreach";
import { addSuppression } from "@/server/services/suppression";
import { createTenant, prisma, resetDb } from "../support/db";

describe("outreach compliance and sending", () => {
  let ctx: { organizationId: string; userId: string };
  let companyId: string;
  beforeEach(async () => {
    await resetDb();
    ctx = await createTenant();
    companyId = (await createCompany(ctx, { name: "Клиент", publicEmail: "sales@client.ru", sourceUrl: "https://client.ru/contacts" })).id;
  });

  const draft = (extra: Record<string, unknown> = {}) =>
    createDraft(ctx, { companyId, channel: "EMAIL", recipient: "sales@client.ru", subject: "Тема", body: "Здравствуйте", legalBasis: "LEGITIMATE_INTEREST_B2B", ...extra });

  it("requires review and explicit confirmation; sends only once (idempotent); DEMO_MODE simulates", async () => {
    const d = await draft();
    expect(d.isFirstContact).toBe(true);
    await expect(sendDraft(ctx, d.id, { confirm: true })).rejects.toThrow(/согласованное/);
    await submitForReview(ctx, d.id);
    await approveDraft(ctx, d.id);
    await expect(sendDraft(ctx, d.id, { confirm: false })).rejects.toThrow(/подтверждения/);
    const res = await sendDraft(ctx, d.id, { confirm: true });
    expect(res.mode).toBe("simulated");
    const msg = await prisma.message.findUniqueOrThrow({ where: { id: res.messageId } });
    expect(msg.isSimulated).toBe(true);
    expect(msg.body).toContain("больше не побеспокою");
    await expect(sendDraft(ctx, d.id, { confirm: true })).rejects.toThrow();
    expect(await prisma.message.count({ where: { draftId: d.id, direction: "OUTBOUND" } })).toBe(1);
    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    expect(company.crmStatus).toBe("CONTACTED");
    expect(await prisma.task.count({ where: { companyId, isFollowUp: true } })).toBe(1);
  });

  it("blocks approval without legal basis or for unpublished recipient", async () => {
    const noBasis = await draft({ legalBasis: null });
    await expect(approveDraft(ctx, noBasis.id)).rejects.toThrow(/основание/);
    const stranger = await draft({ recipient: "ceo-private@gmail.com" });
    const issues = await checkCompliance(ctx.organizationId, stranger.id);
    expect(issues.some((i) => i.level === "block" && /опубликованным/.test(i.message))).toBe(true);
    await expect(approveDraft(ctx, stranger.id)).rejects.toThrow();
  });

  it("suppression list blocks sending, even after approval", async () => {
    const d = await draft();
    await approveDraft(ctx, d.id);
    await addSuppression(ctx.organizationId, "client.ru", "Просили не писать");
    await expect(sendDraft(ctx, d.id, { confirm: true })).rejects.toThrow(/исключений/);
  });

  it("editing an approved draft resets approval", async () => {
    const d = await draft();
    await approveDraft(ctx, d.id);
    const updated = await updateDraft(ctx, d.id, { channel: "EMAIL", recipient: "sales@client.ru", subject: "Новая", body: "Новый текст", legalBasis: "LEGITIMATE_INTEREST_B2B" });
    expect(updated.status).toBe("DRAFT");
    expect(updated.approvedAt).toBeNull();
  });

  it("reply creates a task and updates status; opt-out suppresses and blocks further drafts", async () => {
    const d = await draft();
    await approveDraft(ctx, d.id);
    await sendDraft(ctx, d.id, { confirm: true });
    await recordReply(ctx, d.id, { body: "Интересно" });
    expect((await prisma.company.findUniqueOrThrow({ where: { id: companyId } })).crmStatus).toBe("REPLIED");
    expect(await prisma.task.count({ where: { companyId, title: { startsWith: "Ответить" } } })).toBe(1);

    const second = await draft();
    await optOut(ctx, d.id, "Отписка");
    expect((await prisma.messageDraft.findUniqueOrThrow({ where: { id: second.id } })).status).toBe("OPTED_OUT");
    expect(await prisma.suppressionEntry.count({ where: { organizationId: ctx.organizationId, value: "sales@client.ru" } })).toBe(1);
    const third = await draft();
    await expect(approveDraft(ctx, third.id)).rejects.toThrow();
  });

  it("forbids more than two unanswered outbound messages", async () => {
    for (let i = 0; i < 2; i++) {
      const d = await draft();
      await approveDraft(ctx, d.id);
      await sendDraft(ctx, d.id, { confirm: true });
    }
    const d3 = await draft();
    const issues = await checkCompliance(ctx.organizationId, d3.id);
    expect(issues.some((i) => i.level === "block" && /без ответа/.test(i.message))).toBe(true);
  });

  it("manual channel requires manual confirmation outside DEMO_MODE", async () => {
    process.env.DEMO_MODE = "false";
    try {
      const contactPhone = await prisma.company.update({ where: { id: companyId }, data: { publicPhone: "79001234567" } });
      const d = await createDraft(ctx, { companyId: contactPhone.id, channel: "TELEGRAM", recipient: "+79001234567", body: "Привет", legalBasis: "LEGITIMATE_INTEREST_B2B" });
      await approveDraft(ctx, d.id);
      await expect(sendDraft(ctx, d.id, { confirm: true })).rejects.toThrow(/вручную/);
      const res = await sendDraft(ctx, d.id, { confirm: true, manualConfirmed: true });
      expect(res.mode).toBe("manual");
    } finally {
      process.env.DEMO_MODE = "true";
    }
  });
});
