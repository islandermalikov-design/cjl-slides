import "server-only";
import {
  LeadScoreResultSchema,
  MARKETPLACE_LABELS,
  SCORE_CRITERIA_LABELS,
  SCORE_CRITERIA_WEIGHTS,
  normalizeLeadScore,
  type LeadScoreResult,
} from "@leadflow/shared";
import type { Prisma } from "@/generated/prisma/client";
import { callStructured, getAiStatus, wrapUntrusted } from "../ai/client";
import { sha256 } from "../crypto";
import { prisma } from "../db";
import { AppError, notFound } from "../errors";
import { logActivity } from "./activity";
import { heuristicScore, type ScoringInput } from "../domain/heuristic-score";

export const SCORING_PROMPT_VERSION = "score-v1";

async function loadCompanyForScoring(organizationId: string, companyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId, deletedAt: null },
    include: {
      contacts: { where: { deletedAt: null }, select: { fullName: true, position: true, email: true, phone: true, isPublicBusiness: true, sourceUrl: true } },
      evidence: { select: { kind: true, field: true, value: true, url: true, capturedAt: true }, take: 40, orderBy: { capturedAt: "desc" } },
      tags: { include: { tag: true } },
    },
  });
  if (!company) throw notFound("Компания");
  return company;
}

type CompanyForScoring = Awaited<ReturnType<typeof loadCompanyForScoring>>;

export function scoringInput(c: CompanyForScoring): ScoringInput {
  return {
    name: c.name,
    legalName: c.legalName,
    website: c.website,
    category: c.category,
    niche: c.niche,
    city: c.city,
    region: c.region,
    marketplace: MARKETPLACE_LABELS[c.marketplace],
    hasPublicEmail: Boolean(c.publicEmail),
    hasPublicPhone: Boolean(c.publicPhone),
    sourceUrl: c.sourceUrl,
    verifiedAt: c.verifiedAt?.toISOString() ?? null,
    notes: c.notes,
    tags: c.tags.map((t) => t.tag.name),
    contacts: c.contacts.map((x) => ({ position: x.position, hasEmail: Boolean(x.email), hasPhone: Boolean(x.phone), isPublicBusiness: x.isPublicBusiness, sourceUrl: x.sourceUrl })),
    evidence: c.evidence.map((e) => ({ kind: e.kind, field: e.field, value: e.value, url: e.url })),
  };
}

const SYSTEM_PROMPT = `Ты — аналитик B2B-продаж. Оцениваешь, насколько компания подходит как клиент для фрилансера/агентства,
которое продаёт: Excel-автоматизацию и макросы, Google Sheets и управленческие таблицы, аналитику продаж Wildberries и Ozon,
учёт поставок и остатков, CRM-системы, веб-приложения, дашборды/BI и интеграции через API.

Целевая аудитория: продавцы Wildberries и Ozon, интернет-магазины, оптовые и розничные компании, производители,
малый и средний бизнес с ручной отчётностью в Excel.

Оцени компанию по 6 критериям (максимум баллов в скобках):
${Object.entries(SCORE_CRITERIA_WEIGHTS)
  .map(([k, v]) => `- ${k} — ${SCORE_CRITERIA_LABELS[k as keyof typeof SCORE_CRITERIA_LABELS]} (0–${v})`)
  .join("\n")}
Итоговый score — сумма баллов (0–100).

Правила:
- Разделяй факты (только то, что прямо есть во входных данных, со ссылкой sourceUrl если она есть), гипотезы (предположения) и рекомендации.
- Не определяй обороты, выручку, количество сотрудников без достоверных данных — перечисли это в unknowns.
- recommendedProduct — конкретная услуга из перечня выше; recommendedTier — START, BUSINESS, PREMIUM или CUSTOM.
- clientTasks — вероятные задачи клиента (это гипотезы, формулируй осторожно).
- Пиши кратко и по делу.`;

export async function scoreCompany(
  ctx: { organizationId: string; userId: string | null },
  companyId: string,
  opts: { force?: boolean } = {},
) {
  const company = await loadCompanyForScoring(ctx.organizationId, companyId);
  const input = scoringInput(company);
  const status = await getAiStatus(ctx.organizationId);
  if (status.mode === "unavailable") throw new AppError(status.message, "AI_UNAVAILABLE", 503);

  const inputHash = sha256(JSON.stringify({ input, v: SCORING_PROMPT_VERSION, m: status.model }));
  if (!opts.force) {
    // Кэш: те же данные + та же модель → повторно не тратим токены.
    const cached = await prisma.leadScore.findFirst({
      where: { organizationId: ctx.organizationId, companyId, inputHash },
      orderBy: { createdAt: "desc" },
    });
    if (cached) return { score: cached, cached: true };
  }

  let result: LeadScoreResult;
  let model = status.model;
  let inputTokens = 0;
  let outputTokens = 0;
  let generatedBy: "AI" | "DEMO" = "DEMO";
  if (status.mode === "live") {
    const res = await callStructured({
      organizationId: ctx.organizationId,
      feature: "lead_scoring",
      schema: LeadScoreResultSchema,
      system: SYSTEM_PROMPT,
      user: `Оцени компанию по данным ниже.\n\n${wrapUntrusted("company", input)}`,
      maxTokens: 3000,
      effort: "low",
    });
    result = normalizeLeadScore(res.data);
    model = res.model;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    generatedBy = "AI";
  } else {
    result = heuristicScore(input);
  }

  const score = await prisma.$transaction(async (tx) => {
    const created = await tx.leadScore.create({
      data: {
        organizationId: ctx.organizationId,
        companyId,
        score: result.score,
        breakdown: result.breakdown as Prisma.InputJsonValue,
        reasons: result.reasons,
        facts: result.facts as Prisma.InputJsonValue,
        hypotheses: result.hypotheses,
        recommendations: result.recommendations,
        unknowns: result.unknowns,
        clientTasks: result.clientTasks,
        recommendedProduct: result.recommendedProduct,
        recommendedTier: result.recommendedTier,
        summary: result.summary,
        model,
        generatedBy,
        inputHash,
        promptVersion: SCORING_PROMPT_VERSION,
        inputTokens,
        outputTokens,
      },
    });
    await tx.company.update({ where: { id: companyId }, data: { aiScore: result.score } });
    return created;
  });
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    companyId,
    type: "SCORE",
    title: `${generatedBy === "AI" ? "AI-оценка" : "Оценка (DEMO)"}: ${result.score}/100`,
    body: result.summary,
  });
  return { score, cached: false };
}

export async function scoreCompanies(
  ctx: { organizationId: string; userId: string | null },
  companyIds: string[],
  opts: { force?: boolean } = {},
) {
  const results: Array<{ companyId: string; score?: number; error?: string; cached?: boolean }> = [];
  for (const id of companyIds.slice(0, 200)) {
    try {
      const r = await scoreCompany(ctx, id, opts);
      results.push({ companyId: id, score: r.score.score, cached: r.cached });
    } catch (e) {
      results.push({ companyId: id, error: e instanceof Error ? e.message : "Ошибка" });
      if (e instanceof AppError && (e.code === "AI_BUDGET" || e.code === "AI_UNAVAILABLE")) break;
    }
  }
  const failed = results.filter((r) => r.error).length;
  if (failed && failed === results.length) throw new AppError(results[0]?.error ?? "Анализ не выполнен", "EXTERNAL");
  return { processed: results.length, failed, results };
}
