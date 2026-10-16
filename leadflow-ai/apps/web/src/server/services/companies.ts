import "server-only";
import {
  CRM_STATUS_LABELS,
  CompanyInputSchema,
  dedupeKeys,
  duplicateReason,
  normalizeCompanyName,
  normalizeInn,
  normalizePhone,
  normalizeWebsite,
  type DedupeKeys,
  type DuplicateReason,
} from "@leadflow/shared";
import { z } from "zod";
import type { CrmStatus, Marketplace, Prisma, SourceType } from "@/generated/prisma/client";
import { prisma } from "../db";
import { AppError, notFound } from "../errors";
import { logActivity } from "./activity";

export const CompanyListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.array(z.string()).optional(),
  niche: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  marketplace: z.string().optional(),
  category: z.string().optional(),
  hasWebsite: z.enum(["yes", "no"]).optional(),
  hasContacts: z.enum(["yes", "no"]).optional(),
  tagId: z.string().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  sort: z.enum(["name", "createdAt", "updatedAt", "aiScore", "city", "crmStatus"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(25),
});
export type CompanyListQuery = z.infer<typeof CompanyListQuerySchema>;

export function buildCompanyWhere(organizationId: string, q: Partial<CompanyListQuery>): Prisma.CompanyWhereInput {
  const and: Prisma.CompanyWhereInput[] = [{ organizationId, deletedAt: null }];
  if (q.q) {
    const term = q.q;
    and.push({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { legalName: { contains: term, mode: "insensitive" } },
        { website: { contains: term, mode: "insensitive" } },
        { publicEmail: { contains: term, mode: "insensitive" } },
        { inn: { contains: term } },
        { category: { contains: term, mode: "insensitive" } },
      ],
    });
  }
  if (q.status?.length) and.push({ crmStatus: { in: q.status as CrmStatus[] } });
  if (q.niche) and.push({ niche: { equals: q.niche, mode: "insensitive" } });
  if (q.category) and.push({ category: { contains: q.category, mode: "insensitive" } });
  if (q.city) and.push({ city: { equals: q.city, mode: "insensitive" } });
  if (q.region) and.push({ region: { equals: q.region, mode: "insensitive" } });
  if (q.marketplace) and.push({ marketplace: q.marketplace as Marketplace });
  if (q.hasWebsite === "yes") and.push({ website: { not: null } });
  if (q.hasWebsite === "no") and.push({ website: null });
  if (q.hasContacts === "yes") {
    and.push({
      OR: [
        { publicEmail: { not: null } },
        { publicPhone: { not: null } },
        { contacts: { some: { deletedAt: null } } },
      ],
    });
  }
  if (q.hasContacts === "no") {
    and.push({ publicEmail: null, publicPhone: null, contacts: { none: { deletedAt: null } } });
  }
  if (q.tagId) and.push({ tags: { some: { tagId: q.tagId } } });
  if (q.minScore !== undefined) and.push({ aiScore: { gte: q.minScore } });
  return { AND: and };
}

export async function listCompanies(organizationId: string, query: CompanyListQuery) {
  const where = buildCompanyWhere(organizationId, query);
  const orderBy: Prisma.CompanyOrderByWithRelationInput =
    query.sort === "aiScore"
      ? { aiScore: { sort: query.order, nulls: "last" } }
      : { [query.sort]: query.order };
  const [total, items] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      orderBy: [orderBy, { id: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        tags: { include: { tag: true } },
        _count: { select: { contacts: { where: { deletedAt: null } } } },
      },
    }),
  ]);
  return { total, items, page: query.page, pageSize: query.pageSize };
}

export async function getCompany(organizationId: string, id: string) {
  const company = await prisma.company.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      tags: { include: { tag: true } },
      contacts: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      evidence: { orderBy: { capturedAt: "desc" }, include: { source: true } },
      scores: { orderBy: { createdAt: "desc" }, take: 5 },
      deals: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, include: { stage: true } },
      tasks: { orderBy: [{ status: "asc" }, { dueAt: "asc" }], include: { assignee: true } },
      proposals: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      drafts: { orderBy: { updatedAt: "desc" }, include: { contact: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 50 },
      activities: { orderBy: { createdAt: "desc" }, take: 100, include: { user: true } },
      owner: true,
    },
  });
  if (!company) throw notFound("Компания");
  return company;
}

export interface DuplicateMatch {
  id: string;
  name: string;
  reason: DuplicateReason;
}

