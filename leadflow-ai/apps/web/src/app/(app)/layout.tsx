import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePageContext();
  const notifications = await prisma.notification.findMany({
    where: { organizationId: ctx.organizationId, OR: [{ userId: ctx.userId }, { userId: null }] },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  return (
    <div className="min-h-screen">
      <Sidebar demoMode={process.env.DEMO_MODE === "true"} />
      <div className="lg:pl-64">
        <Topbar
          ctx={ctx}
          notifications={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            link: n.link,
            readAt: n.readAt?.toISOString() ?? null,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
