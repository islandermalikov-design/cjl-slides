import { SERVICE_TIER_LABELS, type OutreachTexts, type ProposalContent, type ProposalGeneration } from "@leadflow/shared";

// Шаблонная генерация КП и сообщений без AI. Чистая функция: без БД и сети.

export interface TemplateService {
  name: string;
  tier: "START" | "BUSINESS" | "PREMIUM" | "CUSTOM";
  description: string;
  features: unknown;
  priceFrom: number;
  priceTo: number | null;
  durationDays: number;
}

export interface TemplateSender {
  name: string;
  company?: string;
  email: string;
  phone: string;
  website: string;
  signature: string;
}

const rub = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
function formatMoneyPlain(value: number): string {
  return `${rub.format(value)} ₽`;
}

function priceRange(s: TemplateService) {
  return s.priceTo ? `${formatMoneyPlain(s.priceFrom)} – ${formatMoneyPlain(s.priceTo)}` : `от ${formatMoneyPlain(s.priceFrom)}`;
}

/** Шаблонная генерация КП без AI (DEMO_MODE и ручной режим). Никаких выдуманных кейсов и обещаний. */
export function templateProposal(params: {
  companyName: string;
  niche: string | null;
  marketplace: string | null;
  services: TemplateService[];
  totalPrice: number;
  durationDays: number;
  sender: TemplateSender;
  tasks?: string;
  facts?: string;
}): ProposalGeneration {
  const { companyName, services, sender } = params;
  const isMp = params.marketplace && ["WILDBERRIES", "OZON", "YANDEX_MARKET", "MEGAMARKET"].includes(params.marketplace);
  const features = [...new Set(services.flatMap((s) => (Array.isArray(s.features) ? (s.features as string[]) : [])))].slice(0, 10);
  const userTasks = params.tasks?.split(/\n|;/).map((t) => t.trim()).filter(Boolean) ?? [];
  const problem = userTasks.length
    ? `По предварительной информации, задачи компании: ${userTasks.join("; ")}. Детали уточним на коротком созвоне.`
    : isMp
      ? "Продавцам маркетплейсов приходится регулярно сводить продажи, комиссии, логистику и остатки из разных выгрузок. Предлагаю обсудить, как это устроено у вас сейчас, и где автоматизация сэкономит время."
      : "Регулярная отчётность и учёт часто ведутся вручную в разрозненных таблицах. Предлагаю обсудить текущий процесс и определить, что имеет смысл автоматизировать.";
  const stages = [
    { title: "Знакомство и анализ", description: "Короткий созвон, разбор текущих таблиц и отчётов, фиксация требований.", durationDays: 1 },
    { title: "Проектирование", description: "Структура данных, макет отчётов и согласование результата.", durationDays: Math.max(1, Math.round(params.durationDays * 0.2)) },
    { title: "Разработка", description: "Реализация согласованного решения и наполнение тестовыми данными.", durationDays: Math.max(1, Math.round(params.durationDays * 0.6)) },
    { title: "Запуск и обучение", description: "Передача решения, инструкция и ответы на вопросы.", durationDays: Math.max(1, Math.round(params.durationDays * 0.2)) },
  ];
  const content: ProposalContent = {
    title: `Коммерческое предложение для «${companyName}»`,
    subtitle: services.map((s) => SERVICE_TIER_LABELS[s.tier]).join(" + "),
    clientName: companyName,
    problem,
    solution: services.map((s) => `${s.name}. ${s.description}`).join("\n\n"),
    features,
    stages,
    priceItems: services.map((s) => ({ name: s.name, price: s.priceFrom, comment: `Ориентир: ${priceRange(s)}` })),
    totalPrice: params.totalPrice,
    durationDays: params.durationDays,
    nextStep: "Предлагаю 20-минутный созвон, чтобы уточнить задачи и зафиксировать объём работ. Итоговая стоимость определяется после уточнения требований.",
    assumptions: [
      "Стоимость и сроки ориентировочные и уточняются после созвона.",
      "Доступ к данным и выгрузкам предоставляет заказчик.",
    ],
    contacts: { name: sender.name, email: sender.email, phone: sender.phone, website: sender.website },
  };
  const firstName = sender.name || "Меня зовут";
  const texts: OutreachTexts = {
    firstMessage: `Здравствуйте! ${sender.name ? `Меня зовут ${sender.name}, ` : ""}я занимаюсь автоматизацией учёта и аналитики${isMp ? " для продавцов маркетплейсов" : " для малого бизнеса"}. Посмотрел информацию о «${companyName}» и подумал, что вам может быть полезна ${services[0]?.name.split(":")[1]?.trim().toLowerCase() ?? "автоматизация отчётности"}. Если тема актуальна, пришлю короткое предложение.`,
    emailSubject: `Автоматизация отчётности для «${companyName}»`,
    emailBody: `Здравствуйте!\n\n${firstName === "Меня зовут" ? "Я" : `Меня зовут ${sender.name}, я`} помогаю компаниям автоматизировать учёт и аналитику: таблицы Excel/Google Sheets, отчёты по продажам${isMp ? " Wildberries и Ozon" : ""}, учёт поставок и остатков.\n\n${problem}\n\nВо вложении — предварительное предложение. Ориентировочная стоимость: ${formatMoneyPlain(params.totalPrice)}, срок — около ${params.durationDays} дн.\n\n${content.nextStep}\n\n${sender.signature || [sender.name, sender.phone, sender.website].filter(Boolean).join("\n")}`,
    messengerText: `Здравствуйте! Я делаю автоматизацию учёта и отчётов${isMp ? " для продавцов WB/Ozon" : ""}. Могу показать, как это может выглядеть для «${companyName}». Удобно обсудить 15 минут?`,
    interestedReply: `Спасибо за ответ! Предлагаю короткий созвон: вы расскажете, как сейчас ведёте учёт и отчёты, а я предложу 1–2 варианта решения с точной стоимостью и сроками. Когда вам удобно?`,
    priceObjectionReply: `Понимаю. Можно начать с минимальной версии — пакет START (от 5 000 ₽): одна управленческая таблица под ваш главный отчёт. Если результат окажется полезным, расширим решение поэтапно.`,
  };
  return { content, texts };
}

