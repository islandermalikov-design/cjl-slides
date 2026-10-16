"use client";

import { CRM_STATUSES, CRM_STATUS_LABELS, MARKETPLACES, MARKETPLACE_LABELS } from "@leadflow/shared";
import { ListFilter, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all";

export function CompaniesFilters({ facets }: { facets: { cities: string[]; niches: string[]; regions: string[]; tags: Array<{ id: string; name: string }> } }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const update = (key: string, value: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (!value || value === ALL) p.delete(key);
    else p.set(key, value);
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) update("q", q || null);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = ["status", "niche", "city", "region", "marketplace", "hasWebsite", "hasContacts", "tagId", "minScore", "q"].filter((k) => params.get(k));

  const sel = (key: string, placeholder: string, options: Array<[string, string]>) => {
    const value = params.get(key) ?? ALL;
    const label = options.find(([v]) => v === value)?.[1] ?? placeholder;
    return (
    <Select key={key} value={value} onValueChange={(v) => update(key, v)}>
      <SelectTrigger size="sm" className="w-auto min-w-[140px]" aria-label={placeholder}>
        <SelectValue placeholder={placeholder}>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Название, сайт, email, ИНН" className="h-8 pl-8 text-[13px]" aria-label="Поиск компаний" />
      </div>
      <ListFilter className="hidden size-4 text-muted-foreground sm:block" />
      {sel("status", "Все статусы", CRM_STATUSES.map((s) => [s, CRM_STATUS_LABELS[s]]))}
      {sel("niche", "Все ниши", facets.niches.map((n) => [n, n]))}
      {sel("city", "Все города", facets.cities.map((n) => [n, n]))}
      {facets.regions.length ? sel("region", "Все регионы", facets.regions.map((n) => [n, n])) : null}
      {sel("marketplace", "Любая площадка", MARKETPLACES.map((m) => [m, MARKETPLACE_LABELS[m]]))}
      {sel("hasWebsite", "Сайт: любой", [["yes", "Есть сайт"], ["no", "Нет сайта"]])}
      {sel("hasContacts", "Контакты: любые", [["yes", "Есть деловые контакты"], ["no", "Нет контактов"]])}
      {facets.tags.length ? sel("tagId", "Все теги", facets.tags.map((t) => [t.id, t.name])) : null}
      {sel("minScore", "Score: любой", [["70", "Score ≥ 70"], ["50", "Score ≥ 50"], ["30", "Score ≥ 30"]])}
      {active.length ? (
        <Button variant="ghost" size="sm" onClick={() => { setQ(""); router.push(pathname); }}>
          <X /> Сбросить
        </Button>
      ) : null}
    </div>
  );
}
