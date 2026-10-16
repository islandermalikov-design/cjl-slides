"use client";

import { DUPLICATE_REASON_LABELS, type DuplicateReason } from "@leadflow/shared";
import { CopyCheck, Merge } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAction } from "@/hooks/use-action";
import { mergeCompaniesAction, runDedupScanAction } from "./actions";

interface Group {
  primary: { id: string; name: string };
  duplicates: Array<{ id: string; name: string; reason: DuplicateReason }>;
}

export function DedupPanel() {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [checked, setChecked] = useState(0);
  const { run, pending } = useAction();

  const scan = () =>
    run(() => runDedupScanAction(), {
      refresh: false,
      onSuccess: async (d) => {
        const res = await fetch(`/api/jobs/${(d as { jobId: string }).jobId}`);
        if (res.ok) {
          const job = (await res.json()) as { result?: { groups?: Group[]; checked?: number } };
          setGroups(job.result?.groups ?? []);
          setChecked(job.result?.checked ?? 0);
          setOpen(true);
        }
      },
    });

  return (
    <>
      <div className="flex justify-end -mt-2">
        <Button variant="ghost" size="sm" onClick={scan} disabled={pending}>
          <CopyCheck /> {pending ? "Проверка…" : "Проверить дубли"}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Проверка дублей</DialogTitle>
            <DialogDescription>
              Проверено компаний: {checked}. Найдено групп: {groups?.length ?? 0}. Объединение переносит контакты, сделки, КП и историю в основную запись.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
            {groups?.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Дубли не найдены</p> : null}
            {groups?.map((g) => (
              <div key={g.primary.id} className="rounded-[12px] border p-3">
                <div className="text-sm">
                  Основная:{" "}
                  <Link href={`/companies/${g.primary.id}`} className="font-medium text-primary hover:underline">
                    {g.primary.name}
                  </Link>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {g.duplicates.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 rounded-[8px] bg-muted/50 px-2.5 py-1.5 text-sm">
                      <span className="min-w-0 truncate">
                        <Link href={`/companies/${d.id}`} className="hover:underline">
                          {d.name}
                        </Link>{" "}
                        <span className="text-xs text-muted-foreground">· {DUPLICATE_REASON_LABELS[d.reason]}</span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          run(() => mergeCompaniesAction(g.primary.id, d.id), {
                            onSuccess: () => setGroups((prev) => prev?.map((x) => (x === g ? { ...x, duplicates: x.duplicates.filter((y) => y.id !== d.id) } : x)).filter((x) => x.duplicates.length) ?? null),
                          })
                        }
                      >
                        <Merge /> Объединить
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
