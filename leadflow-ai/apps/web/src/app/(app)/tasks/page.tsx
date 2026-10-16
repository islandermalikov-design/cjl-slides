import type { Metadata } from "next";
import { SquareCheck } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { NewTaskButton } from "@/features/tasks/task-dialog";
import { TaskScopes, TasksList } from "@/features/tasks/tasks-client";
import { sp, type SearchParams } from "@/lib/search-params";
import { hasRole, requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";
import { listTasks } from "@/server/services/tasks";

export const metadata: Metadata = { title: "Задачи" };

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const params = await searchParams;
  const scope = sp(params, "scope") ?? "open";
  const filter =
    scope === "done"
      ? { status: "DONE" as const }
      : scope === "all"
        ? {}
        : scope === "overdue" || scope === "today" || scope === "week"
          ? { scope: scope as "overdue" | "today" | "week" }
          : { status: "OPEN" as const };
  const now = new Date();
  const open = { organizationId: ctx.organizationId, status: { in: ["TODO" as const, "IN_PROGRESS" as const] } };
  const [tasks, companies, openCount, overdueCount] = await Promise.all([
    listTasks(ctx.organizationId, filter),
    prisma.company.findMany({ where: { organizationId: ctx.organizationId, deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.task.count({ where: open }),
    prisma.task.count({ where: { ...open, dueAt: { lt: now } } }),
  ]);
  const canEdit = hasRole(ctx.role, "MEMBER");
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Задачи"
        description="Звонки, повторные контакты, подготовка КП и договоров. Ответы клиентов автоматически создают задачи."
        actions={canEdit ? <NewTaskButton companies={companies} label="Новая задача" variant="default" size="default" /> : null}
      />
      <TaskScopes counts={{ open: openCount, overdue: overdueCount }} />
      {tasks.length === 0 ? (
        <EmptyState icon={SquareCheck} title="Задач нет" description="Создайте задачу или дождитесь ответа клиента — задача на ответ появится автоматически." />
      ) : (
        <Card className="overflow-hidden">
          <TasksList
            canEdit={canEdit}
            tasks={tasks.map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              dueAt: t.dueAt?.toISOString() ?? null,
              status: t.status,
              priority: t.priority,
              isFollowUp: t.isFollowUp,
              company: t.company,
              assignee: t.assignee,
            }))}
          />
        </Card>
      )}
    </div>
  );
}