/** Ищет существующие компании организации, совпадающие по ключам дедупликации. */
export async function findDuplicates(
  organizationId: string,
  keys: DedupeKeys,
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const or: Prisma.CompanyWhereInput[] = [];
  if (keys.inn) or.push({ inn: keys.inn });
  if (keys.domain) or.push({ domain: keys.domain });
  if (keys.email) or.push({ publicEmail: keys.email });
  if (keys.phone) or.push({ publicPhone: keys.phone });
  if (keys.normalizedName) or.push({ normalizedName: keys.normalizedName });
  if (!or.length) return [];
  const candidates = await prisma.company.findMany({
    where: { organizationId, deletedAt: null, OR: or, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, name: true, inn: true, website: true, publicEmail: true, publicPhone: true, city: true },
    take: 20,
  });
  const matches: DuplicateMatch[] = [];
  for (const c of candidates) {
    const reason = duplicateReason(keys, dedupeKeys(c));
    if (reason) matches.push({ id: c.id, name: c.name, reason });
  }
  return matches;
}

function toCompanyData(input: z.output<typeof CompanyInputSchema>) {
  const website = normalizeWebsite(input.website);
  return {
    name: input.name,
    normalizedName: normalizeCompanyName(input.name),
    legalName: input.legalName,
    inn: normalizeInn(input.inn),
    website,
    // Домен берётся из сайта или корпоративного email (бесплатные почтовые домены игнорируются).
    domain: dedupeKeys({ name: input.name, website, publicEmail: input.publicEmail }).domain,
    category: input.category,
    niche: input.niche,
    city: input.city,
    region: input.region,
    marketplace: input.marketplace as Marketplace,
    publicEmail: input.publicEmail,
    publicPhone: normalizePhone(input.publicPhone),
    sourceUrl: input.sourceUrl,
    notes: input.notes,
  };
}

export async function createCompany(
  ctx: { organizationId: string; userId: string | null },
  raw: unknown,
  opts: { sourceType?: SourceType; allowDuplicate?: boolean; isDemo?: boolean } = {},
) {
  const input = CompanyInputSchema.parse(raw);
  const data = toCompanyData(input);
  const dupes = await findDuplicates(ctx.organizationId, dedupeKeys({ ...input, website: data.website }));
  const hard = dupes.find((d) => d.reason === "inn" || d.reason === "domain");
  if (hard || (dupes.length && !opts.allowDuplicate)) {
    const d = hard ?? dupes[0]!;
    throw new AppError(`Похоже, компания уже есть в базе: «${d.name}». Откройте существующую карточку.`, "CONFLICT", 409);
  }
  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        ...data,
        organizationId: ctx.organizationId,
        ownerId: ctx.userId,
        crmStatus: (input.crmStatus as CrmStatus | undefined) ?? "NEW",
        sourceType: opts.sourceType ?? "MANUAL",
        verifiedAt: input.sourceUrl ? new Date() : null,
        isDemo: opts.isDemo ?? false,
      },
    });
    if (input.sourceUrl && (input.publicEmail || input.publicPhone)) {
      await tx.leadEvidence.create({
        data: {
          organizationId: ctx.organizationId,
          companyId: company.id,
          kind: "CONTACT",
          field: "public_contacts",
          value: [input.publicEmail, input.publicPhone].filter(Boolean).join(", "),
          url: input.sourceUrl,
        },
      });
    }
    await logActivity(
      { organizationId: ctx.organizationId, userId: ctx.userId, companyId: company.id, type: "SYSTEM", title: "Компания добавлена в базу" },
      tx,
    );
    return company;
  });
}

export async function updateCompany(ctx: { organizationId: string; userId: string | null }, id: string, raw: unknown) {
  const existing = await prisma.company.findFirst({ where: { id, organizationId: ctx.organizationId, deletedAt: null } });
  if (!existing) throw notFound("Компания");
  const input = CompanyInputSchema.parse(raw);
  const data = toCompanyData(input);
  const dupes = await findDuplicates(ctx.organizationId, dedupeKeys({ ...input, website: data.website }), id);
  const hard = dupes.find((d) => d.reason === "inn" || d.reason === "domain");
  if (hard) throw new AppError(`Конфликт с компанией «${hard.name}» (${hard.reason === "inn" ? "ИНН" : "домен"}).`, "CONFLICT", 409);

  const changed = Object.entries(data)
    .filter(([k, v]) => k !== "normalizedName" && (existing as Record<string, unknown>)[k] !== v)
    .map(([k]) => k);
  const updated = await prisma.company.update({
    where: { id },
    data: { ...data, verifiedAt: data.sourceUrl && data.sourceUrl !== existing.sourceUrl ? new Date() : existing.verifiedAt },
  });
  if (changed.length) {
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      companyId: id,
      type: "UPDATE",
      title: "Карточка компании изменена",
      meta: { fields: changed },
    });
  }
  return updated;
}

