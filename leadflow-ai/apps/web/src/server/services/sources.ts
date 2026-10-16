import "server-only";
import { z } from "zod";
import type { Prisma, SourceType } from "@/generated/prisma/client";
import { prisma } from "../db";
import { AppError, notFound } from "../errors";

export const SourceInputSchema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(200),
  type: z.enum(["WEBSITE", "OFFICIAL_API", "CATALOG", "PROVIDER", "CSV_IMPORT", "XLSX_IMPORT", "MANUAL"]),
  adapterKey: z.string().trim().min(1).max(50),
  baseUrl: z.string().trim().max(500).optional().nullable(),
  legalBasis: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  robotsChecked: z.boolean().default(false),
  termsReviewed: z.boolean().default(false),
});

export async function listSources(organizationId: string) {
  return prisma.leadSource.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { evidence: true, discovery: true } } },
  });
}

export async function upsertSource(organizationId: string, raw: unknown, id?: string) {
  const input = SourceInputSchema.parse(raw);
  const data = {
    name: input.name,
    type: input.type as SourceType,
    adapterKey: input.adapterKey,
    baseUrl: input.baseUrl ?? null,
    legalBasis: input.legalBasis ?? null,
    notes: input.notes ?? null,
    robotsChecked: input.robotsChecked,
    termsReviewed: input.termsReviewed,
  };
  if (id) {
    const existing = await prisma.leadSource.findFirst({ where: { id, organizationId } });
    if (!existing) throw notFound("Источник");
    return prisma.leadSource.update({ where: { id }, data: { ...data, status: existing.status === "ACTIVE" && (!input.robotsChecked || !input.termsReviewed) ? "PENDING_REVIEW" : existing.status } });
  }
  return prisma.leadSource.create({ data: { ...data, organizationId, config: {} as Prisma.InputJsonValue } });
}

/** Источник можно активировать только после подтверждения проверки robots.txt и условий использования. */
export async function setSourceStatus(organizationId: string, id: string, status: "ACTIVE" | "DISABLED") {
  const source = await prisma.leadSource.findFirst({ where: { id, organizationId } });
  if (!source) throw notFound("Источник");
  if (status === "ACTIVE") {
    if (!source.termsReviewed) throw new AppError("Подтвердите, что условия использования источника проверены");
    // robots.txt относится к адаптерам, которые читают сайты; API-справочники подчиняются условиям тарифа.
    if (["website", "yandex_search"].includes(source.adapterKey) && !source.robotsChecked) {
      throw new AppError("Подтвердите проверку robots.txt");
    }
    if (!source.legalBasis) throw new AppError("Опишите основание использования данных источника");
  }
  return prisma.leadSource.update({ where: { id }, data: { status } });
}

export async function deleteSource(organizationId: string, id: string) {
  await prisma.leadSource.deleteMany({ where: { id, organizationId } });
}

const SOURCE_TYPES = new Set(["WEBSITE", "OFFICIAL_API", "CATALOG", "PROVIDER"]);

/** Для каждого адаптера collector создаёт «ожидающий проверки» источник, чтобы его можно было активировать в UI. */
export async function ensureAdapterSources(
  organizationId: string,
  adapters: Array<{ key: string; name: string; sourceType: string; legalNotes: string }>,
) {
  const existing = await prisma.leadSource.findMany({ where: { organizationId }, select: { adapterKey: true } });
  const have = new Set(existing.map((s) => s.adapterKey));
  const missing = adapters.filter((a) => a.key !== "demo" && !have.has(a.key));
  if (!missing.length) return;
  await prisma.leadSource.createMany({
    data: missing.map((a) => ({
      organizationId,
      name: a.name,
      adapterKey: a.key,
      type: (SOURCE_TYPES.has(a.sourceType) ? a.sourceType : "PROVIDER") as SourceType,
      status: "PENDING_REVIEW" as const,
      notes: a.legalNotes,
    })),
    skipDuplicates: true,
  });
}
