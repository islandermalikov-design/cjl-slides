"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarRange } from "lucide-react";

const OPTIONS = [
  { key: "today", label: "Сегодня" },
  { key: "7d", label: "7 дней" },
  { key: "30d", label: "30 дней" },
  { key: "90d", label: "90 дней" },
];

export function PeriodFilter({ current, from, to }: { current: string; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [cFrom, setFrom] = useState(from);
  const [cTo, setTo] = useState(to);
  const set = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    router.push(`${pathname}?${p.toString()}`);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-[10px] border bg-card p-0.5 shadow-soft" role="group" aria-label="Период">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => set({ period: o.key, from: null, to: null })}
            className={cn(
              "h-7 rounded-[8px] px-2.5 text-[13px] font-medium transition-colors duration-150",
              current === o.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={current === o.key}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={current === "custom" ? "default" : "outline"} size="sm">
            <CalendarRange /> {current === "custom" ? `${from} — ${to}` : "Период"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">Произвольный период</div>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              С
              <Input type="date" value={cFrom} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              По
              <Input type="date" value={cTo} onChange={(e) => setTo(e.target.value)} />
            </label>
            <Button size="sm" disabled={!cFrom || !cTo || cFrom > cTo} onClick={() => set({ period: "custom", from: cFrom, to: cTo })}>
              Применить
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
