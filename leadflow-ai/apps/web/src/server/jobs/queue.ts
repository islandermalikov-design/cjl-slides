import "server-only";
import { Queue } from "bullmq";
import type { JobType, Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";
import { logger, redact } from "../logger";
import { getRedis } from "../redis";

export const QUEUE_NAME = "leadflow-jobs";
export const WORKER_HEARTBEAT_KEY = "leadflow:worker:heartbeat";

const globalForQueue = globalThis as unknown as { leadflowQueue?: Queue | null };

function getQueue(): Queue | null {
  if (globalForQueue.leadflowQueue !== undefined) return globalForQueue.leadflowQueue;
  const redis = getRedis();
  globalForQueue.leadflowQueue = redis ? new Queue(QUEUE_NAME, { connection: redis }) : null;
  return globalForQueue.leadflowQueue;
}

/** Worker считается живым, если обновлял heartbeat за последние 30 секунд. */
export async function isWorkerAlive(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const ts = await redis.get(WORKER_HEARTBEAT_KEY);
    return ts ? Date.now() - Number(ts) < 30_000 : false;
  } catch {
    return false;
  }
}

export interface EnqueueOptions {
  organizationId: string;
  userId?: string | null;
  type: JobType;
  payload: Prisma.InputJsonValue;
  idempotencyKey?: string;
  maxAttempts?: number;
  /** Если worker не запущен — дождаться выполнения в текущем процессе. */
  waitInline?: boolean;
}

/**
 * Ставит задание в очередь. Идемпотентность: задание с тем же idempotencyKey
 * не создаётся повторно, пока предыдущее не завершилось ошибкой.
 */
export async function enqueueJob(opts: EnqueueOptions) {
  if (opts.idempotencyKey) {
    const existing = await prisma.backgroundJob.findUnique({
      where: { organizationId_idempotencyKey: { organizationId: opts.organizationId, idempotencyKey: opts.idempotencyKey } },
    });
    if (existing && existing.status !== "FAILED" && existing.status !== "CANCELLED") return existing;
    if (existing) {
      await prisma.backgroundJob.update({
        where: { id: existing.id },
        data: { idempotencyKey: `${opts.idempotencyKey}:retired:${existing.id}` },
      });
    }
  }
  const job = await prisma.backgroundJob.create({
    data: {
      organizationId: opts.organizationId,
      type: opts.type,
      payload: opts.payload,
      maxAttempts: opts.maxAttempts ?? 3,
      idempotencyKey: opts.idempotencyKey,
      createdById: opts.userId ?? null,
    },
  });
  const queue = getQueue();
  if (queue && (await isWorkerAlive())) {
    await queue.add(job.type, { jobId: job.id }, {
      jobId: job.id,
      attempts: job.maxAttempts,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    return job;
  }
  // Режим без worker: выполняем в процессе веб-сервера.
  const run = runJobWithRetries(job.id);
  if (opts.waitInline) await run;
  else run.catch(() => undefined);
  return prisma.backgroundJob.findUniqueOrThrow({ where: { id: job.id } });
}

async function runJobWithRetries(jobId: string) {
  for (;;) {
    const outcome = await executeJob(jobId);
    if (outcome !== "retry") return;
    const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
    await new Promise((r) => setTimeout(r, Math.min(30000, 1000 * 2 ** (job?.attempts ?? 1))));
  }
}

/**
 * Выполняет задание. Возвращает "retry", если попытка не удалась и лимит не исчерпан.
 * Используется и worker-процессом, и встроенным режимом.
 */
export async function executeJob(jobId: string): Promise<"done" | "failed" | "retry" | "skipped"> {
  const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
  if (!job) return "skipped";
  if (job.status === "SUCCEEDED" || job.status === "CANCELLED") return "skipped";
  // Атомарный захват: только один исполнитель переводит задание в RUNNING.
  const claimed = await prisma.backgroundJob.updateMany({
    where: { id: jobId, status: { in: ["QUEUED", "FAILED"] } },
    data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date(), error: null },
  });
  if (!claimed.count) return "skipped";
  const current = await prisma.backgroundJob.findUniqueOrThrow({ where: { id: jobId } });
  try {
    const { runHandler } = await import("./handlers");
    const result = await runHandler(current);
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: "SUCCEEDED", result: (result ?? {}) as Prisma.InputJsonValue, finishedAt: new Date() },
    });
    return "done";
  } catch (e) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка";
    const final = current.attempts >= current.maxAttempts || (e as { code?: string })?.code === "VALIDATION";
    logger.warn("Задание завершилось ошибкой", { jobId, type: current.type, attempt: current.attempts, error: redact(message) });
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: final ? "FAILED" : "QUEUED",
        error: String(redact(message)).slice(0, 2000),
        finishedAt: final ? new Date() : null,
      },
    });
    return final ? "failed" : "retry";
  }
}

export async function retryJob(organizationId: string, jobId: string) {
  const job = await prisma.backgroundJob.findFirst({ where: { id: jobId, organizationId } });
  if (!job) return null;
  if (job.status !== "FAILED" && job.status !== "CANCELLED") return job;
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: { status: "QUEUED", attempts: 0, error: null, finishedAt: null, maxAttempts: Math.max(job.maxAttempts, 1) },
  });
  const queue = getQueue();
  if (queue && (await isWorkerAlive())) {
    await queue.add(job.type, { jobId }, { jobId: `${jobId}:${Date.now()}`, attempts: job.maxAttempts, backoff: { type: "exponential", delay: 2000 } });
  } else {
    runJobWithRetries(jobId).catch(() => undefined);
  }
  return job;
}

export async function cancelJob(organizationId: string, jobId: string) {
  const res = await prisma.backgroundJob.updateMany({
    where: { id: jobId, organizationId, status: "QUEUED" },
    data: { status: "CANCELLED", finishedAt: new Date() },
  });
  return res.count > 0;
}
