import "server-only";
import { TaskInputSchema } from "@leadflow/shared";
import type { Prisma, TaskStatus } from "@/generated/prisma/client";
import { prisma } from "../db";
import { notFound } from "../errors";
import { logActivity } from "./activity";

export async function listTasks(
  organizationId: string,
  filter: { status?: TaskStatus | "OPEN"; scope?: "overdue" | "today" | "week" | "all"; assigneeId?: string; companyId?: string } = {},
) {
  const and: Prisma.TaskWhereInput[] = [{ organizationId }];
  if (filter.status === "OPEN") and.push({ status: { in: ["TODO", "IN_PROGRESS"] } });
  else if (filter.status) and.push({ status: filter.status });
  if (filter.assigneeId) and.push({ assigneeId: filter.assigneeId });
  if (filter.companyId) and.push({ companyId: filter.companyId });
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  if (filter.scope === "overdue") and.push({ dueAt: { lt: now }, status: { in: ["TODO", "IN_PROGRESS"] } });
  if (filter.scope === "today") and.push({ dueAt: { lte: endOfDay } , status: { in: ["TODO", "IN_PROGRESS"] } });
  if (filter.scope === "week") and.push({ dueAt: { lte: new Date(now.getTime() + 7 * 86400000) }, status: { in: ["TODO", "IN_PROGRESS"] } });
  return prisma.task.findMany({
    where: { AND: and },
    include: {
      company: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 500,
  });
}

export async function createTask(ctx: { organizationId: string; userId: string | null }, raw: unknown, opts: { assigneeId?: string | null } = {}) {
  const input = TaskInputSchema.parse(raw);
  if (input.companyId) {
    const c = await prisma.company.findFirst({ where: { id: input.companyId, organizationId: ctx.organizationId, deletedAt: null } });
    if (!c) throw notFound("Компания");
  }
  if (input.dealId) {
    const d = await prisma.deal.findFirst({ where: { id: input.dealId, organizationId: ctx.organizationId } });
    if (!d) throw notFound("Сделка");
  }
  let assigneeId = opts.assigneeId ?? ctx.userId;
  if (assigneeId) {
    const m = await prisma.organizationMember.findFirst({ where: { organizationId: ctx.organizationId, userId: assigneeId } });
    if (!m) assigneeId = ctx.userId;
  }
  const task = await prisma.task.create({
    data: {
      organizationId: ctx.organizationId,
      title: input.title,
      description: input.description,
      companyId: input.companyId ?? null,
      dealId: input.dealId ?? null,
      dueAt: input.dueAt ?? null,
      priority: input.priority,
      status: input.status,
      isFollowUp: input.isFollowUp,
      assigneeId,
      createdById: ctx.userId,
    },
  });
  if (task.companyId) {
    await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId: task.companyId, type: "TASK", title: `Задача создана: ${task.title}` });
  }
  return task;
}

export async function updateTask(ctx: { organizationId: string; userId: string | null }, id: string, raw: unknown) {
  const existing = await prisma.task.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) throw notFound("Задача");
  const input = TaskInputSchema.parse(raw);
  return prisma.task.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      dueAt: input.dueAt ?? null,
      priority: input.priority,
      status: input.status,
      completedAt: input.status === "DONE" ? (existing.completedAt ?? new Date()) : null,
    },
  });
}

export async function setTaskStatus(ctx: { organizationId: string; userId: string | null }, id: string, status: TaskStatus) {
  const existing = await prisma.task.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) throw notFound("Задача");
  const task = await prisma.task.update({
    where: { id },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });
  if (status === "DONE" && existing.companyId) {
    await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId: existing.companyId, type: "TASK", title: `Задача выполнена: ${existing.title}` });
  }
  return task;
}

export async function deleteTask(ctx: { organizationId: string }, id: string) {
  const res = await prisma.task.deleteMany({ where: { id, organizationId: ctx.organizationId } });
  if (!res.count) throw notFound("Задача");
}
