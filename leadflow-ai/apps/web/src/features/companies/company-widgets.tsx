"use client";

import { CRM_STATUSES, CRM_STATUS_LABELS, SCORE_CRITERIA_LABELS, SCORE_CRITERIA_WEIGHTS, formatPhone, type CrmStatusValue } from "@leadflow/shared";
import { ExternalLink, Globe, Pencil, RefreshCw, Sparkles, Trash } from "lucide-react";
import { useState } from "react";
import { CRM_STATUS_DOT } from "@/components/common/badges";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field } from "@/components/common/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import {
  addNoteAction,
  deleteContactAction,
  enrichCompanyAction,
  scoreCompanyAction,
  setStatusAction,
  updateNextStepAction,
  upsertContactAction,
} from "./actions";

export function StatusSelect({ companyId, status, disabled }: { companyId: string; status: CrmStatusValue; disabled?: boolean }) {
  const { run, pending } = useAction();
  return (
    <Select value={status} disabled={disabled || pending} onValueChange={(v) => run(() => setStatusAction(companyId, v), { success: `Статус: ${CRM_STATUS_LABELS[v as CrmStatusValue]}` })}>
      <SelectTrigger className="w-[200px]" aria-label="Статус в CRM">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CRM_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            <span className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", CRM_STATUS_DOT[s])} />
              {CRM_STATUS_LABELS[s]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AnalyzeButton({ companyId, hasScore, size = "sm" }: { companyId: string; hasScore: boolean; size?: "sm" | "default" }) {
  const { run, pending } = useAction();
  return (
    <Button size={size} onClick={() => run(() => scoreCompanyAction(companyId, true))} disabled={pending}>
      {hasScore ? <RefreshCw className={cn(pending && "animate-spin")} /> : <Sparkles />}
      {pending ? "Анализ…" : hasScore ? "Повторный анализ" : "AI-анализ"}
    </Button>
  );
}

export function EnrichButton({ companyId, disabled }: { companyId: string; disabled?: boolean }) {
  const { run, pending } = useAction();
  return (
    <Button size="sm" variant="outline" disabled={pending || disabled} onClick={() => run(() => enrichCompanyAction(companyId))} title={disabled ? "У компании не указан сайт" : "Собрать опубликованные данные с сайта компании"}>
      <Globe /> {pending ? "Сбор…" : "Обогатить с сайта"}
    </Button>
  );
}

interface ScoreView {
  score: number;
  summary: string | null;
  breakdown: Array<{ criterion: keyof typeof SCORE_CRITERIA_LABELS; points: number; comment: string }>;
  reasons: string[];
  facts: Array<{ statement: string; sourceUrl: string | null }>;
  hypotheses: string[];
  recommendations: string[];
  unknowns: string[];
  clientTasks: string[];
  recommendedProduct: string | null;
  recommendedTier: string | null;
  generatedBy: string;
  model: string;
  createdAt: string;
}

export function ScorePanel({ score }: { score: ScoreView }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-soft">
          <span className="text-2xl leading-none font-semibold tabular-nums">{score.score}</span>
          <span className="text-[10px] opacity-80">из 100</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm">{score.summary}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={score.generatedBy === "AI" ? "default" : "demo"}>{score.generatedBy === "AI" ? `Claude · ${score.model}` : "DEMO: эвристика без AI"}</Badge>
            {score.recommendedTier ? <Badge variant="violet">Пакет {score.recommendedTier}</Badge> : null}
            <Badge variant="secondary">{formatDateTime(score.createdAt)}</Badge>
          </div>
        </div>
      </div>
      <div className="grid gap-2.5">
        {score.breakdown.map((b) => {
          const max = SCORE_CRITERIA_WEIGHTS[b.criterion];
          return (
            <div key={b.criterion}>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span>{SCORE_CRITERIA_LABELS[b.criterion]}</span>
                <span className="text-muted-foreground tabular-nums">
                  {b.points} / {max}
                </span>
              </div>
              <Progress value={(b.points / max) * 100} />
              {b.comment ? <div className="mt-0.5 text-xs text-muted-foreground">{b.comment}</div> : null}
            </div>
          );
        })}
      </div>
      {score.recommendedProduct ? (
        <div className="rounded-[12px] border border-blue-200 bg-blue-50/70 p-3 text-sm dark:border-blue-500/30 dark:bg-blue-500/10">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300">Рекомендуемый продукт</div>
          <div className="mt-0.5 font-medium">{score.recommendedProduct}</div>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <ListBlock title="Факты" tone="green" items={score.facts.map((f) => ({ text: f.statement, url: f.sourceUrl }))} empty="Подтверждённых фактов нет" />
        <ListBlock title="Причины оценки" tone="blue" items={score.reasons.map((t) => ({ text: t }))} />
        <ListBlock title="Гипотезы" tone="amber" items={score.hypotheses.map((t) => ({ text: t }))} />
        <ListBlock title="Рекомендации" tone="violet" items={score.recommendations.map((t) => ({ text: t }))} />
        <ListBlock title="Предполагаемые задачи клиента" tone="blue" items={score.clientTasks.map((t) => ({ text: t }))} />
        <ListBlock title="Неизвестно" tone="slate" items={score.unknowns.map((t) => ({ text: t }))} />
      </div>
    </div>
  );
}

function ListBlock({ title, items, tone, empty = "—" }: { title: string; items: Array<{ text: string; url?: string | null }>; tone: "green" | "blue" | "amber" | "violet" | "slate"; empty?: string }) {
  const dot = { green: "bg-green-500", blue: "bg-blue-500", amber: "bg-amber-500", violet: "bg-violet-500", slate: "bg-slate-400" }[tone];
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</div>
      {items.length === 0 ? <div className="text-sm text-muted-foreground">{empty}</div> : null}
      <ul className="flex flex-col gap-1.5">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-2 text-[13px] leading-snug">
            <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", dot)} />
            <span>
              {i.text}
              {i.url ? (
                <a href={i.url} target="_blank" rel="noopener noreferrer nofollow" className="ml-1 inline-flex items-center text-primary hover:underline">
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NextStepCard({ companyId, nextStep, nextStepAt, disabled }: { companyId: string; nextStep: string | null; nextStepAt: string | null; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(nextStep ?? "");
  const [date, setDate] = useState(nextStepAt?.slice(0, 10) ?? "");
  const { run, pending } = useAction();
  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{nextStep ?? <span className="font-normal text-muted-foreground">Не задан</span>}</div>
          {nextStepAt ? <div className="mt-0.5 text-xs text-muted-foreground">до {formatDate(nextStepAt)}</div> : null}
        </div>
        {!disabled ? (
          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)} aria-label="Изменить следующий шаг">
            <Pencil />
          </Button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Например: созвон в четверг" autoFocus />
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => updateNextStepAction(companyId, text || null, date || null), { onSuccess: () => setEditing(false) })}>
          Сохранить
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Отмена
        </Button>
      </div>
    </div>
  );
}

export function NoteForm({ companyId }: { companyId: string }) {
  const [text, setText] = useState("");
  const { run, pending } = useAction();
  return (
    <div className="flex flex-col gap-2">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Заметка: итоги звонка, договорённости…" />
      <div className="flex justify-end">
        <Button size="sm" disabled={pending || !text.trim()} onClick={() => run(() => addNoteAction(companyId, text), { onSuccess: () => setText("") })}>
          Добавить заметку
        </Button>
      </div>
    </div>
  );
}

export interface ContactView {
  id: string;
  fullName: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  isPublicBusiness: boolean;
  sourceUrl: string | null;
  verifiedAt: string | null;
  notes: string | null;
}

export function ContactDialog({ open, onOpenChange, companyId, initial }: { open: boolean; onOpenChange: (v: boolean) => void; companyId: string; initial?: ContactView }) {
  const [v, setV] = useState({
    fullName: initial?.fullName ?? "",
    position: initial?.position ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ? formatPhone(initial.phone) : "",
    isPublicBusiness: initial?.isPublicBusiness ?? true,
    sourceUrl: initial?.sourceUrl ?? "",
    notes: initial?.notes ?? "",
  });
  const { run, pending } = useAction();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Контакт" : "Новый контакт"}</DialogTitle>
          <DialogDescription>Только деловые контакты, опубликованные компанией. Не добавляйте личные данные без законного основания.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Имя или подразделение *" htmlFor="c-name" className="sm:col-span-2">
            <Input id="c-name" value={v.fullName} onChange={set("fullName")} placeholder="Отдел продаж" />
          </Field>
          <Field label="Должность" htmlFor="c-pos">
            <Input id="c-pos" value={v.position} onChange={set("position")} />
          </Field>
          <Field label="Email" htmlFor="c-email">
            <Input id="c-email" type="email" value={v.email} onChange={set("email")} />
          </Field>
          <Field label="Телефон" htmlFor="c-phone">
            <Input id="c-phone" type="tel" value={v.phone} onChange={set("phone")} />
          </Field>
          <Field label="URL источника" htmlFor="c-src">
            <Input id="c-src" value={v.sourceUrl} onChange={set("sourceUrl")} placeholder="https://…/contacts" />
          </Field>
          <Field label="Заметки" htmlFor="c-notes" className="sm:col-span-2">
            <Textarea id="c-notes" rows={2} value={v.notes} onChange={set("notes")} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Switch checked={v.isPublicBusiness} onCheckedChange={(c) => setV((s) => ({ ...s, isPublicBusiness: c }))} />
            Контакт опубликован компанией как деловой
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button disabled={pending || !v.fullName.trim()} onClick={() => run(() => upsertContactAction({ ...v, companyId }, initial?.id), { onSuccess: () => onOpenChange(false) })}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ContactsList({ companyId, contacts, canEdit }: { companyId: string; contacts: ContactView[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<ContactView | null>(null);
  const [creating, setCreating] = useState(false);
  const { run } = useAction();
  return (
    <div className="flex flex-col gap-2">
      {contacts.length === 0 ? <div className="text-sm text-muted-foreground">Контактов пока нет</div> : null}
      {contacts.map((c) => (
        <div key={c.id} className="group flex items-start justify-between gap-2 rounded-[10px] border p-3">
          <div className="min-w-0 text-sm">
            <div className="font-medium">
              {c.fullName}
              {c.position ? <span className="font-normal text-muted-foreground"> · {c.position}</span> : null}
            </div>
            <div className="mt-0.5 flex flex-col text-[13px] text-muted-foreground">
              {c.email ? <span>{c.email}</span> : null}
              {c.phone ? <span>{formatPhone(c.phone)}</span> : null}
              {c.sourceUrl ? (
                <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="size-3" /> источник · {formatDate(c.verifiedAt)}
                </a>
              ) : (
                <span className="text-xs text-amber-600">Источник не указан</span>
              )}
            </div>
          </div>
          {canEdit ? (
            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)} aria-label="Изменить контакт">
                <Pencil />
              </Button>
              <ConfirmDialog
                title="Удалить контакт?"
                destructive
                confirmLabel="Удалить"
                onConfirm={() => run(() => deleteContactAction(c.id))}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label="Удалить контакт">
                    <Trash />
                  </Button>
                }
              />
            </div>
          ) : null}
        </div>
      ))}
      {canEdit ? (
        <Button variant="outline" size="sm" className="self-start" onClick={() => setCreating(true)}>
          + Контакт
        </Button>
      ) : null}
      {creating ? <ContactDialog open={creating} onOpenChange={setCreating} companyId={companyId} /> : null}
      {editing ? <ContactDialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)} companyId={companyId} initial={editing} /> : null}
    </div>
  );
}
