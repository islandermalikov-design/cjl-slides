import "server-only";
import { AppError } from "./errors";
import { getRedis } from "./redis";

// Фиксированное окно. При наличии Redis — общий счётчик для всех процессов,
// иначе — счётчик в памяти процесса (достаточно для одного инстанса).

const memory = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      const bucket = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
      const count = await redis.incr(bucket);
      if (count === 1) await redis.expire(bucket, windowSec);
      if (count > limit) throw new AppError("Слишком много запросов. Повторите позже.", "RATE_LIMITED", 429);
      return;
    } catch (e) {
      if (e instanceof AppError) throw e;
      // Redis недоступен — переходим на память.
    }
  }
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) throw new AppError("Слишком много запросов. Повторите позже.", "RATE_LIMITED", 429);
}
