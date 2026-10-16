import { MEMBER_ROLE_LABELS } from "@leadflow/shared";
import type { RequestContext } from "@/server/context";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandSearch } from "./command-search";
import { MobileNav } from "./mobile-nav";
import { Notifications, type NotificationItem } from "./notifications";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function Topbar({ ctx, notifications }: { ctx: RequestContext; notifications: NotificationItem[] }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 lg:px-6">
      <MobileNav />
      <div className="hidden min-w-0 flex-1 md:block">
        <Breadcrumbs />
      </div>
      <div className="flex flex-1 justify-end md:flex-none md:justify-center">
        <div className="w-full max-w-sm md:w-80">
          <CommandSearch />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Notifications items={notifications} />
        <UserMenu name={ctx.userName} email={ctx.userEmail} orgName={ctx.organizationName} roleLabel={MEMBER_ROLE_LABELS[ctx.role]} />
      </div>
    </header>
  );
}
