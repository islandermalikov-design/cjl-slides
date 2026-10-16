"use client";

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Ellipsis, GripVertical } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DemoBadge } from "@/components/common/badges";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAction } from "@/hooks/use-action";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { deleteDealAction, moveDealAction } from "./actions";
import { DealDialog, type DealOptions } from "./deal-dialog";

export interface DealCard {
  id: string;
  title: string;
  amount: number;
  status: "OPEN" | "WON" | "LOST";
  stageId: string | null;
  serviceId: string | null;
  expectedCloseAt: string | null;
  closedAt: string | null;
  notes: string | null;
  isDemo: boolean;
  company: { id: string; name: string };
}

export interface StageInfo {
  id: string;
  name: string;
  probability: number;
  isWon: boolean;
  isLost: boolean;
}

function DealItem({ deal, stages, options, canEdit, highlight }: { deal: DealCard; stages: StageInfo[]; options: DealOptions; canEdit: boolean; highlight: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id, disabled: !canEdit });
  const [edit, setEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { run } = useAction();
  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("rounded-[12px] border bg-card p-3 shadow-soft", isDragging && "z-10 opacity-80 shadow-pop", highlight && "ring-2 ring-primary/50")}
    >
      <div className="flex items-start gap-2">
        {canEdit ? (
          <button type="button" className="-ml-1 mt-0.5 cursor-grab touch-none text-muted-foreground/50" aria-label={`Перетащить сделку ${deal.title}`} {...attributes} {...listeners}>
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] leading-snug font-medium">{deal.title}</div>
          <Link href={`/companies/${deal.company.id}`} className="text-xs text-muted-foreground hover:text-primary hover:underline">
            {deal.company.name}
          </Link>
        </div>
        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Действия со сделкой">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEdit(true)}>Редактировать</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                Удалить
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Переместить на этап</DropdownMenuLabel>
              {stages
                .filter((s) => s.id !== deal.stageId)
                .map((s) => (
                  <DropdownMenuItem key={s.id} onSelect={() => run(() => moveDealAction(deal.id, s.id), { success: `Этап: ${s.name}` })}>
                    {s.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-[14px] font-semibold tabular-nums">{formatMoney(deal.amount)}</span>
        <span className="text-muted-foreground">{deal.closedAt ? `закрыта ${formatDate(deal.closedAt)}` : deal.expectedCloseAt ? `до ${formatDate(deal.expectedCloseAt)}` : ""}</span>
      </div>
      {deal.isDemo ? <DemoBadge className="mt-2" /> : null}
      {confirmDelete ? (
        <DeleteDealDialog onClose={() => setConfirmDelete(false)} onConfirm={() => run(() => deleteDealAction(deal.id))} title={deal.title} />
      ) : null}
      {edit ? (
        <DealDialog
          open
          onOpenChange={setEdit}
          options={options}
          initial={{ id: deal.id, companyId: deal.company.id, title: deal.title, amount: deal.amount, stageId: deal.stageId, serviceId: deal.serviceId, expectedCloseAt: deal.expectedCloseAt, notes: deal.notes }}
        />
      ) : null}
    </div>
  );
}

function StageColumn({ stage, deals, children }: { stage: StageInfo; deals: DealCard[]; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const sum = deals.reduce((s, d) => s + d.amount, 0);
  return (
    <div className="flex w-[270px] shrink-0 flex-col">
      <div className="mb-2 px-1">
        <div className="flex items-center justify-between text-[13px] font-semibold">
          <span>{stage.name}</span>
          <span className="rounded-md bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">{deals.length}</span>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {formatMoney(sum)} · вероятность {stage.probability}%
        </div>
      </div>
      <div ref={setNodeRef} className={cn("flex min-h-[200px] flex-1 flex-col gap-2 rounded-[14px] border border-transparent p-2 transition-colors", stage.isWon ? "bg-green-50/70 dark:bg-green-500/5" : stage.isLost ? "bg-red-50/60 dark:bg-red-500/5" : "bg-muted/50", isOver && "border-primary/40 bg-accent/60")}>
        {children}
      </div>
    </div>
  );
}

export function DealsBoard({ deals, stages, options, canEdit, highlight }: { deals: DealCard[]; stages: StageInfo[]; options: DealOptions; canEdit: boolean; highlight?: string }) {
  const [items, setItems] = useState(deals);
  const [source, setSource] = useState(deals);
  if (source !== deals) {
    setSource(deals);
    setItems(deals);
  }
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    const deal = items.find((d) => d.id === e.active.id);
    const stageId = String(e.over.id);
    if (!deal || deal.stageId === stageId) return;
    const prev = items;
    const stage = stages.find((s) => s.id === stageId);
    setItems(items.map((d) => (d.id === deal.id ? { ...d, stageId, status: stage?.isWon ? "WON" : stage?.isLost ? "LOST" : "OPEN" } : d)));
    const res = await moveDealAction(deal.id, stageId);
    if (!res.ok) {
      toast.error(res.error);
      setItems(prev);
    } else toast.success(`«${deal.title}» → ${stage?.name}`);
  };
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="-mx-4 overflow-x-auto px-4 pb-4 scrollbar-thin lg:-mx-8 lg:px-8">
        <div className="flex items-start gap-3">
          {stages.map((s) => {
            const list = items.filter((d) => d.stageId === s.id);
            return (
              <StageColumn key={s.id} stage={s} deals={list}>
                {list.map((d) => (
                  <DealItem key={d.id} deal={d} stages={stages} options={options} canEdit={canEdit} highlight={highlight === d.id} />
                ))}
                {list.length === 0 ? <div className="py-6 text-center text-xs text-muted-foreground">Нет сделок</div> : null}
              </StageColumn>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}

function DeleteDealDialog({ onClose, onConfirm, title }: { onClose: () => void; onConfirm: () => Promise<unknown>; title: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить сделку «{title}»?</DialogTitle>
          <DialogDescription>Сделка будет скрыта из воронки и аналитики. Требуются права администратора.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await onConfirm();
              setPending(false);
              onClose();
            }}
          >
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
