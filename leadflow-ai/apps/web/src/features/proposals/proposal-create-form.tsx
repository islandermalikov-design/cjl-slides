"use client";

import { SERVICE_TIER_LABELS, type ServiceTierValue } from "@leadflow/shared";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Field } from "@/components/common/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { formatMoney } from "@/lib/utils";
import { createProposalAction } from "./actions";

export interface ServiceOption {
  id: string;
  name: string;
  tier: ServiceTierValue;
  description: string;
  priceFrom: number;
  priceTo: number | null;
  durationDays: number;
}

export function ProposalCreateForm({
  companies,
  services,
  initialCompanyId,
  aiMode,
  aiMessage,
  initialTasks,
}: {
  companies: Array<{ id: string; name: string; aiScore: number | null }>;
  services: ServiceOption[];
  initialCompanyId?: string;
  aiMode: "live" | "demo" | "unavailable";
  aiMessage: string;
  initialTasks?: Record<string, string>;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(initialCompanyId ?? "");
  const [selected, setSelected] = useState<string[]>(services[1] ? [services[1].id] : services[0] ? [services[0].id] : []);
  const [price, setPrice] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [facts, setFacts] = useState("");
  const [tasks, setTasks] = useState(initialCompanyId ? (initialTasks?.[initialCompanyId] ?? "") : "");
  const [examples, setExamples] = useState("");
  const [useAi, setUseAi] = useState(aiMode === "live");
  const { run, pending } = useAction();
  const chosen = services.filter((s) => selected.includes(s.id));
  const suggestedPrice = useMemo(() => chosen.reduce((s, x) => s + x.priceFrom, 0), [chosen]);
  const suggestedDuration = useMemo(() => Math.max(0, ...chosen.map((x) => x.durationDays)), [chosen]);

  const submit = () =>
    run(
      () =>
        createProposalAction({
          companyId,
          serviceIds: selected,
          totalPrice: price ? Number(price) : undefined,
          durationDays: duration ? Number(duration) : undefined,
          facts: facts || undefined,
          tasks: tasks || undefined,
          examples: examples || undefined,
          useAi,
        }),
      { onSuccess: (d) => router.push(`/proposals/${(d as { id: string }).id}`), refresh: false },
    );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Параметры КП</CardTitle>
          <CardDescription>Цены и сроки задаёте вы — AI их не меняет. Кейсы и отзывы не генерируются.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Компания *">
            <Select
              value={companyId}
              onValueChange={(v) => {
                setCompanyId(v);
                if (!tasks && initialTasks?.[v]) setTasks(initialTasks[v]!);
              }}
            >
              <SelectTrigger aria-label="Компания">
                <SelectValue placeholder="Выберите компанию" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.aiScore !== null ? ` · ${c.aiScore}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div>
            <div className="mb-2 text-[13px] font-medium">Услуги *</div>
            <div className="grid gap-2">
              {services.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-[12px] border p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-accent/40">
                  <Checkbox
                    checked={selected.includes(s.id)}
                    onCheckedChange={(v) => setSelected((prev) => (v ? [...prev, s.id] : prev.filter((x) => x !== s.id)))}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {s.name} <Badge variant="violet">{SERVICE_TIER_LABELS[s.tier]}</Badge>
                    </div>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">{s.description}</div>
                  </div>
                  <div className="text-right text-[13px] whitespace-nowrap">
                    <div className="font-medium">{s.priceTo ? `${formatMoney(s.priceFrom)} – ${formatMoney(s.priceTo)}` : `от ${formatMoney(s.priceFrom)}`}</div>
                    <div className="text-xs text-muted-foreground">~{s.durationDays} дн.</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Итоговая стоимость, ₽" htmlFor="p-price" hint={`По умолчанию: ${formatMoney(suggestedPrice)}`}>
              <Input id="p-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder={String(suggestedPrice)} />
            </Field>
            <Field label="Срок, дней" htmlFor="p-days" hint={`По умолчанию: ${suggestedDuration}`}>
              <Input id="p-days" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))} placeholder={String(suggestedDuration)} />
            </Field>
          </div>
          <Field label="Публичные факты о компании" htmlFor="p-facts" hint="Только проверяемые факты из открытых источников">
            <Textarea id="p-facts" rows={3} value={facts} onChange={(e) => setFacts(e.target.value)} placeholder="Например: магазин на Wildberries, 300+ карточек товаров, публикует прайс в Excel" />
          </Field>
          <Field label="Предполагаемые задачи клиента" htmlFor="p-tasks">
            <Textarea id="p-tasks" rows={3} value={tasks} onChange={(e) => setTasks(e.target.value)} placeholder="Сводная аналитика продаж; учёт остатков; расчёт прибыли" />
          </Field>
          <Field label="Примеры ваших работ" htmlFor="p-examples" hint="Только реальные проекты — AI не придумывает кейсы">
            <Textarea id="p-examples" rows={2} value={examples} onChange={(e) => setExamples(e.target.value)} />
          </Field>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Генерация
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert variant={aiMode === "live" ? "success" : aiMode === "demo" ? "warning" : "destructive"}>
              <AlertDescription>{aiMessage}</AlertDescription>
            </Alert>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={useAi} onCheckedChange={setUseAi} disabled={aiMode !== "live"} />
              Использовать Claude AI
            </label>
            <div className="text-[13px] text-muted-foreground">
              {useAi && aiMode === "live"
                ? "AI подготовит текст КП, первое сообщение, email, вариант для мессенджера и ответы на интерес и возражение по цене."
                : "Будет использован шаблон: структура КП и тексты без AI. Их можно отредактировать вручную."}
            </div>
            <div className="rounded-[12px] bg-muted/60 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Стоимость</span>
                <span className="font-semibold tabular-nums">{formatMoney(price ? Number(price) : suggestedPrice)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Срок</span>
                <span className="font-semibold">{duration || suggestedDuration} дн.</span>
              </div>
            </div>
            <Button size="lg" onClick={submit} disabled={pending || !companyId || selected.length === 0}>
              {pending ? "Генерация…" : "Создать КП"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
