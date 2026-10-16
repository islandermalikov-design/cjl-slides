import "server-only";
import IORedis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: IORedis | null };

/** Возвращает подключение к Redis или null, если REDIS_URL не задан. */
export function getRedis(): IORedis | null {
  if (globalForRedis.redis !== undefined) return globalForRedis.redis;
  const url = process.env.REDIS_URL;
  if (!url) {
    globalForRedis.redis = null;
    return null;
  }
  // Команды ждут подключения, но при недоступном Redis быстро завершаются ошибкой.
  const client = new IORedis(url, { maxRetriesPerRequest: 1, connectTimeout: 2000, enableOfflineQueue: true });
  client.on("error", () => {
    /* ошибки подключения обрабатываются в местах использования */
  });
  globalForRedis.redis = client;
  return client;
}
