import { z } from "zod";
import { CRM_STATUSES, MARKETPLACES, MESSAGE_CHANNELS, CONSENT_BASES, TASK_PRIORITIES, TASK_STATUSES } from "./constants";

// Общие схемы валидации входных данных (используются и в формах, и на сервере).

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const CompanyInputSchema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(300),
  legalName: optionalText(300),
  inn: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v.replace(/\D/g, "") : null))
    .refine((v) => !v || v.length === 10 || v.length === 12, "ИНН должен содержать 10 или 12 цифр"),
  website: optionalText(500),
  category: optionalText(200),
  niche: optionalText(200),
  city: optionalText(120),
  region: optionalText(120),
  marketplace: z.enum(MARKETPLACES).default("NONE"),
  publicEmail: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Некорректный email"),
  publicPhone: optionalText(40),
  sourceUrl: optionalText(1000),
  notes: optionalText(5000),
  crmStatus: z.enum(CRM_STATUSES).optional(),
});
export type CompanyInput = z.input<typeof CompanyInputSchema>;

export const ContactInputSchema = z.object({
  companyId: z.string().min(1),
  fullName: z.string().trim().min(1, "Укажите имя или должность").max(200),
  position: optionalText(200),
  email: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Некорректный email"),
  phone: optionalText(40),
  isPublicBusiness: z.boolean().default(true),
  sourceUrl: optionalText(1000),
  notes: optionalText(2000),
});

export const TaskInputSchema = z.object({
  title: z.string().trim().min(1, "Укажите название").max(300),
  description: optionalText(5000),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  dueAt: z.coerce.date().optional().nullable(),
  priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
  status: z.enum(TASK_STATUSES).default("TODO"),
  isFollowUp: z.boolean().default(false),
});

export const DealInputSchema = z.object({
  companyId: z.string().min(1, "Выберите компанию"),
  title: z.string().trim().min(1, "Укажите название").max(300),
  amount: z.coerce.number().min(0).max(1_000_000_000),
  stageId: z.string().optional().nullable(),
  serviceId: z.string().optional().nullable(),
  expectedCloseAt: z.coerce.date().optional().nullable(),
  notes: optionalText(5000),
});

export const MessageDraftInputSchema = z.object({
  companyId: z.string().min(1),
  contactId: z.string().optional().nullable(),
  proposalId: z.string().optional().nullable(),
  channel: z.enum(MESSAGE_CHANNELS).default("EMAIL"),
  recipient: optionalText(300),
  subject: optionalText(300),
  body: z.string().trim().min(1, "Текст сообщения пуст").max(20000),
  legalBasis: z.enum(CONSENT_BASES).optional().nullable(),
});

export const ImportColumnTargets = [
  "name",
  "legalName",
  "inn",
  "website",
  "category",
  "niche",
  "city",
  "region",
  "marketplace",
  "publicEmail",
  "publicPhone",
  "sourceUrl",
  "notes",
  "tags",
] as const;
export type ImportColumnTarget = (typeof ImportColumnTargets)[number];

export const IMPORT_TARGET_LABELS: Record<ImportColumnTarget, string> = {
  name: "Название компании",
  legalName: "Юридическое название",
  inn: "ИНН",
  website: "Сайт",
  category: "Категория",
  niche: "Ниша",
  city: "Город",
  region: "Регион",
  marketplace: "Площадка",
  publicEmail: "Публичный email",
  publicPhone: "Публичный телефон",
  sourceUrl: "URL источника",
  notes: "Примечания",
  tags: "Теги (через запятую)",
};

/** Подсказки для автоматического сопоставления заголовков. */
export const IMPORT_HEADER_HINTS: Record<ImportColumnTarget, string[]> = {
  name: ["название", "компания", "company", "name", "наименование", "бренд", "магазин"],
  legalName: ["юр", "legal", "полное наименование", "юридическое"],
  inn: ["инн", "inn", "tax"],
  website: ["сайт", "website", "url сайта", "site", "web"],
  category: ["категория", "category", "рубрика"],
  niche: ["ниша", "niche", "сегмент", "отрасль"],
  city: ["город", "city"],
  region: ["регион", "область", "region"],
  marketplace: ["площадка", "маркетплейс", "marketplace", "платформа"],
  publicEmail: ["email", "e-mail", "почта", "mail"],
  publicPhone: ["телефон", "phone", "тел"],
  sourceUrl: ["источник", "source", "url источника", "ссылка"],
  notes: ["примечание", "заметки", "notes", "комментарий"],
  tags: ["теги", "tags", "метки"],
};

export const ImportMappingSchema = z.record(z.string(), z.enum([...ImportColumnTargets, "skip"]));

export function guessImportMapping(headers: string[]): Record<string, ImportColumnTarget | "skip"> {
  const mapping: Record<string, ImportColumnTarget | "skip"> = {};
  const used = new Set<ImportColumnTarget>();
  for (const header of headers) {
    const h = header.toLowerCase().trim();
    let match: ImportColumnTarget | "skip" = "skip";
    for (const target of ImportColumnTargets) {
      if (used.has(target)) continue;
      if (IMPORT_HEADER_HINTS[target].some((hint) => h === hint || h.includes(hint))) {
        match = target;
        break;
      }
    }
    if (match !== "skip") used.add(match);
    mapping[header] = match;
  }
  return mapping;
}

export function parseMarketplace(value: string | null | undefined): (typeof MARKETPLACES)[number] {
  if (!value) return "NONE";
  const v = value.toLowerCase();
  if (v.includes("wildberries") || v === "wb" || v.includes("вайлдберриз")) return "WILDBERRIES";
  if (v.includes("ozon") || v.includes("озон")) return "OZON";
  if (v.includes("яндекс") || v.includes("yandex")) return "YANDEX_MARKET";
  if (v.includes("мегамаркет") || v.includes("megamarket") || v.includes("сбер")) return "MEGAMARKET";
  if (v.includes("сайт") || v.includes("own") || v.includes("магазин")) return "OWN_STORE";
  return "OTHER";
}
