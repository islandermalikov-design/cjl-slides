import "server-only";
import {
  ImportMappingSchema,
  dedupeKeys,
  dedupeWithin,
  guessImportMapping,
  normalizeCompanyName,
  normalizeInn,
  normalizePhone,
  normalizeWebsite,
  parseMarketplace,
  sanitizeImportedCell,
  type ImportColumnTarget,
} from "@leadflow/shared";
import Papa from "papaparse";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";
import { AppError } from "../errors";
import { logActivity, notify } from "./activity";
import { addTagsToCompanies, findDuplicates } from "./companies";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 10_000;

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  fileType: "csv" | "xlsx";
}

function decodeText(buffer: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^﻿/, "");
  } catch {
    // Файлы из русской локали Excel часто сохранены в Windows-1251.
    return new TextDecoder("windows-1251").decode(buffer);
  }
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("hyperlink" in v && typeof v.hyperlink === "string") return String(v.text ?? v.hyperlink);
    if ("result" in v) return cellToString(v.result);
    if ("richText" in v && Array.isArray(v.richText)) {
      return (v.richText as Array<{ text: string }>).map((r) => r.text).join("");
    }
    return "";
  }
  return String(value);
}

export async function parseImportFile(fileName: string, buffer: Buffer): Promise<ParsedTable> {
  if (buffer.byteLength > MAX_IMPORT_BYTES) throw new AppError("Файл больше 5 МБ");
  const lower = fileName.toLowerCase();
  let headers: string[] = [];
  let rows: string[][] = [];
  let fileType: "csv" | "xlsx";
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    fileType = "csv";
    const text = decodeText(buffer);
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy", delimiter: "" });
    const data = parsed.data.filter((r) => Array.isArray(r));
    headers = (data[0] ?? []).map((h) => sanitizeImportedCell(h));
    rows = data.slice(1).map((r) => r.map((c) => sanitizeImportedCell(c)));
  } else if (lower.endsWith(".xlsx")) {
    fileType = "xlsx";
    // ZIP-сигнатура «PK» — защита от подмены расширения.
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) throw new AppError("Файл не является корректным XLSX");
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch {
      throw new AppError("Не удалось прочитать XLSX-файл");
    }
    const ws = wb.worksheets[0];
    if (!ws) throw new AppError("В книге нет листов");
    const all: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      if (all.length > MAX_IMPORT_ROWS + 1) return;
      const values = row.values as unknown[];
      all.push(values.slice(1).map((v) => sanitizeImportedCell(cellToString(v))));
    });
    headers = all[0] ?? [];
    rows = all.slice(1);
  } else {
    throw new AppError("Поддерживаются только файлы CSV и XLSX");
  }
  headers = headers.map((h, i) => h || `Столбец ${i + 1}`);
  // Уникальные заголовки
  const seen = new Map<string, number>();
  headers = headers.map((h) => {
    const n = seen.get(h) ?? 0;
    seen.set(h, n + 1);
    return n ? `${h} (${n + 1})` : h;
  });
  if (!headers.length) throw new AppError("Файл пуст или не содержит заголовков");
  if (rows.length > MAX_IMPORT_ROWS) throw new AppError(`Слишком много строк (максимум ${MAX_IMPORT_ROWS})`);
  rows = rows.filter((r) => r.some((c) => c));
  return { headers, rows, fileType };
}

export function buildPreview(table: ParsedTable) {
  return {
    headers: table.headers,
    sample: table.rows.slice(0, 15),
    totalRows: table.rows.length,
    mapping: guessImportMapping(table.headers),
  };
}

type MappedRow = Partial<Record<ImportColumnTarget, string>>;

function mapRow(headers: string[], row: string[], mapping: Record<string, ImportColumnTarget | "skip">): MappedRow {
  const out: MappedRow = {};
  headers.forEach((h, i) => {
    const target = mapping[h];
    if (!target || target === "skip") return;
    const value = (row[i] ?? "").trim();
    if (value) out[target] = value.slice(0, 1000);
  });
  return out;
}

export interface ImportPayload {
  importJobId: string;
  headers: string[];
  rows: string[][];
  mapping: Record<string, ImportColumnTarget | "skip">;
  tags?: string[];
}

/** Создаёт запись ImportJob и возвращает payload для фонового задания. */
export async function createImportJob(
  ctx: { organizationId: string; userId: string | null },
  fileName: string,
  table: ParsedTable,
  rawMapping: unknown,
  tags: string[] = [],
): Promise<ImportPayload> {
  const mapping = ImportMappingSchema.parse(rawMapping) as Record<string, ImportColumnTarget | "skip">;
  if (!Object.values(mapping).includes("name")) throw new AppError("Сопоставьте столбец «Название компании»");
  const job = await prisma.importJob.create({
    data: {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      fileName: fileName.slice(0, 200),
      fileType: table.fileType,
      totalRows: table.rows.length,
      columnMapping: mapping,
      status: "QUEUED",
    },
  });
  return { importJobId: job.id, headers: table.headers, rows: table.rows, mapping, tags };
}

