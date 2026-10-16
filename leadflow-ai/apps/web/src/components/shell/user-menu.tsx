"use client";

import { LogOut, Settings, ScrollText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

export function UserMenu({ name, email, orgName, roleLabel }: { name: string; email: string; orgName: string; roleLabel: string }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-[10px] p-1 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label="Меню профиля">
        <Avatar name={name} className="size-7" />
        <span className="hidden max-w-[140px] flex-col items-start text-left leading-tight md:flex">
          <span className="truncate text-[13px] font-medium">{name}</span>
          <span className="truncate text-[11px] text-muted-foreground">{roleLabel}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium text-foreground">{name}</div>
          <div className="truncate text-xs">{email}</div>
          <div className="mt-1 truncate text-xs">{orgName}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Настройки
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/audit">
            <ScrollText /> Журнал событий
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={async () => {
            await authClient.signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          <LogOut /> Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
