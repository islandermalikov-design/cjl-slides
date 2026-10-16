"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/hooks/use-action";
import { bulkScoreAction } from "@/features/companies/actions";

export function BulkAnalyze({ ids, label }: { ids: string[]; label: string }) {
  const { run, pending } = useAction();
  const [force, setForce] = useState(false);
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Switch checked={force} onCheckedChange={setForce} /> Повторный анализ (без кэша)
      </label>
      <Button disabled={pending || ids.length === 0} onClick={() => run(() => bulkScoreAction(ids, force), { onSuccess: (d) => router.push(`/jobs?highlight=${(d as { jobId: string }).jobId}`), refresh: false })}>
        <Sparkles /> {label} ({ids.length})
      </Button>
    </div>
  );
}
