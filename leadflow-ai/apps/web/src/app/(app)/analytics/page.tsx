import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartsGrid, KpiGrid } from "@/features/analytics/dashboard-sections";
import { PeriodFilter } from "@/features/analytics/period-filter";
import { SystemJobButtons } from "@/features/jobs/jobs-client";
import { formatDate, formatDateTime, formatPercent } from "@/lib/utils";
import { sp, type SearchParams } from "@/lib/search-params";
import { hasRole, requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";
import { getCharts, getKpis, getNicheConversion, getTeamActivity, resolvePeriod } from "@/server/services/analytics";

export const metadata: Metadata = { title: "Аналитика" };

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const params = await searchParams;
  const period = resolvePeriod(sp(params, "period"), sp(params, "from"), sp(params, "to"));
  const [kpis, charts, niches, team, snapshot] = await Promise.all([
    getKpis(ctx.organizationId, period.from, period.to),
    getCharts(ctx.organizationId, period.from, period.to),
    getNicheConversion(ctx.organizationId),
    getTeamActivity(ctx.organizationId, period.from, period.to),
    prisma.appSetting.findUnique({ where: { organizationId_key: { organizationId: ctx.organizationId, key: "analytics.snapshot" } } }),
  ]);
  const computedAt = (snapshot?.value as { computedAt?: string } | null)?.computedAt;
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Аналитика"
        description={`${formatDate(period.from)} — ${formatDate(period.to)} · все показатели рассчитаны из базы данных${computedAt ? ` · снимок статистики: ${formatDateTime(computedAt)}` : ""}`}
        actions={<PeriodFilter current={period.key} from={toIso(period.from)} to={toIso(period.to)} />}
      />
      <KpiGrid kpis={kpis} />
      <ChartsGrid charts={charts} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Конверсия по нишам</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Ниша</TableHead>
                <TableHead className="text-right">Компаний</TableHead>
                <TableHead className="text-right">Контакт</TableHead>
                <TableHead className="text-right">Ответ</TableHead>
                <TableHead className="text-right">Сделка</TableHead>
                <TableHead className="text-right">Конверсия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {niches.map((n) => (
                <TableRow key={n.niche}>
                  <TableCell className="text-[13px] font-medium">{n.niche}</TableCell>
                  <TableCell className="text-right tabular-nums">{n.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{n.contacted}</TableCell>
                  <TableCell className="text-right tabular-nums">{n.replied}</TableCell>
                  <TableCell className="text-right tabular-nums">{n.won}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(n.contacted ? (n.won / n.contacted) * 100 : 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Активность команды за период</CardTitle>
          </CardHeader>
          {team.length === 0 ? (
            <CardContent className="text-sm text-muted-foreground">Нет действий за период</CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Сотрудник</TableHead>
                  <TableHead className="text-right">Действий</TableHead>
                  <TableHead className="text-right">Сообщения</TableHead>
                  <TableHead className="text-right">КП</TableHead>
                  <TableHead className="text-right">Сделки</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((t) => (
                  <TableRow key={t.name}>
                    <TableCell className="text-[13px] font-medium">{t.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.total}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.messages}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.proposals}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.deals}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <CardContent className="border-t pt-4">
            <SystemJobButtons canEdit={hasRole(ctx.role, "MEMBER")} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
