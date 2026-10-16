"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action";
import { audit } from "@/server/audit";
import { requireContext } from "@/server/context";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { collectorRobotsCheck } from "@/server/services/collector";
import { deleteSource, setSourceStatus, upsertSource } from "@/server/services/sources";

export async function upsertSourceAction(input: unknown, id?: string) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    const s = await upsertSource(ctx.organizationId, input, id);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: id ? "source.update" : "source.create", entityType: "LeadSource", entityId: s.id });
    revalidatePath("/sources");
    return { id: s.id };
  }, "Источник сохранён");
}

export async function setSourceStatusAction(id: string, status: string) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    await setSourceStatus(ctx.organizationId, id, z.enum(["ACTIVE", "DISABLED"]).parse(status));
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: `source.${status.toLowerCase()}`, entityType: "LeadSource", entityId: id });
    revalidatePath("/sources");
    return null;
  }, status === "ACTIVE" ? "Источник активирован" : "Источник отключён");
}

export async function deleteSourceAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    await deleteSource(ctx.organizationId, id);
    revalidatePath("/sources");
    return null;
  }, "Источник удалён");
}

export async function checkRobotsAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const source = await prisma.leadSource.findFirst({ where: { id, organizationId: ctx.organizationId } });
    if (!source?.baseUrl) throw new AppError("У источника не указан базовый URL");
    const res = await collectorRobotsCheck(source.baseUrl);
    if (res.allowed) {
      await prisma.leadSource.update({ where: { id }, data: { robotsChecked: true } });
      revalidatePath("/sources");
    }
    return res;
  });
}
