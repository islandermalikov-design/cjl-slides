import { prisma } from "@/server/db";
import { DEFAULT_PIPELINE_STAGES, DEFAULT_SERVICES } from "@/server/defaults";

const TABLES = [
  "Notification",
  "AiUsage",
  "AppSetting",
  "AuditLog",
  "IntegrationCredential",
  "BackgroundJob",
  "DiscoveryJob",
  "ImportJob",
  "SuppressionEntry",
  "CommunicationConsent",
  "Message",
  "MessageDraft",
  "ProposalVersion",
  "Proposal",
  "Service",
  "Task",
  "Activity",
  "Deal",
  "PipelineStage",
  "CompanyTag",
  "LeadTag",
  "LeadScore",
  "LeadEvidence",
  "LeadSource",
  "Contact",
  "Company",
  "OrganizationMember",
  "Organization",
  "Session",
  "Account",
  "Verification",
  "User",
];

export async function resetDb() {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
}

let counter = 0;

/** Создаёт пользователя и организацию; возвращает контекст как у server actions. */
export async function createTenant(role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" = "OWNER") {
  counter++;
  const user = await prisma.user.create({ data: { id: `user-${Date.now()}-${counter}`, email: `u${Date.now()}${counter}@test.local`, name: `User ${counter}` } });
  const org = await prisma.organization.create({
    data: {
      name: `Org ${counter}`,
      slug: `org-${Date.now()}-${counter}`,
      members: { create: { userId: user.id, role } },
      stages: { create: DEFAULT_PIPELINE_STAGES },
      services: { create: DEFAULT_SERVICES.map((s) => ({ ...s, features: s.features })) },
    },
  });
  return { organizationId: org.id, userId: user.id };
}

export { prisma };
