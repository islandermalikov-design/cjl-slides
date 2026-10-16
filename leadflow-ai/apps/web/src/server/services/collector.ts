import "server-only";
import { z } from "zod";
import { AppError } from "../errors";

// HTTP-клиент Python-сервиса сбора данных (apps/collector).

export const CandidateSchema = z.object({
  name: z.string(),
  legalName: z.string().nullable().optional(),
  inn: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  niche: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  marketplace: z.string().nullable().optional(),
  publicEmail: z.string().nullable().optional(),
  publicPhone: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  evidence: z
    .array(z.object({ kind: z.enum(["FACT", "CONTACT", "SIGNAL"]), field: z.string(), value: z.string(), url: z.string().nullable().optional(), snippet: z.string().nullable().optional() }))
    .default([]),
  isDemo: z.boolean().default(false),
});
export type Candidate = z.infer<typeof CandidateSchema>;

const AdapterInfoSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  sourceType: z.string(),
  available: z.boolean(),
  reason: z.string().nullable().optional(),
  legalNotes: z.string(),
  queryFields: z.array(z.string()),
});
export type CollectorAdapterInfo = z.infer<typeof AdapterInfoSchema>;

function baseUrl(): string | null {
  return process.env.COLLECTOR_URL ?? null;
}

async function call<T>(path: string, schema: z.ZodType<T>, init?: { method?: string; body?: unknown; timeoutMs?: number }): Promise<T> {
  const url = baseUrl();
  if (!url) throw new AppError("Сервис сбора данных не настроен (COLLECTOR_URL)", "EXTERNAL", 503);
  let res: Response;
  try {
    res = await fetch(`${url.replace(/\/$/, "")}${path}`, {
      method: init?.method ?? "GET",
      headers: { "content-type": "application/json", "x-collector-token": process.env.COLLECTOR_TOKEN ?? "" },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(init?.timeoutMs ?? 30000),
      cache: "no-store",
    });
  } catch {
    throw new AppError("Сервис сбора данных недоступен. Запустите collector (см. README).", "EXTERNAL", 503);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = json && typeof json === "object" && "detail" in json ? String((json as { detail: unknown }).detail) : `HTTP ${res.status}`;
    throw new AppError(`Collector: ${detail}`, "EXTERNAL", res.status);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new AppError("Collector вернул ответ неверного формата", "EXTERNAL", 502);
  return parsed.data;
}

export async function collectorHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await call("/health", z.object({ status: z.string(), version: z.string().optional() }), { timeoutMs: 5000 });
    return { ok: res.status === "ok", message: `Collector доступен (${res.version ?? "?"})` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Недоступен" };
  }
}

export async function collectorAdapters(): Promise<CollectorAdapterInfo[]> {
  return call("/adapters", z.array(AdapterInfoSchema), { timeoutMs: 5000 });
}

export async function collectorDiscover(adapter: string, query: Record<string, unknown>, limit = 50) {
  return call(
    "/discover",
    z.object({ candidates: z.array(CandidateSchema), warnings: z.array(z.string()).default([]) }),
    { method: "POST", body: { adapter, query, limit }, timeoutMs: 120000 },
  );
}

export async function collectorEnrichWebsite(url: string) {
  return call(
    "/enrich/website",
    z.object({ candidate: CandidateSchema.nullable(), warnings: z.array(z.string()).default([]) }),
    { method: "POST", body: { url }, timeoutMs: 60000 },
  );
}

export async function collectorRobotsCheck(url: string) {
  return call(
    "/robots/check",
    z.object({ url: z.string(), allowed: z.boolean(), robotsUrl: z.string(), crawlDelay: z.number().nullable().optional(), message: z.string() }),
    { method: "POST", body: { url }, timeoutMs: 20000 },
  );
}
