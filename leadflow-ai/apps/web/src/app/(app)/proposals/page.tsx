import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { DemoBadge, ProposalStatusBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/utils";
import { hasRole, requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";

export const metadata: Metadata = { title: "Коммерческие предложения" };

export default async function ProposalsPage() {
  const ctx = await requirePageContext();
  const proposals = await prisma.proposal.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    include: { company: { select: { id: true, name: true } }, versions: { orderBy: { version: "desc" }, take: 1, select: { generatedBy: true } } },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  const canEdit = hasRole(ctx.role, "MEMBER");
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Коммерческие предложения"
        description="КП с версиями, HTML-превью и экспортом в PDF."
        actions={
          canEdit ? (
            <Button asChild>
              <Link href="/proposals/new">
                <Plus /> Новое КП
              </Link>
            </Button>
          ) : null
        }
      />
      {proposals.length === 0 ? (
        <EmptyState icon={FileText} title="КП пока нет" description="Создайте предложение для компании из базы — шаблон или AI-генерация." action={canEdit ? <Button asChild><Link href="/proposals/new">Создать КП</Link></Button> : null} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>КП</TableHead>
                <TableHead>Компания</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Стоимость</TableHead>
                <TableHead>Срок</TableHead>
                <TableHead>Версия</TableHead>
                <TableHead>Обновлено</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/proposals/${p.id}`} className="font-medium hover:text-primary hover:underline">
                      {p.title}
                    </Link>
                    {p.isDemo ? <DemoBadge className="ml-2" /> : null}
                  </TableCell>
                  <TableCell>
                    <Link href={`/companies/${p.company.id}`} className="text-[13px] hover:underline">
                      {p.company.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ProposalStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatMoney(p.totalPrice)}</TableCell>
                  <TableCell className="text-[13px]">{p.durationDays} дн.</TableCell>
                  <TableCell className="text-[13px]">
                    v{p.currentVersion} · {p.versions[0]?.generatedBy === "AI" ? "AI" : p.versions[0]?.generatedBy === "MANUAL" ? "вручную" : "шаблон"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(p.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
