"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CRM_STATUSES, CRM_STATUS_LABELS, formatPhone, type CrmStatusValue } from "@leadflow/shared";
import { CalendarClock, GripVertical, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CRM_STATUS_DOT, DemoBadge, ScoreBadge } from "@/components/common/badges";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { setStatusAction } from "@/features/companies/actions";

export interface KanbanCard {
  id: string;
  name: string;
  city: string | null;
  niche: string | null;
  aiScore: number | null;
  crmStatus: CrmStatusValue;
  isDemo: boolean;
  nextStep: string | null;
  nextStepAt: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  dealsSum: number;
  openTasks: number;
}

function Card({ card, dragging, handleProps }: { card: KanbanCard; dragging?: boolean; handleProps?: Record<string, unknown> }) {
  const overdue = card.nextStepAt && new Date(card.nextStepAt) < new Date();
  return (
    <div className={cn("group rounded-[12px] border bg-card p-3 shadow-soft transition-shadow duration-150", dragging && "rotate-1 shadow-pop ring-2 ring-primary/30")}>
      <div className="flex items-start gap-2">
        <button type="button" className="-ml-1 mt-0.5 cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing" aria-label={`Перетащить ${card.name}`} {...handleProps}>
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <Link href={`/companies/${card.id}`} className="line-clamp-2 text-[13.5px] leading-snug font-medium hover:text-primary">
            {card.name}
          </Link>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{[card.city, card.niche].filter(Boolean).join(" · ") || "—"}</div>
        </div>
        <ScoreBadge score={card.aiScore} />
      </div>
      {card.nextStep ? (
        <div className={cn("mt-2 flex items-start gap-1.5 rounded-[8px] bg-muted/60 px-2 py-1.5 text-xs", overdue && "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300")}>
          <CalendarClock className="mt-0.5 size-3 shrink-0" />
          <span className="line-clamp-2">
            {card.nextStep}
            {card.nextStepAt ? ` · ${formatDate(card.nextStepAt)}` : ""}
          </span>
        </div>
      ) : null}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {card.publicEmail ? <Mail className="size-3.5" aria-label={card.publicEmail} /> : null}
        {card.publicPhone ? <Phone className="size-3.5" aria-label={formatPhone(card.publicPhone)} /> : null}
        {card.openTasks ? <span>{card.openTasks} задач</span> : null}
        <span className="ml-auto font-medium text-foreground tabular-nums">{card.dealsSum ? formatMoney(card.dealsSum) : ""}</span>
        {card.isDemo ? <DemoBadge /> : null}
      </div>
    </div>
  );
}

function SortableCard({ card, disabled }: { card: KanbanCard; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, data: { status: card.crmStatus }, disabled });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && "opacity-40")}>
      <Card card={card} handleProps={disabled ? undefined : { ...attributes, ...listeners }} />
    </div>
  );
}

function Column({ status, cards, disabled }: { status: CrmStatusValue; cards: KanbanCard[]; disabled: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}`, data: { status } });
  const total = cards.reduce((s, c) => s + c.dealsSum, 0);
  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span className={cn("size-2 rounded-full", CRM_STATUS_DOT[status])} />
          {CRM_STATUS_LABELS[status]}
          <span className="rounded-md bg-muted px-1.5 text-xs font-medium text-muted-foreground tabular-nums">{cards.length}</span>
        </div>
        {total ? <span className="text-xs text-muted-foreground tabular-nums">{formatMoney(total)}</span> : null}
      </div>
      <div ref={setNodeRef} className={cn("flex min-h-[200px] flex-1 flex-col gap-2 rounded-[14px] border border-transparent bg-muted/50 p-2 transition-colors duration-150", isOver && "border-primary/40 bg-accent/60")}>
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} disabled={disabled} />
          ))}
        </SortableContext>
        {cards.length === 0 ? <div className="py-6 text-center text-xs text-muted-foreground">Перетащите карточку сюда</div> : null}
      </div>
    </div>
  );
}

export function Kanban({ initial, canEdit, hidden }: { initial: KanbanCard[]; canEdit: boolean; hidden: CrmStatusValue[] }) {
  const [cards, setCards] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => setCards(initial), [initial]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const byStatus = useMemo(() => {
    const map = new Map<CrmStatusValue, KanbanCard[]>();
    for (const s of CRM_STATUSES) map.set(s, []);
    for (const c of cards) map.get(c.crmStatus)?.push(c);
    return map;
  }, [cards]);
  const active = cards.find((c) => c.id === activeId) ?? null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active: a, over } = e;
    if (!over) return;
    const card = cards.find((c) => c.id === a.id);
    if (!card) return;
    const overStatus = (over.data.current?.status as CrmStatusValue | undefined) ?? card.crmStatus;
    const column = cards.filter((c) => c.crmStatus === overStatus && c.id !== card.id);
    const overIndex = column.findIndex((c) => c.id === over.id);
    const index = overIndex >= 0 ? overIndex : column.length;
    if (over.id === card.id) return;
    const prev = cards;
    const moved = { ...card, crmStatus: overStatus };
    column.splice(index, 0, moved);
    const others = cards.filter((c) => c.crmStatus !== overStatus && c.id !== card.id);
    setCards([...others, ...column]);
    const res = await setStatusAction(card.id, overStatus, index);
    if (!res.ok) {
      toast.error(res.error);
      setCards(prev);
    } else if (overStatus !== card.crmStatus) {
      toast.success(`«${card.name}» → ${CRM_STATUS_LABELS[overStatus]}`);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="-mx-4 overflow-x-auto px-4 pb-4 scrollbar-thin lg:-mx-8 lg:px-8">
        <div className="flex gap-3">
          {CRM_STATUSES.filter((s) => !hidden.includes(s)).map((s) => (
            <Column key={s} status={s} cards={byStatus.get(s) ?? []} disabled={!canEdit} />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>{active ? <Card card={active} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}
