import type { LucideIcon } from "lucide-react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[14px] border border-dashed bg-card/50 px-6 py-14 text-center", className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-[12px] bg-accent text-primary">
        <Icon className="size-5" />
      </div>
      <div className="text-[15px] font-semibold">{title}</div>
      {description ? <div className="mt-1 max-w-md text-sm text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "Не удалось загрузить данные", description, action }: { title?: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-red-200 bg-red-50/60 px-6 py-12 text-center dark:border-red-500/30 dark:bg-red-500/5">
      <div className="mb-3 flex size-11 items-center justify-center rounded-[12px] bg-red-100 text-red-600 dark:bg-red-500/15">
        <CircleAlert className="size-5" />
      </div>
      <div className="text-[15px] font-semibold">{title}</div>
      {description ? <div className="mt-1 max-w-md text-sm text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
