"use client";

import { TASK_STATUS_LABELS, type TaskPriorityValue, type TaskStatusValue } from "@leadflow/shared";
import { CalendarClock, Pencil, RotateCcw, Trash } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PriorityBadge } from "@/components/common/badges";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { cn, formatDateTime } from "@/lib/utils";
import { deleteTaskAction } from "./actions";
import { TaskDialog } from "./task-dialog";
import { TaskCheckbox } from "./task-list";

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  isFollowUp: boolean;
  company: { id: string; name: string } | null;
  assignee: { name: string } | null;
}

const SCOPES = [
  ["open", "Открытые"],
  ["overdue", "Просроченные"],
  ["today", "На сегодня"],
  ["week", "На неделю"],
  ["done", "Выполненные"],
  ["all", "Все"],
] as const;

export function TaskScopes({ counts }: { counts: Record<string, number> }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = params.get("scope") ?? "open";
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Фильтр задач">
      {SCOPES.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={current === key}
          onClick={() => router.push(`${pathname}?scope=${key}`)}
          className={cn("inline-flex h-8 items-center gap-1.5 rounded-[9px] border px-3 text-[13px] font-medium transition-colors", current === key ? "border-primary bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:text-foreground")}
        >
          {label}
          {counts[key] !== undefined ? <span className="text-xs tabular-nums opacity-70">{counts[key]}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function TasksList({ tasks, canEdit }: { tasks: TaskRow[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const { run } = useAction();
  const now = new Date();
  return (
    <div className="divide-y">
      {tasks.map((t) => {
        const overdue = t.dueAt && new Date(t.dueAt) < now && t.status !== "DONE" && t.status !== "CANCELLED";
        return (
          <div key={t.id} className="group flex items-start gap-3 px-4 py-3 hover:bg-muted/30">
            <TaskCheckbox id={t.id} done={t.status === "DONE"} disabled={!canEdit} />
            <div className="min-w-0 flex-1">
              <div className={cn("text-sm font-medium", t.status === "DONE" && "text-muted-foreground line-through")}>{t.title}</div>
              {t.description ? <div className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{t.description}</div> : null}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {t.company ? (
                  <Link href={`/companies/${t.company.id}`} className="text-primary hover:underline">
                    {t.company.name}
                  </Link>
                ) : null}
                <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-destructive")}>
                  <CalendarClock className="size-3" /> {t.dueAt ? formatDateTime(t.dueAt) : "Без срока"}
                  {overdue ? " · просрочено" : ""}
                </span>
                <PriorityBadge priority={t.priority} />
                {t.status !== "TODO" ? <Badge variant="secondary">{TASK_STATUS_LABELS[t.status]}</Badge> : null}
                {t.isFollowUp ? (
                  <Badge variant="violet">
                    <RotateCcw /> повторный контакт
                  </Badge>
                ) : null}
                {t.assignee ? <span>· {t.assignee.name}</span> : null}
              </div>
            </div>
            {canEdit ? (
              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(t)} aria-label="Редактировать задачу">
                  <Pencil />
                </Button>
                <ConfirmDialog
                  title="Удалить задачу?"
                  destructive
                  confirmLabel="Удалить"
                  onConfirm={() => run(() => deleteTaskAction(t.id))}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Удалить задачу">
                      <Trash />
                    </Button>
                  }
                />
              </div>
            ) : null}
          </div>
        );
      })}
      {editing ? (
        <TaskDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          initial={{ ...editing, companyId: editing.company?.id ?? null }}
        />
      ) : null}
    </div>
  );
}
