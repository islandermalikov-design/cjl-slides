"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markAllNotificationsRead } from "@/features/notifications/actions";
import { cn, relativeTime } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function Notifications({ items }: { items: NotificationItem[] }) {
  const unread = items.filter((i) => !i.readAt).length;
  const [pending, start] = useTransition();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Уведомления${unread ? `: ${unread} новых` : ""}`} className="relative">
          <Bell className="size-4" />
          {unread ? (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">Уведомления</div>
          {unread ? (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" disabled={pending} onClick={() => start(async () => void (await markAllNotificationsRead()))}>
              Отметить прочитанными
            </Button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">Новых уведомлений нет</div>
          ) : (
            items.map((n) => {
              const inner = (
                <div className={cn("flex gap-3 border-b px-4 py-3 text-sm last:border-0 hover:bg-muted/50", !n.readAt && "bg-accent/40")}>
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-primary")} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{n.title}</div>
                    {n.body ? <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div> : null}
                    <div className="mt-1 text-[11px] text-muted-foreground" suppressHydrationWarning>{relativeTime(n.createdAt)}</div>
                  </div>
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
