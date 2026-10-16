import "server-only";
import { CRM_STATUS_LABELS, SOURCE_TYPE_LABELS, type CrmStatusValue, type SourceTypeValue } from "@leadflow/shared";
import { prisma } from "../db";
import { setSetting } from "./settings";

export type PeriodKey = "today" | "7d" | "30d" | "90d" | "custom";

export function resolvePeriod(key: string | undefined, from?: string, to?: string): { from: Date; to: Date; key: PeriodKey } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  switch (key) {
    case "today":
      return { from: start, to: end, key: "today" };
    case "7d":
      start.setDate(start.getDate() - 6);
      return { from: start, to: end, key: "7d" };
    case "90d":
      start.setDate(start.getDate() - 89);
      return { from: start, to: end, key: "90d" };
    case "custom": {
      const f = from ? new Date(from) : null;
      const t = to ? new Date(to) : null;
      if (f && t && !Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime()) && f <= t) {
        t.setHours(23, 59, 59, 999);
        return { from: f, to: t, key: "custom" };
      }
      start.setDate(start.getDate() - 29);
      return { from: start, to: end, key: "30d" };
    }
    default:
      start.setDate(start.getDate() - 29);
      return { from: start, to: end, key: "30d" };
  }
}

const FUNNEL: CrmStatusValue[] = ["NEW", "VERIFIED", "PREPARE_PROPOSAL", "PROPOSAL_READY", "CONTACTED", "REPLIED", "NEGOTIATION", "WON"];

export async function getKpis(organizationId: string, from: Date, to: Date) {
  const period = { gte: from, lte: to };
  const companyBase = { organizationId, deletedAt: null };
  const [
    totalCompanies,
    newLeads,
    contactsWithSource,
    companiesWithSourcedContacts,
    proposalsSent,
    repliesReceived,
    activeNegotiations,
    wonAgg,
    contactedCompanies,
    wonCompanies,
    outboundInPeriod,
  ] = await Promise.all([
    prisma.company.count({ where: companyBase }),
    prisma.company.count({ where: { ...companyBase, createdAt: period } }),
    prisma.contact.count({ where: { organizationId, deletedAt: null, sourceUrl: { not: null }, company: { deletedAt: null } } }),
    prisma.company.count({ where: { ...companyBase, sourceUrl: { not: null }, OR: [{ publicEmail: { not: null } }, { publicPhone: { not: null } }] } }),
    prisma.proposal.count({ where: { organizationId, deletedAt: null, sentAt: period } }),
    prisma.message.count({ where: { organizationId, direction: "INBOUND", createdAt: period } }),
    prisma.deal.count({ where: { organizationId, deletedAt: null, status: "OPEN" } }),
    prisma.deal.aggregate({ where: { organizationId, deletedAt: null, status: "WON", closedAt: period }, _sum: { amount: true }, _count: true }),
    prisma.company.count({ where: { ...companyBase, OR: [{ lastContactedAt: { not: null } }, { crmStatus: { in: ["CONTACTED", "REPLIED", "NEGOTIATION", "WON", "LOST"] } }] } }),
    prisma.company.count({ where: { ...companyBase, crmStatus: "WON" } }),
    prisma.message.count({ where: { organizationId, direction: "OUTBOUND", createdAt: period } }),
  ]);
  const revenue = Number(wonAgg._sum.amount ?? 0);
  const wonDeals = wonAgg._count;
  return {
    totalCompanies,
    newLeads,
    verifiedContacts: contactsWithSource + companiesWithSourcedContacts,
    proposalsSent,
    repliesReceived,
    activeNegotiations,
    wonDeals,
    revenue,
    conversion: contactedCompanies ? (wonCompanies / contactedCompanies) * 100 : 0,
    replyRate: outboundInPeriod ? (repliesReceived / outboundInPeriod) * 100 : 0,
    averageDeal: wonDeals ? revenue / wonDeals : 0,
  };
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getCharts(organizationId: string, from: Date, to: Date) {
  const companyBase = { organizationId, deletedAt: null };
  const [leadsRaw, statusGroups, sourceGroups, sourceWon, nicheGroups, revenueRaw, proposalGroups] = await Promise.all([
    prisma.company.findMany({ where: { ...companyBase, createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
    prisma.company.groupBy({ by: ["crmStatus"], where: companyBase, _count: true }),
    prisma.company.groupBy({ by: ["sourceType"], where: companyBase, _count: true }),
    prisma.company.groupBy({ by: ["sourceType"], where: { ...companyBase, crmStatus: "WON" }, _count: true }),
    prisma.company.groupBy({ by: ["niche"], where: companyBase, _count: true, orderBy: { _count: { niche: "desc" } }, take: 8 }),
    prisma.deal.findMany({
      where: { organizationId, deletedAt: null, status: "WON", closedAt: { gte: new Date(new Date().getFullYear() - 1, new Date().getMonth() + 1, 1) } },
      select: { closedAt: true, amount: true },
    }),
    prisma.proposal.groupBy({ by: ["status"], where: { organizationId, deletedAt: null }, _count: true }),
  ]);

  // 1. Новые лиды по дням
  const days: Array<{ date: string; label: string; leads: number }> = [];
  const counts = new Map<string, number>();
  for (const l of leadsRaw) counts.set(dayKey(l.createdAt), (counts.get(dayKey(l.createdAt)) ?? 0) + 1);
  const cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);
  const dayFmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" });
  while (cursor <= to && days.length < 400) {
    const k = dayKey(cursor);
    days.push({ date: k, label: dayFmt.format(cursor), leads: counts.get(k) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // 2. Воронка: сколько компаний достигли этапа (по текущему статусу)
  const statusCount = new Map(statusGroups.map((g) => [g.crmStatus, g._count]));
  const rank = (s: string) => FUNNEL.indexOf(s as CrmStatusValue);
  const funnel = FUNNEL.map((stage, i) => ({
    stage,
    label: CRM_STATUS_LABELS[stage],
    value: statusGroups.filter((g) => (rank(g.crmStatus) >= i) || (i === 0 && rank(g.crmStatus) < 0)).reduce((s, g) => s + g._count, 0),
  }));
  const lostCount = (statusCount.get("LOST") ?? 0) + (statusCount.get("DO_NOT_CONTACT") ?? 0);

  // 3. Конверсия по источникам
  const wonBySource = new Map(sourceWon.map((g) => [g.sourceType, g._count]));
  const bySource = sourceGroups.map((g) => ({
    source: SOURCE_TYPE_LABELS[g.sourceType as SourceTypeValue] ?? g.sourceType,
    total: g._count,
    won: wonBySource.get(g.sourceType) ?? 0,
    conversion: g._count ? ((wonBySource.get(g.sourceType) ?? 0) / g._count) * 100 : 0,
  }));

  // 4. Выручка по месяцам (последние 12)
  const monthFmt = new Intl.DateTimeFormat("ru-RU", { month: "short", year: "2-digit" });
  const months: Array<{ key: string; label: string; revenue: number }> = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthFmt.format(d), revenue: 0 });
  }
  for (const r of revenueRaw) {
    if (!r.closedAt) continue;
    const m = months.find((x) => x.key === `${r.closedAt!.getFullYear()}-${r.closedAt!.getMonth()}`);
    if (m) m.revenue += Number(r.amount);
  }

  // 5. Ниши
  const niches = nicheGroups.map((g) => ({ niche: g.niche ?? "Не указана", count: g._count }));

  // 6. Эффективность КП
  const pCount = new Map(proposalGroups.map((g) => [g.status, g._count]));
  const sent = (pCount.get("SENT") ?? 0) + (pCount.get("ACCEPTED") ?? 0) + (pCount.get("REJECTED") ?? 0);
  const proposals = [
    { label: "Черновики", value: (pCount.get("DRAFT") ?? 0) + (pCount.get("READY") ?? 0) },
    { label: "Отправлено", value: sent },
    { label: "Принято", value: pCount.get("ACCEPTED") ?? 0 },
    { label: "Отклонено", value: pCount.get("REJECTED") ?? 0 },
  ];
  const proposalAcceptance = sent ? ((pCount.get("ACCEPTED") ?? 0) / sent) * 100 : 0;

  return { days, funnel, lostCount, bySource, months: months.map(({ label, revenue }) => ({ label, revenue })), niches, proposals, proposalAcceptance };
}

export async function recalcStats(organizationId: string) {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 86400000);
  const [kpis, charts] = await Promise.all([getKpis(organizationId, from, now), getCharts(organizationId, from, now)]);
  const snapshot = { computedAt: now.toISOString(), kpis, funnel: charts.funnel, bySource: charts.bySource };
  await setSetting(organizationId, "analytics.snapshot", snapshot);
  return { computedAt: snapshot.computedAt, totalCompanies: kpis.totalCompanies, revenue30d: kpis.revenue };
}

export async function getRecentActivity(organizationId: string, take = 12) {
  return prisma.activity.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    include: { company: { select: { id: true, name: true } }, user: { select: { name: true } } },
  });
}

