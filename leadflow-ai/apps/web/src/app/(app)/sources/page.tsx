import type { Metadata } from "next";
import { Database, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourcesList } from "@/features/sources/sources-client";
import { hasRole, requirePageContext } from "@/server/context";
import { listAdapters } from "@/server/services/discovery";
import { listSources } from "@/server/services/sources";

export const metadata: Metadata = { title: "Источники данных" };

export default async function SourcesPage() {
  const ctx = await requirePageContext();
  const [sources, { adapters, collectorError }] = await Promise.all([listSources(ctx.organizationId), listAdapters()]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Источники данных" description="Подключаемые адаптеры: официальные API, разрешённые каталоги, публичные сайты компаний. Каждый источник активируется только после проверки." />
      <Alert variant="info">
        <ShieldCheck />
        <div>
          <AlertTitle>Правила сбора данных</AlertTitle>
          <AlertDescription>
            Не обходим CAPTCHA, авторизацию и антибот-защиту; соблюдаем robots.txt и условия сайтов; собираем только опубликованные деловые контакты; не используем покупательские чаты маркетплейсов для рекламы.
            Официальные API Wildberries/Ozon предназначены для работы продавца со своим кабинетом и не являются источником данных о сторонних продавцах.
          </AlertDescription>
        </div>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>Доступные адаптеры</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {adapters.map((a) => (
            <div key={a.key} className="rounded-[12px] border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{a.name}</div>
                <Badge variant={a.available ? "success" : "secondary"}>{a.available ? "доступен" : "недоступен"}</Badge>
              </div>
              <div className="mt-1 text-[13px] text-muted-foreground">{a.description}</div>
              {!a.available && a.reason ? <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">{a.reason}</div> : null}
            </div>
          ))}
          {collectorError ? <div className="text-sm text-muted-foreground md:col-span-2">Адаптеры collector не загружены: {collectorError}</div> : null}
        </CardContent>
      </Card>
      {sources.length === 0 ? (
        <EmptyState icon={Database} title="Источники не подключены" />
      ) : (
        <SourcesList
          canAdmin={hasRole(ctx.role, "ADMIN")}
          adapters={[...adapters.map((a) => ({ key: a.key, name: a.name })), { key: "manual", name: "Ручной ввод / файлы" }]}
          sources={sources.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            adapterKey: s.adapterKey,
            baseUrl: s.baseUrl,
            status: s.status,
            robotsChecked: s.robotsChecked,
            termsReviewed: s.termsReviewed,
            legalBasis: s.legalBasis,
            notes: s.notes,
            lastRunAt: s.lastRunAt?.toISOString() ?? null,
            isDemo: s.isDemo,
            evidenceCount: s._count.evidence,
            runs: s._count.discovery,
          }))}
        />
      )}
    </div>
  );
}
