import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { sp, type SearchParams } from "@/lib/search-params";
import { requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Журнал событий" };

const ACTION_LABELS: Record<string, string> = {
  "company.create": "Создание компании",
  "company.update": "Изменение компании",
  "company.delete": "Удаление компаний",
  "company.erase": "Безвозвратное удаление компании",
  "company.export": "Экспорт компаний",
  "company.merge": "Объединение дублей",
  "company.bulk_status": "Массовая смена статуса",
  "import.start": "Импорт файла",
  "discovery.start": "Поиск компаний",
  "proposal.create": "Создание КП",
  "proposal.delete": "Удаление КП",
  "proposal.pdf": "Экспорт КП в PDF",
  "message.approve": "Согласование сообщения",
  "message.send": "Отправка сообщения",
  "message.reply": "Ответ клиента",
  "message.opt_out": "Отписка адресата",
  "deal.create": "Создание сделки",
  "deal.delete": "Удаление сделки",
  "integration.save": "Сохранение ключа интеграции",
  "integration.delete": "Удаление ключа интеграции",
  "member.add": "Добавление участника",
  "member.role": "Смена роли",
  "member.remove": "Удаление участника",
  "suppression.add": "Добавление в исключения",
  "suppression.remove": "Удаление из исключений",
  "data.export": "Экспорт всех данных",
  "data.purge_demo": "Удаление DEMO-данных",
  "seed.completed": "Загрузка DEMO-данных",
};

const GROUPS = [
  ["", "Все"],
  ["company", "Компании"],
  ["message", "Сообщения"],
  ["proposal", "КП"],
  ["integration", "Интеграции"],
  ["member", "Команда"],
  ["data", "Данные"],
] as const;

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const params = await searchParams;
  const page = Math.max(1, Number(sp(params, "page")) || 1);
  const group = sp(params, "group") ?? "";
  const pageSize = 50;
  const where = { organizationId: ctx.organizationId, ...(group ? { action: { startsWith: `${group}.` } } : {}) };
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { user: { select: { name: true, email: true } } } }),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Журнал событий" description="Аудит значимых действий: изменения данных, отправки, экспорт, доступы. Секреты в журнал не записываются." />
      <div className="flex flex-wrap gap-1.5">
        {GROUPS.map(([key, label]) => (
          <Link key={key || "all"} href={key ? `/audit?group=${key}` : "/audit"} className={cn("inline-flex h-7 items-center rounded-[8px] border px-2.5 text-[12.5px] font-medium", group === key ? "border-primary bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
            {label}
          </Link>
        ))}
      </div>
      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="Событий нет" />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Время</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>Объект</TableHead>
                <TableHead>Детали</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(l.createdAt)}</TableCell>
                  <TableCell className="text-[13px]">{l.user?.name ?? "Система"}</TableCell>
                  <TableCell className="text-[13px] font-medium">{ACTION_LABELS[l.action] ?? l.action}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {l.entityType}
                    {l.entityId ? `:${l.entityId.slice(-8)}` : ""}
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate font-mono text-xs text-muted-foreground">{l.meta ? JSON.stringify(l.meta) : ""}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.ip ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t px-3">
            <Pagination total={total} page={page} pageSize={pageSize} />
          </div>
        </Card>
      )}
    </div>
  );
}
