// Защита от CSV/Formula injection (OWASP): значения, начинающиеся с = + - @ TAB CR,
// интерпретируются Excel/Sheets как формулы. При экспорте экранируем апострофом.

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvFormula(value: string): string {
  if (FORMULA_PREFIX.test(value)) {
    // Отрицательные числа ("-150") оставляем как есть — это не формула.
    if (/^-\d+([.,]\d+)?$/.test(value)) return value;
    return `'${value}`;
  }
  return value;
}

/** Очищает входящее значение при импорте: убирает управляющие символы и префикс формулы. */
export function sanitizeImportedCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "string" ? value : String(value);
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  while (FORMULA_PREFIX.test(text) && !/^-\d+([.,]\d+)?$/.test(text) && !/^\+\d[\d\s()-]+$/.test(text)) {
    text = text.slice(1).trim();
  }
  return text;
}

function quoteCsv(value: string): string {
  if (/[",\n\r;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Формирует CSV (разделитель «;», как ожидает русская локаль Excel) с BOM. */
export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers.map((h) => quoteCsv(escapeCsvFormula(h))).join(";")];
  for (const row of rows) {
    lines.push(
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return "";
          if (typeof cell === "number") return String(cell);
          return quoteCsv(escapeCsvFormula(cell));
        })
        .join(";"),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
