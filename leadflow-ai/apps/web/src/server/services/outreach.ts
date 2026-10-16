import "server-only";
import {
  CONSENT_BASIS_LABELS,
  MessageDraftInputSchema,
  OutreachTextsSchema,
  normalizeEmail,
  normalizePhone,
  type ConsentBasisValue,
} from "@leadflow/shared";
import nodemailer from "nodemailer";
import type { MessageChannel, MessageStatus } from "@/generated/prisma/client";
import { callStructured, getAiStatus, wrapUntrusted } from "../ai/client";
import { decryptSecret } from "../crypto";
import { prisma } from "../db";
import { AppError, notFound } from "../errors";
import { logger } from "../logger";
import { logActivity, notify } from "./activity";
import { templateProposal, type ProposalVersionContent } from "./proposals";
import { getOutreachSettings, getSenderProfile } from "./settings";
import { isSuppressed } from "./suppression";

type Ctx = { organizationId: string; userId: string | null };

export interface ComplianceIssue {
  level: "block" | "warn";
  message: string;
}

const FREE_MAIL = /@(gmail\.com|mail\.ru|yandex\.ru|ya\.ru|bk\.ru|list\.ru|inbox\.ru|rambler\.ru|icloud\.com|outlook\.com|hotmail\.com)$/i;

/**
 * Проверка законности обращения перед согласованием и отправкой.
 * Блокирующие проблемы не позволяют согласовать или отправить сообщение.
 */
export async function checkCompliance(organizationId: string, draftId: string): Promise<ComplianceIssue[]> {
  const draft = await prisma.messageDraft.findFirst({
    where: { id: draftId, organizationId },
    include: { company: { include: { contacts: { where: { deletedAt: null } } } }, contact: true },
  });
  if (!draft) throw notFound("Черновик");
  const issues: ComplianceIssue[] = [];
  const recipient = draft.recipient?.trim() ?? "";
  if (!recipient) issues.push({ level: "block", message: "Не указан получатель" });
  if (draft.channel === "EMAIL" && recipient && !normalizeEmail(recipient)) issues.push({ level: "block", message: "Некорректный email получателя" });
  if ((draft.channel === "PHONE" || draft.channel === "WHATSAPP") && recipient && !normalizePhone(recipient)) {
    issues.push({ level: "block", message: "Некорректный номер телефона" });
  }
  if (recipient) {
    const s = await isSuppressed(organizationId, recipient);
    if (s.suppressed) issues.push({ level: "block", message: `Адресат в списке исключений (${s.entry}) — отправка запрещена` });
  }
  if (draft.company.crmStatus === "DO_NOT_CONTACT") issues.push({ level: "block", message: "Компания отмечена «Не связываться»" });
  if (draft.company.deletedAt) issues.push({ level: "block", message: "Компания удалена" });

  // Основание для обращения.
  const consent = recipient
    ? await prisma.communicationConsent.findFirst({
        where: { organizationId, channel: draft.channel, address: draft.channel === "EMAIL" ? (normalizeEmail(recipient) ?? recipient) : (normalizePhone(recipient) ?? recipient) },
      })
    : null;
  if (consent?.status === "WITHDRAWN") issues.push({ level: "block", message: "Получатель отозвал согласие на коммуникацию" });
  if (!draft.legalBasis) {
    issues.push({ level: "block", message: "Не указано основание для обращения" });
  } else if (draft.legalBasis === "LEGITIMATE_INTEREST_B2B") {
    const email = normalizeEmail(recipient);
    const phone = normalizePhone(recipient);
    const published =
      (email && (draft.company.publicEmail === email || draft.company.contacts.some((c) => c.email === email && c.isPublicBusiness))) ||
      (phone && (draft.company.publicPhone === phone || draft.company.contacts.some((c) => c.phone === phone && c.isPublicBusiness)));
    if (!published) {
      issues.push({ level: "block", message: "Адрес не является опубликованным деловым контактом компании. Укажите другое основание или подтвердите источник контакта." });
    }
    if (!draft.company.sourceUrl && !draft.company.contacts.some((c) => c.sourceUrl)) {
      issues.push({ level: "warn", message: "У компании нет ссылки на источник контактных данных" });
    }
  } else if (draft.legalBasis === "EXPLICIT_CONSENT" && consent?.status !== "GRANTED") {
    issues.push({ level: "block", message: "Нет записи о согласии получателя. Зафиксируйте согласие в карточке." });
  }
  if (draft.channel === "EMAIL" && FREE_MAIL.test(recipient)) {
    issues.push({ level: "warn", message: "Адрес на бесплатном почтовом домене — убедитесь, что он опубликован как деловой" });
  }
  if (draft.channel === "TELEGRAM" || draft.channel === "WHATSAPP") {
    issues.push({ level: "warn", message: "Мессенджеры запрещают массовые рассылки: отправляйте вручную и только адресатам, ожидающим сообщения" });
  }
  // Повторные сообщения: не более одного напоминания без ответа.
  const outbound = await prisma.message.count({ where: { organizationId, companyId: draft.companyId, direction: "OUTBOUND", status: { in: ["SENT", "DELIVERED"] } } });
  const inbound = await prisma.message.count({ where: { organizationId, companyId: draft.companyId, direction: "INBOUND" } });
  if (!inbound && outbound >= 2) issues.push({ level: "block", message: "Компании уже отправлено 2 сообщения без ответа — дальнейшие повторы запрещены" });
  else if (!inbound && outbound === 1) issues.push({ level: "warn", message: "Это повторное обращение без ответа на первое" });
  // Дневной лимит.
  const settings = await getOutreachSettings(organizationId);
  const since = new Date(Date.now() - 86400000);
  const sentToday = await prisma.message.count({ where: { organizationId, direction: "OUTBOUND", createdAt: { gte: since } } });
  if (sentToday >= settings.dailyLimit) issues.push({ level: "block", message: `Достигнут дневной лимит отправок (${settings.dailyLimit})` });
  return issues;
}

