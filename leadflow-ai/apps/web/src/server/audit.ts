import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { redact } from "./logger";

export async function audit(params: {
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        meta: params.meta ? (redact(params.meta) as Prisma.InputJsonValue) : undefined,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch {
    // Журнал не должен ломать основную операцию.
  }
}
