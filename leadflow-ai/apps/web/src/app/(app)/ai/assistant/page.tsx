import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { AssistantChat } from "@/features/ai/assistant-chat";
import { sp, type SearchParams } from "@/lib/search-params";
import { getAiStatus } from "@/server/ai/client";
import { requirePageContext } from "@/server/context";
import { prisma } from "@/server/db";

export const metadata: Metadata = { title: "AI-ассистент" };

export default async function AssistantPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePageContext();
  const params = await searchParams;
  const [ai, companies] = await Promise.all([
    getAiStatus(ctx.organizationId),
    prisma.company.findMany({ where: { organizationId: ctx.organizationId, deletedAt: null }, select: { id: true, name: true }, orderBy: [{ updatedAt: "desc" }], take: 300 }),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="AI-ассистент" description="Анализ компании, объяснение Score, следующий шаг, ответы клиентам, сводка истории и анализ продаж." />
      <AssistantChat companies={companies} initialCompanyId={sp(params, "companyId")} mode={ai.mode} />
    </div>
  );
}
