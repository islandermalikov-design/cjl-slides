"use client";

import { DUPLICATE_REASON_LABELS, type DuplicateReason } from "@leadflow/shared";
import { CircleCheck, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DemoBadge } from "@/components/common/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAction } from "@/hooks/use-action";
import { importCandidatesAction } from "./actions";

export interface CandidateView {
  name: string;
  website?: string | null;
  niche?: string | null;
  category?: string | null;
  city?: string | null;
  region?: string | null;
  marketplace?: string | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
  sourceUrl?: string | null;
  isDemo: boolean;
  evidence: Array<{ kind: string; field: string; value: string }>;
  duplicateOf: { id: string; name: string; reason: string } | null;
  imported?: string | null;
}

export function DiscoveryResults({ jobId, candidates, canEdit }: { jobId: string; candidates: CandidateView[]; canEdit: boolean }) {
  const selectable = candidates.map((c, i) => ({ c, i })).filter(({ c }) => !c.duplicateOf && !c.imported);
  const [selected, setSelected] = useState<number[]>([]);
  const { run, pending } = useAction();
  const all = selectable.length > 0 && selected.length === selectable.length;
  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="text-sm text-muted-foreground">
          Найдено: {candidates.length} · новых: {selectable.length} · уже в базе: {candidates.filter((c) => c.duplicateOf || c.imported).length}
        </div>
        {canEdit ? (
          <Button size="sm" disabled={!selected.length || pending} onClick={() => run(() => importCandidatesAction(jobId, selected), { onSuccess: (d) => { setSelected([]); void d; }, success: `Добавлено в базу: ${selected.length}` })}>
            <Plus /> Добавить в базу ({selected.length})
          </Button>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>
              <Checkbox aria-label="Выбрать все" checked={all} onCheckedChange={(v) => setSelected(v ? selectable.map((s) => s.i) : [])} disabled={!canEdit} />
            </TableHead>
            <TableHead>Компания</TableHead>
            <TableHead>Ниша / категория</TableHead>
            <TableHead>Город</TableHead>
            <TableHead>Контакты</TableHead>
            <TableHead>Факты</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((c, i) => {
            const disabled = Boolean(c.duplicateOf || c.imported);
            return (
              <TableRow key={i} data-state={selected.includes(i) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    aria-label={`Выбрать ${c.name}`}
                    disabled={disabled || !canEdit}
                    checked={selected.includes(i)}
                    onCheckedChange={(v) => setSelected((s) => (v ? [...s, i] : s.filter((x) => x !== i)))}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 font-medium">
                    {c.name} {c.isDemo ? <DemoBadge /> : null}
                  </div>
                  {c.website ? <div className="text-xs text-muted-foreground">{c.website.replace(/^https?:\/\//, "")}</div> : null}
                </TableCell>
                <TableCell className="text-[13px]">
                  <div>{c.niche ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{c.category ?? ""}</div>
                </TableCell>
                <TableCell className="text-[13px]">{c.city ?? "—"}</TableCell>
                <TableCell className="text-[13px]">
                  <div>{c.publicEmail ?? ""}</div>
                  <div>{c.publicPhone ?? ""}</div>
                  {c.sourceUrl ? (
                    <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      источник <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                  {!c.publicEmail && !c.publicPhone ? <span className="text-xs text-muted-foreground">не опубликованы</span> : null}
                </TableCell>
                <TableCell className="max-w-[220px] text-xs text-muted-foreground">{c.evidence.slice(0, 2).map((e) => e.value).join(" · ")}</TableCell>
                <TableCell>
                  {c.imported ? (
                    <Link href={`/companies/${c.imported}`}>
                      <Badge variant="success">
                        <CircleCheck /> добавлена
                      </Badge>
                    </Link>
                  ) : c.duplicateOf ? (
                    <Link href={`/companies/${c.duplicateOf.id}`} title={c.duplicateOf.name}>
                      <Badge variant="warning">дубль: {DUPLICATE_REASON_LABELS[c.duplicateOf.reason as DuplicateReason] ?? c.duplicateOf.reason}</Badge>
                    </Link>
                  ) : (
                    <Badge variant="secondary">новая</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
