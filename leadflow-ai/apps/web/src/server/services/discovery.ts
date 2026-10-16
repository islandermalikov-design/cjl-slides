import "server-only";
import { dedupeKeys, normalizeCompanyName, normalizeEmail, normalizeInn, normalizePhone, normalizeWebsite, parseMarketplace } from "@leadflow/shared";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";
import { AppError, notFound } from "../errors";
import { logActivity, notify } from "./activity";
import { findDuplicates } from "./companies";
import { collectorAdapters, collectorDiscover, collectorEnrichWebsite, type Candidate, type CollectorAdapterInfo } from "./collector";
import { demoCandidates } from "./demo-candidates";

export const DiscoveryQuerySchema = z.object({
  adapter: z.string().min(1),
  sourceId: z.string().optional().nullable(),
  query: z.object({
    name: z.string().trim().max(200).optional(),
    niche: z.string().trim().max(200).optional(),
    region: z.string().trim().max(200).optional(),
    city: z.string().trim().max(200).optional(),
    category: z.string().trim().max(200).optional(),
    marketplace: z.string().trim().max(50).optional(),
    hasWebsite: z.boolean().optional(),
    hasContacts: z.boolean().optional(),
    urls: z.array(z.string().trim().max(500)).max(50).optional(),
    inn: z.string().trim().max(20).optional(),
  }),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const BUILTIN_ADAPTERS: CollectorAdapterInfo[] = [
  {
    key: "demo",
    name: "DEMO-каталог",
    description: "Вымышленные компании для демонстрации поиска. Все записи помечены DEMO, домены *.example не существуют.",
    sourceType: "DEMO",
    available: true,
    reason: null,
    legalNotes: "Синтетические данные, не относятся к реальным компаниям.",
    queryFields: ["name", "niche", "city", "region", "marketplace", "hasWebsite", "hasContacts"],
  },
];

/** Список адаптеров: встроенные + адаптеры collector (если сервис запущен). */
export async function listAdapters(): Promise<{ adapters: CollectorAdapterInfo[]; collectorError: string | null }> {
  try {
    const remote = await collectorAdapters();
    return { adapters: [...BUILTIN_ADAPTERS, ...remote], collectorError: null };
  } catch (e) {
    return { adapters: BUILTIN_ADAPTERS, collectorError: e instanceof Error ? e.message : "Collector недоступен" };
  }
}

export async function startDiscovery(ctx: { organizationId: string; userId: string | null }, raw: unknown) {
  const input = DiscoveryQuerySchema.parse(raw);
  if (input.sourceId) {
    const source = await prisma.leadSource.findFirst({ where: { id: input.sourceId, organizationId: ctx.organizationId } });
    if (!source) throw notFound("Источник");
    if (source.status !== "ACTIVE") throw new AppError("Источник не активирован: подтвердите проверку robots.txt и условий использования");
  }
  return prisma.discoveryJob.create({
    data: {
      organizationId: ctx.organizationId,
      adapterKey: input.adapter,
      sourceId: input.sourceId ?? null,
      query: { ...input.query, limit: input.limit } as Prisma.InputJsonValue,
    },
  });
}

interface StoredCandidate extends Candidate {
  duplicateOf: { id: string; name: string; reason: string } | null;
  imported?: string | null;
}

export async function runDiscoveryJob(ctx: { organizationId: string; userId: string | null }, discoveryJobId: string) {
  const job = await prisma.discoveryJob.findFirst({ where: { id: discoveryJobId, organizationId: ctx.organizationId } });
  if (!job) throw notFound("Поиск");
  if (job.status === "SUCCEEDED") return { resultsCount: job.resultsCount };
  await prisma.discoveryJob.update({ where: { id: job.id }, data: { status: "RUNNING" } });
  const query = job.query as Record<string, unknown>;
  const limit = Number(query.limit ?? 30);
  try {
    let candidates: Candidate[];
    let warnings: string[] = [];
    if (job.adapterKey === "demo") {
      candidates = demoCandidates(query, limit);
    } else {
      const res = await collectorDiscover(job.adapterKey, query, limit);
      candidates = res.candidates;
      warnings = res.warnings;
    }
    const stored: StoredCandidate[] = [];
    for (const c of candidates.slice(0, limit)) {
      const dupes = await findDuplicates(ctx.organizationId, dedupeKeys(c));
      stored.push({ ...c, duplicateOf: dupes[0] ? { id: dupes[0].id, name: dupes[0].name, reason: dupes[0].reason } : null });
    }
    await prisma.discoveryJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        resultsCount: stored.length,
        results: { candidates: stored, warnings } as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });
    if (job.sourceId) await prisma.leadSource.update({ where: { id: job.sourceId }, data: { lastRunAt: new Date() } });
    await notify({ organizationId: ctx.organizationId, userId: ctx.userId, title: "Поиск компаний завершён", body: `Найдено: ${stored.length}`, link: `/discovery?job=${job.id}` });
    return { resultsCount: stored.length };
  } catch (e) {
    await prisma.discoveryJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: e instanceof Error ? e.message.slice(0, 500) : "Ошибка", finishedAt: new Date() },
    });
    throw e;
  }
}

