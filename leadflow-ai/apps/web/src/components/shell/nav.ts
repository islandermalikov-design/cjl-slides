import {
  Bot,
  Building,
  ChartColumn,
  Database,
  FileText,
  Handshake,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Plug,
  Radar,
  ScrollText,
  Settings,
  Sparkles,
  SquareCheck,
  SquareKanban,
  Users,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: "Обзор",
    items: [
      { title: "Главная", href: "/dashboard", icon: LayoutDashboard },
      { title: "Аналитика", href: "/analytics", icon: ChartColumn },
    ],
  },
  {
    title: "Клиенты",
    items: [
      { title: "Поиск клиентов", href: "/discovery", icon: Radar },
      { title: "База компаний", href: "/companies", icon: Building },
      { title: "CRM", href: "/crm", icon: SquareKanban },
      { title: "Контакты", href: "/contacts", icon: Users },
    ],
  },
  {
    title: "Продажи",
    items: [
      { title: "Коммерческие предложения", href: "/proposals", icon: FileText },
      { title: "Сообщения", href: "/messages", icon: MessagesSquare },
      { title: "Задачи", href: "/tasks", icon: SquareCheck },
      { title: "Сделки", href: "/deals", icon: Handshake },
    ],
  },
  {
    title: "AI-инструменты",
    items: [
      { title: "AI-анализ компаний", href: "/ai/analysis", icon: Sparkles },
      { title: "Генератор КП", href: "/ai/proposals", icon: WandSparkles },
      { title: "AI-ассистент", href: "/ai/assistant", icon: Bot },
    ],
  },
  {
    title: "Автоматизация",
    items: [
      { title: "Источники данных", href: "/sources", icon: Database },
      { title: "Задания", href: "/jobs", icon: ListChecks },
      { title: "Интеграции", href: "/integrations", icon: Plug },
    ],
  },
  {
    title: "Система",
    items: [
      { title: "Настройки", href: "/settings", icon: Settings },
      { title: "Журнал событий", href: "/audit", icon: ScrollText },
    ],
  },
];

const EXTRA_LABELS: Record<string, string> = {
  "/companies/import": "Импорт CSV/XLSX",
  "/proposals/new": "Новое КП",
};

export function labelForPath(path: string): string | null {
  if (EXTRA_LABELS[path]) return EXTRA_LABELS[path]!;
  for (const s of NAV) for (const i of s.items) if (i.href === path) return i.title;
  return null;
}

export function sectionForPath(path: string): NavSection | null {
  return NAV.find((s) => s.items.some((i) => path === i.href || path.startsWith(`${i.href}/`))) ?? null;
}