export async function setCompanyStatus(
  ctx: { organizationId: string; userId: string | null },
  id: string,
  status: CrmStatus,
  order?: number,
) {
  const existing = await prisma.company.findFirst({ where: { id, organizationId: ctx.organizationId, deletedAt: null } });
  if (!existing) throw notFound("Компания");
  if (existing.crmStatus === status && order === undefined) return existing;
  const updated = await prisma.company.update({
    where: { id },
    data: { crmStatus: status, ...(order !== undefined ? { crmOrder: order } : {}) },
  });
  if (existing.crmStatus !== status) {
    await logActivity({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      companyId: id,
      type: "STATUS_CHANGE",
      title: `Статус: ${CRM_STATUS_LABELS[existing.crmStatus]} → ${CRM_STATUS_LABELS[status]}`,
      meta: { from: existing.crmStatus, to: status },
    });
    if (status === "DO_NOT_CONTACT") {
      // Адресаты «Не связываться» автоматически попадают в suppression list.
      const values = [existing.publicEmail, existing.publicPhone].filter((v): v is string => Boolean(v));
      for (const value of values) {
        await prisma.suppressionEntry.upsert({
          where: { organizationId_value: { organizationId: ctx.organizationId, value } },
          create: {
            organizationId: ctx.organizationId,
            value,
            kind: value.includes("@") ? "email" : "phone",
            reason: "Статус «Не связываться»",
            source: "crm",
          },
          update: {},
        });
      }
    }
  }
  return updated;
}

export async function updateNextStep(
  ctx: { organizationId: string; userId: string | null },
  id: string,
  nextStep: string | null,
  nextStepAt: Date | null,
) {
  const existing = await prisma.company.findFirst({ where: { id, organizationId: ctx.organizationId, deletedAt: null } });
  if (!existing) throw notFound("Компания");
  return prisma.company.update({ where: { id }, data: { nextStep, nextStepAt } });
}

export async function softDeleteCompanies(ctx: { organizationId: string; userId: string | null }, ids: string[]) {
  const res = await prisma.company.updateMany({
    where: { id: { in: ids }, organizationId: ctx.organizationId, deletedAt: null },
    data: { deletedAt: new Date(), domain: null, inn: null },
  });
  return res.count;
}

export async function addTagsToCompanies(organizationId: string, companyIds: string[], tagNames: string[]) {
  const names = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))].slice(0, 20);
  if (!names.length || !companyIds.length) return 0;
  const owned = await prisma.company.findMany({
    where: { id: { in: companyIds }, organizationId, deletedAt: null },
    select: { id: true },
  });
  const tags = await Promise.all(
    names.map((name) =>
      prisma.leadTag.upsert({
        where: { organizationId_name: { organizationId, name } },
        create: { organizationId, name },
        update: {},
      }),
    ),
  );
  const rows = owned.flatMap((c) => tags.map((t) => ({ companyId: c.id, tagId: t.id })));
  const res = await prisma.companyTag.createMany({ data: rows, skipDuplicates: true });
  return res.count;
}

export async function removeTagFromCompany(organizationId: string, companyId: string, tagId: string) {
  const company = await prisma.company.findFirst({ where: { id: companyId, organizationId } });
  if (!company) throw notFound("Компания");
  await prisma.companyTag.deleteMany({ where: { companyId, tagId } });
}

export async function addNote(ctx: { organizationId: string; userId: string | null }, companyId: string, body: string) {
  const company = await prisma.company.findFirst({ where: { id: companyId, organizationId: ctx.organizationId } });
  if (!company) throw notFound("Компания");
  const text = body.trim().slice(0, 5000);
  if (!text) throw new AppError("Заметка пуста");
  return logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId, type: "NOTE", title: "Заметка", body: text });
}

