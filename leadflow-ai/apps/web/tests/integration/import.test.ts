import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it } from "vitest";
import { createCompany } from "@/server/services/companies";
import { buildPreview, createImportJob, parseImportFile, runImport } from "@/server/services/imports";
import { createTenant, prisma, resetDb } from "../support/db";

describe("CSV/XLSX import", () => {
  let ctx: { organizationId: string; userId: string };
  beforeEach(async () => {
    await resetDb();
    ctx = await createTenant();
  });

  it("parses UTF-8 CSV with semicolons, guesses mapping, neutralizes formulas", async () => {
    const csv = "Название;Сайт;Город;Email;Телефон\nРомашка;romashka.ru;Москва;info@romashka.ru;+7 900 111-22-33\n=HYPERLINK(\"http://evil\");evil.ru;Казань;;\n";
    const table = await parseImportFile("leads.csv", Buffer.from(csv, "utf8"));
    const preview = buildPreview(table);
    expect(preview.totalRows).toBe(2);
    expect(preview.mapping).toMatchObject({ Название: "name", Сайт: "website", Город: "city", Email: "publicEmail", Телефон: "publicPhone" });
    expect(table.rows[1]![0]!.startsWith("=")).toBe(false);
  });

  it("decodes Windows-1251 CSV", async () => {
    const text = "Название,Город\nЁлка,Тула\n";
    const bytes = Buffer.from(
      [...text].map((ch) => {
        const code = ch.charCodeAt(0);
        if (code < 128) return code;
        if (ch === "Ё") return 0xa8;
        if (ch === "ё") return 0xb8;
        return code - 0x410 + 0xc0;
      }),
    );
    const table = await parseImportFile("cp1251.csv", bytes);
    expect(table.headers).toEqual(["Название", "Город"]);
    expect(table.rows[0]).toEqual(["Ёлка", "Тула"]);
  });

  it("parses XLSX and imports with deduplication within file and against DB", async () => {
    await createCompany(ctx, { name: "Существующая", website: "exists.ru" });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Лиды");
    ws.addRow(["Компания", "Сайт", "Город", "Теги"]);
    ws.addRow(["Новая 1", "new1.ru", "Казань", "WB, Excel"]);
    ws.addRow(["Новая 1 дубль", "www.new1.ru", "Казань", ""]);
    ws.addRow(["Существующая копия", "https://exists.ru", "Москва", ""]);
    ws.addRow(["", "noname.ru", "", ""]);
    ws.addRow(["Новая 2", "", "Тула", ""]);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const table = await parseImportFile("leads.xlsx", buffer);
    expect(table.fileType).toBe("xlsx");
    const mapping = { Компания: "name", Сайт: "website", Город: "city", Теги: "tags" } as const;
    const payload = await createImportJob(ctx, "leads.xlsx", table, mapping, ["Импорт"]);
    const result = await runImport(ctx, payload);
    expect(result).toEqual({ imported: 2, duplicates: 2, skipped: 1, errors: 1 });
    const job = await prisma.importJob.findUniqueOrThrow({ where: { id: payload.importJobId } });
    expect(job.status).toBe("SUCCEEDED");
    const tagged = await prisma.company.findFirstOrThrow({ where: { organizationId: ctx.organizationId, name: "Новая 1" }, include: { tags: { include: { tag: true } } } });
    expect(tagged.tags.map((t) => t.tag.name).sort()).toEqual(["Excel", "WB", "Импорт"]);
    expect(tagged.sourceType).toBe("XLSX_IMPORT");
    // Идемпотентность: повторный запуск завершённого импорта ничего не добавляет
    const again = await runImport(ctx, payload);
    expect(again.imported).toBe(2);
    expect(await prisma.company.count({ where: { organizationId: ctx.organizationId } })).toBe(3);
  });

  it("rejects disguised and oversized files", async () => {
    await expect(parseImportFile("x.xlsx", Buffer.from("not a zip"))).rejects.toThrow(/XLSX/);
    await expect(parseImportFile("x.exe", Buffer.from("MZ"))).rejects.toThrow(/CSV и XLSX/);
    await expect(parseImportFile("big.csv", Buffer.alloc(6 * 1024 * 1024, 65))).rejects.toThrow(/5 МБ/);
  });

  it("requires the name column mapping", async () => {
    const table = await parseImportFile("a.csv", Buffer.from("Сайт\nx.ru\n"));
    await expect(createImportJob(ctx, "a.csv", table, { Сайт: "website" })).rejects.toThrow(/Название/);
  });
});
