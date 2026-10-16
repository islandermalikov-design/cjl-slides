import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock, Sparkles } from "lucide-react";
import { ACTIVITY_TYPE_LABELS } from "@leadflow/shared";
import { PageHeader } from "@/components/common/page-header";
import { CrmStatusBadge, DemoBadge, ScoreBadge } from "@/components/common/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartsGrid, KpiGrid } from "@/features/analytics/dashboard-sections";
import { PeriodFilter } from "@/features/analytics/period-filter";
import { formatDate, relativeTime } from "@/lib/utils";
import { sp, type SearchParams } from "@/lib/search-params";
import { requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";
import { getCharts, getKpis, getRecentActivity, resolvePeriod } from "@/server/services/analytics";

export const metadata: Metadata = { title: "Главная" };

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const params = await searchParams;
  const period = resolvePeriod(sp(params, "period"), sp(params, "from"), sp(params, "to"));
  const [kpis, charts, activity, tasks, topLeads, org] = await Promise.all([
    getKpis(ctx.organizationId, period.from, period.to),
    getCharts(ctx.organizationId, period.from, period.to),
    getRecentActivity(ctx.organizationId, 10),
    prisma.task.findMany({
      where: { organizationId: ctx.organizationId, status: { in: ["TODO", "IN_PROGRESS"] } },
      orderBy: { dueAt: { sort: "asc", nulls: "last" } },
      take: 6,
      include: { company: { select: { id: true, name: true } } },
    }),
    prisma.company.findMany({
      where: { organizationId: ctx.organizationId, deletedAt: null, aiScore: { not: null }, crmStatus: { in: ["NEW", "VERIFIED", "PREPARE_PROPOSAL", "PROPOSAL_READY"] } },
      orderBy: { aiScore: "desc" },
      take: 6,
      select: { id: true, name: true, aiScore: true, crmStatus: true, isDemo: true, city: true },
    }),
    prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { isDemo: true } }),
  ]);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Главная {org?.isDemo ? <DemoBadge /> : null}
          </span>
        }
        description={`Показатели рассчитаны из базы данных · ${formatDate(period.from)} — ${formatDate(period.to)}`}
        actions={<PeriodFilter current={period.key} from={toIso(period.from)} to={toIso(period.to)} />}
      />
      <KpiGrid kpis={kpis} />
      <ChartsGrid charts={charts} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Приоритетные лиды
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/companies?sort=aiScore&order=desc">
                Все <ArrowUpRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 px-2">
            {topLeads.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">Нет оценённых лидов без контакта</p> : null}
            {topLeads.map((c) => (
              <Link key={c.id} href={`/companies/${c.id}`} className="flex items-center gap-3 rounded-[10px] px-3 py-2 hover:bg-muted/60">
                <ScoreBadge score={c.aiScore} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.city ?? "—"}</div>
                </div>
                <CrmStatusBadge status={c.crmStatus} />
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Ближайшие задачи
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/tasks">
                Все <ArrowUpRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 px-2">
            {tasks.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">Открытых задач нет</p> : null}
            {tasks.map((t) => {
              const overdue = t.dueAt && t.dueAt < new Date();
              return (
                <Link key={t.id} href={t.company ? `/companies/${t.company.id}` : "/tasks"} className="flex items-center gap-3 rounded-[10px] px-3 py-2 hover:bg-muted/60">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{t.company?.name ?? "Без компании"}</div>
                  </div>
                  <Badge variant={overdue ? "destructive" : "secondary"}>{t.dueAt ? formatDate(t.dueAt) : "Без срока"}</Badge>
                </Link>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Последние события</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative flex flex-col gap-3 border-l pl-4">
              {activity.length === 0 ? <p className="text-sm text-muted-foreground">Событий пока нет</p> : null}
              {activity.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute top-1.5 -left-[21px] size-2 rounded-full border-2 border-card bg-primary" />
                  <div className="text-[13px] leading-snug">
                    <span className="font-medium">{a.title}</span>
                    {a.company ? (
                      <>
                        {" · "}
                        <Link href={`/companies/${a.company.id}`} className="text-primary hover:underline">
                          {a.company.name}
                        </Link>
                      </>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ACTIVITY_TYPE_LABELS[a.type]} · {relativeTime(a.createdAt)}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
