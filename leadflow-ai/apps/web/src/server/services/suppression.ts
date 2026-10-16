import "server-only";
import { normalizeDomain, normalizeEmail, normalizePhone, normalizeSuppressionValue } from "@leadflow/shared";
import { prisma } from "../db";
import { AppError } from "../errors";

export async function listSuppression(organizationId: string) {
  return prisma.suppressionEntry.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 1000 });
}

export async function addSuppression(organizationId: string, raw: string, reason: string | null, source = "manual") {
  const parsed = normalizeSuppressionValue(raw);
  if (!parsed) throw new AppError("Укажите email, телефон или домен");
  return prisma.suppressionEntry.upsert({
    where: { organizationId_value: { organizationId, value: parsed.value } },
    create: { organizationId, value: parsed.value, kind: parsed.kind, reason, source },
    update: { reason: reason ?? undefined },
  });
}

export async function removeSuppression(organizationId: string, id: string) {
  await prisma.suppressionEntry.deleteMany({ where: { id, organizationId } });
}

/** Проверяет адрес по suppression list: точное совпадение email/телефона или домена email. */
export async function isSuppressed(organizationId: string, recipient: string): Promise<{ suppressed: boolean; entry?: string }> {
  const values = new Set<string>();
  const email = normalizeEmail(recipient);
  if (email) {
    values.add(email);
    const domain = normalizeDomain(email);
    if (domain) values.add(domain);
  }
  const phone = normalizePhone(recipient);
  if (phone && !email) values.add(phone);
  if (!values.size) values.add(recipient.trim().toLowerCase());
  const hit = await prisma.suppressionEntry.findFirst({ where: { organizationId, value: { in: [...values] } } });
  return hit ? { suppressed: true, entry: hit.value } : { suppressed: false };
}
