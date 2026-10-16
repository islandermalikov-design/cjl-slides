import { ACTIVITY_TYPE_LABELS, CRM_STATUS_LABELS } from "@leadflow/shared";
import {
  Banknote,
  Building,
  CircleCheck,
  FileText,
  Handshake,
  MessageSquareReply,
  Percent,
  Receipt,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { KpiCard } from "@/components/common/kpi-card";
import type { getCharts, getKpis } from "@/server/services/analytics";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";
import { ChartCard, ColumnChart, HorizontalBars, LeadsChart, RevenueChart } from "./charts";

type Kpis = Awaited<ReturnType<typeof getKpis>>;
type Charts = Awaited<ReturnType<typeof getCharts>>;

export function KpiGrid({ kpis }: { kpis: Kpis }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard label="Всего компаний" value={formatNumber(kpis.totalCompanies)} icon={Building} tone="slate" hint="В базе на сегодня" />
      <KpiCard label="Новые лиды" value={formatNumber(kpis.newLeads)} icon={UserPlus} tone="blue" hint="Добавлены за период" />
      <KpiCard label="Контакты с источником" value={formatNumber(kpis.verifiedContacts)} icon={ShieldCheck} tone="sky" hint="Подтверждены ссылкой на источник" />
      <KpiCard label="Отправлено КП" value={formatNumber(kpis.proposalsSent)} icon={FileText} tone="violet" hint="За период" />
      <KpiCard label="Получено ответов" value={formatNumber(kpis.repliesReceived)} icon={MessageSquareReply} tone="blue" hint={`Ответы: ${formatPercent(kpis.replyRate)} от отправленных`} />
      <KpiCard label="Активные переговоры" value={formatNumber(kpis.activeNegotiations)} icon={Handshake} tone="amber" hint="Открытые сделки" />
      <KpiCard label="Закрытые сделки" value={formatNumber(kpis.wonDeals)} icon={CircleCheck} tone="green" hint="Выиграно за период" />
      <KpiCard label="Выручка" value={formatMoney(kpis.revenue)} icon={Banknote} tone="green" hint="По выигранным сделкам за период" />
      <KpiCard label="Конверсия" value={formatPercent(kpis.conversion)} icon={Percent} tone="violet" hint="Из контакта в сделку (всё время)" />
      <KpiCard label="Средний чек" value={formatMoney(kpis.averageDeal)} icon={Receipt} tone="slate" hint="По сделкам за период" />
    </div>
  );
}

export function ChartsGrid({ charts }: { charts: Charts }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Новые лиды по дням"
        description="Компании, добавленные в базу"
        table={{ headers: ["День", "Лиды"], rows: charts.days.map((d) => [d.label, d.leads]) }}
      >
        <LeadsChart data={charts.days} />
      </ChartCard>
      <ChartCard
        title="Воронка продаж"
        description={`Сколько компаний дошли до этапа · отказов и «не связываться»: ${charts.lostCount}`}
        table={{ headers: ["Этап", "Компаний"], rows: charts.funnel.map((f) => [f.label, f.value]) }}
      >
        <HorizontalBars data={charts.funnel.map((f) => ({ label: f.label, value: f.value }))} tooltip="Компаний" />
      </ChartCard>
      <ChartCard
        title="Конверсия по источникам"
        description="Доля компаний со статусом «Сделка»"
        table={{ headers: ["Источник", "Всего", "Сделок", "Конверсия"], rows: charts.bySource.map((s) => [s.source, s.total, s.won, formatPercent(s.conversion)]) }}
      >
        <HorizontalBars
          data={charts.bySource.map((s) => ({ label: s.source, value: Math.round(s.conversion * 10) / 10, extra: [["Компаний", formatNumber(s.total)], ["Сделок", formatNumber(s.won)]] }))}
          format="percent"
          tooltip="Конверсия"
          color="var(--chart-2)"
        />
      </ChartCard>
      <ChartCard
        title="Выручка по месяцам"
        description="Выигранные сделки за 12 месяцев"
        table={{ headers: ["Месяц", "Выручка"], rows: charts.months.map((m) => [m.label, formatMoney(m.revenue)]) }}
      >
        <RevenueChart data={charts.months} />
      </ChartCard>
      <ChartCard title="Компании по нишам" description="Топ-8 ниш в базе" table={{ headers: ["Ниша", "Компаний"], rows: charts.niches.map((n) => [n.niche, n.count]) }}>
        <HorizontalBars data={charts.niches.map((n) => ({ label: n.niche, value: n.count }))} tooltip="Компаний" color="var(--chart-1)" />
      </ChartCard>
      <ChartCard
        title="Эффективность КП"
        description={`Принято ${formatPercent(charts.proposalAcceptance)} от отправленных`}
        table={{ headers: ["Статус", "КП"], rows: charts.proposals.map((p) => [p.label, p.value]) }}
      >
        <ColumnChart data={charts.proposals} tooltip="КП" />
      </ChartCard>
    </div>
  );
}

export { ACTIVITY_TYPE_LABELS, CRM_STATUS_LABELS };
