"use client";

import { CircleCheck, CircleAlert, CircleDashed, KeyRound, RefreshCw, Trash } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/common/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { formatDateTime } from "@/lib/utils";
import { checkIntegrationsAction, deleteCredentialAction, saveAnthropicKeyAction, saveSmtpAction } from "./actions";

export interface IntegrationView {
  provider: string;
  name: string;
  description: string;
  status: "OK" | "ERROR" | "NOT_CONFIGURED" | "CONFIGURED" | "DEMO";
  message: string;
  configurable: boolean;
  secretHint?: string | null;
  lastCheckedAt?: string | null;
  envVar?: string;
}

const STATUS: Record<IntegrationView["status"], { label: string; variant: "success" | "destructive" | "secondary" | "default" | "demo"; icon: React.ReactNode }> = {
  OK: { label: "Работает", variant: "success", icon: <CircleCheck /> },
  ERROR: { label: "Ошибка", variant: "destructive", icon: <CircleAlert /> },
  NOT_CONFIGURED: { label: "Не настроено", variant: "secondary", icon: <CircleDashed /> },
  CONFIGURED: { label: "Настроено", variant: "default", icon: <CircleCheck /> },
  DEMO: { label: "DEMO", variant: "demo", icon: <CircleDashed /> },
};

export function CheckButton() {
  const { run, pending } = useAction();
  return (
    <Button variant="outline" disabled={pending} onClick={() => run(() => checkIntegrationsAction())}>
      <RefreshCw className={pending ? "animate-spin" : ""} /> Проверить все
    </Button>
  );
}

function AnthropicDialog({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState("");
  const { run, pending } = useAction();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ключ Anthropic API</DialogTitle>
          <DialogDescription>Ключ шифруется (AES-256-GCM) и хранится только на сервере. В интерфейсе отображаются лишь последние 4 символа. Ключ из .env имеет приоритет.</DialogDescription>
        </DialogHeader>
        <Field label="API-ключ" hint="Получить: console.anthropic.com → API Keys">
          <Input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button disabled={pending || !key.trim()} onClick={() => run(() => saveAnthropicKeyAction(key), { onSuccess: onClose })}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SmtpDialog({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState({ host: "", port: "587", user: "", from: "", password: "" });
  const { run, pending } = useAction();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>SMTP для отправки email</DialogTitle>
          <DialogDescription>Используйте свой почтовый ящик или сервис транзакционной почты. Пароль хранится в зашифрованном виде.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Сервер">
            <Input value={v.host} onChange={(e) => setV({ ...v, host: e.target.value })} placeholder="smtp.yandex.ru" />
          </Field>
          <Field label="Порт">
            <Input value={v.port} onChange={(e) => setV({ ...v, port: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Логин">
            <Input value={v.user} onChange={(e) => setV({ ...v, user: e.target.value })} />
          </Field>
          <Field label="Пароль">
            <Input type="password" autoComplete="off" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />
          </Field>
          <Field label="От кого (From)" className="sm:col-span-2">
            <Input value={v.from} onChange={(e) => setV({ ...v, from: e.target.value })} placeholder="Иван Иванов <ivan@example.ru>" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button disabled={pending || !v.host || !v.password} onClick={() => run(() => saveSmtpAction(v), { onSuccess: onClose })}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IntegrationCard({ item, canAdmin }: { item: IntegrationView; canAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAction();
  const st = STATUS[item.status];
  const hasStored = Boolean(item.secretHint && item.secretHint !== "из .env");
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="font-semibold">{item.name}</div>
          <Badge variant={st.variant}>
            {st.icon} {st.label}
          </Badge>
        </div>
        <div className="text-[13px] text-muted-foreground">{item.description}</div>
        <div className="rounded-[10px] bg-muted/60 px-3 py-2 text-[13px]">{item.message}</div>
        <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.envVar ? <code className="rounded bg-muted px-1.5 py-0.5">{item.envVar}</code> : null}
          {item.secretHint ? (
            <span className="inline-flex items-center gap-1">
              <KeyRound className="size-3" /> {item.secretHint}
            </span>
          ) : null}
          {item.lastCheckedAt ? <span>проверено {formatDateTime(item.lastCheckedAt)}</span> : null}
        </div>
        {item.configurable && canAdmin ? (
          <div className="flex gap-2 border-t pt-3">
            <Button size="sm" onClick={() => setOpen(true)}>
              {hasStored ? "Заменить" : "Настроить"}
            </Button>
            {hasStored ? (
              <Button size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={() => run(() => deleteCredentialAction(item.provider))}>
                <Trash /> Удалить
              </Button>
            ) : null}
          </div>
        ) : null}
        {open && item.provider === "ANTHROPIC" ? <AnthropicDialog onClose={() => setOpen(false)} /> : null}
        {open && item.provider === "SMTP" ? <SmtpDialog onClose={() => setOpen(false)} /> : null}
      </CardContent>
    </Card>
  );
}
