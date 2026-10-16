// Справочники и русские подписи. Значения enum совпадают с prisma/schema.prisma.

export const CRM_STATUSES = [
  "NEW",
  "VERIFIED",
  "PREPARE_PROPOSAL",
  "PROPOSAL_READY",
  "CONTACTED",
  "REPLIED",
  "NEGOTIATION",
  "WON",
  "LOST",
  "DO_NOT_CONTACT",
] as const;
export type CrmStatusValue = (typeof CRM_STATUSES)[number];

export const CRM_STATUS_LABELS: Record<CrmStatusValue, string> = {
  NEW: "Новый",
  VERIFIED: "Проверен",
  PREPARE_PROPOSAL: "Подготовить КП",
  PROPOSAL_READY: "КП готово",
  CONTACTED: "Связались",
  REPLIED: "Получен ответ",
  NEGOTIATION: "Переговоры",
  WON: "Сделка",
  LOST: "Отказ",
  DO_NOT_CONTACT: "Не связываться",
};

export const MARKETPLACES = [
  "NONE",
  "WILDBERRIES",
  "OZON",
  "YANDEX_MARKET",
  "MEGAMARKET",
  "OWN_STORE",
  "OTHER",
] as const;
export type MarketplaceValue = (typeof MARKETPLACES)[number];

export const MARKETPLACE_LABELS: Record<MarketplaceValue, string> = {
  NONE: "Не указана",
  WILDBERRIES: "Wildberries",
  OZON: "Ozon",
  YANDEX_MARKET: "Яндекс Маркет",
  MEGAMARKET: "Мегамаркет",
  OWN_STORE: "Собственный магазин",
  OTHER: "Другая",
};

export const MESSAGE_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "SENT",
  "DELIVERED",
  "REPLIED",
  "FAILED",
  "OPTED_OUT",
] as const;
export type MessageStatusValue = (typeof MESSAGE_STATUSES)[number];

export const MESSAGE_STATUS_LABELS: Record<MessageStatusValue, string> = {
  DRAFT: "Черновик",
  PENDING_REVIEW: "На проверке",
  APPROVED: "Согласовано",
  SENT: "Отправлено",
  DELIVERED: "Доставлено",
  REPLIED: "Получен ответ",
  FAILED: "Ошибка",
  OPTED_OUT: "Отписка",
};

export const MESSAGE_CHANNELS = ["EMAIL", "TELEGRAM", "WHATSAPP", "PHONE", "OTHER"] as const;
export type MessageChannelValue = (typeof MESSAGE_CHANNELS)[number];
export const MESSAGE_CHANNEL_LABELS: Record<MessageChannelValue, string> = {
  EMAIL: "Email",
  TELEGRAM: "Telegram",
  WHATSAPP: "WhatsApp",
  PHONE: "Телефон",
  OTHER: "Другое",
};

export const CONSENT_BASES = [
  "EXPLICIT_CONSENT",
  "LEGITIMATE_INTEREST_B2B",
  "EXISTING_RELATIONSHIP",
  "INBOUND_REQUEST",
] as const;
export type ConsentBasisValue = (typeof CONSENT_BASES)[number];
export const CONSENT_BASIS_LABELS: Record<ConsentBasisValue, string> = {
  EXPLICIT_CONSENT: "Явное согласие получателя",
  LEGITIMATE_INTEREST_B2B: "Деловое обращение на опубликованный рабочий адрес",
  EXISTING_RELATIONSHIP: "Существующие деловые отношения",
  INBOUND_REQUEST: "Входящий запрос от компании",
};

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export type TaskStatusValue = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatusValue, string> = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  DONE: "Готово",
  CANCELLED: "Отменена",
};

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriorityValue = (typeof TASK_PRIORITIES)[number];
export const TASK_PRIORITY_LABELS: Record<TaskPriorityValue, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
  URGENT: "Срочно",
};

export const DEAL_STATUSES = ["OPEN", "WON", "LOST"] as const;
export type DealStatusValue = (typeof DEAL_STATUSES)[number];
export const DEAL_STATUS_LABELS: Record<DealStatusValue, string> = {
  OPEN: "В работе",
  WON: "Выиграна",
  LOST: "Проиграна",
};

