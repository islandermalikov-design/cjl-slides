# Развёртывание

> Приложение не публикуется в интернете автоматически. Ниже — инструкции для самостоятельного развёртывания.

## Локально (macOS, Apple Silicon)

См. «Быстрый старт» в README. Минимум: Node 22, pnpm 10, Docker Desktop (PostgreSQL и Redis).

## Docker Compose (полный стек)

```bash
cp .env.example .env            # заполните секреты, DEMO_MODE=false для реальной работы
docker compose --profile app up -d --build
docker compose --profile app run --rm migrate pnpm db:seed   # при необходимости — DEMO-данные
```

Сервисы: `postgres`, `redis`, `collector`, `migrate` (применяет миграции и завершается), `web` (порт 3000),
`worker`. Порты проброшены только на `127.0.0.1` — для доступа извне используйте reverse proxy с TLS.

Образ `web` (target `runner`) — standalone-сборка Next.js + Chromium для PDF; `worker` — полный набор
зависимостей и `tsx`. Collector — `python:3.13-slim` + uv.

## Production-чеклист

- [ ] `NODE_ENV=production`, `DEMO_MODE=false`, `ALLOW_SIGNUP=false` после создания пользователей.
- [ ] Уникальные `BETTER_AUTH_SECRET` (≥32 символа), `ENCRYPTION_KEY` (32 байта base64), `COLLECTOR_TOKEN`.
      **Не меняйте `ENCRYPTION_KEY`** после сохранения ключей интеграций — они не расшифруются.
- [ ] `BETTER_AUTH_URL` и `NEXT_PUBLIC_APP_URL` — публичный HTTPS-адрес (cookies `Secure` включаются в production).
- [ ] TLS на reverse proxy (Caddy / Nginx), HSTS.
- [ ] PostgreSQL с отдельным пользователем, регулярные бэкапы (ниже), мониторинг места.
- [ ] Redis без внешнего доступа; запущен `worker`.
- [ ] Egress collector — через прокси с запретом внутренних сетей.
- [ ] Лимит расходов на AI и дневной лимит отправок настроены.
- [ ] Проверены условия использования подключённых источников и правовые основания коммуникаций (152-ФЗ, 38-ФЗ «О рекламе»).

## Резервное копирование

```bash
./scripts/backup.sh                       # pg_dump -Fc в backups/, хранит 14 последних (BACKUP_KEEP)
./scripts/restore.sh backups/leadflow-YYYYMMDD-HHMMSS.dump
```

Пример cron (ежедневно в 03:15): `15 3 * * * cd /srv/leadflow-ai && ./scripts/backup.sh >> backups/backup.log 2>&1`.
Храните копии вне сервера (S3-совместимое хранилище с шифрованием). Восстановление проверяйте регулярно.

## Экспорт и удаление данных

- «Настройки → Данные → Экспорт» — JSON со всеми данными организации (без секретов).
- Удаление DEMO-данных, безвозвратное удаление компании, удаление организации (только владелец).

## CI

`.github/workflows/leadflow-ci.yml` (в корне репозитория): lint, typecheck, unit + интеграционные тесты
(PostgreSQL и Redis в service-контейнерах), `pnpm audit --prod`, production-сборка, seed, Playwright E2E;
отдельная задача для collector (ruff, pytest).
