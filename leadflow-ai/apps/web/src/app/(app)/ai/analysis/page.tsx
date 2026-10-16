import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { CrmStatusBadge, DemoBadge, ScoreBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BulkAnalyze } from "@/features/ai/analysis-client";
import { cn, formatDateTime } from "@/lib/utils";
import { sp, type SearchParams } from "@/lib/search-params";
import { getAiStatus } from "@/server/ai/client";
import { hasRole, requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";

export const metadata: Metadata = { title: "AI-анализ компаний" };

const FILTERS = [
  ["unscored", "Без оценки"],
  ["high", "Score ≥ 70"],
  ["mid", "45–69"],
  ["low", "< 45"],
  ["all", "Все"],
] as const;

export default async function AiAnalysisPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const filter = sp(await searchParams, "filter") ?? "unscored";
  const scoreWhere =
    filter === "unscored" ? { aiScore: null } : filter === "high" ? { aiScore: { gte: 70 } } : filter === "mid" ? { aiScore: { gte: 45, lt: 70 } } : filter === "low" ? { aiScore: { lt: 45 } } : {};
  const [ai, companies, usage, counts] = await Promise.all([
    getAiStatus(ctx.organizationId),
    prisma.company.findMany({
      where: { organizationId: ctx.organizationId, deletedAt: null, ...scoreWhere },
      orderBy: [{ aiScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: 200,
      include: { scores: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, generatedBy: true, recommendedProduct: true } } },
    }),
    prisma.aiUsage.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.company.groupBy({ by: ["aiScore"], where: { organizationId: ctx.organizationId, deletedAt: null }, _count: true }),
  ]);
  const total = counts.reduce((s, c) => s + c._count, 0);
  const unscored = counts.find((c) => c.aiScore === null)?._count ?? 0;
  const budgetPct = ai.monthBudgetUsd ? (ai.monthSpentUsd / ai.monthBudgetUsd) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="AI-анализ компаний"
        description="Score 0–100 по 6 критериям. Факты, гипотезы и рекомендации разделены; обороты без достоверных данных не оцениваются."
        actions={hasRole(ctx.role, "MEMBER") ? <BulkAnalyze ids={companies.map((c) => c.id)} label="Анализировать список" /> : null}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Alert variant={ai.mode === "live" ? "success" : ai.mode === "demo" ? "warning" : "destructive"} className="lg:col-span-2">
          <Sparkles />
          <div>
            <AlertTitle>{ai.mode === "live" ? "Claude AI подключён" : ai.mode === "demo" ? "DEMO_MODE" : "AI недоступен"}</AlertTitle>
            <AlertDescription>
              {ai.message}
              {ai.mode === "unavailable" ? (
                <>
                  {" "}
                  <Link href="/integrations" className="font-medium underline">
                    Перейти к интеграциям
                  </Link>
                </>
              ) : null}
            </AlertDescription>
          </div>
        </Alert>
        <Card className="p-4">
          <div className="text-[12.5px] text-muted-foreground">Расходы на AI в этом месяце</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            ${ai.monthSpentUsd.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">из ${ai.monthBudgetUsd.toFixed(2)}</span>
          </div>
          <Progress value={budgetPct} className="mt-2" indicatorClassName={budgetPct > 90 ? "bg-destructive" : undefined} />
          <div className="mt-2 text-xs text-muted-foreground">
            Оценено {total - unscored} из {total} компаний
          </div>
        </Card>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(([key, label]) => (
          <Link key={key} href={`/ai/analysis?filter=${key}`} className={cn("inline-flex h-8 items-center rounded-[9px] border px-3 text-[13px] font-medium", filter === key ? "border-primary bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
            {label}
          </Link>
        ))}
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Компания</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Рекомендуемый продукт</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Оценка</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Нет компаний по этому фильтру
                </TableCell>
              </TableRow>
            ) : null}
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/companies/${c.id}`} className="font-medium hover:text-primary hover:underline">
                    {c.name}
                  </Link>
                  {c.isDemo ? <DemoBadge className="ml-2" /> : null}
                  <div className="text-xs text-muted-foreground">{[c.niche, c.city].filter(Boolean).join(" · ")}</div>
                </TableCell>
                <TableCell>
                  <ScoreBadge score={c.aiScore} />
                </TableCell>
                <TableCell className="max-w-[280px] text-[13px]">{c.scores[0]?.recommendedProduct ?? "—"}</TableCell>
                <TableCell>
                  <CrmStatusBadge status={c.crmStatus} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.scores[0] ? (
                    <>
                      <Badge variant={c.scores[0].generatedBy === "AI" ? "default" : "demo"}>{c.scores[0].generatedBy === "AI" ? "AI" : "DEMO"}</Badge> {formatDateTime(c.scores[0].createdAt)}
                    </>
                  ) : (
                    "не оценивалась"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {usage.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Последние обращения к Claude API</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y text-sm">
            {usage.map((u) => (
              <div key={u.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {u.feature} · {u.model} {u.success ? "" : "· ошибка"}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {u.inputTokens}+{u.outputTokens} ток. · ${Number(u.costUsd).toFixed(4)} · {formatDateTime(u.createdAt)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
