// Отдельный процесс-исполнитель фоновых заданий (BullMQ).
// Запуск: pnpm worker  (требуется REDIS_URL)
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, "../../../../../.env"), quiet: true });

async function main() {
  const { Worker } = await import("bullmq");
  const { getRedis } = await import("../redis");
  const { executeJob, QUEUE_NAME, WORKER_HEARTBEAT_KEY } = await import("./queue");
  const { prisma } = await import("../db");

  const redis = getRedis();
  if (!redis) {
    console.error("REDIS_URL не задан — worker не нужен: задания выполняются внутри веб-сервера.");
    process.exit(1);
  }

  const beat = () => redis.set(WORKER_HEARTBEAT_KEY, String(Date.now()), "EX", 60).catch(() => undefined);
  await beat();
  const heartbeat = setInterval(beat, 10_000);

  // Подхватываем задания, созданные, пока worker был остановлен.
  const pending = await prisma.backgroundJob.findMany({ where: { status: "QUEUED" }, select: { id: true }, take: 500 });
  for (const j of pending) await executeJob(j.id);

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const outcome = await executeJob(String(job.data.jobId));
      if (outcome === "retry") throw new Error("retry");
      return outcome;
    },
    { connection: redis, concurrency: 4 },
  );
  worker.on("ready", () => console.log(JSON.stringify({ level: "info", message: "LeadFlow worker запущен", queue: QUEUE_NAME })));
  worker.on("failed", (job, err) => console.error(JSON.stringify({ level: "warn", message: "Попытка задания не удалась", jobId: job?.id, error: err.message })));

  const shutdown = async () => {
    clearInterval(heartbeat);
    await worker.close();
    await redis.del(WORKER_HEARTBEAT_KEY).catch(() => undefined);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
