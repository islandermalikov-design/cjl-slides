"use client";

import { MESSAGE_STATUSES, MESSAGE_STATUS_LABELS, type MessageStatusValue } from "@leadflow/shared";
import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MessageStatusBadge } from "@/components/common/badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, relativeTime } from "@/lib/utils";
import { ComposeDialog, type ComposeTarget } from "./compose-dialog";

export function StatusTabs({ counts }: { counts: Record<string, number> }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = params.get("status") ?? "";
  const go = (s: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    router.push(`${pathname}?${p.toString()}`);
  };
  const items: Array<[string, string]> = [["", "Все"], ...MESSAGE_STATUSES.map((s) => [s, MESSAGE_STATUS_LABELS[s]] as [string, string])];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([key, label]) => (
        <button
          key={key || "all"}
          type="button"
          onClick={() => go(key)}
          className={cn("inline-flex h-7 items-center gap-1.5 rounded-[8px] border px-2.5 text-[12.5px] font-medium transition-colors", current === key ? "border-primary bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:text-foreground")}
        >
          {label}
          <span className="tabular-nums opacity-70">{key ? (counts[key] ?? 0) : Object.values(counts).reduce((a, b) => a + b, 0)}</span>
        </button>
      ))}
    </div>
  );
}

export interface DraftListItem {
  id: string;
  status: MessageStatusValue;
  subject: string | null;
  body: string;
  recipient: string | null;
  updatedAt: string;
  company: { name: string };
}

export function DraftList({ items, selectedId }: { items: DraftListItem[]; selectedId?: string }) {
  const params = useSearchParams();
  return (
    <div className="flex flex-col divide-y">
      {items.map((d) => {
        const p = new URLSearchParams(params.toString());
        p.set("draft", d.id);
        p.delete("compose");
        return (
          <Link key={d.id} href={`?${p.toString()}`} className={cn("flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/50", selectedId === d.id && "bg-accent/60")}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{d.company.name}</span>
              <MessageStatusBadge status={d.status} />
            </div>
            <div className="truncate text-[13px]">{d.subject ?? d.body.slice(0, 80)}</div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="truncate">{d.recipient ?? "получатель не указан"}</span>
              <span className="shrink-0" suppressHydrationWarning>{relativeTime(d.updatedAt)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function ComposeLauncher({ target, companies }: { target: ComposeTarget | null; companies: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setPickerOpen(true)}>
        <Plus /> Новое сообщение
      </Button>
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Кому пишем?</DialogTitle>
          </DialogHeader>
          <Select
            onValueChange={(v) => {
              setPickerOpen(false);
              router.push(`${pathname}?compose=${v}`);
            }}
          >
            <SelectTrigger aria-label="Компания">
              <SelectValue placeholder="Выберите компанию" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
      {target ? <ComposeDialog key={target.company.id + (target.proposalId ?? "")} target={target} onClose={() => router.push(pathname)} /> : null}
    </>
  );
}
