import { describe, expect, it } from "vitest";
import {
  dedupeWithin,
  dedupeKeys,
  duplicateReason,
  escapeCsvFormula,
  guessImportMapping,
  isSafePublicUrl,
  normalizeCompanyName,
  normalizeDomain,
  normalizePhone,
  normalizeSuppressionValue,
  normalizeLeadScore,
  sanitizeImportedCell,
  toCsv,
  LeadScoreResultSchema,
} from "../src";

describe("normalize", () => {
  it("normalizes company names without legal forms and quotes", () => {
    expect(normalizeCompanyName('ООО «Ромашка»')).toBe("ромашка");
    expect(normalizeCompanyName("ИП Иванов И.И.")).toBe("иванов и и");
    expect(normalizeCompanyName("Торговый дом Ёлка")).toBe("елка");
  });
  it("extracts domains", () => {
    expect(normalizeDomain("https://www.Example.ru/contacts")).toBe("example.ru");
    expect(normalizeDomain("example.ru")).toBe("example.ru");
    expect(normalizeDomain("info@shop.ru")).toBe("shop.ru");
    expect(normalizeDomain("nonsense")).toBeNull();
    expect(normalizeDomain("")).toBeNull();
  });
  it("normalizes russian phones", () => {
    expect(normalizePhone("8 (900) 123-45-67")).toBe("79001234567");
    expect(normalizePhone("+7 900 123 45 67")).toBe("79001234567");
    expect(normalizePhone("123")).toBeNull();
  });
  it("detects suppression value kind", () => {
    expect(normalizeSuppressionValue("Info@Shop.ru")).toEqual({ kind: "email", value: "info@shop.ru" });
    expect(normalizeSuppressionValue("+7 (900) 123-45-67")).toEqual({ kind: "phone", value: "79001234567" });
    expect(normalizeSuppressionValue("https://shop.ru")).toEqual({ kind: "domain", value: "shop.ru" });
  });
});

describe("dedupe", () => {
  it("finds duplicates by domain, inn, email and name+city", () => {
    const a = dedupeKeys({ name: "ООО Ромашка", website: "romashka.ru", city: "Москва" });
    const b = dedupeKeys({ name: "Ромашка", website: "https://www.romashka.ru", city: "Казань" });
    expect(duplicateReason(a, b)).toBe("domain");
    const c = dedupeKeys({ name: "Ромашка", city: "москва" });
    const d = dedupeKeys({ name: "ООО «Ромашка»", city: "Москва" });
    expect(duplicateReason(c, d)).toBe("name_city");
    const e = dedupeKeys({ name: "A", inn: "7707083893" });
    const f = dedupeKeys({ name: "B", inn: "7707083893" });
    expect(duplicateReason(e, f)).toBe("inn");
  });
  it("does not treat free mail domains as company domains", () => {
    const a = dedupeKeys({ name: "Альфа", publicEmail: "alfa@gmail.com" });
    const b = dedupeKeys({ name: "Бета", publicEmail: "beta@gmail.com" });
    expect(duplicateReason(a, b)).toBeNull();
  });
  it("dedupes inside a batch", () => {
    const { unique, duplicates } = dedupeWithin([
      { name: "Альфа", website: "alfa.ru" },
      { name: "Альфа Трейд", website: "www.alfa.ru" },
      { name: "Бета", website: "beta.ru" },
    ]);
    expect(unique).toHaveLength(2);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]!.reason).toBe("domain");
  });
});

describe("csv safety", () => {
  it("escapes formula injection on export", () => {
    expect(escapeCsvFormula("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(escapeCsvFormula("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsvFormula("-150")).toBe("-150");
    expect(escapeCsvFormula("Обычный текст")).toBe("Обычный текст");
  });
  it("sanitizes imported cells", () => {
    expect(sanitizeImportedCell("=cmd|' /C calc'!A0")).toBe("cmd|' /C calc'!A0");
    expect(sanitizeImportedCell("+7 900 123-45-67")).toBe("+7 900 123-45-67");
    expect(sanitizeImportedCell(null)).toBe("");
    expect(sanitizeImportedCell(42)).toBe("42");
  });
  it("builds csv with quoting", () => {
    const csv = toCsv(["a", "b"], [["x;y", "=1+1"]]);
    expect(csv).toContain('"x;y"');
    expect(csv).toContain("'=1+1");
  });
});

describe("import mapping", () => {
  it("guesses columns from russian headers", () => {
    const m = guessImportMapping(["Название", "Сайт", "Город", "Email", "Телефон", "Что-то"]);
    expect(m).toEqual({
      Название: "name",
      Сайт: "website",
      Город: "city",
      Email: "publicEmail",
      Телефон: "publicPhone",
      "Что-то": "skip",
    });
  });
});

describe("url safety", () => {
  it("blocks private and non-http targets", () => {
    expect(isSafePublicUrl("http://localhost:3000").ok).toBe(false);
    expect(isSafePublicUrl("http://127.0.0.1").ok).toBe(false);
    expect(isSafePublicUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(isSafePublicUrl("file:///etc/passwd").ok).toBe(false);
    expect(isSafePublicUrl("http://10.0.0.5").ok).toBe(false);
    expect(isSafePublicUrl("https://example.ru:8443").ok).toBe(false);
    expect(isSafePublicUrl("https://example.ru/contacts").ok).toBe(true);
  });
});

describe("ai schemas", () => {
  it("rejects invalid score json and normalizes totals", () => {
    expect(LeadScoreResultSchema.safeParse({ score: 120 }).success).toBe(false);
    const parsed = LeadScoreResultSchema.parse({
      score: 99,
      summary: "s",
      breakdown: [
        { criterion: "audience_fit", points: 25, comment: "" },
        { criterion: "contact_channel", points: 20, comment: "" },
        { criterion: "audience_fit", points: 10, comment: "dup" },
      ],
      reasons: [],
      facts: [],
      hypotheses: [],
      recommendations: [],
      unknowns: [],
      clientTasks: [],
      recommendedProduct: "x",
      recommendedTier: "START",
    });
    const n = normalizeLeadScore(parsed);
    expect(n.breakdown).toHaveLength(2);
    expect(n.score).toBe(40);
  });
});
