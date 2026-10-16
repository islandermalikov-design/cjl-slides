import { normalizeLeadScore, type LeadScoreResult } from "@leadflow/shared";

// Чистые функции (без обращений к БД) — используются сервисом скоринга, seed и тестами.

export interface ScoringInput {
  name: string;
  legalName: string | null;
  website: string | null;
  category: string | null;
  niche: string | null;
  city: string | null;
  region: string | null;
  marketplace: string;
  hasPublicEmail: boolean;
  hasPublicPhone: boolean;
  sourceUrl: string | null;
  verifiedAt: string | null;
  notes: string | null;
  tags: string[];
  contacts: Array<{ position: string | null; hasEmail: boolean; hasPhone: boolean; isPublicBusiness: boolean; sourceUrl: string | null }>;
  evidence: Array<{ kind: string; field: string; value: string; url: string | null }>;
}

/** Детерминированная эвристика для DEMO_MODE (без обращения к AI). */
export function heuristicScore(input: ScoringInput): LeadScoreResult {
  const text = [input.niche, input.category, input.notes, ...input.tags, ...input.evidence.map((e) => e.value)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const isMarketplace = input.marketplace === "Wildberries" || input.marketplace === "Ozon" || /wildberries|ozon|маркетплейс/.test(text);
  const targetNiche = /интернет-магазин|опт|рознич|производ|магазин|торгов|дистриб|склад/.test(text);
  const manualSignals = /excel|таблиц|вручную|ручн|google sheets|прайс|1с|учёт|учет/.test(text);
  const hasChannel = input.hasPublicEmail || input.hasPublicPhone || input.contacts.some((c) => c.hasEmail || c.hasPhone);
  const filled = [input.website, input.category, input.niche, input.city, input.region, input.sourceUrl].filter(Boolean).length;
  const fresh = input.verifiedAt ? Date.now() - new Date(input.verifiedAt).getTime() < 180 * 86400000 : false;

  const points = {
    audience_fit: isMarketplace ? 23 : targetNiche ? 18 : 8,
    automation_need: isMarketplace ? 17 : targetNiche ? 13 : 6,
    manual_process_signals: manualSignals ? 12 : 4,
    analytics_value: isMarketplace ? 14 : targetNiche ? 10 : 5,
    contact_channel: hasChannel ? (input.contacts.length ? 15 : 11) : 0,
    data_completeness: Math.min(10, filled + (fresh ? 4 : 0)),
  };
  const breakdown = (Object.keys(points) as Array<keyof typeof points>).map((criterion) => ({
    criterion,
    points: points[criterion],
    comment: "Эвристика DEMO_MODE по заполненным полям карточки",
  }));
  const facts = [
    input.marketplace !== "Не указана" ? { statement: `Площадка: ${input.marketplace}`, sourceUrl: input.sourceUrl } : null,
    input.website ? { statement: `Есть сайт: ${input.website}`, sourceUrl: input.website } : null,
    hasChannel ? { statement: "Есть опубликованный деловой канал связи", sourceUrl: input.sourceUrl } : null,
    input.city ? { statement: `Город: ${input.city}`, sourceUrl: input.sourceUrl } : null,
  ].filter((f): f is { statement: string; sourceUrl: string | null } => Boolean(f));
  const tier = isMarketplace ? "BUSINESS" : targetNiche ? "START" : "START";
  return normalizeLeadScore({
    score: 0,
    summary: isMarketplace
      ? "Продавец маркетплейса: вероятна потребность в аналитике продаж, учёте поставок и остатков."
      : targetNiche
        ? "Торговая компания: возможна потребность в управленческих таблицах и автоматизации отчётности."
        : "Соответствие целевой аудитории не подтверждено данными карточки.",
    breakdown,
    reasons: [
      isMarketplace ? "Работает на маркетплейсе — типичный клиент для аналитики продаж" : "Площадка продаж не указана",
      manualSignals ? "В данных есть признаки ручной работы с таблицами" : "Явных признаков ручных процессов не найдено",
      hasChannel ? "Есть публичный деловой контакт" : "Нет опубликованного делового контакта",
    ],
    facts,
    hypotheses: [
      isMarketplace ? "Отчёты по продажам и остаткам, вероятно, сводятся вручную из выгрузок площадки" : "Учёт может вестись в разрозненных таблицах",
    ],
    recommendations: [
      hasChannel ? "Подготовить короткое персональное сообщение с предложением бесплатного аудита отчётности" : "Найти официальный деловой контакт на сайте компании перед обращением",
    ],
    unknowns: ["Оборот и объём продаж", "Используемые системы учёта", "Наличие собственного аналитика"],
    clientTasks: isMarketplace
      ? ["Сводная аналитика продаж по площадкам", "Расчёт прибыли с учётом комиссий", "Контроль остатков и поставок"]
      : ["Управленческая таблица продаж и расходов", "Автоматизация регулярных отчётов"],
    recommendedProduct: isMarketplace ? "Аналитика продаж Wildberries/Ozon и учёт поставок" : "Управленческая таблица в Google Sheets",
    recommendedTier: tier,
  });
}

