"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PROPOSAL_STATUSES } from "@leadflow/shared";
import { runAction } from "@/server/action";
import { audit } from "@/server/audit";
import { requireContext } from "@/server/context";
import { rateLimit } from "@/server/rate-limit";
import { createProposal, deleteProposal, generateProposalVersion, saveManualVersion, setProposalStatus } from "@/server/services/proposals";

export async function createProposalAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await rateLimit(`proposal:${ctx.userId}`, 30, 300);
    const p = await createProposal(ctx, input);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "proposal.create", entityType: "Proposal", entityId: p.id });
    revalidatePath("/proposals");
    return { id: p.id };
  }, "КП создано");
}

export async function regenerateProposalAction(id: string, options: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await rateLimit(`proposal:${ctx.userId}`, 30, 300);
    const res = await generateProposalVersion(ctx, id, options);
    revalidatePath(`/proposals/${id}`);
    return res;
  }, "Создана новая версия");
}

export async function saveProposalVersionAction(id: string, data: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const v = await saveManualVersion(ctx, id, data);
    revalidatePath(`/proposals/${id}`);
    return { version: v.version };
  }, "Версия сохранена");
}

export async function setProposalStatusAction(id: string, status: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await setProposalStatus(ctx, id, z.enum(PROPOSAL_STATUSES).parse(status));
    revalidatePath(`/proposals/${id}`);
    revalidatePath("/proposals");
    return null;
  }, "Статус обновлён");
}

export async function deleteProposalAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await deleteProposal(ctx, id);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "proposal.delete", entityType: "Proposal", entityId: id });
    revalidatePath("/proposals");
    return null;
  }, "КП удалено");
}
