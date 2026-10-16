import type { ServiceTier } from "@/generated/prisma/enums";

export const DEFAULT_PIPELINE_STAGES = [
  { name: "Квалификация", order: 1, probability: 10, isWon: false, isLost: false },
  { name: "КП отправлено", order: 2, probability: 30, isWon: false, isLost: false },
  { name: "Переговоры", order: 3, probability: 60, isWon: false, isLost: false },
  { name: "Согласование договора", order: 4, probability: 80, isWon: false, isLost: false },
  { name: "Выиграна", order: 5, probability: 100, isWon: true, isLost: false },
  { name: "Проиграна", order: 6, probability: 0, isWon: false, isLost: true },
];

export const DEFAULT_SERVICES: Array<{
  code: string;
  name: string;
  tier: ServiceTier;
  description: string;
  features: string[];
  priceFrom: number;
  priceTo: number | null;
  durationDays: number;
}> = [
  {
    code: "start-sheets",
    name: "START: аналитика в Excel / Google Sheets",
    tier: "START",
    description: "Управленческая таблица с автоматическим сведением данных и наглядными отчётами.",
    features: [
      "Единая таблица продаж и расходов",
      "Автоматические формулы и сводные отчёты",
      "Простые графики для ежедневного контроля",
      "Инструкция по работе с таблицей",
    ],
    priceFrom: 5000,
    priceTo: 10000,
    durationDays: 5,
  },
  {
    code: "business-analytics",
    name: "BUSINESS: продажи, расходы, прибыль, поставки",
    tier: "BUSINESS",
    description: "Система учёта продаж, себестоимости, поставок и остатков с аналитикой по маркетплейсам.",
    features: [
      "Учёт продаж Wildberries / Ozon из выгрузок",
      "Расчёт прибыли с учётом комиссий и логистики",
      "Контроль поставок и остатков",
      "Дашборд ключевых показателей",
      "Макросы для автоматизации рутинных операций",
    ],
    priceFrom: 15000,
    priceTo: 35000,
    durationDays: 14,
  },
  {
    code: "premium-platform",
    name: "PREMIUM: веб-платформа, CRM, API-интеграции",
    tier: "PREMIUM",
    description: "Индивидуальное веб-приложение: CRM, интеграции через API, BI-дашборды и автоматизация процессов.",
    features: [
      "Веб-приложение с разграничением доступа",
      "Интеграции через официальные API площадок",
      "BI-дашборды и отчёты",
      "Автоматизация бизнес-процессов",
      "Поддержка после запуска",
    ],
    priceFrom: 40000,
    priceTo: null,
    durationDays: 30,
  },
];