export async function listFacets(organizationId: string) {
  const base = { organizationId, deletedAt: null };
  const [cities, niches, regions, tags] = await Promise.all([
    prisma.company.groupBy({ by: ["city"], where: { ...base, city: { not: null } }, _count: true, orderBy: { _count: { city: "desc" } }, take: 50 }),
    prisma.company.groupBy({ by: ["niche"], where: { ...base, niche: { not: null } }, _count: true, orderBy: { _count: { niche: "desc" } }, take: 50 }),
    prisma.company.groupBy({ by: ["region"], where: { ...base, region: { not: null } }, _count: true, orderBy: { _count: { region: "desc" } }, take: 50 }),
    prisma.leadTag.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
  ]);
  return {
    cities: cities.map((c) => c.city!).filter(Boolean),
    niches: niches.map((c) => c.niche!).filter(Boolean),
    regions: regions.map((c) => c.region!).filter(Boolean),
    tags,
  };
}

/** Полная проверка базы на дубли (задание DEDUPLICATION). */
export async function scanDuplicates(organizationId: string) {
  const companies = await prisma.company.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, name: true, inn: true, website: true, publicEmail: true, publicPhone: true, city: true },
    orderBy: { createdAt: "asc" },
  });
  const keyed = companies.map((c) => ({ c, k: dedupeKeys(c) }));
  const groups: Array<{ primary: { id: string; name: string }; duplicates: Array<{ id: string; name: string; reason: DuplicateReason }> }> = [];
  const assigned = new Set<string>();
  for (let i = 0; i < keyed.length; i++) {
    const a = keyed[i]!;
    if (assigned.has(a.c.id)) continue;
    const dups: Array<{ id: string; name: string; reason: DuplicateReason }> = [];
    for (let j = i + 1; j < keyed.length; j++) {
      const b = keyed[j]!;
      if (assigned.has(b.c.id)) continue;
      const reason = duplicateReason(a.k, b.k);
      if (reason) {
        dups.push({ id: b.c.id, name: b.c.name, reason });
        assigned.add(b.c.id);
      }
    }
    if (dups.length) groups.push({ primary: { id: a.c.id, name: a.c.name }, duplicates: dups });
  }
  return { checked: companies.length, groups };
}

/** Объединяет дубль с основной записью: переносит связанные данные и удаляет дубль. */
export async function mergeCompanies(ctx: { organizationId: string; userId: string | null }, primaryId: string, duplicateId: string) {
  if (primaryId === duplicateId) throw new AppError("Нельзя объединить компанию саму с собой");
  const [primary, dup] = await Promise.all([
    prisma.company.findFirst({ where: { id: primaryId, organizationId: ctx.organizationId, deletedAt: null } }),
    prisma.company.findFirst({ where: { id: duplicateId, organizationId: ctx.organizationId, deletedAt: null } }),
  ]);
  if (!primary || !dup) throw notFound("Компания");
  await prisma.$transaction(async (tx) => {
    const where = { companyId: duplicateId, organizationId: ctx.organizationId };
    await tx.contact.updateMany({ where, data: { companyId: primaryId } });
    await tx.leadEvidence.updateMany({ where, data: { companyId: primaryId } });
    await tx.deal.updateMany({ where, data: { companyId: primaryId } });
    await tx.task.updateMany({ where, data: { companyId: primaryId } });
    await tx.activity.updateMany({ where, data: { companyId: primaryId } });
    await tx.proposal.updateMany({ where, data: { companyId: primaryId } });
    await tx.messageDraft.updateMany({ where, data: { companyId: primaryId } });
    await tx.message.updateMany({ where, data: { companyId: primaryId } });
    const dupTags = await tx.companyTag.findMany({ where: { companyId: duplicateId } });
    await tx.companyTag.createMany({ data: dupTags.map((t) => ({ companyId: primaryId, tagId: t.tagId })), skipDuplicates: true });
    await tx.company.update({ where: { id: duplicateId }, data: { deletedAt: new Date(), domain: null, inn: null } });
    await tx.company.update({
      where: { id: primaryId },
      data: {
        legalName: primary.legalName ?? dup.legalName,
        website: primary.website ?? dup.website,
        domain: primary.domain ?? dup.domain,
        inn: primary.inn ?? dup.inn,
        publicEmail: primary.publicEmail ?? dup.publicEmail,
        publicPhone: primary.publicPhone ?? dup.publicPhone,
        city: primary.city ?? dup.city,
        region: primary.region ?? dup.region,
        category: primary.category ?? dup.category,
        niche: primary.niche ?? dup.niche,
      },
    });
    await logActivity(
      { organizationId: ctx.organizationId, userId: ctx.userId, companyId: primaryId, type: "SYSTEM", title: `Объединено с дублем «${dup.name}»` },
      tx,
    );
  });
}
