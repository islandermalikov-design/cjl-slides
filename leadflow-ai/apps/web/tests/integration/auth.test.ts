import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTenant, prisma, resetDb } from "../support/db";

// next/headers недоступен вне запроса Next — заглушка для плагина nextCookies.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
  headers: async () => new Headers(),
}));

describe("authentication", () => {
  beforeEach(resetDb);

  it("sign-up hashes the password and provisions an organization with OWNER role", async () => {
    const { auth } = await import("@/server/auth");
    const res = await auth.api.signUpEmail({ body: { email: "new@test.local", password: "strong-pass-123", name: "Новый" } });
    expect(res.user.email).toBe("new@test.local");
    const account = await prisma.account.findFirstOrThrow({ where: { userId: res.user.id } });
    expect(account.password).toBeTruthy();
    expect(account.password).not.toContain("strong-pass-123");
    const membership = await prisma.organizationMember.findFirstOrThrow({ where: { userId: res.user.id }, include: { organization: { include: { stages: true, services: true } } } });
    expect(membership.role).toBe("OWNER");
    expect(membership.organization.stages.length).toBeGreaterThan(0);
    expect(membership.organization.services.length).toBe(3);
  });

  it("rejects wrong passwords and short passwords", async () => {
    const { auth } = await import("@/server/auth");
    await auth.api.signUpEmail({ body: { email: "user@test.local", password: "correct-horse-1", name: "U" } });
    await expect(auth.api.signInEmail({ body: { email: "user@test.local", password: "wrong-password" } })).rejects.toThrow();
    await expect(auth.api.signUpEmail({ body: { email: "short@test.local", password: "123", name: "S" } })).rejects.toThrow();
    const ok = await auth.api.signInEmail({ body: { email: "user@test.local", password: "correct-horse-1" } });
    expect(ok.token).toBeTruthy();
  });

  it("role hierarchy enforces permissions", async () => {
    const { assertRole, hasRole } = await import("@/server/context");
    expect(hasRole("VIEWER", "MEMBER")).toBe(false);
    expect(hasRole("ADMIN", "MEMBER")).toBe(true);
    expect(() => assertRole({ role: "MEMBER" }, "ADMIN")).toThrow(/прав/);
    const t = await createTenant("VIEWER");
    const m = await prisma.organizationMember.findFirstOrThrow({ where: { userId: t.userId } });
    expect(m.role).toBe("VIEWER");
  });
});
