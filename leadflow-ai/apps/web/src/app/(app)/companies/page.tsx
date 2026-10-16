import type { Metadata } from "next";
import Link from "next/link";
import { Building, Download, Upload } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddCompanyButton } from "@/features/companies/add-company-button";
import { CompaniesFilters } from "@/features/companies/companies-filters";
import { CompaniesTable } from "@/features/companies/companies-table";
import { DedupPanel } from "@/features/companies/dedup-panel";
import { formatNumber } from "@/lib/utils";
import { sp, spAll, type SearchParams } from "@/lib/search-params";
import { hasRole, requirePageContext } from "@/server/context";
import { CompanyListQuerySchema, listCompanies, listFacets } from "@/server/services/companies";

export const metadata: Metadata = { title: "База компаний" };

export default async function CompaniesPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const params = await searchParams;
  const query = CompanyListQuerySchema.parse({
    q: sp(params, "q"),
    status: spAll(params, "status"),
    niche: sp(params, "niche"),
    city: sp(params, "city"),
    region: sp(params, "region"),
    marketplace: sp(params, "marketplace"),
    hasWebsite: sp(params, "hasWebsite"),
    hasContacts: sp(params, "hasContacts"),
    tagId: sp(params, "tagId"),
    minScore: sp(params, "minScore"),
    sort: sp(params, "sort"),
    order: sp(params, "order"),
    page: sp(params, "page"),
    pageSize: sp(params, "pageSize"),
  });
  const [{ items, total }, facets] = await Promise.all([listCompanies(ctx.organizationId, query), listFacets(ctx.organizationId)]);
  const canEdit = hasRole(ctx.role, "MEMBER");
  const exportQuery = new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : []))).toString();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="База компаний"
        description={`${formatNumber(total)} компаний по текущим фильтрам. Контакты — только опубликованные деловые, с источником.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={`/api/companies/export?${exportQuery}`}>
                <Download /> Экспорт CSV
              </a>
            </Button>
            {canEdit ? (
              <>
                <Button variant="outline" asChild>
                  <Link href="/companies/import">
                    <Upload /> Импорт CSV/XLSX
                  </Link>
                </Button>
                <AddCompanyButton />
              </>
            ) : null}
          </>
        }
      />
      <CompaniesFilters facets={{ ...facets, tags: facets.tags.map((t) => ({ id: t.id, name: t.name })) }} />
      {canEdit ? <DedupPanel /> : null}
      {items.length === 0 ? (
        <EmptyState
          icon={Building}
          title={total === 0 && !query.q ? "В базе пока нет компаний" : "Ничего не найдено"}
          description="Добавьте компанию вручную, импортируйте CSV/XLSX или найдите компании в разделе «Поиск клиентов»."
          action={canEdit ? <AddCompanyButton /> : null}
        />
      ) : (
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
      )}
    </div>
  );
}