export async function listDrafts(organizationId: string, filter: { status?: MessageStatus; q?: string } = {}) {
  return prisma.messageDraft.findMany({
    where: {
      organizationId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.q ? { OR: [{ subject: { contains: filter.q, mode: "insensitive" } }, { company: { name: { contains: filter.q, mode: "insensitive" } } }, { recipient: { contains: filter.q, mode: "insensitive" } }] } : {}),
    },
    include: { company: { select: { id: true, name: true, isDemo: true, crmStatus: true } }, contact: { select: { fullName: true } }, reviewedBy: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
}

export async function getDraft(organizationId: string, id: string) {
  const draft = await prisma.messageDraft.findFirst({
    where: { id, organizationId },
    include: {
      company: { include: { contacts: { where: { deletedAt: null } } } },
      contact: true,
      messages: { orderBy: { createdAt: "asc" } },
      reviewedBy: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!draft) throw notFound("Черновик");
  return draft;
}

export async function createDraft(ctx: Ctx, raw: unknown, opts: { generatedBy?: "MANUAL" | "AI" | "TEMPLATE" | "DEMO" } = {}) {
  const input = MessageDraftInputSchema.parse(raw);
  const company = await prisma.company.findFirst({ where: { id: input.companyId, organizationId: ctx.organizationId, deletedAt: null } });
  if (!company) throw notFound("Компания");
  if (input.contactId) {
    const contact = await prisma.contact.findFirst({ where: { id: input.contactId, organizationId: ctx.organizationId, companyId: company.id } });
    if (!contact) throw notFound("Контакт");
  }
  const previous = await prisma.message.count({ where: { organizationId: ctx.organizationId, companyId: company.id, direction: "OUTBOUND" } });
  const draft = await prisma.messageDraft.create({
    data: {
      organizationId: ctx.organizationId,
      companyId: company.id,
      contactId: input.contactId ?? null,
      proposalId: input.proposalId ?? null,
      channel: input.channel as MessageChannel,
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      legalBasis: (input.legalBasis as ConsentBasisValue | null) ?? null,
      isFirstContact: previous === 0,
      generatedBy: opts.generatedBy ?? "MANUAL",
      createdById: ctx.userId,
      isDemo: company.isDemo,
    },
  });
  await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId: company.id, type: "MESSAGE", title: "Создан черновик сообщения" });
  return draft;
}

export async function updateDraft(ctx: Ctx, id: string, raw: unknown) {
  const draft = await prisma.messageDraft.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!draft) throw notFound("Черновик");
  if (!["DRAFT", "PENDING_REVIEW", "APPROVED", "FAILED"].includes(draft.status)) {
    throw new AppError("Отправленное сообщение нельзя редактировать");
  }
  const input = MessageDraftInputSchema.parse({ ...raw as object, companyId: draft.companyId });
  // Любое изменение текста сбрасывает согласование.
  return prisma.messageDraft.update({
    where: { id },
    data: {
      contactId: input.contactId ?? null,
      channel: input.channel as MessageChannel,
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      legalBasis: (input.legalBasis as ConsentBasisValue | null) ?? null,
      status: "DRAFT",
      approvedAt: null,
      reviewedAt: null,
      reviewedById: null,
      lastError: null,
    },
  });
}

export async function submitForReview(ctx: Ctx, id: string) {
  const draft = await prisma.messageDraft.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!draft) throw notFound("Черновик");
  if (draft.status !== "DRAFT" && draft.status !== "FAILED") throw new AppError("Черновик уже на проверке или согласован");
  return prisma.messageDraft.update({ where: { id }, data: { status: "PENDING_REVIEW" } });
}

