import "server-only";
import { prisma } from "../db";

export async function globalSearch(organizationId: string, q: string) {
  const term = q.trim().slice(0, 100);
  if (term.length < 2) return { companies: [], contacts: [], proposals: [], deals: [] };
  const mode = "insensitive" as const;
  const [companies, contacts, proposals, deals] = await Promise.all([
    prisma.company.findMany({
      where: { organizationId, deletedAt: null, OR: [{ name: { contains: term, mode } }, { website: { contains: term, mode } }, { inn: { contains: term } }, { publicEmail: { contains: term, mode } }] },
      select: { id: true, name: true, city: true, crmStatus: true, isDemo: true },
      take: 6,
    }),
    prisma.contact.findMany({
      where: { organizationId, deletedAt: null, OR: [{ fullName: { contains: term, mode } }, { email: { contains: term, mode } }] },
      select: { id: true, fullName: true, companyId: true, company: { select: { name: true } } },
      take: 5,
    }),
    prisma.proposal.findMany({ where: { organizationId, deletedAt: null, title: { contains: term, mode } }, select: { id: true, title: true }, take: 4 }),
    prisma.deal.findMany({ where: { organizationId, deletedAt: null, title: { contains: term, mode } }, select: { id: true, title: true, companyId: true }, take: 4 }),
  ]);
  return { companies, contacts, proposals, deals };
}
