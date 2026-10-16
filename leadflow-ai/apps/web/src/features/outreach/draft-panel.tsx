"use client";

import { CONSENT_BASES, CONSENT_BASIS_LABELS, MESSAGE_CHANNEL_LABELS, type ConsentBasisValue, type MessageChannelValue, type MessageStatusValue } from "@leadflow/shared";
import { Ban, CircleAlert, CircleCheck, MailCheck, MessageSquareReply, Send, ShieldCheck, TriangleAlert, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DemoBadge, MessageStatusBadge } from "@/components/common/badges";
import { Field } from "@/components/common/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { formatDateTime } from "@/lib/utils";
import {
  approveDraftAction,
  complianceAction,
  deleteDraftAction,
  markDeliveredAction,
  optOutAction,
  recordReplyAction,
  rejectDraftAction,
  sendDraftAction,
  submitDraftAction,
  updateDraftAction,
} from "./actions";

export interface DraftView {
  id: string;
  status: MessageStatusValue;
  channel: MessageChannelValue;
  recipient: string | null;
  subject: string | null;
  body: string;
  legalBasis: ConsentBasisValue | null;
  isFirstContact: boolean;
  generatedBy: string;
  reviewNote: string | null;
  reviewedBy: string | null;
  createdBy: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  lastError: string | null;
  isDemo: boolean;
  company: { id: string; name: string };
  contactName: string | null;
  messages: Array<{ id: string; direction: "INBOUND" | "OUTBOUND"; body: string; subject: string | null; status: string; isSimulated: boolean; createdAt: string; error: string | null }>;
}

type Issue = { level: "block" | "warn"; message: string };
const EDITABLE: MessageStatusValue[] = ["DRAFT", "PENDING_REVIEW", "APPROVED", "FAILED"];

