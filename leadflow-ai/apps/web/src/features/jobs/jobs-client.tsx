"use client";

import { JOB_TYPE_LABELS, type JobStatusValue, type JobTypeValue } from "@leadflow/shared";
import { ChartColumn, CopyCheck, Plug, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { JobStatusBadge } from "@/components/common/badges";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAction } from "@/hooks/use-action";
import { cn, formatDateTime } from "@/lib/utils";
import { cancelJobAction, retryJobAction, runSystemJobAction } from "./actions";

export interface JobRow {
  id: string;
  type: JobTypeValue;
  status: JobStatusValue;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  result: unknown;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export function SystemJobButtons({ canEdit }: { canEdit: boolean }) {
  const { run, pending } = useAction();
  if (!canEdit) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={pending} onClick={() => run(() => runSystemJobAction("STATS_RECALC"))}>
        <ChartColumn /> Пересчитать статистику
      </Button>
      <Button variant="outline" disabled={pending} onClick={() => run(() => runSystemJobAction("INTEGRATION_CHECK"))}>
        <Plug /> Проверить интеграции
      </Button>
      <Button variant="outline" disabled={pending} onClick={() => run(() => runSystemJobAction("DEDUPLICATION"))}>
        <CopyCheck /> Проверить дубли
      </Button>
    </div>
  );
}

function duration(a: string | null, b: string | null) {
  if (!a || !b) return "—";
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return ms < 1000 ? `${ms} мс` : `${(ms / 1000).toFixed(1)} с`;
}

function summarize(result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const r = result as Record<string, unknown>;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(r)) {
    if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") parts.push(`${k}: ${v}`);
    else if (v && typeof v === "object" && "ok" in (v as object)) parts.push(`${k}: ${(v as { ok: boolean }).ok ? "OK" : "ошибка"}`);
  }
  return parts.slice(0, 5).join(" · ");
}

export function JobsTable({ jobs, highlight, canEdit }: { jobs: JobRow[]; highlight?: string; canEdit: boolean }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [open, setOpen] = useState<string | null>(highlight ?? null);
  const active = jobs.some((j) => j.status === "QUEUED" || j.status === "RUNNING");
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [active, router]);
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>ID</TableHead>
          <TableHead>Тип</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead>Создано</TableHead>
          <TableHead>Выполнение</TableHead>
          <TableHead>Попытки</TableHead>
          <TableHead>Результат / ошибка</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((j) => (
          <Fragment key={j.id}>
            <TableRow className={cn("cursor-pointer", highlight === j.id && "bg-accent/50")} onClick={() => setOpen(open === j.id ? null : j.id)}>
              <TableCell className="font-mono text-xs text-muted-foreground">{j.id.slice(-8)}</TableCell>
              <TableCell className="text-[13px] font-medium">{JOB_TYPE_LABELS[j.type]}</TableCell>
              <TableCell>
                <JobStatusBadge status={j.status} />
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(j.createdAt)}</TableCell>
              <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{duration(j.startedAt, j.finishedAt)}</TableCell>
              <TableCell className="text-xs tabular-nums">
                {j.attempts}/{j.maxAttempts}
              </TableCell>
              <TableCell className="max-w-[360px] truncate text-xs">{j.error ? <span className="text-destructive">{j.error}</span> : <span className="text-muted-foreground">{summarize(j.result)}</span>}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                {canEdit ? (
                  <div className="flex justify-end gap-1">
                    {j.status === "FAILED" || j.status === "CANCELLED" ? (
                      <Button size="icon-sm" variant="ghost" disabled={pending} onClick={() => run(() => retryJobAction(j.id))} aria-label="Повторить">
                        <RotateCcw />
                      </Button>
                    ) : null}
                    {j.status === "QUEUED" ? (
                      <Button size="icon-sm" variant="ghost" disabled={pending} onClick={() => run(() => cancelJobAction(j.id))} aria-label="Отменить">
                        <X />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </TableCell>
            </TableRow>
            {open === j.id ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="bg-muted/30">
                  <pre className="max-h-72 overflow-auto rounded-[10px] bg-card p-3 font-mono text-xs whitespace-pre-wrap">{JSON.stringify({ id: j.id, error: j.error, result: j.result }, null, 2)}</pre>
                </TableCell>
              </TableRow>
            ) : null}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
