"use client";

import { Kanban, Search, Table2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function CrmToolbar({ view }: { view: "kanban" | "table" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const set = (k: string, v: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  };
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) set("q", q || null);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-[10px] border bg-card p-0.5 shadow-soft">
        {(
          [
            ["kanban", "Kanban", Kanban],
            ["table", "Таблица", Table2],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => set("view", key === "kanban" ? null : key)}
            className={cn("inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-medium transition-colors", view === key ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>
      <div className="relative w-full sm:w-64">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по компаниям" className="h-8 pl-8 text-[13px]" />
      </div>
      {view === "kanban" ? (
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Switch checked={params.get("closed") === "1"} onCheckedChange={(v) => set("closed", v ? "1" : null)} />
          Показывать «Отказ» и «Не связываться»
        </label>
      ) : null}
      <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Switch checked={params.get("followup") === "1"} onCheckedChange={(v) => set("followup", v ? "1" : null)} />
        Требуют повторного контакта
      </label>
    </div>
  );
}
