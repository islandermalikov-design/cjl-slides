import { normalizeCompanyName, normalizeDomain, normalizeEmail, normalizeInn, normalizePhone } from "./normalize";

export interface DedupeCandidate {
  name: string;
  website?: string | null;
  inn?: string | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
  city?: string | null;
}

export interface DedupeKeys {
  normalizedName: string;
  domain: string | null;
  inn: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
}

const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "mail.ru",
  "yandex.ru",
  "ya.ru",
  "bk.ru",
  "list.ru",
  "inbox.ru",
  "rambler.ru",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "yahoo.com",
]);

export function dedupeKeys(c: DedupeCandidate): DedupeKeys {
  const email = normalizeEmail(c.publicEmail);
  let domain = normalizeDomain(c.website);
  if (!domain && email) {
    const emailDomain = email.split("@")[1] ?? "";
    if (!FREE_MAIL_DOMAINS.has(emailDomain)) domain = emailDomain;
  }
  return {
    normalizedName: normalizeCompanyName(c.name),
    domain,
    inn: normalizeInn(c.inn),
    email,
    phone: normalizePhone(c.publicPhone),
    city: c.city ? c.city.trim().toLowerCase() : null,
  };
}

export type DuplicateReason = "inn" | "domain" | "email" | "phone" | "name_city";

/** Проверяет, являются ли две записи дублями. Возвращает причину или null. */
export function duplicateReason(a: DedupeKeys, b: DedupeKeys): DuplicateReason | null {
  if (a.inn && b.inn && a.inn === b.inn) return "inn";
  if (a.domain && b.domain && a.domain === b.domain) return "domain";
  if (a.email && b.email && a.email === b.email) return "email";
  if (a.phone && b.phone && a.phone === b.phone) return "phone";
  if (
    a.normalizedName &&
    a.normalizedName === b.normalizedName &&
    (a.city === b.city || !a.city || !b.city)
  ) {
    return "name_city";
  }
  return null;
}

/** Удаляет дубли внутри одного набора (например, импортируемого файла). */
export function dedupeWithin<T extends DedupeCandidate>(
  items: T[],
): { unique: T[]; duplicates: Array<{ item: T; duplicateOf: number; reason: DuplicateReason }> } {
  const unique: T[] = [];
  const keys: DedupeKeys[] = [];
  const duplicates: Array<{ item: T; duplicateOf: number; reason: DuplicateReason }> = [];
  for (const item of items) {
    const k = dedupeKeys(item);
    let found = -1;
    let reason: DuplicateReason | null = null;
    for (let i = 0; i < keys.length; i++) {
      reason = duplicateReason(k, keys[i]!);
      if (reason) {
        found = i;
        break;
      }
    }
    if (found >= 0 && reason) {
      duplicates.push({ item, duplicateOf: found, reason });
    } else {
      unique.push(item);
      keys.push(k);
    }
  }
  return { unique, duplicates };
}

export const DUPLICATE_REASON_LABELS: Record<DuplicateReason, string> = {
  inn: "Совпадает ИНН",
  domain: "Совпадает домен сайта",
  email: "Совпадает email",
  phone: "Совпадает телефон",
  name_city: "Совпадает название и город",
};
