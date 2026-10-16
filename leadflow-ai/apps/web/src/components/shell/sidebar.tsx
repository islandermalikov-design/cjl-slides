"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5 px-3 py-4" aria-label="Основная навигация">
      {NAV.map((section) => (
        <div key={section.title} className="flex flex-col gap-0.5">
          <div className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
            {section.title}
          </div>
          {section.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-8 items-center gap-2.5 rounded-[9px] px-2.5 text-[13.5px] font-medium transition-colors duration-150",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-1">
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-soft">
        <Zap className="size-4" fill="currentColor" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">LeadFlow AI</span>
        <span className="text-[11px] text-muted-foreground">B2B продажи</span>
      </span>
    </Link>
  );
}

export function Sidebar({ demoMode }: { demoMode: boolean }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <SidebarNav />
      </div>
      {demoMode ? (
        <div className="m-3 rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <div className="font-semibold">DEMO_MODE включён</div>
          <div className="mt-0.5 opacity-80">Сообщения только симулируются, AI работает по правилам без ключа.</div>
        </div>
      ) : null}
    </aside>
  );
}
