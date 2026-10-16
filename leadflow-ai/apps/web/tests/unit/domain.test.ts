import { LeadScoreResultSchema, ProposalGenerationSchema } from "@leadflow/shared";
import { describe, expect, it } from "vitest";
import { heuristicScore, type ScoringInput } from "@/server/domain/heuristic-score";
import { templateProposal } from "@/server/domain/proposal-template";

const base: ScoringInput = {
  name: "Тест",
  legalName: null,
  website: "https://shop.ru",
  category: "Одежда",
  niche: "Продавец Wildberries",
  city: "Казань",
  region: null,
  marketplace: "Wildberries",
  hasPublicEmail: true,
  hasPublicPhone: false,
  sourceUrl: "https://shop.ru/contacts",
  verifiedAt: new Date().toISOString(),
  notes: "Отчёты собирают вручную в Excel",
  tags: [],
  contacts: [],
  evidence: [],
};

describe("heuristic lead score (DEMO_MODE)", () => {
  it("returns schema-valid result with total equal to sum of criteria", () => {
    const r = heuristicScore(base);
    expect(LeadScoreResultSchema.safeParse(r).success).toBe(true);
    expect(r.score).toBe(r.breakdown.reduce((s, b) => s + b.points, 0));
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
  it("ranks a marketplace seller with contacts above an unknown company without contacts", () => {
    const weak = heuristicScore({ ...base, niche: null, category: null, marketplace: "Не указана", notes: null, hasPublicEmail: false, website: null, sourceUrl: null });
    expect(heuristicScore(base).score).toBeGreaterThan(weak.score);
    expect(weak.breakdown.find((b) => b.criterion === "contact_channel")!.points).toBe(0);
  });
  it("never claims revenue — revenue is always listed as unknown", () => {
    expect(heuristicScore(base).unknowns.join(" ")).toMatch(/Оборот/);
  });
});

describe("template proposal", () => {
  const services = [
    { name: "BUSINESS: аналитика", tier: "BUSINESS" as const, description: "Описание", features: ["Учёт продаж", "Дашборд"], priceFrom: 15000, priceTo: 35000, durationDays: 14 },
  ];
  const sender = { name: "Иван", email: "ivan@example.ru", phone: "+7 900", website: "https://ivan.example", signature: "Иван" };

  it("produces schema-valid content using the given price and duration", () => {
    const g = templateProposal({ companyName: "ООО Ромашка", niche: null, marketplace: "WILDBERRIES", services, totalPrice: 20000, durationDays: 10, sender });
    expect(ProposalGenerationSchema.safeParse(g).success).toBe(true);
    expect(g.content.totalPrice).toBe(20000);
    expect(g.content.durationDays).toBe(10);
    expect(g.content.contacts.email).toBe("ivan@example.ru");
  });
  it("does not invent cases, reviews or savings promises", () => {
    const g = templateProposal({ companyName: "Ромашка", niche: null, marketplace: null, services, totalPrice: 15000, durationDays: 14, sender });
    const all = JSON.stringify(g).toLowerCase();
    for (const banned of ["кейс", "отзыв", "экономия до", "гарантируем", "окупаемост"]) expect(all).not.toContain(banned);
  });
});
