import "server-only";
import type { IntegrationProvider, Prisma } from "@/generated/prisma/client";
import { getAiStatus, pingAnthropic } from "../ai/client";
import { encryptSecret, secretHint } from "../crypto";
import { prisma } from "../db";
import { AppError } from "../errors";
import { getRedis } from "../redis";
import { isWorkerAlive } from "../jobs/queue";
import { collectorAdapters, collectorHealth } from "./collector";

export interface IntegrationState {
  provider: IntegrationProvider | "REDIS" | "POSTGRES";
  name: string;
  description: string;
  status: "OK" | "ERROR" | "NOT_CONFIGURED" | "CONFIGURED" | "DEMO";
  message: string;
  configurable: boolean;
  secretHint?: string | null;
  lastCheckedAt?: Date | null;
  envVar?: string;
}

export async function getIntegrations(organizationId: string): Promise<IntegrationState[]> {
  const creds = await prisma.integrationCredential.findMany({ where: { organizationId } });
  const byProvider = new Map(creds.map((c) => [c.provider, c]));
  const ai = await getAiStatus(organizationId);
  const anthropic = byProvider.get("ANTHROPIC");
  const smtp = byProvider.get("SMTP");
  const redisConfigured = Boolean(process.env.REDIS_URL);
  const worker = await isWorkerAlive();
  const dadata = process.env.COLLECTOR_URL ? await collectorAdapters().then((list) => list.find((a) => a.key === "dadata")).catch(() => undefined) : undefined;
  return [
    {
      provider: "POSTGRES",
      name: "PostgreSQL",
      description: "Основная база данных.",
      status: "OK",
      message: "Подключено",
      configurable: false,
      envVar: "DATABASE_URL",
    },
    {
      provider: "REDIS",
      name: "Redis + BullMQ",
      description: "Очередь фоновых заданий. Без Redis задания выполняются в процессе веб-сервера.",
      status: redisConfigured ? (worker ? "OK" : "CONFIGURED") : "NOT_CONFIGURED",
      message: redisConfigured ? (worker ? "Worker активен" : "Redis задан, worker не запущен (pnpm worker) — задания выполняются встроенно") : "REDIS_URL не задан",
      configurable: false,
      envVar: "REDIS_URL",
    },
    {
      provider: "ANTHROPIC",
      name: "Anthropic Claude API",
      description: "AI-анализ компаний, генерация КП и ассистент. Ключ хранится только на сервере в зашифрованном виде.",
      status: ai.mode === "live" ? (anthropic?.status === "ERROR" ? "ERROR" : anthropic?.status === "OK" ? "OK" : "CONFIGURED") : ai.mode === "demo" ? "DEMO" : "NOT_CONFIGURED",
      message: anthropic?.lastError ?? ai.message,
      configurable: true,
      secretHint: ai.keySource === "env" ? "из .env" : anthropic?.secretHint,
      lastCheckedAt: anthropic?.lastCheckedAt,
      envVar: "ANTHROPIC_API_KEY",
    },
    {
      provider: "SMTP",
      name: "Email (SMTP)",
      description: "Отправка согласованных email через ваш почтовый сервер. В DEMO_MODE отправка только симулируется.",
      status: process.env.SMTP_HOST || smtp?.encryptedSecret ? (smtp?.status === "ERROR" ? "ERROR" : "CONFIGURED") : "NOT_CONFIGURED",
      message: process.env.DEMO_MODE === "true" ? "DEMO_MODE: отправка симулируется" : smtp?.lastError ?? (process.env.SMTP_HOST ? `Сервер ${process.env.SMTP_HOST}` : "Не настроено"),
      configurable: true,
      secretHint: process.env.SMTP_HOST ? "из .env" : smtp?.secretHint,
      lastCheckedAt: smtp?.lastCheckedAt,
      envVar: "SMTP_HOST / SMTP_USER / SMTP_PASSWORD",
    },
    {
      provider: "COLLECTOR",
      name: "Collector (Python)",
      description: "Сбор данных с корпоративных сайтов (с проверкой robots.txt) и подключаемые провайдеры.",
      status: process.env.COLLECTOR_URL ? (byProvider.get("COLLECTOR")?.status === "OK" ? "OK" : byProvider.get("COLLECTOR")?.status === "ERROR" ? "ERROR" : "CONFIGURED") : "NOT_CONFIGURED",
      message: byProvider.get("COLLECTOR")?.lastError ?? (process.env.COLLECTOR_URL ? process.env.COLLECTOR_URL : "COLLECTOR_URL не задан"),
      configurable: false,
      lastCheckedAt: byProvider.get("COLLECTOR")?.lastCheckedAt,
      envVar: "COLLECTOR_URL",
    },
    {
      provider: "DADATA",
      name: "DaData (реквизиты компаний)",
      description: "Официальный API поиска организаций по названию или ИНН. Ключ задаётся в окружении collector.",
      status: dadata?.available ? "CONFIGURED" : "NOT_CONFIGURED",
      message: dadata ? (dadata.available ? "Ключ задан в collector, адаптер доступен" : (dadata.reason ?? "Адаптер недоступен")) : "Collector недоступен — состояние адаптера неизвестно",
      configurable: false,
      envVar: "DADATA_API_KEY (collector)",
    },
  ];
}

