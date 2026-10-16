import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { JOB_STATUSES, JOB_STATUS_LABELS, JOB_TYPES, JOB_TYPE_LABELS } from "@leadflow/shared";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { JobsTable, SystemJobButtons } from "@/features/jobs/jobs-client";
import type { JobStatus, JobType } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { sp, type SearchParams } from "@/lib/search-params";
import { hasRole, requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";
import { isWorkerAlive } from "@/server/jobs/queue";

export const metadata: Metadata = { title: "Задания" };

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const params = await searchParams;
  const status = sp(params, "status");
  const type = sp(params, "type");
  const where = {
    organizationId: ctx.organizationId,
    ...(status && (JOB_STATUSES as readonly string[]).includes(status) ? { status: status as JobStatus } : {}),
    ...(type && (JOB_TYPES as readonly string[]).includes(type) ? { type: type as JobType } : {}),
  };
  const [jobs, worker] = await Promise.all([prisma.backgroundJob.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }), isWorkerAlive()]);
  const link = (k: string, v: string | null) => {
    const p = new URLSearchParams();
    if (status && k !== "status") p.set("status", status);
    if (type && k !== "type") p.set("type", type);
    if (v) p.set(k, v);
    return `/jobs?${p.toString()}`;
  };
  const chip = (active: boolean) => cn("inline-flex h-7 items-center rounded-[8px] border px-2.5 text-[12.5px] font-medium", active ? "border-primary bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:text-foreground");
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Задания" description="Фоновые задачи: импорт, обогащение, AI-анализ, генерация КП, проверка дублей, статистика и интеграции. Повторные попытки и идемпотентность — встроены." actions={<SystemJobButtons canEdit={hasRole(ctx.role, "MEMBER")} />} />
      <Alert variant={worker ? "success" : "info"}>
        <AlertDescription>
          {worker
            ? "Worker BullMQ активен: задания выполняются в отдельном процессе."
            : process.env.REDIS_URL
              ? "Redis подключён, но worker не запущен (pnpm worker) — задания выполняются внутри веб-сервера."
              : "REDIS_URL не задан — задания выполняются внутри веб-сервера."}
        </AlertDescription>
      </Alert>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Link href={link("status", null)} className={chip(!status)}>Все статусы</Link>
          {JOB_STATUSES.map((s) => (
            <Link key={s} href={link("status", s)} className={chip(status === s)}>
              {JOB_STATUS_LABELS[s]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link href={link("type", null)} className={chip(!type)}>Все типы</Link>
          {JOB_TYPES.map((t) => (
            <Link key={t} href={link("type", t)} className={chip(type === t)}>
              {JOB_TYPE_LABELS[t]}
            </Link>
          ))}
        </div>
      </div>
      {jobs.length === 0 ? (
        <EmptyState icon={ListChecks} title="Заданий нет" description="Задания появятся при импорте, AI-анализе, поиске компаний и других операциях." />
      ) : (
        <Card className="overflow-hidden">
          <JobsTable
            canEdit={hasRole(ctx.role, "MEMBER")}
            highlight={sp(params, "highlight")}
            jobs={jobs.map((j) => ({
              id: j.id,
              type: j.type,
              status: j.status,
              attempts: j.attempts,
              maxAttempts: j.maxAttempts,
              error: j.error,
              result: j.type === "IMPORT" ? j.result : j.result,
              createdAt: j.createdAt.toISOString(),
              startedAt: j.startedAt?.toISOString() ?? null,
              finishedAt: j.finishedAt?.toISOString() ?? null,
            }))}
          />
        </Card>
      )}
    </div>
  );
}
