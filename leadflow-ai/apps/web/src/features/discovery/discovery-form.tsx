"use client";

import { MARKETPLACES, MARKETPLACE_LABELS, TARGET_NICHES } from "@leadflow/shared";
import { Radar } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { startDiscoveryAction } from "./actions";

export interface AdapterInfo {
  key: string;
  name: string;
  description: string;
  available: boolean;
  reason?: string | null;
  legalNotes: string;
  queryFields: string[];
}

export function DiscoveryForm({ adapters, sources, collectorError }: { adapters: AdapterInfo[]; sources: Array<{ id: string; name: string; adapterKey: string; status: string }>; collectorError: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adapter, setAdapter] = useState(adapters.find((a) => a.available)?.key ?? "demo");
  const info = adapters.find((a) => a.key === adapter);
  const matchingSources = sources.filter((s) => s.adapterKey === adapter);
  const [sourceId, setSourceId] = useState<string>("");
  const [q, setQ] = useState({ name: "", niche: "", region: "", city: "", category: "", marketplace: "", inn: "", urls: "" });
  const [hasWebsite, setHasWebsite] = useState(false);
  const [hasContacts, setHasContacts] = useState(false);
  const [limit, setLimit] = useState("30");
  const [loading, setLoading] = useState(false);
  const has = (f: string) => info?.queryFields.includes(f);
  const set = (k: keyof typeof q) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setQ((s) => ({ ...s, [k]: e.target.value }));
  const effectiveSource = sourceId || matchingSources.find((s) => s.status === "ACTIVE")?.id || "";
  const needsSource = adapter !== "demo";

  const submit = async () => {
    setLoading(true);
    const query: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(q)) if (v && k !== "urls" && has(k)) query[k] = v;
    if (has("urls") && q.urls) query.urls = q.urls.split(/\s+/).filter(Boolean).slice(0, 50);
    if (has("hasWebsite") && hasWebsite) query.hasWebsite = true;
    if (has("hasContacts") && hasContacts) query.hasContacts = true;
    const res = await startDiscoveryAction({ adapter, sourceId: effectiveSource || null, query, limit: Number(limit) || 30 });
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    router.push(`${pathname}?job=${res.data.id}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radar className="size-4 text-primary" /> Параметры поиска
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label="Источник (адаптер)">
          <Select value={adapter} onValueChange={(v) => { setAdapter(v); setSourceId(""); }}>
            <SelectTrigger aria-label="Адаптер">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {adapters.map((a) => (
                <SelectItem key={a.key} value={a.key} disabled={!a.available}>
                  {a.name}
                  {!a.available ? " — недоступен" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {info ? (
          <div className="rounded-[10px] bg-muted/60 p-3 text-[13px]">
            <div>{info.description}</div>
            <div className="mt-1 text-xs text-muted-foreground">{info.legalNotes}</div>
            {!info.available && info.reason ? <div className="mt-1 text-xs text-destructive">{info.reason}</div> : null}
          </div>
        ) : null}
        {collectorError ? (
          <Alert variant="warning">
            <AlertDescription>Collector недоступен: доступен только DEMO-каталог. {collectorError}</AlertDescription>
          </Alert>
        ) : null}
        {needsSource ? (
          <Field label="Подключённый источник" hint="Источник должен быть активирован после проверки robots.txt и условий использования">
            {matchingSources.length ? (
              <Select value={effectiveSource} onValueChange={setSourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите источник" />
                </SelectTrigger>
                <SelectContent>
                  {matchingSources.map((s) => (
                    <SelectItem key={s.id} value={s.id} disabled={s.status !== "ACTIVE"}>
                      {s.name} {s.status !== "ACTIVE" ? "(не активирован)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground">Нет источника для этого адаптера — создайте его в разделе «Источники данных».</div>
            )}
          </Field>
        ) : null}
        {has("urls") ? (
          <Field label="Адреса сайтов компаний" hint="По одному в строке, до 50. Будут собраны только опубликованные деловые контакты с соблюдением robots.txt.">
            <Textarea rows={5} value={q.urls} onChange={set("urls")} placeholder={"https://example.ru\nhttps://shop.example.com"} />
          </Field>
        ) : null}
        {has("name") ? (
          <Field label="Название компании">
            <Input value={q.name} onChange={set("name")} />
          </Field>
        ) : null}
        {has("inn") ? (
          <Field label="ИНН">
            <Input value={q.inn} onChange={set("inn")} inputMode="numeric" />
          </Field>
        ) : null}
        {has("niche") ? (
          <Field label="Ниша">
            <Input value={q.niche} onChange={set("niche")} list="disc-niches" placeholder="Продавец Wildberries" />
            <datalist id="disc-niches">
              {TARGET_NICHES.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
        ) : null}
        {has("category") ? (
          <Field label="Категория бизнеса">
            <Input value={q.category} onChange={set("category")} />
          </Field>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          {has("region") ? (
            <Field label="Регион">
              <Input value={q.region} onChange={set("region")} />
            </Field>
          ) : null}
          {has("city") ? (
            <Field label="Город">
              <Input value={q.city} onChange={set("city")} />
            </Field>
          ) : null}
        </div>
        {has("marketplace") ? (
          <Field label="Площадка">
            <Select value={q.marketplace || "__any"} onValueChange={(v) => setQ((s) => ({ ...s, marketplace: v === "__any" ? "" : MARKETPLACE_LABELS[v as keyof typeof MARKETPLACE_LABELS] }))}>
              <SelectTrigger>
                <SelectValue>{q.marketplace || "Любая"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Любая</SelectItem>
                {MARKETPLACES.filter((m) => m !== "NONE").map((m) => (
                  <SelectItem key={m} value={m}>
                    {MARKETPLACE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <div className="flex flex-col gap-2">
          {has("hasWebsite") ? (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={hasWebsite} onCheckedChange={setHasWebsite} /> Только с сайтом
            </label>
          ) : null}
          {has("hasContacts") ? (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={hasContacts} onCheckedChange={setHasContacts} /> Только с опубликованными деловыми контактами
            </label>
          ) : null}
        </div>
        <Field label="Максимум результатов">
          <Input value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
        </Field>
        <Button onClick={submit} disabled={loading || !info?.available || (needsSource && !effectiveSource)}>
          {loading ? "Поиск…" : "Найти компании"}
        </Button>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="outline">robots.txt соблюдается</Badge>
          <Badge variant="outline">без обхода CAPTCHA и авторизации</Badge>
          <Badge variant="outline">контакты не придумываются</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
