import "server-only";
import { AssistantReplySchema, CRM_STATUS_LABELS, MARKETPLACE_LABELS, type AssistantReply } from "@leadflow/shared";
import { z } from "zod";
import { callStructured, getAiStatus, wrapUntrusted } from "../ai/client";
import { prisma } from "../db";
import { AppError } from "../errors";
import { getKpis } from "./analytics";
import { formatMoneyPlain } from "./format";

export const AssistantInputSchema = z.object({
  message: z.string().trim().min(1, "Введите вопрос").max(4000),
  companyId: z.string().optional().nullable(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(20)
    .default([]),
});

const SYSTEM = `Ты — встроенный AI-ассистент CRM LeadFlow AI для фрилансера/агентства, продающего автоматизацию учёта,
аналитику (Excel, Google Sheets, Wildberries, Ozon), CRM и веб-приложения.
Ты помогаешь: анализировать компании, объяснять AI Score, предлагать следующий шаг, готовить тексты и ответы,
кратко пересказывать историю клиента и анализировать эффективность продаж.

Ограничения:
- Ты НЕ выполняешь действия сам: не отправляешь сообщения, не меняешь данные. Вместо этого предлагай действия
  в suggestedActions — пользователь подтвердит их сам.
- Опирайся только на данные из контекста. Если данных нет — так и скажи.
- Не выдумывай факты, кейсы, цифры. Разделяй факты и предположения.
- Ответ — понятный текст на русском, допускается простой markdown (списки, **жирный**).`;

async function companyContext(organizationId: string, companyId: string) {
  const c = await prisma.company.findFirst({
    where: { id: companyId, organizationId, deletedAt: null },
    include: {
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
      activities: { orderBy: { createdAt: "desc" }, take: 25 },
      deals: { where: { deletedAt: null }, include: { stage: true } },
      tasks: { where: { status: { in: ["TODO", "IN_PROGRESS"] } } },
      contacts: { where: { deletedAt: null }, select: { fullName: true, position: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 10, select: { direction: true, body: true, createdAt: true, status: true } },
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    status: CRM_STATUS_LABELS[c.crmStatus],
    niche: c.niche,
    category: c.category,
    city: c.city,
    marketplace: MARKETPLACE_LABELS[c.marketplace],
    website: c.website,
    hasPublicEmail: Boolean(c.publicEmail),
    nextStep: c.nextStep,
    lastContactedAt: c.lastContactedAt,
    score: c.scores[0]
      ? {
          value: c.scores[0].score,
          summary: c.scores[0].summary,
          reasons: c.scores[0].reasons,
          facts: c.scores[0].facts,
          hypotheses: c.scores[0].hypotheses,
          unknowns: c.scores[0].unknowns,
          recommendedProduct: c.scores[0].recommendedProduct,
          generatedBy: c.scores[0].generatedBy,
        }
      : null,
    deals: c.deals.map((d) => ({ title: d.title, amount: Number(d.amount), status: d.status, stage: d.stage?.name })),
    openTasks: c.tasks.map((t) => ({ title: t.title, dueAt: t.dueAt })),
    contacts: c.contacts,
    history: c.activities.map((a) => ({ at: a.createdAt.toISOString().slice(0, 10), type: a.type, title: a.title, body: a.body?.slice(0, 300) })),
    messages: c.messages.map((m) => ({ direction: m.direction, at: m.createdAt.toISOString().slice(0, 10), status: m.status, body: m.body.slice(0, 500) })),
  };
}

async function orgContext(organizationId: string) {
  const now = new Date();
  const kpis = await getKpis(organizationId, new Date(now.getTime() - 30 * 86400000), now);
  const topLeads = await prisma.company.findMany({
    where: { organizationId, deletedAt: null, aiScore: { not: null }, crmStatus: { in: ["NEW", "VERIFIED", "PREPARE_PROPOSAL", "PROPOSAL_READY"] } },
    orderBy: { aiScore: "desc" },
    take: 5,
    select: { id: true, name: true, aiScore: true, crmStatus: true },
  });
  const overdue = await prisma.task.count({ where: { organizationId, status: { in: ["TODO", "IN_PROGRESS"] }, dueAt: { lt: now } } });
  return { kpis30d: kpis, topUncontactedLeads: topLeads, overdueTasks: overdue };
}

/** Ответы без AI для DEMO_MODE — по ключевым словам вопроса и данным из БД. */
function demoReply(message: string, company: Awaited<ReturnType<typeof companyContext>>, org: Awaited<ReturnType<typeof orgContext>> | null): AssistantReply {
  const m = message.toLowerCase();
  if (company) {
    if (/score|оцен|балл|почему/.test(m)) {
      if (!company.score) return { answer: `Для «${company.name}» ещё нет оценки. Запустите AI-анализ в карточке компании.`, suggestedActions: [{ label: "Запустить анализ", kind: "rescore", companyId: company.id }] };
      return {
        answer: `**Score ${company.score.value}/100** для «${company.name}».\n\n${company.score.summary ?? ""}\n\n**Причины:**\n${(company.score.reasons as string[]).map((r) => `- ${r}`).join("\n")}\n\n**Неизвестно:** ${(company.score.unknowns as string[]).join(", ")}.`,
        suggestedActions: [{ label: "Открыть карточку", kind: "open_company", companyId: company.id }],
      };
    }
    if (/истори|свод|кратк|резюм/.test(m)) {
      const items = company.history.slice(0, 8).map((h) => `- ${h.at}: ${h.title}`).join("\n");
      return { answer: `**История «${company.name}»** (статус: ${company.status}):\n${items || "- событий пока нет"}`, suggestedActions: [{ label: "Открыть карточку", kind: "open_company", companyId: company.id }] };
    }
    const next =
      company.status === "Новый" || company.status === "Проверен"
        ? "Проверить источник контактов и подготовить КП."
        : company.status === "Подготовить КП" || company.status === "КП готово"
          ? "Подготовить и согласовать первое сообщение."
          : company.status === "Связались"
            ? "Дождаться ответа; через 4 дня — одно вежливое напоминание."
            : company.status === "Получен ответ"
              ? "Ответить на сообщение и предложить короткий созвон."
              : company.status === "Переговоры"
                ? "Зафиксировать договорённости и создать сделку с суммой."
                : "Обновить статус и поставить задачу.";
    return {
      answer: `**Следующий шаг для «${company.name}»:** ${next}\n\n_Ответ сформирован правилами DEMO_MODE без обращения к AI._`,
      suggestedActions: [
        { label: "Создать задачу", kind: "create_task", companyId: company.id },
        { label: "Подготовить КП", kind: "generate_proposal", companyId: company.id },
        { label: "Черновик сообщения", kind: "draft_message", companyId: company.id },
      ],
    };
  }
  if (org) {
    const k = org.kpis30d;
    return {
      answer: `**Сводка за 30 дней** (DEMO_MODE, без AI):\n- Новые лиды: ${k.newLeads}\n- Отправлено КП: ${k.proposalsSent}\n- Ответов: ${k.repliesReceived} (ответы на сообщения: ${k.replyRate.toFixed(1)}%)\n- Закрыто сделок: ${k.wonDeals} на ${formatMoneyPlain(k.revenue)}\n- Просроченных задач: ${org.overdueTasks}\n\n**Приоритетные лиды без контакта:**\n${org.topUncontactedLeads.map((l) => `- ${l.name} — ${l.aiScore}/100`).join("\n") || "- нет оценённых лидов"}`,
      suggestedActions: org.topUncontactedLeads.slice(0, 3).map((l) => ({ label: `Открыть «${l.name}»`, kind: "open_company" as const, companyId: l.id })),
    };
  }
  return { answer: "Задайте вопрос о компании или о продажах.", suggestedActions: [] };
}

export async function askAssistant(ctx: { organizationId: string; userId: string | null }, raw: unknown) {
  const input = AssistantInputSchema.parse(raw);
  const status = await getAiStatus(ctx.organizationId);
  if (status.mode === "unavailable") throw new AppError(status.message, "AI_UNAVAILABLE", 503);
  const company = input.companyId ? await companyContext(ctx.organizationId, input.companyId) : null;
  const org = company ? null : await orgContext(ctx.organizationId);
  if (status.mode === "demo") return { reply: demoReply(input.message, company, org), mode: "demo" as const };

  const transcript = input.history
    .slice(-10)
    .map((h) => `${h.role === "user" ? "Пользователь" : "Ассистент"}: ${h.content.slice(0, 2000)}`)
    .join("\n");
  const res = await callStructured({
    organizationId: ctx.organizationId,
    feature: "assistant",
    schema: AssistantReplySchema,
    system: SYSTEM,
    user: [
      company ? wrapUntrusted("company_context", company, 20000) : wrapUntrusted("sales_context", org, 12000),
      transcript ? `История диалога:\n${transcript}` : "",
      `Вопрос пользователя: ${input.message}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    maxTokens: 3000,
    effort: "low",
  });
  // companyId в предложенных действиях допускается только из контекста (защита от подмены).
  const allowed = new Set([company?.id, ...(org?.topUncontactedLeads.map((l) => l.id) ?? [])].filter(Boolean));
  res.data.suggestedActions = res.data.suggestedActions.filter((a) => !a.companyId || allowed.has(a.companyId)).slice(0, 5);
  return { reply: res.data, mode: "live" as const };
}