/** Выполнение импорта (вызывается обработчиком фонового задания). */
export async function runImport(ctx: { organizationId: string; userId: string | null }, payload: ImportPayload) {
  const importJob = await prisma.importJob.findFirst({ where: { id: payload.importJobId, organizationId: ctx.organizationId } });
  if (!importJob) throw new AppError("Импорт не найден");
  if (importJob.status === "SUCCEEDED") {
    // Идемпотентность: повторный запуск завершённого импорта ничего не делает.
    return { imported: importJob.importedRows, duplicates: importJob.duplicateRows, skipped: importJob.skippedRows, errors: importJob.errorRows };
  }
  await prisma.importJob.update({ where: { id: importJob.id }, data: { status: "RUNNING" } });

  const errors: Array<{ row: number; message: string }> = [];
  const candidates: Array<MappedRow & { name: string; __row: number }> = [];
  payload.rows.forEach((row, idx) => {
    const m = mapRow(payload.headers, row, payload.mapping);
    if (!m.name) {
      errors.push({ row: idx + 2, message: "Пустое название компании" });
      return;
    }
    candidates.push({ ...m, name: m.name, __row: idx + 2 });
  });

  const { unique, duplicates: inFileDupes } = dedupeWithin(candidates);
  let imported = 0;
  let dbDuplicates = 0;
  const sourceType = importJob.fileType === "xlsx" ? "XLSX_IMPORT" : "CSV_IMPORT";
  const createdIds: string[] = [];

  for (const c of unique) {
    try {
      const keys = dedupeKeys(c);
      const dupes = await findDuplicates(ctx.organizationId, keys);
      if (dupes.length) {
        dbDuplicates++;
        continue;
      }
      const website = normalizeWebsite(c.website);
      const email = c.publicEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.publicEmail.toLowerCase()) ? c.publicEmail.toLowerCase() : null;
      const data: Prisma.CompanyUncheckedCreateInput = {
        organizationId: ctx.organizationId,
        ownerId: ctx.userId,
        name: c.name.slice(0, 300),
        normalizedName: normalizeCompanyName(c.name),
        legalName: c.legalName ?? null,
        inn: normalizeInn(c.inn),
        website,
        domain: keys.domain,
        category: c.category ?? null,
        niche: c.niche ?? null,
        city: c.city ?? null,
        region: c.region ?? null,
        marketplace: parseMarketplace(c.marketplace),
        publicEmail: email,
        publicPhone: normalizePhone(c.publicPhone),
        sourceUrl: c.sourceUrl ?? null,
        notes: c.notes ?? null,
        sourceType,
        verifiedAt: c.sourceUrl ? new Date() : null,
      };
      const company = await prisma.company.create({ data });
      createdIds.push(company.id);
      if (c.tags) {
        await addTagsToCompanies(ctx.organizationId, [company.id], c.tags.split(/[,;]/));
      }
      imported++;
    } catch (e) {
      errors.push({ row: c.__row, message: e instanceof Error ? e.message.slice(0, 200) : "Ошибка записи" });
    }
  }
  if (payload.tags?.length && createdIds.length) {
    await addTagsToCompanies(ctx.organizationId, createdIds, payload.tags);
  }
  if (createdIds.length) {
    await prisma.activity.createMany({
      data: createdIds.map((companyId) => ({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        companyId,
        type: "IMPORT" as const,
        title: `Импортировано из файла ${importJob.fileName}`,
      })),
    });
  }
  const result = {
    imported,
    duplicates: inFileDupes.length + dbDuplicates,
    skipped: errors.filter((e) => e.message === "Пустое название компании").length,
    errors: errors.length,
  };
  await prisma.importJob.update({
    where: { id: importJob.id },
    data: {
      status: "SUCCEEDED",
      importedRows: result.imported,
      duplicateRows: result.duplicates,
      skippedRows: result.skipped,
      errorRows: errors.length,
      errors: errors.slice(0, 200),
      finishedAt: new Date(),
    },
  });
  await logActivity({ organizationId: ctx.organizationId, userId: ctx.userId, type: "IMPORT", title: `Импорт «${importJob.fileName}»: добавлено ${imported}` });
  await notify({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    title: "Импорт завершён",
    body: `Добавлено: ${result.imported}, дублей: ${result.duplicates}, ошибок: ${result.errors}`,
    link: "/companies",
  });
  return result;
}
