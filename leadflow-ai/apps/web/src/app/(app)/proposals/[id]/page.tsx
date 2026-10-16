import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBadge, ProposalStatusBadge } from "@/components/common/badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalEditor } from "@/features/proposals/proposal-editor";
import { ProposalToolbar } from "@/features/proposals/proposal-toolbar";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";
import { sp, type SearchParams } from "@/lib/search-params";
import { getAiStatus } from "@/server/ai/client";
import { hasRole, requirePageContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { getProposalVersion } from "@/server/services/proposals";

export const metadata: Metadata = { title: "КП" };

export default async function ProposalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const { id } = await params;
  const v = Number(sp(await searchParams, "v")) || undefined;
  let loaded;
  try {
    loaded = await getProposalVersion(ctx.organizationId, id, v);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { proposal, version, data } = loaded;
  const ai = await getAiStatus(ctx.organizationId);
  const canEdit = hasRole(ctx.role, "MEMBER");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight">{proposal.title}</h1>
            <ProposalStatusBadge status={proposal.status} />
            {proposal.isDemo ? <DemoBadge /> : null}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            <Link href={`/companies/${proposal.company.id}`} className="text-primary hover:underline">
              {proposal.company.name}
            </Link>{" "}
            · {formatMoney(data.content.totalPrice)} · {data.content.durationDays} дн. · версия {version.version} из {proposal.versions.length}
          </div>
        </div>
        <ProposalToolbar id={proposal.id} companyId={proposal.companyId} status={proposal.status} version={version.version} canEdit={canEdit} aiLive={ai.mode === "live"} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Tabs defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview">Превью</TabsTrigger>
            <TabsTrigger value="edit">{canEdit ? "Редактор" : "Содержание"}</TabsTrigger>
          </TabsList>
          <TabsContent value="preview">
            <Card className="overflow-hidden">
              <iframe
                title="Превью коммерческого предложения"
                src={`/api/proposals/${proposal.id}/html?v=${version.version}`}
                className="h-[1100px] w-full bg-white"
                sandbox=""
              />
            </Card>
          </TabsContent>
          <TabsContent value="edit">
            <ProposalEditor key={version.id} proposalId={proposal.id} initial={data} canEdit={canEdit} />
          </TabsContent>
        </Tabs>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Версии</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 px-2">
            {proposal.versions.map((ver) => (
              <Link
                key={ver.id}
                href={`/proposals/${proposal.id}?v=${ver.version}`}
                className={cn("flex items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm hover:bg-muted/60", ver.version === version.version && "bg-accent")}
              >
                <span className="font-medium">v{ver.version}</span>
                <span className="flex flex-col items-end text-xs text-muted-foreground">
                  <Badge variant={ver.generatedBy === "AI" ? "default" : ver.generatedBy === "MANUAL" ? "secondary" : "outline"}>
                    {ver.generatedBy === "AI" ? "AI" : ver.generatedBy === "MANUAL" ? "Вручную" : "Шаблон"}
                  </Badge>
                  <span className="mt-0.5">{formatDateTime(ver.createdAt)}</span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
