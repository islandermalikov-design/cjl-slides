import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewProposalSection } from "@/features/proposals/new-proposal-section";
import { formatDateTime } from "@/lib/utils";
import { sp, type SearchParams } from "@/lib/search-params";
import { hasRole, requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";

export const metadata: Metadata = { title: "Генератор КП" };

export default async function AiProposalsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  if (!hasRole(ctx.role, "MEMBER")) redirect("/proposals");
  const params = await searchParams;
  const recent = await prisma.proposalVersion.findMany({
    where: { proposal: { organizationId: ctx.organizationId, deletedAt: null } },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { proposal: { select: { id: true, title: true } } },
  });
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Генератор КП"
        description="AI готовит развёрнутое КП, первое сообщение, email, вариант для мессенджера и ответы на интерес и возражение по цене — только на основе переданных фактов."
      />
      <NewProposalSection organizationId={ctx.organizationId} companyId={sp(params, "companyId")} />
      {recent.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Последние версии</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {recent.map((v) => (
              <Link key={v.id} href={`/proposals/${v.proposal.id}?v=${v.version}`} className="flex items-center justify-between gap-2 py-2.5 text-sm hover:text-primary">
                <span className="truncate">
                  {v.proposal.title} · v{v.version}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {v.note ?? v.generatedBy} · {formatDateTime(v.createdAt)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
