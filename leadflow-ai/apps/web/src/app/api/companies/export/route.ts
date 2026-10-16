import { CRM_STATUS_LABELS, MARKETPLACE_LABELS, formatPhone, toCsv } from "@leadflow/shared";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { getContext } from "@/server/context";
import { prisma } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";
import { CompanyListQuerySchema, buildCompanyWhere } from "@/server/services/companies";

export async function GET(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  try {
    await rateLimit(`export:${ctx.userId}`, 20, 60);
  } catch {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }
  const url = new URL(req.url);
  const ids = url.searchParams.get("ids")?.split(",").filter(Boolean).slice(0, 5000);
  const q = CompanyListQuerySchema.partial().parse({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status")?.split(",") ?? undefined,
    niche: url.searchParams.get("niche") ?? undefined,
    city: url.searchParams.get("city") ?? undefined,
    region: url.searchParams.get("region") ?? undefined,
    marketplace: url.searchParams.get("marketplace") ?? undefined,
    hasWebsite: url.searchParams.get("hasWebsite") ?? undefined,
    hasContacts: url.searchParams.get("hasContacts") ?? undefined,
    tagId: url.searchParams.get("tagId") ?? undefined,
    minScore: url.searchParams.get("minScore") ?? undefined,
  });
  const where = ids?.length ? { organizationId: ctx.organizationId, deletedAt: null, id: { in: ids } } : buildCompanyWhere(ctx.organizationId, q);
  const companies = await prisma.company.findMany({ where, orderBy: { createdAt: "desc" }, take: 20000, include: { tags: { include: { tag: true } } } });
  const csv = toCsv(
    ["Название", "Юр. название", "ИНН", "Сайт", "Категория", "Ниша", "Город", "Регион", "Площадка", "Email", "Телефон", "URL источника", "Дата проверки", "Статус CRM", "AI Score", "Теги", "Примечания", "DEMO"],
    companies.map((c) => [
      c.name,
      c.legalName,
      c.inn,
      c.website,
      c.category,
      c.niche,
      c.city,
      c.region,
      MARKETPLACE_LABELS[c.marketplace],
      c.publicEmail,
      c.publicPhone ? formatPhone(c.publicPhone) : null,
      c.sourceUrl,
      c.verifiedAt ? c.verifiedAt.toISOString().slice(0, 10) : null,
      CRM_STATUS_LABELS[c.crmStatus],
      c.aiScore,
      c.tags.map((t) => t.tag.name).join(", "),
      c.notes,
      c.isDemo ? "да" : "",
    ]),
  );
  await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "company.export", entityType: "Company", meta: { count: companies.length } });
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leadflow-companies-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
