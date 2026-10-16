"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action";
import { requireContext } from "@/server/context";
import { cancelJob, enqueueJob, retryJob } from "@/server/jobs/queue";

export async function runSystemJobAction(type: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const t = z.enum(["STATS_RECALC", "INTEGRATION_CHECK", "DEDUPLICATION"]).parse(type);
    const job = await enqueueJob({ organizationId: ctx.organizationId, userId: ctx.userId, type: t, payload: {}, idempotencyKey: `${t}:${new Date().toISOString().slice(0, 16)}`, waitInline: true });
    revalidatePath("/jobs");
    return { jobId: job.id };
  }, "Задание запущено");
}

export async function retryJobAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await retryJob(ctx.organizationId, id);
    revalidatePath("/jobs");
    return null;
  }, "Задание перезапущено");
}

export async function cancelJobAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const ok = await cancelJob(ctx.organizationId, id);
    revalidatePath("/jobs");
    return { cancelled: ok };
  }, "Задание отменено");
}
