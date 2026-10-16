import "server-only";
import type { ActivityType, Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";

type Db = Prisma.TransactionClient | typeof prisma;

export async function logActivity(
  params: {
    organizationId: string;
    userId?: string | null;
    companyId?: string | null;
    dealId?: string | null;
    type: ActivityType;
    title: string;
    body?: string | null;
    meta?: Prisma.InputJsonValue;
  },
  db: Db = prisma,
) {
  return db.activity.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      companyId: params.companyId ?? null,
      dealId: params.dealId ?? null,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      meta: params.meta,
    },
  });
}

export async function notify(params: {
  organizationId: string;
  userId?: string | null;
  title: string;
  body?: string;
  link?: string;
}) {
  await prisma.notification.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      title: params.title,
      body: params.body,
      link: params.link,
    },
  });
}
