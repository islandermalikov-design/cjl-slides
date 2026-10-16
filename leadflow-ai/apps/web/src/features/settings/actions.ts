"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { MEMBER_ROLES } from "@leadflow/shared";
import { runAction } from "@/server/action";
import { audit } from "@/server/audit";
import { auth } from "@/server/auth";
import { requireContext } from "@/server/context";
import { prisma } from "@/server/db";
import { AppError, forbidden } from "@/server/errors";
import { deleteOrganization, purgeDemoData } from "@/server/services/data-export";
import { OutreachSettingsSchema, SenderProfileSchema, setSetting } from "@/server/services/settings";
import { addSuppression, removeSuppression } from "@/server/services/suppression";

const done = () => revalidatePath("/settings");

export async function saveSenderProfileAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    await setSetting(ctx.organizationId, "profile.sender", SenderProfileSchema.parse(input));
    done();
    return null;
  }, "Профиль отправителя сохранён");
}

export async function saveOutreachSettingsAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    await setSetting(ctx.organizationId, "outreach", OutreachSettingsSchema.parse(input));
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "settings.outreach", entityType: "AppSetting" });
    done();
    return null;
  }, "Настройки коммуникаций сохранены");
}

export async function saveAiBudgetAction(value: number) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    const v = z.coerce.number().min(0).max(10000).parse(value);
    await setSetting(ctx.organizationId, "ai.monthlyBudgetUsd", v);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "settings.ai_budget", entityType: "AppSetting", meta: { value: v } });
    done();
    return null;
  }, "Лимит расходов сохранён");
}

const ServiceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000),
  tier: z.enum(["START", "BUSINESS", "PREMIUM", "CUSTOM"]),
  priceFrom: z.coerce.number().int().min(0).max(100_000_000),
  priceTo: z.coerce.number().int().min(0).max(100_000_000).nullable(),
  durationDays: z.coerce.number().int().min(1).max(365),
  features: z.array(z.string().trim().min(1).max(200)).max(20),
  isActive: z.boolean(),
});

export async function upsertServiceAction(input: unknown, id?: string) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    const v = ServiceSchema.parse(input);
    if (v.priceTo !== null && v.priceTo < v.priceFrom) throw new AppError("Верхняя граница цены меньше нижней");
    if (id) {
      const s = await prisma.service.findFirst({ where: { id, organizationId: ctx.organizationId } });
      if (!s) throw new AppError("Услуга не найдена", "NOT_FOUND", 404);
      await prisma.service.update({ where: { id }, data: v });
    } else {
      await prisma.service.create({ data: { ...v, organizationId: ctx.organizationId, code: `custom-${Date.now().toString(36)}` } });
    }
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: id ? "service.update" : "service.create", entityType: "Service", entityId: id });
    done();
    return null;
  }, "Услуга сохранена");
}

export async function updateOrganizationAction(name: string) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    await prisma.organization.update({ where: { id: ctx.organizationId }, data: { name: z.string().trim().min(2).max(120).parse(name) } });
    done();
    revalidatePath("/", "layout");
    return null;
  }, "Название сохранено");
}

export async function addMemberAction(email: string, role: string) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    const r = z.enum(MEMBER_ROLES).parse(role);
    if (r === "OWNER" && ctx.role !== "OWNER") throw forbidden("Назначать владельца может только владелец");
    const user = await prisma.user.findUnique({ where: { email: z.string().trim().toLowerCase().email("Некорректный email").parse(email) } });
    if (!user) throw new AppError("Пользователь не найден. Он должен сначала зарегистрироваться.", "NOT_FOUND", 404);
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: ctx.organizationId, userId: user.id } },
      create: { organizationId: ctx.organizationId, userId: user.id, role: r },
      update: { role: r },
    });
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "member.add", entityType: "OrganizationMember", entityId: user.id, meta: { role: r } });
    done();
    return null;
  }, "Участник добавлен");
}

export async function changeRoleAction(memberId: string, role: string) {
  return runAction(async () => {
    const ctx = await requireContext("OWNER");
    const r = z.enum(MEMBER_ROLES).parse(role);
    const m = await prisma.organizationMember.findFirst({ where: { id: memberId, organizationId: ctx.organizationId } });
    if (!m) throw new AppError("Участник не найден", "NOT_FOUND", 404);
    if (m.userId === ctx.userId && r !== "OWNER") {
      const owners = await prisma.organizationMember.count({ where: { organizationId: ctx.organizationId, role: "OWNER" } });
      if (owners <= 1) throw new AppError("В организации должен остаться хотя бы один владелец");
    }
    await prisma.organizationMember.update({ where: { id: memberId }, data: { role: r } });
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "member.role", entityType: "OrganizationMember", entityId: memberId, meta: { role: r } });
    done();
    return null;
  }, "Роль изменена");
}

export async function removeMemberAction(memberId: string) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    const m = await prisma.organizationMember.findFirst({ where: { id: memberId, organizationId: ctx.organizationId } });
    if (!m) throw new AppError("Участник не найден", "NOT_FOUND", 404);
    if (m.userId === ctx.userId) throw new AppError("Нельзя удалить себя");
    if (m.role === "OWNER" && ctx.role !== "OWNER") throw forbidden();
    await prisma.organizationMember.delete({ where: { id: memberId } });
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "member.remove", entityType: "OrganizationMember", entityId: memberId });
    done();
    return null;
  }, "Участник удалён");
}

export async function addSuppressionAction(value: string, reason: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await addSuppression(ctx.organizationId, value, reason || null);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "suppression.add", entityType: "SuppressionEntry" });
    done();
    return null;
  }, "Добавлено в список исключений");
}

export async function removeSuppressionAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    await removeSuppression(ctx.organizationId, id);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "suppression.remove", entityType: "SuppressionEntry", entityId: id });
    done();
    return null;
  }, "Удалено из списка исключений");
}

export async function purgeDemoAction() {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    const count = await purgeDemoData(ctx.organizationId);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "data.purge_demo", entityType: "Organization", meta: { count } });
    revalidatePath("/", "layout");
    return { count };
  }, "DEMO-данные удалены");
}

export async function deleteOrganizationAction(confirmName: string) {
  return runAction(async () => {
    const ctx = await requireContext("OWNER");
    if (confirmName.trim() !== ctx.organizationName) throw new AppError("Название организации введено неверно");
    await deleteOrganization(ctx.organizationId);
    await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
    return null;
  }, "Организация удалена");
}
