# База данных

PostgreSQL 16, Prisma 7 (`prisma/schema.prisma`, миграции в `prisma/migrations`).

## Принципы

- **Tenant isolation:** все бизнес-таблицы содержат `organizationId` с внешним ключом на `Organization`
  (`onDelete: Cascade`), индексы начинаются с `organizationId`. Сервисы фильтруют каждый запрос по организации.
- **DEMO-данные:** поле `isDemo` у компаний, контактов, сделок, КП, сообщений, задач, фактов, источников.
- **Soft delete:** `deletedAt` у `Company`, `Contact`, `Deal`, `Proposal`. При мягком удалении компании очищаются
  `domain` и `inn`, чтобы освободить уникальные ключи. Безвозвратное удаление — «Удалить данные компании» (каскад).
- **Секреты:** `IntegrationCredential.encryptedSecret` — AES-256-GCM (`iv.tag.ciphertext`, base64), в UI — `secretHint`.
- **Временные метки:** `createdAt`, `updatedAt` (`@updatedAt`) у изменяемых сущностей.

## Модели

| Группа | Модели |
|---|---|
| Доступ | `User`, `Session`, `Account`, `Verification` (Better Auth), `Organization`, `OrganizationMember` (роль OWNER/ADMIN/MEMBER/VIEWER) |
| Компании | `Company`, `Contact`, `LeadSource`, `LeadEvidence` (факт/контакт/сигнал со ссылкой и датой), `LeadScore`, `LeadTag`, `CompanyTag` |
| Продажи | `PipelineStage`, `Deal`, `Activity` (история), `Task`, `Service` (каталог и цены), `Proposal`, `ProposalVersion` (JSON-содержимое) |
| Коммуникации | `MessageDraft`, `Message`, `CommunicationConsent`, `SuppressionEntry` |
| Автоматизация | `ImportJob`, `DiscoveryJob`, `BackgroundJob`, `IntegrationCredential`, `AppSetting`, `AiUsage`, `Notification`, `AuditLog` |

## Уникальные ограничения (выборочно)

| Ограничение | Назначение |
|---|---|
| `Company(organizationId, domain)`, `Company(organizationId, inn)` | Жёсткая дедупликация по домену и ИНН |
| `Message(organizationId, idempotencyKey)` | Один черновик — не более одного исходящего сообщения |
| `BackgroundJob(organizationId, idempotencyKey)` | Идемпотентная постановка заданий |
| `SuppressionEntry(organizationId, value)` | Один адрес/домен в списке исключений |
| `CommunicationConsent(organizationId, channel, address)` | Одно согласие на адрес и канал |
| `ProposalVersion(proposalId, version)` | Нумерация версий КП |

## Дедупликация

Ключи (`packages/shared/src/dedupe.ts`): ИНН, домен сайта (или корпоративного email; бесплатные почтовые домены
игнорируются), email, телефон (7XXXXXXXXXX), нормализованное название (без ОПФ и кавычек) + город.
ИНН и домен блокируют создание; совпадение по названию предупреждает (можно добавить явно).

## Seed

`pnpm db:seed` пересоздаёт организацию `leadflow-demo`: 2 пользователя, 32 компании из DEMO-каталога (вторая половина
каталога доступна в «Поиске клиентов»), оценки, КП, симулированная переписка, сделки, задачи, источники.
