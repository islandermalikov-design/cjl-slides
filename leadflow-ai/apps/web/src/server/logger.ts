// Логгер, который никогда не печатает секреты: ключи API, пароли, токены, cookie.

const SECRET_KEYS = /(pass(word)?|secret|token|api[_-]?key|authorization|cookie|encrypted)/i;
const SECRET_VALUES = [/sk-ant-[A-Za-z0-9_-]+/g, /Bearer\s+[A-Za-z0-9._-]+/gi];

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[depth]";
  if (typeof value === "string") {
    let out = value;
    for (const re of SECRET_VALUES) out = out.replace(re, "[REDACTED]");
    return out.length > 2000 ? `${out.slice(0, 2000)}…` : out;
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (value instanceof Error) return { name: value.name, message: redact(value.message, depth + 1) };
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEYS.test(k) ? "[REDACTED]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

type Level = "debug" | "info" | "warn" | "error";

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const line = { level, time: new Date().toISOString(), message, ...(meta ? (redact(meta) as object) : {}) };
  const out = level === "error" || level === "warn" ? console.error : console.log;
  out(JSON.stringify(line));
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => log("debug", m, meta),
  info: (m: string, meta?: Record<string, unknown>) => log("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => log("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => log("error", m, meta),
};
