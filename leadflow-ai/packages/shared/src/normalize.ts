// Нормализация значений для дедупликации и suppression list.

const LEGAL_FORMS = [
  "ооо",
  "оао",
  "зао",
  "пао",
  "ао",
  "ип",
  "нко",
  "llc",
  "ltd",
  "inc",
  "гк",
  "тд",
  "компания",
  "группа компаний",
  "торговый дом",
];

/** Приводит название компании к сравнимому виду: без ОПФ, кавычек и лишних пробелов. */
export function normalizeCompanyName(name: string): string {
  let value = name
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'`“”„]/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const form of LEGAL_FORMS) {
    const re = new RegExp(`(^|\\s)${form}(?=\\s|$)`, "g");
    value = value.replace(re, " ");
  }
  return value.replace(/\s+/g, " ").trim();
}

/** Извлекает домен из URL или строки вида "example.ru". Возвращает null, если домен некорректен. */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let raw = input.trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes("@")) raw = raw.split("@").pop() ?? "";
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(raw)) raw = `https://${raw}`;
  try {
    const url = new URL(raw);
    let host = url.hostname.replace(/^www\./, "").replace(/\.$/, "");
    if (!host.includes(".")) return null;
    if (!/^[a-z0-9.-]+$/.test(host) && !/^xn--/.test(host)) {
      // Кириллические домены (.рф) — приводим к punycode через URL API (уже сделано), оставляем как есть.
      host = url.hostname;
    }
    return host;
  } catch {
    return null;
  }
}

/** Приводит URL сайта к виду https://host/path без мусора. */
export function normalizeWebsite(input: string | null | undefined): string | null {
  if (!input) return null;
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

/** Телефон → только цифры, российские номера приводятся к формату 7XXXXXXXXXX. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function formatPhone(digits: string | null | undefined): string {
  if (!digits) return "";
  const d = digits.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("7")) {
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
  }
  return `+${d}`;
}

/** ИНН: 10 или 12 цифр. */
export function normalizeInn(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 12 ? digits : null;
}

/** Значение для suppression list: email, телефон или домен. */
export function normalizeSuppressionValue(
  input: string,
): { kind: "email" | "phone" | "domain"; value: string } | null {
  const email = normalizeEmail(input);
  if (email) return { kind: "email", value: email };
  if (/^[\d\s()+-]+$/.test(input.trim())) {
    const phone = normalizePhone(input);
    if (phone) return { kind: "phone", value: phone };
  }
  const domain = normalizeDomain(input);
  if (domain) return { kind: "domain", value: domain };
  return null;
}
