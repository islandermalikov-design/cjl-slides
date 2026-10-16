import "server-only";
import { prisma } from "../db";

/** Полный экспорт данных организации (JSON) — для переносимости и запросов субъектов данных. Секреты не экспортируются. */
export async function exportOrganizationData(organizationId: string) {
  const where = { organizationId };
  const [organization, companies, contacts, evidence, scores, tags, deals, stages, activities, tasks, services, proposals, drafts, messages, consents, suppressions, sources, settings] =
    await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true, slug: true, createdAt: true } }),
      prisma.company.findMany({ where, include: { tags: true } }),
      prisma.contact.findMany({ where }),
      prisma.leadEvidence.findMany({ where }),
      prisma.leadScore.findMany({ where }),
      prisma.leadTag.findMany({ where }),
      prisma.deal.findMany({ where }),
      prisma.pipelineStage.findMany({ where }),
      prisma.activity.findMany({ where }),
      prisma.task.findMany({ where }),
      prisma.service.findMany({ where }),
      prisma.proposal.findMany({ where, include: { versions: true } }),
      prisma.messageDraft.findMany({ where }),
      prisma.message.findMany({ where }),
      prisma.communicationConsent.findMany({ where }),
      prisma.suppressionEntry.findMany({ where }),
      prisma.leadSource.findMany({ where }),
      prisma.appSetting.findMany({ where }),
    ]);
  return {
    exportedAt: new Date().toISOString(),
    format: "leadflow-export-v1",
    organization,
    companies,
    contacts,
    evidence,
    scores,
    tags,
    deals,
    stages,
    activities,
    tasks,
    services,
    proposals,
    drafts,
    messages,
    consents,
    suppressions,
    sources,
    settings,
  };
}

/** Удаление всех DEMO-данных организации. */
export async function purgeDemoData(organizationId: string) {
  const where = { organizationId, isDemo: true };
  const res = await prisma.$transaction([
    prisma.message.deleteMany({ where }),
    prisma.messageDraft.deleteMany({ where }),
    prisma.proposal.deleteMany({ where }),
    prisma.task.deleteMany({ where }),
    prisma.deal.deleteMany({ where }),
    prisma.activity.deleteMany({ where }),
    prisma.contact.deleteMany({ where }),
    prisma.company.deleteMany({ where }),
    prisma.leadSource.deleteMany({ where }),
  ]);
  return res.reduce((s, r) => s + r.count, 0);
}

/** Безвозвратное удаление компании и всех связанных с ней данных (право на удаление). */
export async function hardDeleteCompany(organizationId: string, companyId: string) {
  const res = await prisma.company.deleteMany({ where: { id: companyId, organizationId } });
  return res.count;
}

/** Удаление организации целиком (каскадно). */
export async function deleteOrganization(organizationId: string) {
  await prisma.organization.delete({ where: { id: organizationId } });
}
