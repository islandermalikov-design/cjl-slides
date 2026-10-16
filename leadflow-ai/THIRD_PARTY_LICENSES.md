# Сторонние компоненты и лицензии

Файл сгенерирован `node scripts/generate-licenses.mjs` (2026-10-16).
Код сторонних проектов **не копировался** в репозиторий: все компоненты подключаются как пакеты
из официальных реестров (npm, PyPI). UI-компоненты в `apps/web/src/components/ui` написаны
по мотивам открытого дизайна shadcn/ui (MIT) поверх Radix UI (MIT).

## Прямые JavaScript/TypeScript-зависимости

| Пакет | Версия | Лицензия | Тип | Репозиторий |
|---|---|---|---|---|
| @playwright/test | 1.63.0 | Apache-2.0 | dev | https://github.com/microsoft/playwright |
| @tailwindcss/postcss | 4.3.3 | MIT | dev | https://github.com/tailwindlabs/tailwindcss |
| @types/node | 22.20.4 | MIT | dev | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/papaparse | 5.5.2 | MIT | dev | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/react | 19.3.0 | MIT | dev | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/react-dom | 19.3.0 | MIT | dev | https://github.com/DefinitelyTyped/DefinitelyTyped |
| dotenv | 17.4.2 | BSD-2-Clause | dev | git://github.com/motdotla/dotenv |
| eslint | 9.39.5 | MIT | dev | eslint/eslint |
| eslint-config-next | 16.3.8 | MIT | dev | vercel/next.js |
| postcss | 8.5.28 | MIT | dev | postcss/postcss |
| prisma | 7.10.0 | Apache-2.0 | dev | https://github.com/prisma/prisma |
| tailwindcss | 4.3.3 | MIT | dev | https://github.com/tailwindlabs/tailwindcss |
| tsx | 4.23.15 | MIT | dev | privatenumber/tsx |
| tw-animate-css | 1.4.0 | MIT | dev | Wombosvideo/tw-animate-css |
| typescript | 5.9.3 | Apache-2.0 | dev | https://github.com/microsoft/TypeScript |
| vitest | 5.0.3 | MIT | dev | https://github.com/vitest-dev/vitest |
| @anthropic-ai/sdk | 0.131.0 | MIT | runtime | github:anthropics/anthropic-sdk-typescript |
| @dnd-kit/core | 6.3.1 | MIT | runtime | https://github.com/clauderic/dnd-kit |
| @dnd-kit/sortable | 10.0.0 | MIT | runtime | https://github.com/clauderic/dnd-kit |
| @dnd-kit/utilities | 3.2.2 | MIT | runtime | https://github.com/clauderic/dnd-kit |
| @hookform/resolvers | 5.9.1 | MIT | runtime | https://github.com/react-hook-form/resolvers |
| @prisma/adapter-pg | 7.10.0 | Apache-2.0 | runtime | https://github.com/prisma/prisma |
| @prisma/client | 7.10.0 | Apache-2.0 | runtime | https://github.com/prisma/prisma |
| @tanstack/react-table | 8.21.3 | MIT | runtime | https://github.com/TanStack/table |
| better-auth | 1.7.7 | MIT | runtime | https://github.com/better-auth/better-auth |
| bullmq | 5.81.5 | MIT | runtime | https://github.com/taskforcesh/bullmq |
| class-variance-authority | 0.7.1 | Apache-2.0 | runtime | https://github.com/joe-bell/cva |
| clsx | 2.1.1 | MIT | runtime | lukeed/clsx |
| cmdk | 1.1.1 | MIT | runtime | https://github.com/pacocoursey/cmdk |
| exceljs | 4.4.0 | MIT | runtime | https://github.com/exceljs/exceljs |
| ioredis | 5.11.1 | MIT | runtime | git://github.com/luin/ioredis |
| lucide-react | 1.49.0 | ISC | runtime | https://github.com/lucide-icons/lucide |
| next | 16.3.8 | MIT | runtime | vercel/next.js |
| next-themes | 0.4.6 | MIT | runtime | https://github.com/pacocoursey/next-themes |
| nodemailer | 10.0.13 | MIT-0 | runtime | https://github.com/nodemailer/nodemailer |
| papaparse | 5.7.0 | MIT | runtime | https://github.com/mholt/PapaParse |
| pg | 8.23.1 | MIT | runtime | git://github.com/brianc/node-postgres |
| playwright-core | 1.63.0 | Apache-2.0 | runtime | https://github.com/microsoft/playwright |
| radix-ui | 1.6.7 | MIT | runtime | https://github.com/radix-ui/primitives |
| react | 19.3.0 | MIT | runtime | https://github.com/react/react |
| react-dom | 19.3.0 | MIT | runtime | https://github.com/react/react |
| react-hook-form | 7.89.0 | MIT | runtime | https://github.com/react-hook-form/react-hook-form |
| recharts | 3.10.1 | MIT | runtime | https://github.com/recharts/recharts |
| server-only | 0.0.1 | MIT | runtime | https://reactjs.org/ |
| sonner | 2.0.8 | MIT | runtime | https://github.com/emilkowalski/sonner |
| tailwind-merge | 3.7.0 | MIT | runtime | https://github.com/dcastil/tailwind-merge |
| zod | 4.6.5 | MIT | runtime | https://github.com/colinhacks/zod |

## Прямые Python-зависимости (apps/collector)

| Пакет | Версия | Лицензия |
|---|---|---|
| fastapi | 0.142.2 | MIT |
| uvicorn | 0.54.0 | BSD-3-Clause |
| httpx | 0.28.1 | BSD-3-Clause |
| beautifulsoup4 | 4.15.0 | MIT |
| lxml | 6.1.3 | BSD-3-Clause |
| pydantic | 2.13.5 | MIT |
| pydantic-settings | 2.15.0 | MIT |
| pytest | 9.1.1 | MIT |
| respx | 0.23.1 | BSD-3-Clause |
| ruff | 0.16.9 | MIT |

## Сводка лицензий production-зависимостей (включая транзитивные)

| Лицензия | Пакетов |
|---|---|
| MIT | 455 |
| ISC | 39 |
| Apache-2.0 | 36 |
| BSD-3-Clause | 6 |
| Unlicense | 4 |
| MPL-2.0 | 3 |
| LGPL-3.0-or-later | 2 |
| MIT and ISC | 1 |
| Unknown | 1 |
| CC-BY-4.0 | 1 |
| MIT/X11 | 1 |
| BSD-2-Clause | 1 |
| EPL-2.0 | 1 |
| (MIT OR GPL-3.0-or-later) | 1 |
| MIT-0 | 1 |
| (MIT AND Zlib) | 1 |
| 0BSD | 1 |
| MIT AND ISC | 1 |

## Замечания по совместимости

- **jszip** (через exceljs) распространяется под `MIT OR GPL-3.0-or-later` — используется вариант MIT.
- **sharp / libvips** (LGPL-3.0, опциональная зависимость Next.js для оптимизации изображений) подключается динамически как отдельная библиотека, что допускается LGPL.
- **lightningcss** (MPL-2.0) — инструмент сборки CSS, исходники не модифицируются.
- **elkjs** (EPL-2.0) — транзитивная зависимость инструментов Prisma, не входит в клиентский бандл.
- **buffers** (лицензия не указана в package.json, транзитивно через exceljs → unzipper) — используется только при чтении XLSX на сервере; при коммерческом распространении рекомендуется проверить или заменить парсер.
- Шрифты не встраиваются: используется системный стек (SF Pro на macOS).
