import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { Card } from "@/components/ui/card";
import { AddCompanyButton } from "@/features/companies/add-company-button";
import { CompaniesTable } from "@/features/companies/companies-table";
import { CrmToolbar } from "@/features/crm/crm-toolbar";
import { Kanban } from "@/features/crm/kanban";
import { sp, type SearchParams } from "@/lib/search-params";
import { hasRole, requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import { CompanyListQuerySchema, listCompanies } from "@/server/services/companies";

export const metadata: Metadata = { title: "CRM" };

export default async function CrmPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const params = await searchParams;
  const view = sp(params, "view") === "table" ? "table" : "kanban";
  const q = sp(params, "q");
  const followup = sp(params, "followup") === "1";
  const canEdit = hasRole(ctx.role, "MEMBER");

  // «Требуют повторного контакта»: связались > 4 дней назад и нет ответа.
  const followupWhere: Prisma.CompanyWhereInput = followup ? { crmStatus: "CONTACTED", lastContactedAt: { lt: new Date(Date.now() - 4 * 86400000) } } : {};

  let content: React.ReactNode;
  if (view === "kanban") {
    const companies = await prisma.company.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        ...followupWhere,
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: [{ crmOrder: "asc" }, { updatedAt: "desc" }],
      take: 600,
      include: {
        deals: { where: { deletedAt: null, status: { not: "LOST" } }, select: { amount: true } },
        _count: { select: { tasks: { where: { status: { in: ["TODO", "IN_PROGRESS"] } } } } },
      },
    });
    content = (
      <Kanban
        canEdit={canEdit}
        hidden={sp(params, "closed") === "1" ? [] : ["LOST", "DO_NOT_CONTACT"]}
        initial={companies.map((c) => ({
          id: c.id,
          name: c.name,
          city: c.city,
          niche: c.niche,
          aiScore: c.aiScore,
          crmStatus: c.crmStatus,
          isDemo: c.isDemo,
          nextStep: c.nextStep,
          nextStepAt: c.nextStepAt?.toISOString() ?? null,
          publicEmail: c.publicEmail,
          publicPhone: c.publicPhone,
          dealsSum: c.deals.reduce((s, d) => s + Number(d.amount), 0),
          openTasks: c._count.tasks,
        }))}
      />
    );
  } else {
    const query = CompanyListQuerySchema.parse({ q, sort: sp(params, "sort") ?? "updatedAt", order: sp(params, "order"), page: sp(params, "page") });
    const { items, total } = followup
      ? await (async () => {
          const where = { organizationId: ctx.organizationId, deletedAt: null, ...followupWhere };
          const [items, total] = await Promise.all([
            prisma.company.findMany({ where, include: { tags: { include: { tag: true } }, _count: { select: { contacts: { where: { deletedAt: null } } } } }, take: 200 }),
            prisma.company.count({ where }),
          ]);
          return { items, total };
        })()
      : await listCompanies(ctx.organizationId, query);
    content = (
      <Card className="overflow-hidden">
        <CompaniesTable
          canEdit={canEdit}
          rows={items.map((c) => ({
            id: c.id,
            name: c.name,
            legalName: c.legalName,
            website: c.website,
            category: c.category,
            niche: c.niche,
            city: c.city,
            region: c.region,
            marketplace: c.marketplace,
            publicEmail: c.publicEmail,
            publicPhone: c.publicPhone,
            sourceUrl: c.sourceUrl,
            verifiedAt: c.verifiedAt?.toISOString() ?? null,
            crmStatus: c.crmStatus,
            aiScore: c.aiScore,
            isDemo: c.isDemo,
            createdAt: c.createdAt.toISOString(),
            contactsCount: c._count.contacts,
            tags: c.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
          }))}
        />
        <div className="border-t px-3">
          <Pagination total={total} page={query.page} pageSize={query.pageSize} />
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="CRM"
        description="Перетаскивайте карточки между статусами — изменения сохраняются в базе и попадают в историю компании."
        actions={canEdit ? <AddCompanyButton /> : null}
      />
      <CrmToolbar view={view} />
      {content}
    </div>
  );
}
