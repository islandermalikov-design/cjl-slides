"use client";

import { useState } from "react";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { createDealAction, updateDealAction } from "./actions";

export interface DealOptions {
  stages: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string; priceFrom: number }>;
  companies?: Array<{ id: string; name: string }>;
}

export interface DealInitial {
  id?: string;
  companyId?: string;
  title?: string;
  amount?: number;
  stageId?: string | null;
  serviceId?: string | null;
  expectedCloseAt?: string | null;
  notes?: string | null;
}

export function DealDialog({ open, onOpenChange, initial, options }: { open: boolean; onOpenChange: (v: boolean) => void; initial?: DealInitial; options: DealOptions }) {
  const [companyId, setCompanyId] = useState(initial?.companyId ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [amount, setAmount] = useState(String(initial?.amount ?? ""));
  const [stageId, setStageId] = useState(initial?.stageId ?? options.stages[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(initial?.serviceId ?? "");
  const [expected, setExpected] = useState(initial?.expectedCloseAt?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const { run, pending } = useAction();

  const submit = () => {
    const payload = {
      companyId,
      title,
      amount: Number(amount || 0),
      stageId: stageId || null,
      serviceId: serviceId || null,
      expectedCloseAt: expected || null,
      notes,
    };
    return run(() => (initial?.id ? updateDealAction(initial.id, payload) : createDealAction(payload)), { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Сделка" : "Новая сделка"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {options.companies && !initial?.companyId ? (
            <Field label="Компания *" className="sm:col-span-2">
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите компанию" />
                </SelectTrigger>
                <SelectContent>
                  {options.companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <Field label="Название *" htmlFor="deal-title" className="sm:col-span-2">
            <Input id="deal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: BUSINESS — аналитика WB" />
          </Field>
          <Field label="Услуга">
            <Select
              value={serviceId || "__none"}
              onValueChange={(v) => {
                const id = v === "__none" ? "" : v;
                setServiceId(id);
                const svc = options.services.find((s) => s.id === id);
                if (svc && !amount) setAmount(String(svc.priceFrom));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Не выбрана</SelectItem>
                {options.services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Сумма, ₽ *" htmlFor="deal-amount">
            <Input id="deal-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          </Field>
          <Field label="Этап">
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ожидаемое закрытие" htmlFor="deal-close">
            <Input id="deal-close" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
          </Field>
          <Field label="Заметки" htmlFor="deal-notes" className="sm:col-span-2">
            <Textarea id="deal-notes" rows={3} value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={pending || !title.trim() || !companyId}>
            {pending ? "Сохранение…" : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewDealButton({ companyId, options, label = "Сделка", size = "sm", variant = "outline" }: { companyId?: string; options: DealOptions; label?: string; size?: "sm" | "default"; variant?: "outline" | "default" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        + {label}
      </Button>
      {open ? <DealDialog open={open} onOpenChange={setOpen} initial={{ companyId }} options={options} /> : null}
    </>
  );
}
