import { getAiStatus } from "@/server/ai/client";
import { prisma } from "@/server/db";
import { ProposalCreateForm } from "./proposal-create-form";

export async function NewProposalSection({ organizationId, companyId }: { organizationId: string; companyId?: string }) {
  const [companies, services, ai, scores] = await Promise.all([
    prisma.company.findMany({
      where: { organizationId, deletedAt: null, crmStatus: { not: "DO_NOT_CONTACT" } },
      select: { id: true, name: true, aiScore: true },
      orderBy: [{ aiScore: { sort: "desc", nulls: "last" } }, { name: "asc" }],
      take: 1000,
    }),
    prisma.service.findMany({ where: { organizationId, isActive: true }, orderBy: { priceFrom: "asc" } }),
    getAiStatus(organizationId),
    prisma.leadScore.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, select: { companyId: true, clientTasks: true }, take: 2000 }),
  ]);
  const tasksByCompany: Record<string, string> = {};
  for (const s of scores) if (!tasksByCompany[s.companyId]) tasksByCompany[s.companyId] = (s.clientTasks as string[]).join("; ");
  return (
    <ProposalCreateForm
      companies={companies}
      services={services.map((s) => ({ id: s.id, name: s.name, tier: s.tier, description: s.description, priceFrom: s.priceFrom, priceTo: s.priceTo, durationDays: s.durationDays }))}
      initialCompanyId={companies.some((c) => c.id === companyId) ? companyId : undefined}
      aiMode={ai.mode}
      aiMessage={ai.message}
      initialTasks={tasksByCompany}
    />
  );
}