export const PROPOSAL_STATUSES = ["DRAFT", "READY", "SENT", "ACCEPTED", "REJECTED", "ARCHIVED"] as const;
export type ProposalStatusValue = (typeof PROPOSAL_STATUSES)[number];
export const PROPOSAL_STATUS_LABELS: Record<ProposalStatusValue, string> = {
  DRAFT: "Черновик",
  READY: "Готово",
  SENT: "Отправлено",
  ACCEPTED: "Принято",
  REJECTED: "Отклонено",
  ARCHIVED: "В архиве",
};

export const SERVICE_TIERS = ["START", "BUSINESS", "PREMIUM", "CUSTOM"] as const;
export type ServiceTierValue = (typeof SERVICE_TIERS)[number];
export const SERVICE_TIER_LABELS: Record<ServiceTierValue, string> = {
  START: "START",
  BUSINESS: "BUSINESS",
  PREMIUM: "PREMIUM",
  CUSTOM: "Индивидуально",
};

export const SOURCE_TYPES = [
  "MANUAL",
  "CSV_IMPORT",
  "XLSX_IMPORT",
  "WEBSITE",
  "OFFICIAL_API",
  "CATALOG",
  "PROVIDER",
  "DEMO",
] as const;
export type SourceTypeValue = (typeof SOURCE_TYPES)[number];
export const SOURCE_TYPE_LABELS: Record<SourceTypeValue, string> = {
  MANUAL: "Ручное добавление",
  CSV_IMPORT: "Импорт CSV",
  XLSX_IMPORT: "Импорт XLSX",
  WEBSITE: "Корпоративный сайт",
  OFFICIAL_API: "Официальный API",
  CATALOG: "Бизнес-каталог",
  PROVIDER: "Внешний провайдер",
  DEMO: "DEMO",
};

export const JOB_TYPES = [
  "IMPORT",
  "ENRICHMENT",
  "DEDUPLICATION",
  "AI_SCORING",
  "PROPOSAL_GENERATION",
  "STATS_RECALC",
  "INTEGRATION_CHECK",
  "DISCOVERY",
] as const;
export type JobTypeValue = (typeof JOB_TYPES)[number];
export const JOB_TYPE_LABELS: Record<JobTypeValue, string> = {
  IMPORT: "Импорт данных",
  ENRICHMENT: "Обогащение компании",
  DEDUPLICATION: "Проверка дублей",
  AI_SCORING: "AI-анализ",
  PROPOSAL_GENERATION: "Генерация КП",
  STATS_RECALC: "Пересчёт статистики",
  INTEGRATION_CHECK: "Проверка интеграций",
  DISCOVERY: "Поиск компаний",
};

export const JOB_STATUSES = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"] as const;
export type JobStatusValue = (typeof JOB_STATUSES)[number];
export const JOB_STATUS_LABELS: Record<JobStatusValue, string> = {
  QUEUED: "В очереди",
  RUNNING: "Выполняется",
  SUCCEEDED: "Выполнено",
  FAILED: "Ошибка",
  CANCELLED: "Отменено",
};

export const MEMBER_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
export type MemberRoleValue = (typeof MEMBER_ROLES)[number];
export const MEMBER_ROLE_LABELS: Record<MemberRoleValue, string> = {
  OWNER: "Владелец",
  ADMIN: "Администратор",
  MEMBER: "Менеджер",
  VIEWER: "Наблюдатель",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  NOTE: "Заметка",
  CALL: "Звонок",
  EMAIL: "Email",
  MEETING: "Встреча",
  STATUS_CHANGE: "Смена статуса",
  SCORE: "AI-оценка",
  PROPOSAL: "КП",
  MESSAGE: "Сообщение",
  TASK: "Задача",
  DEAL: "Сделка",
  IMPORT: "Импорт",
  UPDATE: "Изменение",
  SYSTEM: "Система",
};

/** Ниши целевой аудитории, используются в фильтрах и скоринге. */
export const TARGET_NICHES = [
  "Продавец Wildberries",
  "Продавец Ozon",
  "Интернет-магазин",
  "Оптовая торговля",
  "Розничный магазин",
  "Производство",
  "Услуги",
  "Другое",
] as const;