export async function saveCredential(
  organizationId: string,
  provider: "ANTHROPIC" | "SMTP",
  secret: string,
  config?: Prisma.InputJsonValue,
) {
  // Пароль SMTP сохраняется как есть; ключ API — без пробелов по краям.
  const value = provider === "ANTHROPIC" ? secret.trim() : secret;
  if (!value) throw new AppError("Секрет не указан");
  if (provider === "ANTHROPIC" && (!value.startsWith("sk-ant-") || value.length < 20)) throw new AppError("Ключ Anthropic должен начинаться с sk-ant-");
  return prisma.integrationCredential.upsert({
    where: { organizationId_provider: { organizationId, provider } },
    create: { organizationId, provider, encryptedSecret: encryptSecret(value), secretHint: secretHint(value), status: "CONFIGURED", config },
    update: { encryptedSecret: encryptSecret(value), secretHint: secretHint(value), status: "CONFIGURED", lastError: null, config },
  });
}

export async function deleteCredential(organizationId: string, provider: IntegrationProvider) {
  await prisma.integrationCredential.deleteMany({ where: { organizationId, provider } });
}

async function setStatus(organizationId: string, provider: IntegrationProvider, ok: boolean, message: string) {
  await prisma.integrationCredential.upsert({
    where: { organizationId_provider: { organizationId, provider } },
    create: { organizationId, provider, status: ok ? "OK" : "ERROR", lastError: ok ? null : message, lastCheckedAt: new Date() },
    update: { status: ok ? "OK" : "ERROR", lastError: ok ? null : message, lastCheckedAt: new Date() },
  });
}

/** Задание INTEGRATION_CHECK: проверяет доступность всех интеграций. */
export async function checkIntegrations(organizationId: string) {
  const results: Record<string, { ok: boolean; message: string }> = {};
  const ai = await getAiStatus(organizationId);
  if (ai.mode === "live") {
    results.anthropic = await pingAnthropic(organizationId);
    await setStatus(organizationId, "ANTHROPIC", results.anthropic.ok, results.anthropic.message);
  } else {
    results.anthropic = { ok: ai.mode === "demo", message: ai.message };
  }
  if (process.env.COLLECTOR_URL) {
    results.collector = await collectorHealth();
    await setStatus(organizationId, "COLLECTOR", results.collector.ok, results.collector.message);
  }
  const redis = getRedis();
  if (redis) {
    try {
      await redis.ping();
      results.redis = { ok: true, message: (await isWorkerAlive()) ? "Redis OK, worker активен" : "Redis OK, worker не запущен" };
    } catch {
      results.redis = { ok: false, message: "Redis недоступен" };
    }
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.postgres = { ok: true, message: "OK" };
  } catch {
    results.postgres = { ok: false, message: "Ошибка подключения" };
  }
  return results;
}