/** Конверсия по нишам: сколько компаний дошли до контакта, ответа и сделки. */
export async function getNicheConversion(organizationId: string) {
  const rows = await prisma.company.groupBy({
    by: ["niche", "crmStatus"],
    where: { organizationId, deletedAt: null },
    _count: true,
  });
  const map = new Map<string, { niche: string; total: number; contacted: number; replied: number; won: number }>();
  const contactedSet = new Set(["CONTACTED", "REPLIED", "NEGOTIATION", "WON", "LOST"]);
  const repliedSet = new Set(["REPLIED", "NEGOTIATION", "WON"]);
  for (const r of rows) {
    const key = r.niche ?? "Не указана";
    const e = map.get(key) ?? { niche: key, total: 0, contacted: 0, replied: 0, won: 0 };
    e.total += r._count;
    if (contactedSet.has(r.crmStatus)) e.contacted += r._count;
    if (repliedSet.has(r.crmStatus)) e.replied += r._count;
    if (r.crmStatus === "WON") e.won += r._count;
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export async function getTeamActivity(organizationId: string, from: Date, to: Date) {
  const rows = await prisma.activity.groupBy({
    by: ["userId", "type"],
    where: { organizationId, createdAt: { gte: from, lte: to }, userId: { not: null } },
    _count: true,
  });
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.userId!))] } }, select: { id: true, name: true } });
  const names = new Map(users.map((u) => [u.id, u.name]));
  const byUser = new Map<string, { name: string; total: number; messages: number; proposals: number; deals: number }>();
  for (const r of rows) {
    const e = byUser.get(r.userId!) ?? { name: names.get(r.userId!) ?? "—", total: 0, messages: 0, proposals: 0, deals: 0 };
    e.total += r._count;
    if (r.type === "MESSAGE") e.messages += r._count;
    if (r.type === "PROPOSAL") e.proposals += r._count;
    if (r.type === "DEAL") e.deals += r._count;
    byUser.set(r.userId!, e);
  }
  return [...byUser.values()].sort((a, b) => b.total - a.total);
}
