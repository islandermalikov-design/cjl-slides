import "server-only";
import { DealInputSchema } from "@leadflow/shared";
import type { DealStatus } from "@/generated/prisma/client";
import { prisma } from "../db";
import { AppError, notFound } from "../errors";
import { logActivity } from "./activity";
import { formatMoneyPlain } from "./format";

export async function listDeals(organizationId: string, filter: { status?: DealStatus; q?: string } = {}) {
  return prisma.deal.findMany({
    where: {
      organizationId,
      deletedAt: null,
      company: { deletedAt: null },
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.q ? { OR: [{ title: { contains: filter.q, mode: "insensitive" } }, { company: { name: { contains: filter.q, mode: "insensitive" } } }] } : {}),
    },
    include: { company: { select: { id: true, name: true } }, stage: true, service: true, owner: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
}

export async function listStages(organizationId: string) {
  return prisma.pipelineStage.findMany({ where: { organizationId }, orderBy: { order: "asc" } });
}

async function resolveStage(organizationId: string, stageId: string | null | undefined) {
  if (!stageId) return null;
  const stage = await prisma.pipelineStage.findFirst({ where: { id: stageId, organizationId } });
  if (!stage) throw notFound("Этап воронки");
  return stage;
}

export async function createDeal(ctx: { organizationId: string; userId: string | null }, raw: unknown) {
  const input = DealInputSchema.parse(raw);
  const company = await prisma.company.findFirst({ where: { id: input.companyId, organizationId: ctx.organizationId, deletedAt: null } });
  if (!company) throw notFound("Компания");
  if (input.serviceId) {
    const svc = await prisma.service.findFirst({ where: { id: input.serviceId, organizationId: ctx.organizationId } });
    if (!svc) throw notFound("Услуга");
  }
  const stage = (await resolveStage(ctx.organizationId, input.stageId)) ?? (await prisma.pipelineStage.findFirst({ where: { organizationId: ctx.organizationId }, orderBy: { order: "asc" } }));
  const status: DealStatus = stage?.isWon ? "WON" : stage?.isLost ? "LOST" : "OPEN";
  const deal = await prisma.deal.create({
    data: {
      organizationId: ctx.organizationId,
      companyId: input.companyId,
      title: input.title,
      amount: input.amount,
      stageId: stage?.id ?? null,
      serviceId: input.serviceId ?? null,
      expectedCloseAt: input.expectedCloseAt ?? null,
      notes: input.notes,
      ownerId: ctx.userId,
      status,
      closedAt: status === "OPEN" ? null : new Date(),
    },
  });
  await logActivity({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    companyId: input.companyId,
    dealId: deal.id,
    type: "DEAL",
    title: `Создана сделка «${input.title}» на ${formatMoneyPlain(input.amount)}`,
  });
  if (company.crmStatus !== "WON" && company.crmStatus !== "NEGOTIATION" && status === "OPEN") {
    await prisma.company.update({ where: { id: company.id }, data: { crmStatus: "NEGOTIATION" } });
  }
  return deal;
}

export async function updateDeal(ctx: { organizationId: string; userId: string | null }, id: string, raw: unknown) {
  const existing = await prisma.deal.findFirst({ where: { id, organizationId: ctx.organizationId, deletedAt: null } });
  if (!existing) throw notFound("Сделка");
  const input = DealInputSchema.parse(raw);
  if (input.companyId !== existing.companyId) throw new AppError("Нельзя перенести сделку в другую компанию");
  const stage = await resolveStage(ctx.organizationId, input.stageId);
  return applyDealStage(ctx, existing.id, stage?.id ?? existing.stageId, {
    title: input.title,
    amount: input.amount,
    serviceId: input.serviceId ?? null,
    expectedCloseAt: input.expectedCloseAt ?? null,
    notes: input.notes,
  });
}

export async function moveDealToStage(ctx: { organizationId: string; userId: string | null }, id: string, stageId: string) {
  const existing = await prisma.deal.findFirst({ where: { id, organizationId: ctx.organizationId, deletedAt: null } });
  if (!existing) throw notFound("Сделка");
  await resolveStage(ctx.organizationId, stageId);
  return applyDealStage(ctx, id, stageId, {});
}

async function applyDealStage(
  ctx: { organizationId: string; userId: string | null },
  id: string,
  stageId: string | null,
  data: Record<string, unknown>,
) {
  const existing = await prisma.deal.findUniqueOrThrow({ where: { id }, include: { stage: true } });
  const stage = stageId ? await prisma.pipelineStage.findFirst({ where: { id: stageId, organizationId: ctx.organizationId } }) : null;
  const status: DealStatus = stage?.isWon ? "WON" : stage?.isLost ? "LOST" : "OPEN";
  const updated = await prisma.deal.update({
    where: { id },
    data: {
      ...data,
      stageId,
      status,
      closedAt: status === "OPEN" ? null : (existing.closedAt ?? new Date()),
    },
  });
  if (existing.stageId !== stageId) {
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      companyId: existing.companyId,
      dealId: id,
      type: "DEAL",
      title: `Сделка «${existing.title}»: ${existing.stage?.name ?? "без этапа"} → ${stage?.name ?? "без этапа"}`,
    });
  }
  if (status !== existing.status && status !== "OPEN") {
    await prisma.company.update({
      where: { id: existing.companyId },
      data: { crmStatus: status === "WON" ? "WON" : "LOST" },
    });
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      companyId: existing.companyId,
      dealId: id,
      type: "STATUS_CHANGE",
      title: status === "WON" ? "Сделка выиграна" : "Сделка проиграна",
    });
  }
  return updated;
}

export async function deleteDeal(ctx: { organizationId: string; userId: string | null }, id: string) {
  const existing = await prisma.deal.findFirst({ where: { id, organizationId: ctx.organizationId, deletedAt: null } });
  if (!existing) throw notFound("Сделка");
  await prisma.deal.update({ where: { id }, data: { deletedAt: new Date() } });
  await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId: existing.companyId, type: "DEAL", title: `Сделка «${existing.title}» удалена` });
}
