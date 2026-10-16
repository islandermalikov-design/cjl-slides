import "server-only";
import { prisma } from "./db";
import { DEFAULT_PIPELINE_STAGES, DEFAULT_SERVICES } from "./defaults";

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return `${base || "org"}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Создаёт рабочее пространство для нового пользователя (если он ещё не состоит
 * ни в одной организации): организация, роль OWNER, этапы воронки и каталог услуг.
 */
export async function provisionOrganizationForUser(userId: string, userName: string) {
  const existing = await prisma.organizationMember.findFirst({ where: { userId } });
  if (existing) return existing.organizationId;
  const org = await prisma.organization.create({
    data: {
      name: userName ? `Рабочее пространство ${userName}` : "Моё рабочее пространство",
      slug: slugify(userName || "org"),
      members: { create: { userId, role: "OWNER" } },
      stages: { create: DEFAULT_PIPELINE_STAGES.map((s) => ({ ...s })) },
      services: { create: DEFAULT_SERVICES.map((s) => ({ ...s, features: s.features })) },
    },
  });
  return org.id;
}
