"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action";
import { audit } from "@/server/audit";
import { requireContext } from "@/server/context";
import { rateLimit } from "@/server/rate-limit";
import {
  approveDraft,
  checkCompliance,
  createDraft,
  deleteDraft,
  generateDraftTexts,
  markDelivered,
  optOut,
  recordReply,
  rejectDraft,
  sendDraft,
  submitForReview,
  updateDraft,
} from "@/server/services/outreach";

const touch = () => {
  revalidatePath("/messages");
};

export async function generateTextsAction(companyId: string, proposalId?: string | null) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await rateLimit(`draftgen:${ctx.userId}`, 30, 300);
    return generateDraftTexts(ctx, companyId, proposalId);
  });
}

export async function createDraftAction(input: unknown, generatedBy?: "MANUAL" | "AI" | "TEMPLATE") {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const d = await createDraft(ctx, input, { generatedBy });
    touch();
    return { id: d.id };
  }, "Черновик создан");
}

export async function updateDraftAction(id: string, input: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await updateDraft(ctx, id, input);
    touch();
    return null;
  }, "Черновик сохранён");
}

export async function complianceAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext();
    return checkCompliance(ctx.organizationId, id);
  });
}

export async function submitDraftAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await submitForReview(ctx, id);
    touch();
    return null;
  }, "Отправлено на проверку");
}

export async function approveDraftAction(id: string, note?: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await approveDraft(ctx, id, note);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "message.approve", entityType: "MessageDraft", entityId: id });
    touch();
    return null;
  }, "Сообщение согласовано");
}

export async function rejectDraftAction(id: string, note: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await rejectDraft(ctx, id, z.string().trim().min(1, "Укажите причину").max(1000).parse(note));
    touch();
    return null;
  }, "Возвращено на доработку");
}

export async function sendDraftAction(id: string, confirmation: { confirm: boolean; manualConfirmed?: boolean }) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await rateLimit(`send:${ctx.organizationId}`, 20, 60);
    const res = await sendDraft(ctx, id, confirmation);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "message.send", entityType: "MessageDraft", entityId: id, meta: { mode: res.mode } });
    touch();
    return res;
  }, "Сообщение отправлено");
}

export async function markDeliveredAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await markDelivered(ctx, id);
    touch();
    return null;
  }, "Отмечено как доставленное");
}

export async function recordReplyAction(id: string, input: { body: string; createTask?: boolean; optOut?: boolean }) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await recordReply(ctx, id, input);
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: input.optOut ? "message.opt_out" : "message.reply", entityType: "MessageDraft", entityId: id });
    touch();
    return null;
  }, "Ответ зафиксирован");
}

export async function optOutAction(id: string, reason: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await optOut(ctx, id, reason.slice(0, 500) || "Отказ от сообщений");
    await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "message.opt_out", entityType: "MessageDraft", entityId: id });
    touch();
    return null;
  }, "Адресат добавлен в список исключений");
}

export async function deleteDraftAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await deleteDraft(ctx, id);
    touch();
    return null;
  }, "Черновик удалён");
}
