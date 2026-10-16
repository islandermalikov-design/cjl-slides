import "server-only";
import {
  ProposalGenerationSchema,
  type OutreachTexts,
  type ProposalContent,
  type ProposalGeneration,
} from "@leadflow/shared";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { callStructured, getAiStatus, wrapUntrusted } from "../ai/client";
import { prisma } from "../db";
import { AppError, notFound } from "../errors";
import { logActivity } from "./activity";
import { getSenderProfile } from "./settings";
import { templateProposal } from "../domain/proposal-template";
export { templateProposal };

export const CreateProposalSchema = z.object({
  companyId: z.string().min(1, "Выберите компанию"),
  title: z.string().trim().max(300).optional(),
  serviceIds: z.array(z.string()).min(1, "Выберите хотя бы одну услугу").max(10),
  totalPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
  durationDays: z.coerce.number().int().min(1).max(365).optional(),
  useAi: z.boolean().default(true),
  facts: z.string().max(4000).optional(),
  tasks: z.string().max(4000).optional(),
  examples: z.string().max(4000).optional(),
});

export const GenerationOptionsSchema = z.object({
  facts: z.string().max(4000).optional(),
  tasks: z.string().max(4000).optional(),
  examples: z.string().max(4000).optional(),
  useAi: z.boolean().default(true),
});
export type GenerationOptions = z.infer<typeof GenerationOptionsSchema>;

export interface ProposalVersionContent {
  content: ProposalContent;
  texts: OutreachTexts;
}

const SYSTEM_PROMPT = `Ты пишешь коммерческие предложения и деловые сообщения для фрилансера/агентства,
которое занимается автоматизацией учёта, аналитикой (Excel, Google Sheets, Wildberries/Ozon), CRM и веб-приложениями.

Требования:
- Тон: деловой, дружелюбный, без давления и манипуляций, без канцелярита.
- Персонализируй только на основе переданных фактов. Если фактов мало — пиши нейтрально.
- ЗАПРЕЩЕНО: выдумывать кейсы, отзывы, клиентов, цифры экономии, гарантии результата, сроки окупаемости.
- Примеры работ используй только если они переданы в поле examples, без искажений.
- Цены и сроки бери из входных данных (services, totalPrice, durationDays), не меняй их.
- firstMessage — до 400 символов, без вложений и ссылок.
- emailBody — до 1500 символов, обращение без имени, если имя контакта неизвестно.
- messengerText — до 300 символов.
- priceObjectionReply — предложи меньший объём работ, не снижай цену без причины.
- Подпись и контакты бери только из sender.`;

export async function createProposal(ctx: { organizationId: string; userId: string | null }, raw: unknown) {
  const input = CreateProposalSchema.parse(raw);
  const company = await prisma.company.findFirst({ where: { id: input.companyId, organizationId: ctx.organizationId, deletedAt: null } });
  if (!company) throw notFound("Компания");
  const services = await prisma.service.findMany({ where: { id: { in: input.serviceIds }, organizationId: ctx.organizationId } });
  if (services.length !== input.serviceIds.length) throw notFound("Услуга");
  const totalPrice = input.totalPrice ?? services.reduce((s, x) => s + x.priceFrom, 0);
  const durationDays = input.durationDays ?? Math.max(...services.map((s) => s.durationDays));
  const proposal = await prisma.proposal.create({
    data: {
      organizationId: ctx.organizationId,
      companyId: company.id,
      createdById: ctx.userId,
      title: input.title || `КП для «${company.name}»`,
      serviceIds: services.map((s) => s.id),
      totalPrice,
      durationDays,
      currentVersion: 0,
      isDemo: company.isDemo,
    },
  });
  await generateProposalVersion(ctx, proposal.id, { facts: input.facts, tasks: input.tasks, examples: input.examples, useAi: input.useAi });
  if (["NEW", "VERIFIED", "PREPARE_PROPOSAL"].includes(company.crmStatus)) {
    await prisma.company.update({ where: { id: company.id }, data: { crmStatus: "PROPOSAL_READY" } });
  }
  return proposal;
}