export async function approveDraft(ctx: Ctx, id: string, note?: string) {
  const draft = await prisma.messageDraft.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!draft) throw notFound("Черновик");
  if (draft.status !== "PENDING_REVIEW" && draft.status !== "DRAFT") throw new AppError("Согласовать можно только черновик или сообщение на проверке");
  const issues = await checkCompliance(ctx.organizationId, id);
  const blocking = issues.filter((i) => i.level === "block");
  if (blocking.length) throw new AppError(`Согласование невозможно: ${blocking.map((b) => b.message).join("; ")}`, "BLOCKED", 422);
  const updated = await prisma.messageDraft.update({
    where: { id },
    data: { status: "APPROVED", reviewedById: ctx.userId, reviewedAt: new Date(), approvedAt: new Date(), reviewNote: note?.slice(0, 1000) ?? null },
  });
  await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId: draft.companyId, type: "MESSAGE", title: "Сообщение согласовано" });
  return updated;
}

export async function rejectDraft(ctx: Ctx, id: string, note: string) {
  const draft = await prisma.messageDraft.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!draft) throw notFound("Черновик");
  return prisma.messageDraft.update({ where: { id }, data: { status: "DRAFT", reviewNote: note.slice(0, 1000), reviewedById: ctx.userId, reviewedAt: new Date() } });
}

async function smtpTransport(organizationId: string) {
  if (process.env.SMTP_HOST) {
    return {
      transport: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      }),
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
    };
  }
  const cred = await prisma.integrationCredential.findUnique({ where: { organizationId_provider: { organizationId, provider: "SMTP" } } });
  if (cred?.encryptedSecret && cred.config) {
    const cfg = cred.config as { host?: string; port?: number; user?: string; from?: string };
    if (cfg.host) {
      return {
        transport: nodemailer.createTransport({
          host: cfg.host,
          port: cfg.port ?? 587,
          secure: cfg.port === 465,
          auth: cfg.user ? { user: cfg.user, pass: decryptSecret(cred.encryptedSecret) } : undefined,
        }),
        from: cfg.from || cfg.user || "",
      };
    }
  }
  return null;
}

export type DeliveryMode = "simulated" | "smtp" | "manual";

export async function deliveryModeFor(organizationId: string, channel: MessageChannel): Promise<DeliveryMode> {
  if (process.env.DEMO_MODE === "true") return "simulated";
  if (channel === "EMAIL" && (await smtpTransport(organizationId))) return "smtp";
  return "manual";
}

/**
 * Отправка согласованного сообщения. Требует явного подтверждения пользователя (confirm=true).
 * Идемпотентность: один черновик = максимум одно исходящее сообщение (уникальный ключ draft:<id>).
 */
