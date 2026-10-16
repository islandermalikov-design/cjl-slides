"use client";

import { CRM_STATUSES, CRM_STATUS_LABELS, MARKETPLACE_LABELS, formatPhone, type CrmStatusValue, type MarketplaceValue } from "@leadflow/shared";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, ExternalLink, Mail, Phone, Sparkles, Tag, Trash, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CrmStatusBadge, DemoBadge, ScoreBadge } from "@/components/common/badges";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAction } from "@/hooks/use-action";
import { cn, formatDate } from "@/lib/utils";
import { bulkDeleteAction, bulkScoreAction, bulkSetStatusAction, bulkTagAction } from "./actions";

export interface CompanyRow {
  id: string;
  name: string;
  legalName: string | null;
  website: string | null;
  category: string | null;
  niche: string | null;
  city: string | null;
  region: string | null;
  marketplace: MarketplaceValue;
  publicEmail: string | null;
  publicPhone: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  crmStatus: CrmStatusValue;
  aiScore: number | null;
  isDemo: boolean;
  createdAt: string;
  contactsCount: number;
  tags: Array<{ id: string; name: string }>;
}

function SortHeader({ label, field }: { label: string; field: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const sort = params.get("sort") ?? "createdAt";
  const order = params.get("order") ?? "desc";
  const active = sort === field;
  const toggle = () => {
    const p = new URLSearchParams(params.toString());
    p.set("sort", field);
    p.set("order", active && order === "desc" ? "asc" : "desc");
    router.push(`${pathname}?${p.toString()}`);
  };
  return (
    <button type="button" onClick={toggle} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}>
      {label}
      {active ? order === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-40" />}
    </button>
  );
}

export function CompaniesTable({ rows, canEdit }: { rows: CompanyRow[]; canEdit: boolean }) {
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [tagOpen, setTagOpen] = useState(false);
  const [tagValue, setTagValue] = useState("");
  const { run, pending } = useAction();
  const router = useRouter();

  const columns = useMemo<ColumnDef<CompanyRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Выбрать все"
            checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false}
            onCheckedChange={(v) => table.toggleAllRowsSelected(Boolean(v))}
          />
        ),
        cell: ({ row }) => <Checkbox aria-label="Выбрать строку" checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(Boolean(v))} />,
      },
      {
        id: "name",
        header: () => <SortHeader label="Компания" field="name" />,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="min-w-[220px]">
              <div className="flex items-center gap-1.5">
                <Link href={`/companies/${c.id}`} className="font-medium hover:text-primary hover:underline">
                  {c.name}
                </Link>
                {c.isDemo ? <DemoBadge /> : null}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                {c.website ? (
                  <a href={c.website} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-foreground">
                    {c.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <span>Без сайта</span>
                )}
                {c.tags.slice(0, 3).map((t) => (
                  <Badge key={t.id} variant="secondary" className="text-[10.5px]">
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          );
        },
      },
      { id: "crmStatus", header: () => <SortHeader label="Статус" field="crmStatus" />, cell: ({ row }) => <CrmStatusBadge status={row.original.crmStatus} /> },
      { id: "aiScore", header: () => <SortHeader label="AI Score" field="aiScore" />, cell: ({ row }) => <ScoreBadge score={row.original.aiScore} /> },
      {
        id: "niche",
        header: "Ниша / категория",
        cell: ({ row }) => (
          <div className="max-w-[200px] text-[13px]">
            <div className="truncate">{row.original.niche ?? "—"}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.category ?? ""}</div>
          </div>
        ),
      },
      {
        id: "city",
        header: () => <SortHeader label="Город" field="city" />,
        cell: ({ row }) => (
          <div className="text-[13px]">
            <div>{row.original.city ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{row.original.region ?? ""}</div>
          </div>
        ),
      },
      { id: "marketplace", header: "Площадка", cell: ({ row }) => <span className="text-[13px]">{row.original.marketplace === "NONE" ? "—" : MARKETPLACE_LABELS[row.original.marketplace]}</span> },
      {
        id: "contacts",
        header: "Контакты",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {c.publicEmail ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Mail className="size-4 text-foreground" aria-label={c.publicEmail} />
                  </TooltipTrigger>
                  <TooltipContent>{c.publicEmail}</TooltipContent>
                </Tooltip>
              ) : null}
              {c.publicPhone ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Phone className="size-4 text-foreground" aria-label={formatPhone(c.publicPhone)} />
                  </TooltipTrigger>
                  <TooltipContent>{formatPhone(c.publicPhone)}</TooltipContent>
                </Tooltip>
              ) : null}
              {c.contactsCount ? <span className="text-xs">+{c.contactsCount}</span> : null}
              {!c.publicEmail && !c.publicPhone && !c.contactsCount ? <span className="text-xs">—</span> : null}
            </div>
          );
        },
      },
      {
        id: "source",
        header: "Источник",
        cell: ({ row }) => {
          const c = row.original;
          return c.sourceUrl ? (
            <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="size-3" /> {formatDate(c.verifiedAt)}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
      },
      { id: "createdAt", header: () => <SortHeader label="Добавлена" field="createdAt" />, cell: ({ row }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDate(row.original.createdAt)}</span> },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (r) => r.id,
    state: { rowSelection: selection },
    onRowSelectionChange: setSelection,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: canEdit,
  });
  const selectedIds = Object.keys(selection).filter((k) => selection[k]);

  return (
    <div className="flex flex-col">
      {selectedIds.length ? (
        <div className="flex flex-wrap items-center gap-2 border-b bg-accent/50 px-3 py-2 text-sm">
          <span className="font-medium">Выбрано: {selectedIds.length}</span>
          <Button size="sm" variant="outline" onClick={() => setTagOpen(true)} disabled={pending}>
            <Tag /> Теги
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={pending}>
                <Workflow /> В CRM / статус
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Установить статус</DropdownMenuLabel>
              {CRM_STATUSES.map((s) => (
                <DropdownMenuItem key={s} onSelect={() => run(() => bulkSetStatusAction(selectedIds, s), { onSuccess: () => setSelection({}) })}>
                  {CRM_STATUS_LABELS[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => bulkScoreAction(selectedIds), { onSuccess: (d) => router.push(`/jobs?highlight=${(d as { jobId: string }).jobId}`) })}
          >
            <Sparkles /> AI-анализ
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/companies/export?ids=${selectedIds.join(",")}`}>
              <Download /> Экспорт
            </a>
          </Button>
          <ConfirmDialog
            title={`Удалить ${selectedIds.length} компаний?`}
            description="Компании будут скрыты из базы (мягкое удаление). Связанные данные сохранятся в журнале."
            destructive
            confirmLabel="Удалить"
            onConfirm={() => run(() => bulkDeleteAction(selectedIds), { onSuccess: () => setSelection({}) })}
            trigger={
              <Button size="sm" variant="ghost" className="text-destructive" disabled={pending}>
                <Trash /> Удалить
              </Button>
            }
          />
          <Button size="sm" variant="ghost" onClick={() => setSelection({})}>
            Снять выбор
          </Button>
        </div>
      ) : null}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((h) => (
                <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={tagOpen} onOpenChange={setTagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Назначить теги</DialogTitle>
            <DialogDescription>Через запятую. Новые теги будут созданы автоматически.</DialogDescription>
          </DialogHeader>
          <Input value={tagValue} onChange={(e) => setTagValue(e.target.value)} placeholder="Маркетплейс, Горячий лид" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagOpen(false)}>
              Отмена
            </Button>
            <Button
              disabled={pending || !tagValue.trim()}
              onClick={() =>
                run(() => bulkTagAction(selectedIds, tagValue.split(",")), {
                  onSuccess: () => {
                    setTagOpen(false);
                    setTagValue("");
                    setSelection({});
                  },
                })
              }
            >
              Назначить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
