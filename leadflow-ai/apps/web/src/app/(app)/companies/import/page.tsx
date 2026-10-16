import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ImportWizard } from "@/features/companies/import-wizard";
import { requirePageContext, hasRole } from "@/server/context";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { JobStatusBadge } from "@/components/common/badges";

export const metadata: Metadata = { title: "Импорт CSV/XLSX" };

export default async function ImportPage() {
  const ctx = await requirePageContext();
  if (!hasRole(ctx.role, "MEMBER")) redirect("/companies");
  const history = await prisma.importJob.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { createdAt: "desc" }, take: 10 });
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Импорт компаний" description="Загрузите CSV или XLSX, проверьте предпросмотр и сопоставьте столбцы с полями карточки." />
      <ImportWizard />
      {history.length ? (
        <Card>
          <CardHeader>
            <CardTitle>История импорта</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <div className="font-medium">{h.fileName}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(h.createdAt)} · строк {h.totalRows} · добавлено {h.importedRows} · дублей {h.duplicateRows} · ошибок {h.errorRows}
                  </div>
                </div>
                <JobStatusBadge status={h.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