export function DraftPanel({ draft, canEdit, deliveryMode }: { draft: DraftView; canEdit: boolean; deliveryMode: "simulated" | "smtp" | "manual" }) {
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body);
  const [recipient, setRecipient] = useState(draft.recipient ?? "");
  const [basis, setBasis] = useState<ConsentBasisValue | "">(draft.legalBasis ?? "");
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [manualDone, setManualDone] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [replyTask, setReplyTask] = useState(true);
  const [replyOptOut, setReplyOptOut] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const { run: runAction, pending } = useAction();
  const router = useRouter();
  // После любого действия остаёмся на этом сообщении, даже если фильтр статуса его скрывает.
  const run: typeof runAction = (fn, opts = {}) =>
    runAction(fn, {
      ...opts,
      onSuccess: (d) => {
        opts.onSuccess?.(d);
        router.replace(`/messages?draft=${draft.id}`);
      },
    });
  const editable = canEdit && EDITABLE.includes(draft.status);
  const dirty = subject !== (draft.subject ?? "") || body !== draft.body || recipient !== (draft.recipient ?? "") || basis !== (draft.legalBasis ?? "");

  useEffect(() => {
    let cancelled = false;
    complianceAction(draft.id).then((res) => {
      if (!cancelled && res.ok) setIssues(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [draft.id, draft.status, draft.body, draft.recipient, draft.legalBasis]);

  const blocking = issues?.filter((i) => i.level === "block") ?? [];
  const save = () => run(() => updateDraftAction(draft.id, { channel: draft.channel, recipient, subject: draft.channel === "EMAIL" ? subject : null, body, legalBasis: basis || null }));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex flex-wrap items-center gap-2">
              <Link href={`/companies/${draft.company.id}`} className="hover:text-primary hover:underline">
                {draft.company.name}
              </Link>
              <MessageStatusBadge status={draft.status} />
              {draft.isDemo ? <DemoBadge /> : null}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge variant="secondary">{MESSAGE_CHANNEL_LABELS[draft.channel]}</Badge>
              <Badge variant="outline">{draft.isFirstContact ? "Первое обращение" : "Повторное"}</Badge>
              <Badge variant={draft.generatedBy === "AI" ? "default" : "outline"}>{draft.generatedBy === "AI" ? "AI" : draft.generatedBy === "TEMPLATE" ? "Шаблон" : "Вручную"}</Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {draft.createdBy ? `Автор: ${draft.createdBy}` : ""}
            {draft.reviewedBy ? ` · проверил: ${draft.reviewedBy}` : ""}
            {draft.approvedAt ? ` · согласовано ${formatDateTime(draft.approvedAt)}` : ""}
            {draft.sentAt ? ` · отправлено ${formatDateTime(draft.sentAt)}` : ""}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {draft.reviewNote && draft.status === "DRAFT" ? (
            <Alert variant="warning">
              <Undo2 />
              <div>
                <AlertTitle>Возвращено на доработку</AlertTitle>
                <AlertDescription>{draft.reviewNote}</AlertDescription>
              </div>
            </Alert>
          ) : null}
          {draft.lastError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{draft.lastError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Получатель">
              <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} disabled={!editable} />
            </Field>
            <Field label="Основание">
              <Select value={basis || "__none"} onValueChange={(v) => setBasis(v === "__none" ? "" : (v as ConsentBasisValue))} disabled={!editable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Не указано</SelectItem>
                  {CONSENT_BASES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {CONSENT_BASIS_LABELS[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {draft.channel === "EMAIL" ? (
              <Field label="Тема" className="sm:col-span-2">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!editable} />
              </Field>
            ) : null}
            <Field label="Текст" className="sm:col-span-2">
              <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} disabled={!editable} />
            </Field>
          </div>
          {editable && dirty ? (
            <div className="flex items-center justify-between rounded-[10px] bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              Изменения сбросят согласование.
              <Button size="sm" onClick={save} disabled={pending}>
                Сохранить
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> Проверка законности обращения
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {issues === null ? <div className="text-sm text-muted-foreground">Проверка…</div> : null}
          {issues?.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <CircleCheck className="size-4" /> Нарушений не найдено: адресат не в списке исключений, основание указано, контакт опубликован.
            </div>
          ) : null}
          {issues?.map((i, idx) => (
            <div key={idx} className={`flex items-start gap-2 text-sm ${i.level === "block" ? "text-destructive" : "text-amber-700 dark:text-amber-400"}`}>
              {i.level === "block" ? <Ban className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
              {i.message}
            </div>
          ))}
        </CardContent>
      </Card>

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          {draft.status === "DRAFT" || draft.status === "FAILED" ? (
            <Button variant="outline" disabled={pending || dirty} onClick={() => run(() => submitDraftAction(draft.id))}>
              На проверку
            </Button>
          ) : null}
          {draft.status === "DRAFT" || draft.status === "PENDING_REVIEW" ? (
            <Button variant="success" disabled={pending || dirty || blocking.length > 0} onClick={() => run(() => approveDraftAction(draft.id))} title={blocking.length ? "Есть блокирующие проблемы" : undefined}>
              <CircleCheck /> Согласовать
            </Button>
          ) : null}
          {draft.status === "PENDING_REVIEW" ? (
            <Button variant="outline" disabled={pending} onClick={() => setRejectOpen(true)}>
              Вернуть на доработку
            </Button>
          ) : null}
          {draft.status === "APPROVED" ? (
            <Button disabled={pending || dirty || blocking.length > 0} onClick={() => { setConfirmed(false); setManualDone(false); setSendOpen(true); }}>
              <Send /> Отправить…
            </Button>
          ) : null}
          {draft.status === "SENT" ? (
            <Button variant="outline" disabled={pending} onClick={() => run(() => markDeliveredAction(draft.id))}>
              <MailCheck /> Доставлено
            </Button>
          ) : null}
          {["SENT", "DELIVERED", "REPLIED"].includes(draft.status) ? (
            <Button variant="outline" disabled={pending} onClick={() => setReplyOpen(true)}>
              <MessageSquareReply /> Зафиксировать ответ
            </Button>
          ) : null}
          {draft.status !== "OPTED_OUT" ? (
            <Button variant="ghost" className="text-destructive" disabled={pending} onClick={() => run(() => optOutAction(draft.id, "Адресат отказался от сообщений"))}>
              <Ban /> Отписка
            </Button>
          ) : null}
          {EDITABLE.includes(draft.status) ? (
            <Button variant="ghost" disabled={pending} onClick={() => run(() => deleteDraftAction(draft.id), { success: "Черновик удалён" })}>
              Удалить черновик
            </Button>
          ) : null}
        </div>
      ) : null}

      {draft.messages.length ? (
        <Card>
          <CardHeader>
            <CardTitle>История переписки</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {draft.messages.map((m) => (
              <div key={m.id} className={`max-w-[90%] rounded-[12px] border p-3 text-sm ${m.direction === "INBOUND" ? "self-start bg-muted/50" : "self-end bg-accent/60"}`}>
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {m.direction === "INBOUND" ? "Ответ" : "Исходящее"} · {formatDateTime(m.createdAt)}
                  {m.isSimulated ? <Badge variant="demo">симуляция</Badge> : null}
                  {m.error ? <Badge variant="destructive">ошибка</Badge> : null}
                </div>
                {m.subject ? <div className="font-medium">{m.subject}</div> : null}
                <div className="whitespace-pre-wrap">{m.body}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение отправки</DialogTitle>
            <DialogDescription>
              Получатель: <b>{draft.recipient}</b> · канал: {MESSAGE_CHANNEL_LABELS[draft.channel]}
            </DialogDescription>
          </DialogHeader>
          <Alert variant={deliveryMode === "smtp" ? "info" : "warning"}>
            <AlertDescription>
              {deliveryMode === "simulated"
                ? "DEMO_MODE: сообщение не будет отправлено наружу — отправка только симулируется и фиксируется в истории."
                : deliveryMode === "smtp"
                  ? "Email будет отправлен через подключённый SMTP-сервер. Отменить отправку будет невозможно."
                  : "Для этого канала нет интеграции. Отправьте сообщение вручную (скопируйте текст), затем подтвердите отправку здесь."}
            </AlertDescription>
          </Alert>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} className="mt-0.5" />
            Я проверил текст и получателя, основание для обращения законно, сообщение не является массовой рассылкой.
          </label>
          {deliveryMode === "manual" ? (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={manualDone} onCheckedChange={(v) => setManualDone(Boolean(v))} className="mt-0.5" />
              Сообщение отправлено мной вручную.
            </label>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>
              Отмена
            </Button>
            <Button
              disabled={pending || !confirmed || (deliveryMode === "manual" && !manualDone)}
              onClick={() => run(() => sendDraftAction(draft.id, { confirm: confirmed, manualConfirmed: manualDone }), { onSuccess: () => setSendOpen(false) })}
            >
              <Send /> {deliveryMode === "manual" ? "Подтвердить отправку" : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ответ клиента</DialogTitle>
            <DialogDescription>Вставьте текст ответа. Статус компании обновится, напоминания «Проверить ответ» закроются.</DialogDescription>
          </DialogHeader>
          <Textarea rows={6} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Текст ответа" />
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={replyTask} onCheckedChange={setReplyTask} /> Создать задачу «Ответить»
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={replyOptOut} onCheckedChange={setReplyOptOut} /> Адресат просит больше не писать (отписка)
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>
              Отмена
            </Button>
            <Button
              disabled={pending || !reply.trim()}
              onClick={() =>
                run(() => recordReplyAction(draft.id, { body: reply, createTask: replyTask, optOut: replyOptOut }), {
                  onSuccess: () => {
                    setReplyOpen(false);
                    setReply("");
                  },
                })
              }
            >
              Сохранить ответ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Вернуть на доработку</DialogTitle>
          </DialogHeader>
          <Textarea rows={4} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Что нужно исправить" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Отмена
            </Button>
            <Button disabled={pending || !rejectNote.trim()} onClick={() => run(() => rejectDraftAction(draft.id, rejectNote), { onSuccess: () => setRejectOpen(false) })}>
              Вернуть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
