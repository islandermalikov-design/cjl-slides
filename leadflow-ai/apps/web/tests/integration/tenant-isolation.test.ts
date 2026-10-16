import { beforeEach, describe, expect, it } from "vitest";
import { createCompany, getCompany, listCompanies, CompanyListQuerySchema, setCompanyStatus, softDeleteCompanies, updateCompany } from "@/server/services/companies";
import { upsertContact } from "@/server/services/contacts";
import { createDeal } from "@/server/services/deals";
import { createDraft, sendDraft } from "@/server/services/outreach";
import { createTask } from "@/server/services/tasks";
import { getProposal } from "@/server/services/proposals";
import { globalSearch } from "@/server/services/search";
import { createTenant, prisma, resetDb } from "../support/db";

describe("tenant isolation", () => {
  let a: { organizationId: string; userId: string };
  let b: { organizationId: string; userId: string };
  let companyA: string;

  beforeEach(async () => {
    await resetDb();
    a = await createTenant();
    b = await createTenant();
    companyA = (await createCompany(a, { name: "Секретная компания А", publicEmail: "a@a-secret.ru" })).id;
  });

  it("org B cannot list, read, update, or delete org A data", async () => {
    expect((await listCompanies(b.organizationId, CompanyListQuerySchema.parse({}))).total).toBe(0);
    await expect(getCompany(b.organizationId, companyA)).rejects.toThrow(/не найдена/);
    await expect(updateCompany(b, companyA, { name: "Взлом" })).rejects.toThrow(/не найдена/);
    await expect(setCompanyStatus(b, companyA, "WON")).rejects.toThrow(/не найдена/);
    expect(await softDeleteCompanies(b, [companyA])).toBe(0);
    const still = await prisma.company.findUniqueOrThrow({ where: { id: companyA } });
    expect(still.name).toBe("Секретная компания А");
    expect(still.deletedAt).toBeNull();
  });

  it("org B cannot attach contacts, deals, tasks, or drafts to org A company", async () => {
    await expect(upsertContact(b, { companyId: companyA, fullName: "X" })).rejects.toThrow();
    await expect(createDeal(b, { companyId: companyA, title: "X", amount: 1 })).rejects.toThrow();
    await expect(createTask(b, { title: "X", companyId: companyA })).rejects.toThrow();
    await expect(createDraft(b, { companyId: companyA, body: "Привет" })).rejects.toThrow();
  });

  it("org B cannot send org A drafts or read org A proposals; search is scoped", async () => {
    const draft = await createDraft(a, { companyId: companyA, body: "Текст", recipient: "a@a-secret.ru", legalBasis: "LEGITIMATE_INTEREST_B2B" });
    await expect(sendDraft(b, draft.id, { confirm: true })).rejects.toThrow(/не найден/);
    const p = await prisma.proposal.create({ data: { organizationId: a.organizationId, companyId: companyA, title: "КП А", serviceIds: [] } });
    await expect(getProposal(b.organizationId, p.id)).rejects.toThrow();
    const found = await globalSearch(b.organizationId, "Секретная");
    expect(found.companies).toHaveLength(0);
    expect((await globalSearch(a.organizationId, "Секретная")).companies).toHaveLength(1);
  });
});
