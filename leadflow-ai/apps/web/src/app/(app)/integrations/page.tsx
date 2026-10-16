import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { CheckButton, IntegrationCard } from "@/features/integrations/integrations-client";
import { hasRole, requirePageContext } from "@/server/context";
import { getIntegrations } from "@/server/services/integrations";

export const metadata: Metadata = { title: "Интеграции" };

export default async function IntegrationsPage() {
  const ctx = await requirePageContext();
  const items = await getIntegrations(ctx.organizationId);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Интеграции"
        description="Внешние сервисы. Ключи хранятся только на сервере в зашифрованном виде; без ключей система работает в DEMO_MODE."
        actions={<CheckButton />}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => (
          <IntegrationCard key={i.provider} canAdmin={hasRole(ctx.role, "ADMIN")} item={{ ...i, lastCheckedAt: i.lastCheckedAt?.toISOString() ?? null }} />
        ))}
      </div>
    </div>
  );
}