export async function sendDraft(ctx: Ctx, id: string, opts: { confirm: boolean; manualConfirmed?: boolean }) {
  if (!opts.confirm) throw new AppError("Отправка требует явного подтверждения");
  const draft = await prisma.messageDraft.findFirst({ where: { id, organizationId: ctx.organizationId }, include: { company: true } });
  if (!draft) throw notFound("Черновик");
  if (draft.status !== "APPROVED") throw new AppError("Отправить можно только согласованное сообщение");
  const issues = await checkCompliance(ctx.organizationId, id);
  const blocking = issues.filter((i) => i.level === "block");
  if (blocking.length) throw new AppError(`Отправка заблокирована: ${blocking.map((b) => b.message).join("; ")}`, "BLOCKED", 422);

  const idempotencyKey = `draft:${draft.id}`;
  const existing = await prisma.message.findUnique({ where: { organizationId_idempotencyKey: { organizationId: ctx.organizationId, idempotencyKey } } });
  if (existing) throw new AppError("Это сообщение уже было отправлено", "CONFLICT", 409);

  const mode = await deliveryModeFor(ctx.organizationId, draft.channel);
  if (mode === "manual" && !opts.manualConfirmed) {
    throw new AppError("Для этого канала нет подключённой интеграции. Отправьте сообщение вручную и подтвердите отправку.", "VALIDATION");
  }
  const settings = await getOutreachSettings(ctx.organizationId);
  const body = draft.channel === "EMAIL" && settings.unsubscribeText && !draft.body.includes(settings.unsubscribeText)
    ? `${draft.body}\n\n—\n${settings.unsubscribeText}`
    : draft.body;

  // Сначала резервируем запись (уникальный ключ защищает от двойной отправки при гонке).
  let message;
  try {
    message = await prisma.message.create({
      data: {
        organizationId: ctx.organizationId,
        companyId: draft.companyId,
        contactId: draft.contactId,
        draftId: draft.id,
        direction: "OUTBOUND",
        channel: draft.channel,
        recipient: draft.recipient,
        subject: draft.subject,
        body,
        status: "SENT",
        idempotencyKey,
        isSimulated: mode === "simulated",
        providerMessageId: mode === "manual" ? "manual" : null,
        sentAt: new Date(),
        isDemo: draft.isDemo,
      },
    });
  } catch {
    throw new AppError("Это сообщение уже было отправлено", "CONFLICT", 409);
  }

  if (mode === "smtp") {
    try {
      const smtp = await smtpTransport(ctx.organizationId);
      if (!smtp) throw new Error("SMTP не настроен");
      const info = await smtp.transport.sendMail({
        from: smtp.from,
        to: draft.recipient!,
        subject: draft.subject ?? "",
        text: body,
        headers: { "X-LeadFlow-Message": message.id },
      });
      await prisma.message.update({ where: { id: message.id }, data: { providerMessageId: String(info.messageId ?? ""), status: "DELIVERED", deliveredAt: new Date() } });
    } catch (e) {
      const err = e instanceof Error ? e.message : "Ошибка SMTP";
      logger.error("Ошибка отправки email", { draftId: draft.id, error: err });
      await prisma.message.update({ where: { id: message.id }, data: { status: "FAILED", error: err.slice(0, 500), idempotencyKey: `${idempotencyKey}:failed:${message.id}` } });
      await prisma.messageDraft.update({ where: { id: draft.id }, data: { status: "FAILED", lastError: err.slice(0, 500) } });
      throw new AppError(`Не удалось отправить: ${err}`, "EXTERNAL", 502);
    }
  }

  await prisma.messageDraft.update({ where: { id: draft.id }, data: { status: mode === "smtp" ? "DELIVERED" : "SENT", sentAt: new Date(), lastError: null } });
  await prisma.company.update({
    where: { id: draft.companyId },
    data: {
      lastContactedAt: new Date(),
      crmStatus: ["NEW", "VERIFIED", "PREPARE_PROPOSAL", "PROPOSAL_READY"].includes(draft.company.crmStatus) ? "CONTACTED" : draft.company.crmStatus,
    },
  });
  if (draft.proposalId) await prisma.proposal.updateMany({ where: { id: draft.proposalId, status: { in: ["DRAFT", "READY"] } }, data: { status: "SENT", sentAt: new Date() } });
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    companyId: draft.companyId,
    type: "MESSAGE",
    title: mode === "simulated" ? "Сообщение отправлено (симуляция DEMO_MODE)" : mode === "manual" ? "Сообщение отправлено вручную" : "Email отправлен",
    body: draft.subject ?? body.slice(0, 200),
  });
  // Напоминание о повторном контакте через 4 дня.
  await prisma.task.create({
    data: {
      organizationId: ctx.organizationId,
      companyId: draft.companyId,
      assigneeId: ctx.userId,
      createdById: ctx.userId,
      title: `Проверить ответ: ${draft.company.name}`,
      dueAt: new Date(Date.now() + 4 * 86400000),
      isFollowUp: true,
      priority: "MEDIUM",
    },
  });
  return { messageId: message.id, mode };
}

