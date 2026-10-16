"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import { audit } from "@/server/audit";
import { requireContext } from "@/server/context";
import { createDeal, deleteDeal, moveDealToStage, updateDeal } from "@/server/services/deals";

export async function createDealAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const d = await createDeal(ctx, input);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "deal.create", entityType: "Deal", entityId: d.id });
    revalidatePath("/deals");
    revalidatePath(`/companies/${d.companyId}`);
    return { id: d.id };
  }, "Сделка создана");
}

export async function updateDealAction(id: string, input: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await updateDeal(ctx, id, input);
    revalidatePath("/deals");
    return null;
  }, "Сделка обновлена");
}

export async function moveDealAction(id: string, stageId: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await moveDealToStage(ctx, id, stageId);
    revalidatePath("/deals");
    return null;
  });
}

export async function deleteDealAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("ADMIN");
    await deleteDeal(ctx, id);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "deal.delete", entityType: "Deal", entityId: id });
    revalidatePath("/deals");
    return null;
  }, "Сделка удалена");
}
