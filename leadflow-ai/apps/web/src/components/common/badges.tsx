import {
  CRM_STATUS_LABELS,
  DEAL_STATUS_LABELS,
  JOB_STATUS_LABELS,
  MESSAGE_STATUS_LABELS,
  PROPOSAL_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  type CrmStatusValue,
  type DealStatusValue,
  type JobStatusValue,
  type MessageStatusValue,
  type ProposalStatusValue,
  type TaskPriorityValue,
} from "@leadflow/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "success" | "destructive" | "warning" | "violet" | "outline";

export const CRM_STATUS_VARIANT: Record<CrmStatusValue, Variant> = {
  NEW: "secondary",
  VERIFIED: "outline",
  PREPARE_PROPOSAL: "warning",
  PROPOSAL_READY: "violet",
  CONTACTED: "default",
  REPLIED: "default",
  NEGOTIATION: "violet",
  WON: "success",
  LOST: "destructive",
  DO_NOT_CONTACT: "destructive",
};

export const CRM_STATUS_DOT: Record<CrmStatusValue, string> = {
  NEW: "bg-slate-400",
  VERIFIED: "bg-sky-500",
  PREPARE_PROPOSAL: "bg-amber-500",
  PROPOSAL_READY: "bg-violet-500",
  CONTACTED: "bg-blue-500",
  REPLIED: "bg-cyan-500",
  NEGOTIATION: "bg-indigo-500",
  WON: "bg-green-600",
  LOST: "bg-red-500",
  DO_NOT_CONTACT: "bg-red-800",
};

export function CrmStatusBadge({ status }: { status: CrmStatusValue }) {
  return (
    <Badge variant={CRM_STATUS_VARIANT[status]}>
      <span className={cn("size-1.5 rounded-full", CRM_STATUS_DOT[status])} />
      {CRM_STATUS_LABELS[status]}
    </Badge>
  );
}

const MESSAGE_VARIANT: Record<MessageStatusValue, Variant> = {
  DRAFT: "secondary",
  PENDING_REVIEW: "warning",
  APPROVED: "violet",
  SENT: "default",
  DELIVERED: "default",
  REPLIED: "success",
  FAILED: "destructive",
  OPTED_OUT: "destructive",
};
export function MessageStatusBadge({ status }: { status: MessageStatusValue }) {
  return <Badge variant={MESSAGE_VARIANT[status]}>{MESSAGE_STATUS_LABELS[status]}</Badge>;
}

const PROPOSAL_VARIANT: Record<ProposalStatusValue, Variant> = {
  DRAFT: "secondary",
  READY: "violet",
  SENT: "default",
  ACCEPTED: "success",
  REJECTED: "destructive",
  ARCHIVED: "outline",
};
export function ProposalStatusBadge({ status }: { status: ProposalStatusValue }) {
  return <Badge variant={PROPOSAL_VARIANT[status]}>{PROPOSAL_STATUS_LABELS[status]}</Badge>;
}

export function DealStatusBadge({ status }: { status: DealStatusValue }) {
  return <Badge variant={status === "WON" ? "success" : status === "LOST" ? "destructive" : "default"}>{DEAL_STATUS_LABELS[status]}</Badge>;
}

export function JobStatusBadge({ status }: { status: JobStatusValue }) {
  const v: Record<JobStatusValue, Variant> = { QUEUED: "secondary", RUNNING: "default", SUCCEEDED: "success", FAILED: "destructive", CANCELLED: "outline" };
  return <Badge variant={v[status]}>{JOB_STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TaskPriorityValue }) {
  const v: Record<TaskPriorityValue, Variant> = { LOW: "secondary", MEDIUM: "outline", HIGH: "warning", URGENT: "destructive" };
  return <Badge variant={v[priority]}>{TASK_PRIORITY_LABELS[priority]}</Badge>;
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="demo" className={className} title="Демонстрационные данные">
      DEMO
    </Badge>
  );
}

export function ScoreBadge({ score, className }: { score: number | null | undefined; className?: string }) {
  if (score === null || score === undefined) return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  const tone =
    score >= 70
      ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400"
      : score >= 45
        ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400"
        : "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400";
  return (
    <span className={cn("inline-flex h-6 min-w-9 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums ring-1 ring-inset", tone, className)}>
      {score}
    </span>
  );
}
