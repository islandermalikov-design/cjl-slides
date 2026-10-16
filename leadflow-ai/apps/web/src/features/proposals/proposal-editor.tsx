"use client";

import type { ProposalGeneration } from "@leadflow/shared";
import { Copy, Plus, Save, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { formatMoney } from "@/lib/utils";
import { saveProposalVersionAction } from "./actions";

export function ProposalEditor({ proposalId, initial, canEdit }: { proposalId: string; initial: ProposalGeneration; canEdit: boolean }) {
  const [data, setData] = useState<ProposalGeneration>(initial);
  const { run, pending } = useAction();
  const c = data.content;
  const setC = <K extends keyof ProposalGeneration["content"]>(k: K, v: ProposalGeneration["content"][K]) => setData((d) => ({ ...d, content: { ...d.content, [k]: v } }));
  const setT = (k: keyof ProposalGeneration["texts"], v: string) => setData((d) => ({ ...d, texts: { ...d.texts, [k]: v } }));
  const priceSum = c.priceItems.reduce((s, p) => s + (Number.isFinite(p.price) ? p.price : 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Содержание КП</CardTitle>
          {canEdit ? (
            <Button onClick={() => run(() => saveProposalVersionAction(proposalId, data))} disabled={pending}>
              <Save /> {pending ? "Сохранение…" : "Сохранить как новую версию"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Заголовок" className="md:col-span-2">
            <Input value={c.title} onChange={(e) => setC("title", e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Подзаголовок">
            <Input value={c.subtitle} onChange={(e) => setC("subtitle", e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Клиент">
            <Input value={c.clientName} onChange={(e) => setC("clientName", e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Описание задачи" className="md:col-span-2">
            <Textarea rows={4} value={c.problem} onChange={(e) => setC("problem", e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Предлагаемое решение" className="md:col-span-2">
            <Textarea rows={5} value={c.solution} onChange={(e) => setC("solution", e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Возможности (по одной на строку)" className="md:col-span-2">
            <Textarea rows={5} value={c.features.join("\n")} onChange={(e) => setC("features", e.target.value.split("\n"))} onBlur={() => setC("features", c.features.map((f) => f.trim()).filter(Boolean))} disabled={!canEdit} />
          </Field>

          <div className="md:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[13px] font-medium">Этапы работы</div>
              {canEdit ? (
                <Button variant="ghost" size="sm" onClick={() => setC("stages", [...c.stages, { title: "Новый этап", description: "", durationDays: 1 }])}>
                  <Plus /> Этап
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              {c.stages.map((s, i) => (
                <div key={i} className="grid gap-2 rounded-[10px] border p-2.5 sm:grid-cols-[1fr_2fr_90px_auto]">
                  <Input value={s.title} aria-label="Название этапа" onChange={(e) => setC("stages", c.stages.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} disabled={!canEdit} />
                  <Input value={s.description} aria-label="Описание этапа" onChange={(e) => setC("stages", c.stages.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} disabled={!canEdit} />
                  <Input type="number" min={0} value={s.durationDays} aria-label="Дней" onChange={(e) => setC("stages", c.stages.map((x, j) => (j === i ? { ...x, durationDays: Math.max(0, Number(e.target.value) || 0) } : x)))} disabled={!canEdit} />
                  {canEdit ? (
                    <Button variant="ghost" size="icon" aria-label="Удалить этап" onClick={() => setC("stages", c.stages.filter((_, j) => j !== i))}>
                      <Trash />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[13px] font-medium">Стоимость</div>
              {canEdit ? (
                <Button variant="ghost" size="sm" onClick={() => setC("priceItems", [...c.priceItems, { name: "Позиция", price: 0, comment: "" }])}>
                  <Plus /> Позиция
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              {c.priceItems.map((p, i) => (
                <div key={i} className="grid gap-2 rounded-[10px] border p-2.5 sm:grid-cols-[2fr_1.5fr_120px_auto]">
                  <Input value={p.name} aria-label="Позиция" onChange={(e) => setC("priceItems", c.priceItems.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} disabled={!canEdit} />
                  <Input value={p.comment} aria-label="Комментарий" placeholder="Комментарий" onChange={(e) => setC("priceItems", c.priceItems.map((x, j) => (j === i ? { ...x, comment: e.target.value } : x)))} disabled={!canEdit} />
                  <Input type="number" min={0} value={p.price} aria-label="Цена" onChange={(e) => setC("priceItems", c.priceItems.map((x, j) => (j === i ? { ...x, price: Math.max(0, Math.round(Number(e.target.value) || 0)) } : x)))} disabled={!canEdit} />
                  {canEdit ? (
                    <Button variant="ghost" size="icon" aria-label="Удалить позицию" onClick={() => setC("priceItems", c.priceItems.filter((_, j) => j !== i))}>
                      <Trash />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Сумма позиций: {formatMoney(priceSum)}</div>
          </div>
          <Field label="Итого, ₽">
            <Input type="number" min={0} value={c.totalPrice} onChange={(e) => setC("totalPrice", Math.max(0, Math.round(Number(e.target.value) || 0)))} disabled={!canEdit} />
          </Field>
          <Field label="Срок, дней">
            <Input type="number" min={0} max={365} value={c.durationDays} onChange={(e) => setC("durationDays", Math.min(365, Math.max(0, Number(e.target.value) || 0)))} disabled={!canEdit} />
          </Field>
          <Field label="Призыв к следующему шагу" className="md:col-span-2">
            <Textarea rows={2} value={c.nextStep} onChange={(e) => setC("nextStep", e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Допущения и оговорки (по одной на строку)" className="md:col-span-2">
            <Textarea rows={3} value={c.assumptions.join("\n")} onChange={(e) => setC("assumptions", e.target.value.split("\n"))} onBlur={() => setC("assumptions", c.assumptions.map((f) => f.trim()).filter(Boolean))} disabled={!canEdit} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
            <Field label="Контакт: имя">
              <Input value={c.contacts.name} onChange={(e) => setC("contacts", { ...c.contacts, name: e.target.value })} disabled={!canEdit} />
            </Field>
            <Field label="Контакт: email">
              <Input value={c.contacts.email} onChange={(e) => setC("contacts", { ...c.contacts, email: e.target.value })} disabled={!canEdit} />
            </Field>
            <Field label="Контакт: телефон">
              <Input value={c.contacts.phone} onChange={(e) => setC("contacts", { ...c.contacts, phone: e.target.value })} disabled={!canEdit} />
            </Field>
            <Field label="Контакт: сайт">
              <Input value={c.contacts.website} onChange={(e) => setC("contacts", { ...c.contacts, website: e.target.value })} disabled={!canEdit} />
            </Field>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Тексты для коммуникации</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["firstMessage", "Короткое первое сообщение", 4],
              ["messengerText", "Вариант для мессенджера", 4],
              ["emailSubject", "Тема email", 1],
              ["emailBody", "Email", 8],
              ["interestedReply", "Ответ на заинтересованность", 4],
              ["priceObjectionReply", "Ответ на возражение по цене", 4],
            ] as const
          ).map(([key, label, rows]) => (
            <Field key={key} label={label} className={key === "emailBody" ? "md:col-span-2" : key === "emailSubject" ? "md:col-span-2" : ""}>
              <div className="relative">
                {rows === 1 ? (
                  <Input value={data.texts[key]} onChange={(e) => setT(key, e.target.value)} disabled={!canEdit} className="pr-10" />
                ) : (
                  <Textarea rows={rows} value={data.texts[key]} onChange={(e) => setT(key, e.target.value)} disabled={!canEdit} className="pr-10" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1 right-1"
                  aria-label={`Копировать: ${label}`}
                  onClick={async () => {
                    await navigator.clipboard.writeText(data.texts[key]);
                    toast.success("Скопировано");
                  }}
                >
                  <Copy />
                </Button>
              </div>
            </Field>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
