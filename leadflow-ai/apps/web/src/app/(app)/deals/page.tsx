import type { Metadata } from "next";
import { Banknote, Handshake, Scale, Trophy } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { KpiCard } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { NewDealButton } from "@/features/deals/deal-dialog";
import { DealsBoard } from "@/features/deals/deals-board";
import { formatMoney, formatNumber } from "@/lib/utils";
import { sp, type SearchParams } from "@/lib/search-params";
import { hasRole, requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";
import { listDeals, listStages } from "@/server/services/deals";

export const metadata: Metadata = { title: "Сделки" };

export default async function DealsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const params = await searchParams;
  const [deals, stages, services, companies] = await Promise.all([
    listDeals(ctx.organizationId),
    listStages(ctx.organizationId),
    prisma.service.findMany({ where: { organizationId: ctx.organizationId, isActive: true }, select: { id: true, name: true, priceFrom: true } }),
    prisma.company.findMany({ where: { organizationId: ctx.organizationId, deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 1000 }),
  ]);
  const options = { stages: stages.map((s) => ({ id: s.id, name: s.name })), services, companies };
  const open = deals.filter((d) => d.status === "OPEN");
  const won = deals.filter((d) => d.status === "WON");
  const stageProb = new Map(stages.map((s) => [s.id, s.probability]));
  const openSum = open.reduce((s, d) => s + Number(d.amount), 0);
  const weighted = open.reduce((s, d) => s + (Number(d.amount) * (stageProb.get(d.stageId ?? "") ?? 10)) / 100, 0);
  const wonSum = won.reduce((s, d) => s + Number(d.amount), 0);
  const canEdit = hasRole(ctx.role, "MEMBER");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Сделки"
        description="Воронка сделок по этапам. Перетащите карточку на другой этап — статус компании и аналитика обновятся."
        actions={canEdit ? <NewDealButton options={options} label="Новая сделка" variant="default" size="default" /> : null}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Открытые сделки" value={formatNumber(open.length)} icon={Handshake} tone="blue" />
        <KpiCard label="Сумма в работе" value={formatMoney(openSum)} icon={Banknote} tone="amber" />
        <KpiCard label="Прогноз (с учётом вероятности)" value={formatMoney(weighted)} icon={Scale} tone="violet" />
        <KpiCard label="Выиграно всего" value={formatMoney(wonSum)} icon={Trophy} tone="green" hint={`${won.length} сделок`} />
      </div>
      {deals.length === 0 ? (
        <EmptyState icon={Handshake} title="Сделок пока нет" description="Создайте сделку из карточки компании или кнопкой выше." action={canEdit ? <NewDealButton options={options} label="Новая сделка" variant="default" size="default" /> : null} />
      ) : (
        <DealsBoard
          canEdit={canEdit}
          highlight={sp(params, "highlight")}
          stages={stages.map((s) => ({ id: s.id, name: s.name, probability: s.probability, isWon: s.isWon, isLost: s.isLost }))}
          options={options}
          deals={deals.map((d) => ({
            id: d.id,
            title: d.title,
            amount: Number(d.amount),
            status: d.status,
            stageId: d.stageId,
            serviceId: d.serviceId,
            expectedCloseAt: d.expectedCloseAt?.toISOString() ?? null,
            closedAt: d.closedAt?.toISOString() ?? null,
            notes: d.notes,
            isDemo: d.isDemo,
            company: d.company,
          }))}
        />
      )}
    </div>
  );
}