/** Добавляет выбранных кандидатов из результатов поиска в базу компаний. */
export async function importCandidates(ctx: { organizationId: string; userId: string | null }, discoveryJobId: string, indexes: number[]) {
  const job = await prisma.discoveryJob.findFirst({ where: { id: discoveryJobId, organizationId: ctx.organizationId } });
  if (!job || job.status !== "SUCCEEDED") throw notFound("Результаты поиска");
  const results = (job.results ?? { candidates: [] }) as unknown as { candidates: StoredCandidate[]; warnings: string[] };
  let created = 0;
  let skipped = 0;
  for (const idx of indexes) {
    const c = results.candidates[idx];
    if (!c || c.imported) {
      skipped++;
      continue;
    }
    const keys = dedupeKeys(c);
    const dupes = await findDuplicates(ctx.organizationId, keys);
    if (dupes.length) {
      c.duplicateOf = { id: dupes[0]!.id, name: dupes[0]!.name, reason: dupes[0]!.reason };
      skipped++;
      continue;
    }
    const website = normalizeWebsite(c.website);
    const company = await prisma.company.create({
      data: {
        organizationId: ctx.organizationId,
        ownerId: ctx.userId,
        name: c.name.slice(0, 300),
        normalizedName: normalizeCompanyName(c.name),
        legalName: c.legalName ?? null,
        inn: normalizeInn(c.inn),
        website,
        domain: keys.domain,
        category: c.category ?? null,
        niche: c.niche ?? null,
        city: c.city ?? null,
        region: c.region ?? null,
        marketplace: parseMarketplace(c.marketplace),
        publicEmail: normalizeEmail(c.publicEmail),
        publicPhone: normalizePhone(c.publicPhone),
        sourceUrl: c.sourceUrl ?? null,
        sourceType: c.isDemo ? "DEMO" : job.adapterKey === "website" ? "WEBSITE" : job.adapterKey === "dadata" ? "OFFICIAL_API" : "PROVIDER",
        verifiedAt: new Date(),
        isDemo: c.isDemo,
        evidence: {
          create: c.evidence.slice(0, 30).map((e) => ({
            organizationId: ctx.organizationId,
            sourceId: job.sourceId,
            kind: e.kind,
            field: e.field.slice(0, 100),
            value: e.value.slice(0, 1000),
            url: e.url ?? c.sourceUrl ?? null,
            snippet: e.snippet?.slice(0, 500) ?? null,
            isDemo: c.isDemo,
          })),
        },
      },
    });
    await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId: company.id, type: "SYSTEM", title: `Добавлено из поиска (${job.adapterKey})` });
    c.imported = company.id;
    created++;
  }
  await prisma.discoveryJob.update({ where: { id: job.id }, data: { results: results as unknown as Prisma.InputJsonValue } });
  return { created, skipped };
}

/** Обогащение карточки данными с корпоративного сайта (через collector). */
export async function enrichCompany(ctx: { organizationId: string; userId: string | null }, companyId: string) {
  const company = await prisma.company.findFirst({ where: { id: companyId, organizationId: ctx.organizationId, deletedAt: null } });
  if (!company) throw notFound("Компания");
  if (!company.website) throw new AppError("У компании не указан сайт", "VALIDATION");
  if (company.isDemo) {
    return { added: 0, warnings: ["DEMO-компания: сайт не существует, обогащение пропущено"] };
  }
  const { candidate, warnings } = await collectorEnrichWebsite(company.website);
  if (!candidate) return { added: 0, warnings };
  const existing = await prisma.leadEvidence.findMany({ where: { companyId }, select: { field: true, value: true } });
  const known = new Set(existing.map((e) => `${e.field}:${e.value}`));
  const fresh = candidate.evidence.filter((e) => !known.has(`${e.field}:${e.value}`));
  if (fresh.length) {
    await prisma.leadEvidence.createMany({
      data: fresh.slice(0, 30).map((e) => ({
        organizationId: ctx.organizationId,
        companyId,
        kind: e.kind,
        field: e.field.slice(0, 100),
        value: e.value.slice(0, 1000),
        url: e.url ?? candidate.sourceUrl ?? company.website,
        snippet: e.snippet?.slice(0, 500) ?? null,
      })),
    });
  }
  const email = normalizeEmail(candidate.publicEmail);
  const phone = normalizePhone(candidate.publicPhone);
  await prisma.company.update({
    where: { id: companyId },
    data: {
      publicEmail: company.publicEmail ?? email,
      publicPhone: company.publicPhone ?? phone,
      category: company.category ?? candidate.category ?? null,
      marketplace: company.marketplace === "NONE" && candidate.marketplace ? parseMarketplace(candidate.marketplace) : company.marketplace,
      verifiedAt: new Date(),
      sourceUrl: company.sourceUrl ?? candidate.sourceUrl ?? null,
    },
  });
  await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId, type: "SYSTEM", title: `Обогащение с сайта: добавлено фактов — ${fresh.length}` });
  return { added: fresh.length, warnings };
}
