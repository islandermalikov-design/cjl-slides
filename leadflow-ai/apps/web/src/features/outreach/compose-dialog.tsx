"use client";

import { CONSENT_BASES, CONSENT_BASIS_LABELS, MESSAGE_CHANNELS, MESSAGE_CHANNEL_LABELS, formatPhone, type OutreachTexts } from "@leadflow/shared";
import { Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createDraftAction, generateTextsAction } from "./actions";

export interface ComposeTarget {
  company: { id: string; name: string; publicEmail: string | null; publicPhone: string | null };
  contacts: Array<{ id: string; fullName: string; email: string | null; phone: string | null; isPublicBusiness: boolean }>;
  proposalId: string | null;
}

export function ComposeDialog({ target, onClose }: { target: ComposeTarget; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [channel, setChannel] = useState<(typeof MESSAGE_CHANNELS)[number]>("EMAIL");
  const recipients = [
    ...(target.company.publicEmail ? [{ value: target.company.publicEmail, label: `${target.company.publicEmail} (публичный email компании)`, kind: "email", contactId: null }] : []),
    ...(target.company.publicPhone ? [{ value: target.company.publicPhone, label: `${formatPhone(target.company.publicPhone)} (публичный телефон)`, kind: "phone", contactId: null }] : []),
    ...target.contacts.flatMap((c) => [
      ...(c.email ? [{ value: c.email, label: `${c.fullName}: ${c.email}`, kind: "email", contactId: c.id }] : []),
      ...(c.phone ? [{ value: c.phone, label: `${c.fullName}: ${formatPhone(c.phone)}`, kind: "phone", contactId: c.id }] : []),
    ]),
  ];
  const forChannel = recipients.filter((r) => (channel === "EMAIL" ? r.kind === "email" : r.kind === "phone"));
  const [recipient, setRecipient] = useState(forChannel[0]?.value ?? "");
  const [basis, setBasis] = useState<(typeof CONSENT_BASES)[number]>("LEGITIMATE_INTEREST_B2B");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [texts, setTexts] = useState<OutreachTexts | null>(null);
  const [generatedBy, setGeneratedBy] = useState<"MANUAL" | "AI" | "TEMPLATE">("MANUAL");
  const [loading, setLoading] = useState(false);

  const applyTexts = (t: OutreachTexts, ch: string) => {
    if (ch === "EMAIL") {
      setSubject(t.emailSubject);
      setBody(t.emailBody);
    } else {
      setSubject("");
      setBody(ch === "PHONE" ? t.firstMessage : t.messengerText);
    }
  };

  const generate = async () => {
    setLoading(true);
    const res = await generateTextsAction(target.company.id, target.proposalId);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setTexts(res.data.texts);
    setGeneratedBy(res.data.generatedBy === "AI" ? "AI" : "TEMPLATE");
    applyTexts(res.data.texts, channel);
    toast.success(res.data.generatedBy === "AI" ? "Тексты сгенерированы AI" : "Тексты подготовлены по шаблону");
  };

  const create = async () => {
    setLoading(true);
    const contactId = recipients.find((r) => r.value === recipient)?.contactId ?? null;
    const res = await createDraftAction(
      { companyId: target.company.id, contactId, proposalId: target.proposalId, channel, recipient, subject: channel === "EMAIL" ? subject : null, body, legalBasis: basis },
      generatedBy,
    );
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Черновик создан");
    onClose();
    router.push(`${pathname}?draft=${(res.data as { id: string }).id}`);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Новое сообщение · {target.company.name}</DialogTitle>
          <DialogDescription>Черновик не отправляется автоматически: его нужно проверить, согласовать и отправить с явным подтверждением.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Канал">
            <Select
              value={channel}
              onValueChange={(v) => {
                const ch = v as (typeof MESSAGE_CHANNELS)[number];
                setChannel(ch);
                const list = recipients.filter((r) => (ch === "EMAIL" ? r.kind === "email" : r.kind === "phone"));
                setRecipient(list[0]?.value ?? "");
                if (texts) applyTexts(texts, ch);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {MESSAGE_CHANNEL_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Основание для обращения">
            <Select value={basis} onValueChange={(v) => setBasis(v as typeof basis)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONSENT_BASES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {CONSENT_BASIS_LABELS[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Получатель" className="sm:col-span-2" hint="Только опубликованные деловые контакты из карточки компании">
            {forChannel.length ? (
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger aria-label="Получатель">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {forChannel.map((r) => (
                    <SelectItem key={`${r.contactId}-${r.value}`} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={channel === "EMAIL" ? "email" : "телефон"} />
            )}
          </Field>
          {forChannel.length === 0 ? (
            <Alert variant="warning" className="sm:col-span-2">
              <AlertDescription>У компании нет опубликованного контакта для этого канала. Добавьте контакт с источником в карточке компании — иначе проверка законности не пройдёт.</AlertDescription>
            </Alert>
          ) : null}
          {channel === "EMAIL" ? (
            <Field label="Тема" className="sm:col-span-2">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
          ) : null}
          <Field label="Текст" className="sm:col-span-2">
            <Textarea rows={9} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Текст сообщения" />
          </Field>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={generate} disabled={loading}>
            <Sparkles /> {target.proposalId ? "Взять тексты из КП" : "Сгенерировать черновик"}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={create} disabled={loading || !body.trim()}>
              Создать черновик
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
