import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataCard, LimitsCard, SenderProfileForm, ServicesCatalog, SuppressionCard, TeamCard } from "@/features/settings/settings-client";
import { hasRole, requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";
import { getOutreachSettings, getSenderProfile } from "@/server/services/settings";
import { listSuppression } from "@/server/services/suppression";

export const metadata: Metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const ctx = await requirePageContext();
  const [sender, outreach, budgetRow, services, members, suppression] = await Promise.all([
    getSenderProfile(ctx.organizationId),
    getOutreachSettings(ctx.organizationId),
    prisma.appSetting.findUnique({ where: { organizationId_key: { organizationId: ctx.organizationId, key: "ai.monthlyBudgetUsd" } } }),
    prisma.service.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { priceFrom: "asc" } }),
    prisma.organizationMember.findMany({ where: { organizationId: ctx.organizationId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } }),
    listSuppression(ctx.organizationId),
  ]);
  const canAdmin = hasRole(ctx.role, "ADMIN");
  const budget = typeof budgetRow?.value === "number" ? budgetRow.value : Number(process.env.AI_MONTHLY_BUDGET_USD ?? 20);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Настройки" description={`${ctx.organizationName}`} />
      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Профиль</TabsTrigger>
          <TabsTrigger value="services">Услуги и цены</TabsTrigger>
          <TabsTrigger value="team">Команда</TabsTrigger>
          <TabsTrigger value="limits">Лимиты</TabsTrigger>
          <TabsTrigger value="suppression">Исключения</TabsTrigger>
          <TabsTrigger value="data">Данные</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <SenderProfileForm initial={sender} disabled={!canAdmin} />
        </TabsContent>
        <TabsContent value="services">
          <ServicesCatalog canAdmin={canAdmin} services={services.map((s) => ({ id: s.id, name: s.name, description: s.description, tier: s.tier, priceFrom: s.priceFrom, priceTo: s.priceTo, durationDays: s.durationDays, features: s.features as string[], isActive: s.isActive }))} />
        </TabsContent>
        <TabsContent value="team">
          <TeamCard orgName={ctx.organizationName} myRole={ctx.role} currentUserId={ctx.userId} members={members.map((m) => ({ id: m.id, role: m.role, user: m.user, createdAt: m.createdAt.toISOString() }))} />
        </TabsContent>
        <TabsContent value="limits">
          <LimitsCard budget={budget} outreach={outreach} canAdmin={canAdmin} />
        </TabsContent>
        <TabsContent value="suppression">
          <SuppressionCard canEdit={hasRole(ctx.role, "MEMBER")} canAdmin={canAdmin} entries={suppression.map((s) => ({ id: s.id, value: s.value, kind: s.kind, reason: s.reason, source: s.source, createdAt: s.createdAt.toISOString() }))} />
        </TabsContent>
        <TabsContent value="data">
          <DataCard orgName={ctx.organizationName} isOwner={ctx.role === "OWNER"} canAdmin={canAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
