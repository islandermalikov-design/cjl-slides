import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: "blue" | "green" | "violet" | "amber" | "slate" | "sky" | "rose";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  } as const;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-medium text-muted-foreground">{label}</div>
          <div className="mt-1.5 text-[22px] leading-none font-semibold tracking-tight tabular-nums">{value}</div>
        </div>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[9px]", tones[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      {hint ? <div className="mt-2.5 truncate text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}
