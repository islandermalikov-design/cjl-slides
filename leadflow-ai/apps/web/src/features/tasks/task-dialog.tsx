"use client";

import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from "@leadflow/shared";
import { useState } from "react";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { createTaskAction, updateTaskAction } from "./actions";

export interface TaskInitial {
  id?: string;
  title?: string;
  description?: string | null;
  dueAt?: string | null;
  priority?: string;
  status?: string;
  companyId?: string | null;
  dealId?: string | null;
  isFollowUp?: boolean;
}

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskDialog({
  open,
  onOpenChange,
  initial,
  companies,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: TaskInitial;
  companies?: Array<{ id: string; name: string }>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dueAt, setDueAt] = useState(toLocalInput(initial?.dueAt));
  const [priority, setPriority] = useState(initial?.priority ?? "MEDIUM");
  const [status, setStatus] = useState(initial?.status ?? "TODO");
  const [companyId, setCompanyId] = useState(initial?.companyId ?? "");
  const [isFollowUp, setFollowUp] = useState(initial?.isFollowUp ?? false);
  const { run, pending } = useAction();

  const submit = () => {
    const payload = {
      title,
      description,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      priority,
      status,
      companyId: companyId || initial?.companyId || null,
      dealId: initial?.dealId ?? null,
      isFollowUp,
    };
    return run(() => (initial?.id ? updateTaskAction(initial.id, payload) : createTaskAction(payload)), { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Задача" : "Новая задача"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Название *" htmlFor="task-title">
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Позвонить, отправить КП, напомнить…" />
          </Field>
          {companies && !initial?.companyId ? (
            <Field label="Компания">
              <Select value={companyId || "__none"} onValueChange={(v) => setCompanyId(v === "__none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Без компании</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Дедлайн" htmlFor="task-due" className="sm:col-span-1">
              <Input id="task-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </Field>
            <Field label="Приоритет">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {TASK_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Статус">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {TASK_STATUS_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Описание" htmlFor="task-desc">
            <Textarea id="task-desc" rows={3} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isFollowUp} onCheckedChange={setFollowUp} /> Повторный контакт (follow-up)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={pending || !title.trim()}>
            {pending ? "Сохранение…" : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewTaskButton({ companyId, companies, label = "Задача", variant = "outline", size = "sm" }: { companyId?: string; companies?: Array<{ id: string; name: string }>; label?: string; variant?: "outline" | "default"; size?: "sm" | "default" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        + {label}
      </Button>
      {open ? <TaskDialog open={open} onOpenChange={setOpen} initial={{ companyId }} companies={companies} /> : null}
    </>
  );
}