export async function recordReply(ctx: Ctx, draftId: string, raw: { body: string; createTask?: boolean; optOut?: boolean }) {
  const draft = await prisma.messageDraft.findFirst({ where: { id: draftId, organizationId: ctx.organizationId }, include: { company: true } });
  if (!draft) throw notFound("Черновик");
  const text = raw.body.trim().slice(0, 20000);
  if (!text) throw new AppError("Текст ответа пуст");
  await prisma.message.create({
    data: {
      organizationId: ctx.organizationId,
      companyId: draft.companyId,
      contactId: draft.contactId,
      draftId: draft.id,
      direction: "INBOUND",
      channel: draft.channel,
      recipient: draft.recipient,
      subject: draft.subject ? `Re: ${draft.subject}` : null,
      body: text,
      status: "REPLIED",
      isDemo: draft.isDemo,
    },
  });
  if (raw.optOut) {
    await optOut(ctx, draft.id, "Отказ в ответе на сообщение");
    return;
  }
  await prisma.messageDraft.update({ where: { id: draft.id }, data: { status: "REPLIED" } });
  await prisma.company.update({
    where: { id: draft.companyId },
    data: { crmStatus: ["WON", "NEGOTIATION"].includes(draft.company.crmStatus) ? draft.company.crmStatus : "REPLIED" },
  });
  // Закрываем напоминания «Проверить ответ».
  await prisma.task.updateMany({
    where: { organizationId: ctx.organizationId, companyId: draft.companyId, isFollowUp: true, status: { in: ["TODO", "IN_PROGRESS"] } },
    data: { status: "DONE", completedAt: new Date() },
  });
  await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId: draft.companyId, type: "MESSAGE", title: "Получен ответ", body: text.slice(0, 500) });
  if (raw.createTask !== false) {
    await prisma.task.create({
      data: {
        organizationId: ctx.organizationId,
        companyId: draft.companyId,
        assigneeId: ctx.userId,
        createdById: ctx.userId,
        title: `Ответить: ${draft.company.name}`,
        description: text.slice(0, 1000),
        dueAt: new Date(Date.now() + 86400000),
        priority: "HIGH",
      },
    });
  }
  await notify({ organizationId: ctx.organizationId, userId: ctx.userId, title: `Ответ от «${draft.company.name}»`, body: text.slice(0, 140), link: `/messages?draft=${draft.id}` });
}

/** Отписка: адресат попадает в suppression list, все неотправленные черновики блокируются. */
export async function optOut(ctx: Ctx, draftId: string, reason: string) {
  const draft = await prisma.messageDraft.findFirst({ where: { id: draftId, organizationId: ctx.organizationId } });
  if (!draft) throw notFound("Черновик");
  if (draft.recipient) {
    const email = normalizeEmail(draft.recipient);
    const value = email ?? normalizePhone(draft.recipient) ?? draft.recipient.trim().toLowerCase();
    await prisma.suppressionEntry.upsert({
      where: { organizationId_value: { organizationId: ctx.organizationId, value } },
      create: { organizationId: ctx.organizationId, value, kind: email ? "email" : "phone", channel: draft.channel, reason, source: "opt-out" },
      update: {},
    });
    await prisma.communicationConsent.updateMany({
      where: { organizationId: ctx.organizationId, address: value },
      data: { status: "WITHDRAWN", withdrawnAt: new Date() },
    });
  }
  await prisma.messageDraft.updateMany({
    where: { organizationId: ctx.organizationId, companyId: draft.companyId, status: { in: ["DRAFT", "PENDING_REVIEW", "APPROVED"] } },
    data: { status: "OPTED_OUT" },
  });
  await prisma.messageDraft.update({ where: { id: draft.id }, data: { status: "OPTED_OUT" } });
  await prisma.company.update({ where: { id: draft.companyId }, data: { crmStatus: "DO_NOT_CONTACT" } });
  await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId: draft.companyId, type: "MESSAGE", title: "Адресат отказался от сообщений", body: reason });
}

