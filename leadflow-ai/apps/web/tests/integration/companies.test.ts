import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import {
  addTagsToCompanies,
  createCompany,
  getCompany,
  listCompanies,
  CompanyListQuerySchema,
  mergeCompanies,
  scanDuplicates,
  setCompanyStatus,
  softDeleteCompanies,
  updateCompany,
} from "@/server/services/companies";
import { createTenant, prisma, resetDb } from "../support/db";

describe("companies CRUD and deduplication", () => {
  let ctx: { organizationId: string; userId: string };
  beforeEach(async () => {
    await resetDb();
    ctx = await createTenant();
  });

  it("creates a company with normalized fields and an activity", async () => {
    const c = await createCompany(ctx, { name: "ООО «Ромашка»", website: "www.Romashka.ru/", publicPhone: "8 (900) 123-45-67", publicEmail: "Sales@Romashka.ru", sourceUrl: "https://romashka.ru/contacts" });
    expect(c.domain).toBe("romashka.ru");
    expect(c.normalizedName).toBe("ромашка");
    expect(c.publicPhone).toBe("79001234567");
    expect(c.publicEmail).toBe("sales@romashka.ru");
    expect(c.verifiedAt).not.toBeNull();
    const full = await getCompany(ctx.organizationId, c.id);
    expect(full.activities.length).toBeGreaterThan(0);
    expect(full.evidence.some((e) => e.kind === "CONTACT")).toBe(true);
  });

  it("validates input (INN, email)", async () => {
    await expect(createCompany(ctx, { name: "X", inn: "123" })).rejects.toThrow();
    await expect(createCompany(ctx, { name: "X", publicEmail: "not-an-email" })).rejects.toThrow();
    await expect(createCompany(ctx, { name: "" })).rejects.toThrow();
  });

  it("blocks duplicates by domain/INN, allows name duplicates only with explicit flag", async () => {
    await createCompany(ctx, { name: "Альфа", website: "alfa.ru", inn: "7707083893" });
    await expect(createCompany(ctx, { name: "Альфа Трейд", website: "https://www.alfa.ru" })).rejects.toBeInstanceOf(AppError);
    await expect(createCompany(ctx, { name: "Другая", inn: "7707083893" })).rejects.toThrow(/уже есть/);
    await createCompany(ctx, { name: "Бета", city: "Казань" });
    await expect(createCompany(ctx, { name: "ООО Бета", city: "Казань" })).rejects.toThrow();
    const dup = await createCompany(ctx, { name: "ООО Бета", city: "Казань" }, { allowDuplicate: true });
    expect(dup.id).toBeTruthy();
    const scan = await scanDuplicates(ctx.organizationId);
    expect(scan.groups.length).toBe(1);
  });

  it("free-mail domains do not collide", async () => {
    await createCompany(ctx, { name: "Один", publicEmail: "one@gmail.com" });
    const two = await createCompany(ctx, { name: "Два", publicEmail: "two@gmail.com" });
    expect(two.domain).toBeNull();
  });

  it("updates, filters, tags, soft-deletes", async () => {
    const a = await createCompany(ctx, { name: "Магазин А", city: "Москва", marketplace: "OZON", website: "a.ru" });
    await createCompany(ctx, { name: "Магазин Б", city: "Казань" });
    await updateCompany(ctx, a.id, { name: "Магазин А+", city: "Москва", marketplace: "OZON", website: "a.ru", niche: "Продавец Ozon" });
    await addTagsToCompanies(ctx.organizationId, [a.id], ["Горячий лид", "Горячий лид"]);
    const q = CompanyListQuerySchema.parse({ marketplace: "OZON" });
    const res = await listCompanies(ctx.organizationId, q);
    expect(res.total).toBe(1);
    expect(res.items[0]!.name).toBe("Магазин А+");
    expect(res.items[0]!.tags).toHaveLength(1);
    const withSite = await listCompanies(ctx.organizationId, CompanyListQuerySchema.parse({ hasWebsite: "yes" }));
    expect(withSite.total).toBe(1);
    expect(await softDeleteCompanies(ctx, [a.id])).toBe(1);
    expect((await listCompanies(ctx.organizationId, CompanyListQuerySchema.parse({}))).total).toBe(1);
    // После мягкого удаления домен освобождается для повторного добавления
    await expect(createCompany(ctx, { name: "Магазин А", website: "a.ru" })).resolves.toBeTruthy();
  });

  it("CRM status change is persisted, logged, and DO_NOT_CONTACT suppresses contacts", async () => {
    const c = await createCompany(ctx, { name: "Гамма", publicEmail: "info@gamma.ru" });
    await setCompanyStatus(ctx, c.id, "VERIFIED");
    await setCompanyStatus(ctx, c.id, "DO_NOT_CONTACT");
    const fresh = await prisma.company.findUniqueOrThrow({ where: { id: c.id } });
    expect(fresh.crmStatus).toBe("DO_NOT_CONTACT");
    const changes = await prisma.activity.count({ where: { companyId: c.id, type: "STATUS_CHANGE" } });
    expect(changes).toBe(2);
    const sup = await prisma.suppressionEntry.findFirst({ where: { organizationId: ctx.organizationId, value: "info@gamma.ru" } });
    expect(sup).not.toBeNull();
  });

  it("merges a duplicate into the primary record", async () => {
    const a = await createCompany(ctx, { name: "Дельта", city: "Казань" });
    const b = await createCompany(ctx, { name: "ООО Дельта", city: "Казань", publicEmail: "d@delta.ru" }, { allowDuplicate: true });
    await prisma.task.create({ data: { organizationId: ctx.organizationId, companyId: b.id, title: "Позвонить" } });
    await mergeCompanies(ctx, a.id, b.id);
    const merged = await prisma.company.findUniqueOrThrow({ where: { id: a.id } });
    expect(merged.publicEmail).toBe("d@delta.ru");
    expect(await prisma.task.count({ where: { companyId: a.id } })).toBe(1);
    expect((await prisma.company.findUniqueOrThrow({ where: { id: b.id } })).deletedAt).not.toBeNull();
  });
});
