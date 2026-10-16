# CLAUDE.md — правила работы над LeadFlow AI

Этот файл читает Claude Code при каждом запуске. Статус фаз и следующий шаг — в `docs/roadmap.md`.

## Команды

```bash
docker compose up -d postgres redis   # инфраструктура
pnpm dev                              # веб на :3000
pnpm worker                           # BullMQ worker (опционально)
pnpm lint && pnpm typecheck && pnpm test   # перед каждым коммитом
pnpm build                            # production-сборка
pnpm test:e2e                         # при запущенном приложении и DEMO seed
cd apps/collector && uv run ruff check . && uv run pytest -q
```

После изменения `prisma/schema.prisma`: `pnpm exec prisma migrate dev --name <имя>` (генерирует клиент в
`apps/web/src/generated/prisma`, каталог в .gitignore).

## Архитектурные правила

- **Tenant isolation.** Любой запрос к бизнес-данным фильтруется по `organizationId` из `RequestContext`
  (`src/server/context.ts`). Никогда не принимайте `organizationId` от клиента. Новые сервисы принимают
  `ctx: { organizationId, userId }` и проверяют принадлежность связанных записей (см. `services/deals.ts`).
- **Права.** Server actions начинаются с `requireContext("<минимальная роль>")`: VIEWER < MEMBER < ADMIN < OWNER.
- **Слои.** UI (`src/features/*`, client components) → server actions (`features/*/actions.ts`, обёртка `runAction`)
  → сервисы (`src/server/services/*`, без React) → Prisma. Чистые функции без БД — `src/server/domain/*`.
- **Валидация.** Все входные данные — через Zod-схемы (`packages/shared/src/schemas.ts` или рядом с сервисом).
- **Ошибки.** Ожидаемые ошибки — `AppError` с русским сообщением; неожиданные логируются через `logger` (секреты маскируются).
- **Аудит.** Значимые действия (удаление, экспорт, отправка, интеграции, роли) пишутся через `audit()`.
- **Фоновые задания.** `enqueueJob()` из `src/server/jobs/queue.ts`; обработчик добавляется в `jobs/handlers.ts`.
  Задания должны быть идемпотентными (повторный запуск не дублирует данные).
- **AI.** Только через `callStructured()` (`src/server/ai/client.ts`): Zod-схема ответа, внешние данные в `wrapUntrusted()`,
  лимит бюджета, учёт расходов. Для каждого AI-сценария нужен DEMO-вариант без ключа.
- **Источники данных.** Новый источник — адаптер в `apps/collector/app/adapters/` (наследник `Adapter`) с проверкой
  robots.txt и только через `safe_get()`. Никаких обходов CAPTCHA/авторизации, никаких придуманных контактов.
- **Коммуникации.** Не добавлять автоматическую массовую отправку. Отправка — только `sendDraft()` после согласования
  и с явным подтверждением; suppression list проверяется всегда.

## Правила продукта

- Интерфейс только на русском. Иконки — Lucide, без эмодзи.
- Демонстрационные данные всегда помечены (`isDemo`, бейдж `DEMO`, домены `*.example`).
- Не создавать фальшивые интеграции: если сервис требует ключ — адаптер + переменная окружения + инструкция + DEMO-режим.
- Не утверждать, что тесты прошли, если они не запускались.
- Дизайн-токены — `src/styles/globals.css`; компоненты — `src/components/ui`. Цвета графиков проверены на различимость (dataviz).

## Где что лежит

| Задача | Файл |
|---|---|
| Схема БД | `prisma/schema.prisma`, описание — `docs/database.md` |
| Навигация | `src/components/shell/nav.ts` |
| Справочники и подписи | `packages/shared/src/constants.ts` |
| Скоринг | `src/server/services/scoring.ts`, `src/server/domain/heuristic-score.ts` |
| КП и PDF | `src/server/services/proposals.ts`, `proposal-render.ts`, `domain/proposal-template.ts` |
| Проверка законности сообщений | `src/server/services/outreach.ts` → `checkCompliance()` |
| Seed | `apps/web/src/server/seed/index.ts` (точка входа `prisma/seed.ts`) |
