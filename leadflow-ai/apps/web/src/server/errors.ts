export class AppError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION"
      | "CONFLICT"
      | "RATE_LIMITED"
      | "AI_UNAVAILABLE"
      | "AI_BUDGET"
      | "EXTERNAL"
      | "BLOCKED" = "VALIDATION",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "Запись") => new AppError(`${what} не найдена`, "NOT_FOUND", 404);
export const forbidden = (msg = "Недостаточно прав для этого действия") => new AppError(msg, "FORBIDDEN", 403);

export type ActionResult<T = undefined> = { ok: true; data: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
