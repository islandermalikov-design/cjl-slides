import type { Metadata } from "next";
import Link from "next/link";
import { Radar } from "lucide-react";
import { JobStatusBadge } from "@/components/common/badges";
import { EmptyState, ErrorState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DiscoveryForm } from "@/features/discovery/discovery-form";
import { DiscoveryResults, type CandidateView } from "@/features/discovery/discovery-results";
import { cn, formatDateTime } from "@/lib/utils";
import { sp, type SearchParams } from "@/lib/search-params";
import { hasRole, requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";
import { listAdapters } from "@/server/services/discovery";

export const metadata: Metadata = { title: "Поиск клиентов" };

export default async function DiscoveryPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const params = await searchParams;
  const [{ adapters, collectorError }, sources, history] = await Promise.all([
    listAdapters(),
    prisma.leadSource.findMany({ where: { organizationId: ctx.organizationId }, select: { id: true, name: true, adapterKey: true, status: true } }),
    prisma.discoveryJob.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const jobId = sp(params, "job") ?? history.find((h) => h.status === "SUCCEEDED")?.id;
  const job = jobId ? await prisma.discoveryJob.findFirst({ where: { id: jobId, organizationId: ctx.organizationId } }) : null;
  const results = (job?.results ?? null) as { candidates: CandidateView[]; warnings: string[] } | null;
  const canEdit = hasRole(ctx.role, "MEMBER");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Поиск клиентов"
        description="Поиск компаний в подключённых разрешённых источниках. Новые компании добавляются в базу только после вашего выбора; дубли отмечаются автоматически."
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {canEdit ? <DiscoveryForm adapters={adapters} sources={sources} collectorError={collectorError} /> : null}
          <Card>
            <CardHeader>
              <CardTitle>История поиска</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 px-2">
              {history.length === 0 ? <div className="px-3 text-sm text-muted-foreground">Поисков ещё не было</div> : null}
              {history.map((h) => (
                <Link key={h.id} href={`/discovery?job=${h.id}`} className={cn("flex items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm hover:bg-muted/60", job?.id === h.id && "bg-accent")}>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{h.adapterKey === "demo" ? "DEMO-каталог" : h.adapterKey}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(h.createdAt)} · {h.resultsCount} рез.
                    </span>
                  </span>
                  <JobStatusBadge status={h.status} />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="min-w-0">
          {!job ? (
            <EmptyState icon={Radar} title="Запустите поиск" description="Выберите источник и параметры слева. Для демонстрации доступен DEMO-каталог вымышленных компаний." />
          ) : job.status === "FAILED" ? (
            <ErrorState title="Поиск завершился с ошибкой" description={job.error ?? undefined} />
          ) : !results ? (
            <EmptyState icon={Radar} title="Поиск выполняется…" description="Обновите страницу через несколько секунд." />
          ) : (
            <Card className="overflow-hidden">
              {results.warnings?.length ? (
                <div className="border-b bg-amber-50 px-4 py-2 text-[13px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                  {results.warnings.map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </div>
              ) : null}
              <DiscoveryResults jobId={job.id} candidates={results.candidates} canEdit={canEdit} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