export async function markDelivered(ctx: Ctx, draftId: string) {
  const draft = await prisma.messageDraft.findFirst({ where: { id: draftId, organizationId: ctx.organizationId } });
  if (!draft) throw notFound("Черновик");
  if (draft.status !== "SENT") throw new AppError("Отметить доставку можно только для отправленного сообщения");
  await prisma.messageDraft.update({ where: { id: draftId }, data: { status: "DELIVERED" } });
  await prisma.message.updateMany({ where: { draftId, direction: "OUTBOUND", status: "SENT" }, data: { status: "DELIVERED", deliveredAt: new Date() } });
}

export async function deleteDraft(ctx: Ctx, id: string) {
  const draft = await prisma.messageDraft.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!draft) throw notFound("Черновик");
  if (!["DRAFT", "PENDING_REVIEW", "APPROVED", "FAILED"].includes(draft.status)) throw new AppError("Отправленные сообщения сохраняются в истории");
  await prisma.messageDraft.delete({ where: { id } });
}

const DRAFT_SYSTEM = `Ты помогаешь подготовить персональное первое деловое сообщение от фрилансера/агентства,
которое делает автоматизацию учёта, аналитику Excel/Google Sheets/Wildberries/Ozon, CRM и веб-приложения.
Не выдумывай факты о компании, кейсы, отзывы, цифры экономии. Без давления. Сообщение не должно выдавать себя за
личное знакомство и не должно имитировать, что пишет кто-то другой. Используй подпись отправителя из sender.`;

/** Генерация текстов для черновика: из последней версии КП, AI или шаблона. */
export async function generateDraftTexts(ctx: Ctx, companyId: string, proposalId?: string | null) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId: ctx.organizationId, deletedAt: null },
    include: { scores: { orderBy: { createdAt: "desc" }, take: 1 }, evidence: { take: 15 } },
  });
  if (!company) throw notFound("Компания");
  if (proposalId) {
    const v = await prisma.proposalVersion.findFirst({ where: { proposal: { id: proposalId, organizationId: ctx.organizationId } }, orderBy: { version: "desc" } });
    if (v) return { texts: (v.content as unknown as ProposalVersionContent).texts, generatedBy: v.generatedBy };
  }
  const sender = await getSenderProfile(ctx.organizationId);
  const status = await getAiStatus(ctx.organizationId);
  if (status.mode === "live") {
    const res = await callStructured({
      organizationId: ctx.organizationId,
      feature: "draft_generation",
      schema: OutreachTextsSchema,
      system: DRAFT_SYSTEM,
      user: `Подготовь тексты сообщений.\n\n${wrapUntrusted("company", {
        name: company.name,
        niche: company.niche,
        category: company.category,
        marketplace: company.marketplace,
        city: company.city,
        facts: company.evidence.map((e) => `${e.field}: ${e.value}`),
        probableTasks: company.scores[0]?.clientTasks ?? null,
        recommendedProduct: company.scores[0]?.recommendedProduct ?? null,
      })}\n\n${wrapUntrusted("sender", sender)}`,
      maxTokens: 2500,
      effort: "low",
    });
    return { texts: res.data, generatedBy: "AI" as const };
  }
  const services = await prisma.service.findMany({ where: { organizationId: ctx.organizationId, isActive: true }, orderBy: { priceFrom: "asc" }, take: 1 });
  const t = templateProposal({
    companyName: company.name,
    niche: company.niche,
    marketplace: company.marketplace,
    services,
    totalPrice: services[0]?.priceFrom ?? 0,
    durationDays: services[0]?.durationDays ?? 7,
    sender,
  });
  return { texts: t.texts, generatedBy: "TEMPLATE" as const };
}

export const LEGAL_BASIS_OPTIONS = CONSENT_BASIS_LABELS;
