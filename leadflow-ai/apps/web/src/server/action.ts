import "server-only";
import { z } from "zod";
import { AppError, type ActionResult } from "./errors";
import { logger } from "./logger";

/** Преобразует исключение в безопасный для клиента результат. */
export function toActionError(e: unknown): { ok: false; error: string; fieldErrors?: Record<string, string[]> } {
  if (e instanceof z.ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of e.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, error: e.issues[0]?.message ?? "Некорректные данные", fieldErrors };
  }
  if (e instanceof AppError) return { ok: false, error: e.message };
  // Ошибки Next (redirect/notFound) должны пробрасываться дальше.
  if (e && typeof e === "object" && "digest" in e && typeof (e as { digest: unknown }).digest === "string") {
    const digest = (e as { digest: string }).digest;
    if (digest.startsWith("NEXT_")) throw e;
  }
  logger.error("Необработанная ошибка действия", { error: e });
  return { ok: false, error: "Внутренняя ошибка. Подробности записаны в лог сервера." };
}

export async function runAction<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message };
  } catch (e) {
    return toActionError(e);
  }
}
