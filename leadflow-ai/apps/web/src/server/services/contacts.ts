import "server-only";
import { ContactInputSchema, normalizePhone } from "@leadflow/shared";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";
import { notFound } from "../errors";
import { logActivity } from "./activity";

export const ContactListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  companyId: z.string().optional(),
  hasEmail: z.enum(["yes", "no"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(25),
});

export async function listContacts(organizationId: string, query: z.infer<typeof ContactListQuerySchema>) {
  const and: Prisma.ContactWhereInput[] = [{ organizationId, deletedAt: null, company: { deletedAt: null } }];
  if (query.q) {
    and.push({
      OR: [
        { fullName: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        { position: { contains: query.q, mode: "insensitive" } },
        { company: { name: { contains: query.q, mode: "insensitive" } } },
      ],
    });
  }
  if (query.companyId) and.push({ companyId: query.companyId });
  if (query.hasEmail === "yes") and.push({ email: { not: null } });
  if (query.hasEmail === "no") and.push({ email: null });
  const where = { AND: and };
  const [total, items] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      include: { company: { select: { id: true, name: true, crmStatus: true } } },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { total, items };
}

export async function upsertContact(
  ctx: { organizationId: string; userId: string | null },
  raw: unknown,
  id?: string,
) {
  const input = ContactInputSchema.parse(raw);
  const company = await prisma.company.findFirst({
    where: { id: input.companyId, organizationId: ctx.organizationId, deletedAt: null },
  });
  if (!company) throw notFound("Компания");
  const data = {
    fullName: input.fullName,
    position: input.position,
    email: input.email,
    phone: normalizePhone(input.phone),
    isPublicBusiness: input.isPublicBusiness,
    sourceUrl: input.sourceUrl,
    notes: input.notes,
    verifiedAt: input.sourceUrl ? new Date() : null,
  };
  if (id) {
    const existing = await prisma.contact.findFirst({ where: { id, organizationId: ctx.organizationId, deletedAt: null } });
    if (!existing) throw notFound("Контакт");
    const updated = await prisma.contact.update({
      where: { id },
      data: { ...data, companyId: input.companyId, verifiedAt: data.sourceUrl ? (existing.sourceUrl === data.sourceUrl ? existing.verifiedAt : new Date()) : null },
    });
    await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId: input.companyId, type: "UPDATE", title: `Контакт изменён: ${input.fullName}` });
    return updated;
  }
  const created = await prisma.contact.create({
    data: { ...data, organizationId: ctx.organizationId, companyId: input.companyId },
  });
  await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId: input.companyId, type: "UPDATE", title: `Добавлен контакт: ${input.fullName}` });
  return created;
}

export async function deleteContact(ctx: { organizationId: string; userId: string | null }, id: string) {
  const existing = await prisma.contact.findFirst({ where: { id, organizationId: ctx.organizationId, deletedAt: null } });
  if (!existing) throw notFound("Контакт");
  await prisma.contact.update({ where: { id }, data: { deletedAt: new Date() } });
  await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, companyId: existing.companyId, type: "UPDATE", title: `Контакт удалён: ${existing.fullName}` });
}
