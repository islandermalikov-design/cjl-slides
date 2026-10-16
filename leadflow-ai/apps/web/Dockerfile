# syntax=docker/dockerfile:1.7
# LeadFlow AI — веб-приложение и worker. Сборка из корня монорепозитория:
#   docker build -f apps/web/Dockerfile -t leadflow-web .
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm exec prisma generate && pnpm --filter @leadflow/web build

# --- Worker BullMQ и миграции: полный набор зависимостей + исходники ---
FROM build AS worker
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@leadflow/web", "worker"]

# --- Веб-сервер: standalone-сборка Next.js + Chromium для PDF ---
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=build /app/apps/web/node_modules/playwright-core /opt/playwright-core
RUN node /opt/playwright-core/cli.js install --with-deps chromium && rm -rf /var/lib/apt/lists/*
RUN groupadd --system app && useradd --system --gid app --home /app app
COPY --from=build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /app/apps/web/public ./apps/web/public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
