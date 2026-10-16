import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { MemberRole } from "@/generated/prisma/enums";
import { auth } from "./auth";
import { prisma } from "./db";
import { AppError, forbidden } from "./errors";

export interface RequestContext {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  role: MemberRole;
}

const ROLE_RANK: Record<MemberRole, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

/** Проверяет, что роль не ниже требуемой. */
export function hasRole(role: MemberRole, min: MemberRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function assertRole(ctx: Pick<RequestContext, "role">, min: MemberRole) {
  if (!hasRole(ctx.role, min)) throw forbidden();
}

/** Загружает контекст запроса: пользователь + организация. Кэшируется на время запроса. */
export const getContext = cache(async (): Promise<RequestContext | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;
  return {
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    role: membership.role,
  };
});

/** Для страниц: перенаправляет на вход, если сессии нет. */
export async function requirePageContext(): Promise<RequestContext> {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Для server actions и API: бросает ошибку, если сессии нет или роль ниже требуемой. */
export async function requireContext(min: MemberRole = "VIEWER"): Promise<RequestContext> {
  const ctx = await getContext();
  if (!ctx) throw new AppError("Требуется вход в систему", "UNAUTHORIZED", 401);
  assertRole(ctx, min);
  return ctx;
}
