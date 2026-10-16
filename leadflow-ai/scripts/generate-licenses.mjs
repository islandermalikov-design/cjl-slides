// Генерирует THIRD_PARTY_LICENSES.md: прямые зависимости (JS и Python) и сводка по транзитивным лицензиям.
// Запуск: node scripts/generate-licenses.mjs
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const manifests = ["package.json", "apps/web/package.json", "packages/shared/package.json"];
const rows = new Map();
for (const m of manifests) {
  const pkg = JSON.parse(readFileSync(path.join(root, m), "utf8"));
  const dir = path.dirname(path.join(root, m));
  for (const [section, deps] of [["runtime", pkg.dependencies ?? {}], ["dev", pkg.devDependencies ?? {}]]) {
    for (const name of Object.keys(deps)) {
      if (String(deps[name]).startsWith("workspace")) continue;
      const pj = [path.join(dir, "node_modules", name, "package.json"), path.join(root, "node_modules", name, "package.json")].find(existsSync);
      if (!pj) continue;
      const info = JSON.parse(readFileSync(pj, "utf8"));
      const license = typeof info.license === "string" ? info.license : info.license?.type ?? "см. пакет";
      const repo = typeof info.repository === "string" ? info.repository : info.repository?.url ?? info.homepage ?? "";
      const key = `${name}@${info.version}`;
      if (!rows.has(key)) rows.set(key, { name, version: info.version, license, section, repo: repo.replace(/^git\+/, "").replace(/\.git$/, "") });
    }
  }
}

let summary = "";
try {
  const json = JSON.parse(execSync("pnpm licenses list --prod --json", { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  summary = Object.entries(json)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([lic, pkgs]) => `| ${lic} | ${pkgs.length} |`)
    .join("\n");
} catch {
  summary = "| (не удалось получить: выполните pnpm install) | |";
}

const py = [];
const lockPath = path.join(root, "apps/collector/uv.lock");
if (existsSync(lockPath)) {
  const direct = ["fastapi", "uvicorn", "httpx", "beautifulsoup4", "lxml", "pydantic", "pydantic-settings", "pytest", "respx", "ruff"];
  const lock = readFileSync(lockPath, "utf8");
  const pyLicenses = { fastapi: "MIT", uvicorn: "BSD-3-Clause", httpx: "BSD-3-Clause", beautifulsoup4: "MIT", lxml: "BSD-3-Clause", pydantic: "MIT", "pydantic-settings": "MIT", pytest: "MIT", respx: "BSD-3-Clause", ruff: "MIT" };
  for (const name of direct) {
    const m = lock.match(new RegExp(`name = "${name}"\\nversion = "([^"]+)"`));
    if (m) py.push(`| ${name} | ${m[1]} | ${pyLicenses[name]} |`);
  }
}

const table = [...rows.values()]
  .sort((a, b) => a.section.localeCompare(b.section) || a.name.localeCompare(b.name))
  .map((r) => `| ${r.name} | ${r.version} | ${r.license} | ${r.section} | ${r.repo} |`)
  .join("\n");

writeFileSync(
  path.join(root, "THIRD_PARTY_LICENSES.md"),
  `# Сторонние компоненты и лицензии

Файл сгенерирован \`node scripts/generate-licenses.mjs\` (${new Date().toISOString().slice(0, 10)}).
Код сторонних проектов **не копировался** в репозиторий: все компоненты подключаются как пакеты
из официальных реестров (npm, PyPI). UI-компоненты в \`apps/web/src/components/ui\` написаны
по мотивам открытого дизайна shadcn/ui (MIT) поверх Radix UI (MIT).

## Прямые JavaScript/TypeScript-зависимости

| Пакет | Версия | Лицензия | Тип | Репозиторий |
|---|---|---|---|---|
${table}

## Прямые Python-зависимости (apps/collector)

| Пакет | Версия | Лицензия |
|---|---|---|
${py.join("\n")}

## Сводка лицензий production-зависимостей (включая транзитивные)

| Лицензия | Пакетов |
|---|---|
${summary}

## Замечания по совместимости

- **jszip** (через exceljs) распространяется под \`MIT OR GPL-3.0-or-later\` — используется вариант MIT.
- **sharp / libvips** (LGPL-3.0, опциональная зависимость Next.js для оптимизации изображений) подключается динамически как отдельная библиотека, что допускается LGPL.
- **lightningcss** (MPL-2.0) — инструмент сборки CSS, исходники не модифицируются.
- **elkjs** (EPL-2.0) — транзитивная зависимость инструментов Prisma, не входит в клиентский бандл.
- **buffers** (лицензия не указана в package.json, транзитивно через exceljs → unzipper) — используется только при чтении XLSX на сервере; при коммерческом распространении рекомендуется проверить или заменить парсер.
- Шрифты не встраиваются: используется системный стек (SF Pro на macOS).
`,
);
console.log(`THIRD_PARTY_LICENSES.md: ${rows.size} JS, ${py.length} Python`);
