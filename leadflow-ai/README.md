# LeadFlow AI

B2B-платформа для фрилансера или агентства, которое продаёт автоматизацию учёта, аналитику
(Excel, Google Sheets, Wildberries, Ozon), CRM и веб-приложения. Покрывает весь путь:

**поиск компании → сбор данных → AI-анализ → оценка → КП → согласование сообщения → отправка → ответ → сделка → аналитика.**

Интерфейс полностью на русском языке. Без платных ключей система работает в **DEMO_MODE**:
AI заменяется детерминированными правилами, сообщения только симулируются, демо-данные помечены `DEMO`.

## Возможности

| Раздел | Что работает |
|---|---|
| Главная, Аналитика | 10 KPI и 6 графиков из PostgreSQL, фильтры периода (сегодня / 7 / 30 / 90 дней / произвольный), конверсия по нишам, активность команды |
| Поиск клиентов | Подключаемые адаптеры: DEMO-каталог, корпоративные сайты (robots.txt, SSRF-защита), DaData (официальный API по ключу); отметка дублей, добавление выбранных в базу |
| База компаний | Таблица с сортировкой и фильтрами, пагинация, массовые теги/статусы/AI-анализ/удаление, экспорт CSV (защита от formula injection), проверка и объединение дублей |
| Импорт CSV/XLSX | Предпросмотр, автоматическое и ручное сопоставление столбцов, UTF-8/Windows-1251, дедупликация в файле и против базы, история импортов |
| Карточка компании | AI-анализ (факты / гипотезы / рекомендации / неизвестное), источники, история, контакты, задачи, сделки, КП, переписка, следующий шаг |
| CRM | Kanban с drag-and-drop (10 статусов) и табличный вид, фильтр «требуют повторного контакта» |
| КП | Каталог услуг START/BUSINESS/PREMIUM с редактируемыми ценами, генерация (Claude или шаблон), редактор, версии, HTML-превью, PDF (Playwright) |
| Сообщения | Черновик → проверка → согласование → отправка с явным подтверждением; проверка законности канала, suppression list, отписки, лимит в сутки, защита от повторной отправки |
| AI | Lead Scoring 0–100 по 6 критериям, AI-ассистент (только предлагает действия), лимит расходов, кэш, логи без секретов |
| Автоматизация | Фоновые задания (BullMQ + Redis или встроенный режим), повторы, идемпотентность, страница управления; источники данных с проверкой robots.txt; интеграции с зашифрованными ключами |
| Система | Роли (владелец/админ/менеджер/наблюдатель), журнал аудита, экспорт всех данных (JSON), удаление DEMO-данных и организации |

## Стек

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript strict · Tailwind CSS 4 · компоненты в стиле shadcn/ui на Radix ·
Lucide · Recharts · TanStack Table · React Hook Form · Zod 4 · dnd-kit · PostgreSQL 16 · Prisma 7 · Better Auth ·
Redis + BullMQ · Anthropic SDK (Claude) · Playwright (PDF и E2E) · Vitest ·
Python 3.12+ / FastAPI / httpx / BeautifulSoup (collector) · Docker Compose · GitHub Actions.

## Быстрый старт на MacBook (Apple Silicon)

Требуется: **Node.js 22**, **pnpm 10** (`corepack enable`), **Docker Desktop**, для collector — **uv** (`brew install uv`).

```bash
cd leadflow-ai
cp .env.example .env
# Сгенерируйте секреты:
#   BETTER_AUTH_SECRET=$(openssl rand -base64 32)
#   ENCRYPTION_KEY=$(openssl rand -base64 32)
#   COLLECTOR_TOKEN=$(openssl rand -hex 24)

docker compose up -d postgres redis   # PostgreSQL 16 + Redis 7 (+ БД leadflow_test)
pnpm install
pnpm db:migrate                       # миграции и генерация Prisma Client
pnpm db:seed                          # DEMO-организация и пользователи
pnpm --filter @leadflow/web exec playwright install chromium   # для PDF и E2E
pnpm dev                              # http://localhost:3000
```

Дополнительно (в отдельных терминалах):

```bash
pnpm worker                                   # worker BullMQ (без него задания выполняются в веб-сервере)
cd apps/collector && uv sync && uv run uvicorn app.main:app --port 8001   # сбор данных с сайтов
```

**DEMO-вход:** `demo@leadflow.local` / `demo12345` (владелец), `viewer@leadflow.local` / `viewer12345` (наблюдатель).

### Подключение Claude

Задайте `ANTHROPIC_API_KEY` в `.env` или сохраните ключ в разделе **Интеграции** (шифруется AES-256-GCM).
Модель по умолчанию — `claude-opus-5-5` (`ANTHROPIC_MODEL`). Месячный лимит расходов — `AI_MONTHLY_BUDGET_USD`
или «Настройки → Лимиты». Если ключа нет и `DEMO_MODE=false`, AI-функции показывают понятное сообщение.

## Команды

| Команда | Назначение |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Разработка / production-сборка / запуск |
| `pnpm worker` | Worker фоновых заданий (нужен `REDIS_URL`) |
| `pnpm lint`, `pnpm typecheck` | ESLint и TypeScript |
| `pnpm test` | Unit + интеграционные тесты (БД `TEST_DATABASE_URL`, очищается) |
| `pnpm test:e2e` | Playwright smoke-тесты против запущенного приложения с DEMO seed |
| `pnpm db:migrate` / `db:deploy` / `db:seed` / `db:reset` / `db:studio` | Prisma |
| `cd apps/collector && uv run pytest` | Тесты collector |
| `./scripts/backup.sh`, `./scripts/restore.sh <файл>` | Резервное копирование PostgreSQL |
| `node scripts/generate-licenses.mjs` | Обновить THIRD_PARTY_LICENSES.md |

## Структура

```
leadflow-ai/
  apps/web/            Next.js: src/app (страницы и API), src/features (UI по доменам + server actions),
                       src/server (сервисы, AI, задания, auth, seed), src/components (дизайн-система), tests/
  apps/collector/      FastAPI: app/adapters (источники), app/services (safe HTTP, robots.txt, извлечение), tests/
  packages/shared/     Общие Zod-схемы, справочники, нормализация, дедупликация, CSV-защита
  packages/config/     Базовый tsconfig
  prisma/              schema.prisma, migrations, seed.ts
  docs/                architecture, database, integrations, deployment, security, roadmap
  scripts/             backup/restore, генерация лицензий, init SQL
```

Подробности — в [docs/architecture.md](docs/architecture.md). План и статус работ — [docs/roadmap.md](docs/roadmap.md).

## Принципы работы с данными

- Контакты не придумываются: только опубликованные деловые контакты с URL источника и датой проверки.
- Не обходим CAPTCHA, авторизацию и антибот-защиту; соблюдаем robots.txt и условия сайтов.
- Покупательские чаты маркетплейсов для рекламы не используются; официальные API WB/Ozon не выдаются за источник данных о сторонних продавцах.
- Каждое сообщение проходит проверку и согласование; автоматическая массовая отправка отсутствует.
- AI не отправляет сообщения и не меняет данные — только предлагает действия.

## Лицензии

Сторонние компоненты — [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
