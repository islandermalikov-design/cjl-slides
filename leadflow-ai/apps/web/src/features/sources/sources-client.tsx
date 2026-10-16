"use client";

import { SOURCE_TYPE_LABELS, type SourceTypeValue } from "@leadflow/shared";
import { Bot, Pencil, Plus, Power, PowerOff, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DemoBadge } from "@/components/common/badges";
import { Field } from "@/components/common/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { formatDateTime } from "@/lib/utils";
import { checkRobotsAction, deleteSourceAction, setSourceStatusAction, upsertSourceAction } from "./actions";

export interface SourceRow {
  id: string;
  name: string;
  type: SourceTypeValue;
  adapterKey: string;
  baseUrl: string | null;
  status: "PENDING_REVIEW" | "ACTIVE" | "DISABLED";
  robotsChecked: boolean;
  termsReviewed: boolean;
  legalBasis: string | null;
  notes: string | null;
  lastRunAt: string | null;
  isDemo: boolean;
  evidenceCount: number;
  runs: number;
}

const TYPES = ["WEBSITE", "OFFICIAL_API", "CATALOG", "PROVIDER", "CSV_IMPORT", "XLSX_IMPORT", "MANUAL"] as const;

function SourceDialog({ initial, adapters, onClose }: { initial?: SourceRow; adapters: Array<{ key: string; name: string }>; onClose: () => void }) {
  const [v, setV] = useState({
    name: initial?.name ?? "",
    type: (initial?.type ?? "WEBSITE") as (typeof TYPES)[number],
    adapterKey: initial?.adapterKey ?? adapters[0]?.key ?? "website",
    baseUrl: initial?.baseUrl ?? "",
    legalBasis: initial?.legalBasis ?? "",
    notes: initial?.notes ?? "",
    robotsChecked: initial?.robotsChecked ?? false,
    termsReviewed: initial?.termsReviewed ?? false,
  });
  const { run, pending } = useAction();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Источник данных" : "Новый источник данных"}</DialogTitle>
          <DialogDescription>Подключайте только официальные API, разрешённые каталоги и публичные корпоративные сайты. Перед активацией проверьте robots.txt и условия использования.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Название *" className="sm:col-span-2">
            <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <Field label="Тип">
            <Select value={v.type} onValueChange={(t) => setV({ ...v, type: t as (typeof TYPES)[number] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {SOURCE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Адаптер">
            <Select value={v.adapterKey} onValueChange={(a) => setV({ ...v, adapterKey: a })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adapters.map((a) => (
                  <SelectItem key={a.key} value={a.key}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Базовый URL" className="sm:col-span-2">
            <Input value={v.baseUrl} onChange={(e) => setV({ ...v, baseUrl: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Основание использования данных *" className="sm:col-span-2" hint="Например: официальный API по договору / публичные контакты на сайтах компаний, robots.txt разрешает">
            <Textarea rows={2} value={v.legalBasis} onChange={(e) => setV({ ...v, legalBasis: e.target.value })} />
          </Field>
          <Field label="Заметки" className="sm:col-span-2">
            <Textarea rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
          </Field>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <Checkbox checked={v.robotsChecked} onCheckedChange={(c) => setV({ ...v, robotsChecked: Boolean(c) })} className="mt-0.5" /> robots.txt проверен и разрешает сбор нужных страниц
          </label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <Checkbox checked={v.termsReviewed} onCheckedChange={(c) => setV({ ...v, termsReviewed: Boolean(c) })} className="mt-0.5" /> Условия использования источника проверены, автоматизированный доступ не запрещён
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button disabled={pending || !v.name.trim()} onClick={() => run(() => upsertSourceAction(v, initial?.id), { onSuccess: onClose })}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SourcesList({ sources, adapters, canAdmin }: { sources: SourceRow[]; adapters: Array<{ key: string; name: string }>; canAdmin: boolean }) {
  const [editing, setEditing] = useState<SourceRow | null>(null);
  const [creating, setCreating] = useState(false);
  const { run, pending } = useAction();
  return (
    <div className="flex flex-col gap-4">
      {canAdmin ? (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus /> Подключить источник
          </Button>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {sources.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-semibold">
                    {s.name} {s.isDemo ? <DemoBadge /> : null}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {SOURCE_TYPE_LABELS[s.type]} · адаптер «{s.adapterKey}»{s.baseUrl ? ` · ${s.baseUrl}` : ""}
                  </div>
                </div>
                <Badge variant={s.status === "ACTIVE" ? "success" : s.status === "DISABLED" ? "secondary" : "warning"}>
                  {s.status === "ACTIVE" ? "Активен" : s.status === "DISABLED" ? "Отключён" : "Требует проверки"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant={s.robotsChecked ? "success" : "outline"}>{s.robotsChecked ? "robots.txt проверен" : "robots.txt не проверен"}</Badge>
                <Badge variant={s.termsReviewed ? "success" : "outline"}>{s.termsReviewed ? "Условия проверены" : "Условия не проверены"}</Badge>
                <Badge variant="secondary">запусков: {s.runs}</Badge>
                <Badge variant="secondary">фактов: {s.evidenceCount}</Badge>
              </div>
              {s.legalBasis ? <div className="text-[13px]"><span className="text-muted-foreground">Основание: </span>{s.legalBasis}</div> : <div className="text-[13px] text-amber-700 dark:text-amber-400">Основание использования не указано</div>}
              {s.notes ? <div className="text-xs text-muted-foreground">{s.notes}</div> : null}
              <div className="text-xs text-muted-foreground">Последний запуск: {formatDateTime(s.lastRunAt)}</div>
              {canAdmin ? (
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {s.status !== "ACTIVE" ? (
                    <Button size="sm" variant="success" disabled={pending} onClick={() => run(() => setSourceStatusAction(s.id, "ACTIVE"))}>
                      <Power /> Активировать
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setSourceStatusAction(s.id, "DISABLED"))}>
                      <PowerOff /> Отключить
                    </Button>
                  )}
                  {s.baseUrl && (s.type === "WEBSITE" || s.type === "CATALOG") ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(() => checkRobotsAction(s.id), {
                          onSuccess: (d) => {
                            const r = d as { allowed: boolean; message: string };
                            (r.allowed ? toast.success : toast.error)(r.message);
                          },
                        })
                      }
                    >
                      <Bot /> Проверить robots.txt
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                    <Pencil /> Изменить
                  </Button>
                  <ConfirmDialog
                    title={`Удалить источник «${s.name}»?`}
                    description="Факты, собранные из источника, сохранятся в карточках компаний."
                    destructive
                    confirmLabel="Удалить"
                    onConfirm={() => run(() => deleteSourceAction(s.id))}
                    trigger={
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash /> Удалить
                      </Button>
                    }
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
      {creating ? <SourceDialog adapters={adapters} onClose={() => setCreating(false)} /> : null}
      {editing ? <SourceDialog initial={editing} adapters={adapters} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