export async function generateProposalVersion(
  ctx: { organizationId: string; userId: string | null },
  proposalId: string,
  rawOptions: unknown,
) {
  const options = GenerationOptionsSchema.parse(rawOptions ?? {});
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, organizationId: ctx.organizationId, deletedAt: null },
    include: { company: { include: { scores: { orderBy: { createdAt: "desc" }, take: 1 }, evidence: { take: 20 } } } },
  });
  if (!proposal) throw notFound("КП");
  const services = await prisma.service.findMany({ where: { id: { in: proposal.serviceIds }, organizationId: ctx.organizationId } });
  const sender = await getSenderProfile(ctx.organizationId);
  const status = await getAiStatus(ctx.organizationId);
  const latestScore = proposal.company.scores[0];

  let generation: ProposalGeneration;
  let generatedBy: "AI" | "TEMPLATE" = "TEMPLATE";
  let model: string | null = null;
  if (options.useAi && status.mode === "live") {
    const input = {
      company: {
        name: proposal.company.name,
        niche: proposal.company.niche,
        category: proposal.company.category,
        city: proposal.company.city,
        marketplace: proposal.company.marketplace,
        website: proposal.company.website,
      },
      publicFacts: [
        ...proposal.company.evidence.map((e) => `${e.field}: ${e.value}`),
        ...(latestScore ? (latestScore.facts as Array<{ statement: string }>).map((f) => f.statement) : []),
        ...(options.facts ? [options.facts] : []),
      ],
      probableTasks: options.tasks ?? (latestScore ? (latestScore.clientTasks as string[]).join("; ") : null),
      services: services.map((s) => ({ name: s.name, tier: s.tier, description: s.description, features: s.features, priceFrom: s.priceFrom, priceTo: s.priceTo })),
      totalPrice: proposal.totalPrice,
      durationDays: proposal.durationDays,
      examples: options.examples || sender.portfolio || null,
      sender,
    };
    const res = await callStructured({
      organizationId: ctx.organizationId,
      feature: "proposal_generation",
      schema: ProposalGenerationSchema,
      system: SYSTEM_PROMPT,
      user: `Подготовь коммерческое предложение и тексты сообщений по данным ниже.\n\n${wrapUntrusted("proposal_input", input)}`,
      maxTokens: 6000,
      effort: "medium",
    });
    generation = res.data;
    // Цены и контакты — только из системы, не из ответа модели.
    generation.content.totalPrice = proposal.totalPrice;
    generation.content.durationDays = proposal.durationDays;
    generation.content.contacts = { name: sender.name, email: sender.email, phone: sender.phone, website: sender.website };
    generatedBy = "AI";
    model = res.model;
  } else {
    generation = templateProposal({
      companyName: proposal.company.name,
      niche: proposal.company.niche,
      marketplace: proposal.company.marketplace,
      services,
      totalPrice: proposal.totalPrice,
      durationDays: proposal.durationDays,
      sender,
      tasks: options.tasks,
      facts: options.facts,
    });
  }
  const version = await saveVersion(ctx, proposal.id, generation, generatedBy, model, generatedBy === "AI" ? "Сгенерировано AI" : status.mode === "live" ? "Шаблон" : "Шаблон (AI недоступен или DEMO_MODE)");
  return { proposalId: proposal.id, version: version.version, generatedBy };
}

async function saveVersion(
  ctx: { organizationId: string; userId: string | null },
  proposalId: string,
  data: ProposalVersionContent,
  generatedBy: "AI" | "TEMPLATE" | "MANUAL" | "DEMO",
  model: string | null,
  note: string,
) {
  const parsed = ProposalGenerationSchema.parse(data);
  return prisma.$transaction(async (tx) => {
    const p = await tx.proposal.findUniqueOrThrow({ where: { id: proposalId } });
    const next = p.currentVersion + 1;
    const v = await tx.proposalVersion.create({
      data: { proposalId, version: next, content: parsed as unknown as Prisma.InputJsonValue, generatedBy, model, note },
    });
    await tx.proposal.update({
      where: { id: proposalId },
      data: { currentVersion: next, totalPrice: parsed.content.totalPrice, durationDays: parsed.content.durationDays, title: parsed.content.title.slice(0, 300) },
    });
    await logActivity(
      { organizationId: ctx.organizationId, userId: ctx.userId, companyId: p.companyId, type: "PROPOSAL", title: `КП «${p.title}»: версия ${next} (${note})` },
      tx,
    );
    return v;
  });
}

export async function saveManualVersion(ctx: { organizationId: string; userId: string | null }, proposalId: string, raw: unknown) {
  const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, organizationId: ctx.organizationId, deletedAt: null } });
  if (!proposal) throw notFound("КП");
  const data = ProposalGenerationSchema.parse(raw);
  return saveVersion(ctx, proposalId, data, "MANUAL", null, "Ручное редактирование");
}

export async function getProposal(organizationId: string, id: string) {
  const proposal = await prisma.proposal.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: { company: true, versions: { orderBy: { version: "desc" } } },
  });
  if (!proposal) throw notFound("КП");
  return proposal;
}

export async function getProposalVersion(organizationId: string, id: string, version?: number) {
  const proposal = await getProposal(organizationId, id);
  const v = version ? proposal.versions.find((x) => x.version === version) : proposal.versions[0];
  if (!v) throw new AppError("Версия КП не найдена", "NOT_FOUND", 404);
  return { proposal, version: v, data: v.content as unknown as ProposalVersionContent };
}

export async function setProposalStatus(ctx: { organizationId: string; userId: string | null }, id: string, status: "DRAFT" | "READY" | "SENT" | "ACCEPTED" | "REJECTED" | "ARCHIVED") {
  const proposal = await prisma.proposal.findFirst({ where: { id, organizationId: ctx.organizationId, deletedAt: null } });
  if (!proposal) throw notFound("КП");
  await prisma.proposal.update({ where: { id }, data: { status, sentAt: status === "SENT" && !proposal.sentAt ? new Date() : proposal.sentAt } });
  await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId: proposal.companyId, type: "PROPOSAL", title: `КП «${proposal.title}»: статус ${status}` });
}

export async function deleteProposal(ctx: { organizationId: string; userId: string | null }, id: string) {
  const proposal = await prisma.proposal.findFirst({ where: { id, organizationId: ctx.organizationId, deletedAt: null } });
  if (!proposal) throw notFound("КП");
  await prisma.proposal.update({ where: { id }, data: { deletedAt: new Date() } });
}
