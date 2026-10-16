import "server-only";
import type { ProposalContent } from "@leadflow/shared";
import { AppError } from "../errors";
import { logger } from "../logger";
import { formatMoneyPlain } from "./format";

function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");
}

/** HTML-документ КП (A4). Все значения экранируются — контент из AI/пользователя считается недоверенным. */
export function renderProposalHtml(c: ProposalContent, meta: { date: Date; version: number; isDemo: boolean }): string {
  const dateStr = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(meta.date);
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>${esc(c.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11.5pt; line-height: 1.55; background: #fff; }
  .page { max-width: 820px; margin: 0 auto; padding: 32px 36px; }
  .cover { border-radius: 14px; padding: 32px; background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%); color: #fff; margin-bottom: 28px; }
  .cover .eyebrow { font-size: 9.5pt; letter-spacing: .08em; text-transform: uppercase; opacity: .8; }
  .cover h1 { font-size: 22pt; line-height: 1.2; margin: 10px 0 6px; font-weight: 700; letter-spacing: -.01em; }
  .cover .sub { font-size: 12pt; opacity: .9; }
  .cover .meta { display: flex; gap: 24px; margin-top: 22px; font-size: 9.5pt; opacity: .85; }
  .demo { display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 6px; background: #fef3c7; color: #92400e; font-size: 8.5pt; font-weight: 600; }
  h2 { font-size: 13.5pt; margin: 26px 0 10px; letter-spacing: -.005em; color: #0f172a; display: flex; align-items: center; gap: 10px; }
  h2 .num { display: inline-flex; width: 24px; height: 24px; border-radius: 7px; background: #eff6ff; color: #2563eb; font-size: 10pt; align-items: center; justify-content: center; font-weight: 700; }
  p { margin: 0 0 8px; color: #334155; }
  ul.features { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
  ul.features li { padding-left: 20px; position: relative; color: #334155; }
  ul.features li:before { content: ""; position: absolute; left: 0; top: .55em; width: 8px; height: 8px; border-radius: 3px; background: #2563eb; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { font-size: 9pt; text-transform: uppercase; letter-spacing: .04em; color: #64748b; font-weight: 600; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .total { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding: 14px 16px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
  .total strong { font-size: 15pt; color: #0f172a; }
  .muted { color: #64748b; font-size: 9.5pt; }
  .cta { margin-top: 26px; padding: 18px 20px; border-radius: 12px; border: 1px solid #bfdbfe; background: #eff6ff; }
  .cta h3 { margin: 0 0 6px; font-size: 12pt; color: #1d4ed8; }
  .contacts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 18px; margin-top: 10px; font-size: 10.5pt; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 8.5pt; color: #94a3b8; }
  .stage { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; }
  @media print { .page { padding: 0; } .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body><div class="page">
  <section class="cover">
    <div class="eyebrow">Коммерческое предложение${meta.isDemo ? '<span class="demo">DEMO</span>' : ""}</div>
    <h1>${esc(c.title)}</h1>
    <div class="sub">${esc(c.subtitle)}</div>
    <div class="meta"><span>Для: ${esc(c.clientName)}</span><span>${esc(dateStr)}</span><span>Версия ${meta.version}</span></div>
  </section>

  <h2><span class="num">1</span>Задача</h2>
  ${paragraphs(c.problem)}

  <h2><span class="num">2</span>Предлагаемое решение</h2>
  ${paragraphs(c.solution)}

  ${c.features.length ? `<h2><span class="num">3</span>Возможности</h2><ul class="features">${c.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}

  <h2><span class="num">4</span>Этапы работы</h2>
  <table><thead><tr><th>Этап</th><th class="num">Срок</th></tr></thead><tbody>
  ${c.stages.map((s) => `<tr><td><strong>${esc(s.title)}</strong><div class="muted">${esc(s.description)}</div></td><td class="num">${s.durationDays} дн.</td></tr>`).join("")}
  </tbody></table>

  <h2><span class="num">5</span>Стоимость и сроки</h2>
  <table><thead><tr><th>Позиция</th><th class="num">Стоимость</th></tr></thead><tbody>
  ${c.priceItems.map((p) => `<tr><td>${esc(p.name)}${p.comment ? `<div class="muted">${esc(p.comment)}</div>` : ""}</td><td class="num">${esc(formatMoneyPlain(p.price))}</td></tr>`).join("")}
  </tbody></table>
  <div class="total"><span>Итого, ориентировочно · срок ${c.durationDays} дн.</span><strong>${esc(formatMoneyPlain(c.totalPrice))}</strong></div>
  ${c.assumptions.length ? `<p class="muted" style="margin-top:10px">${c.assumptions.map(esc).join(" ")}</p>` : ""}

  <div class="cta">
    <h3>Следующий шаг</h3>
    ${paragraphs(c.nextStep)}
    <div class="contacts">
      ${c.contacts.name ? `<div>${esc(c.contacts.name)}</div>` : ""}
      ${c.contacts.email ? `<div>${esc(c.contacts.email)}</div>` : ""}
      ${c.contacts.phone ? `<div>${esc(c.contacts.phone)}</div>` : ""}
      ${c.contacts.website ? `<div>${esc(c.contacts.website)}</div>` : ""}
    </div>
  </div>
  <div class="footer">Предложение носит информационный характер и не является публичной офертой. Итоговые стоимость и сроки фиксируются в договоре.</div>
</div></body></html>`;
}

const DEFAULT_CHROMIUM_PATHS = [
  "/opt/pw-browsers/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
];

/** HTML → PDF через Playwright (Chromium). Внешние запросы страницы блокируются. */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const { chromium } = await import("playwright-core");
  const fs = await import("node:fs");
  const candidates = [process.env.PDF_CHROMIUM_PATH, ...DEFAULT_CHROMIUM_PATHS].filter((p): p is string => Boolean(p));
  let executablePath: string | undefined;
  for (const p of candidates) {
    try {
      const stat = fs.statSync(p);
      if (stat.isFile()) {
        executablePath = p;
        break;
      }
      if (stat.isDirectory()) {
        // Каталог Playwright: ищем бинарник внутри.
        const nested = ["chrome-linux/chrome", "chrome-linux64/chrome", "chrome"].map((n) => `${p}/${n}`).find((n) => fs.existsSync(n));
        if (nested) {
          executablePath = nested;
          break;
        }
      }
    } catch {
      /* следующий кандидат */
    }
  }
  let browser;
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  } catch (e) {
    logger.error("Не удалось запустить Chromium для PDF", { error: e });
    throw new AppError(
      "Не найден Chromium для генерации PDF. Выполните `pnpm --filter @leadflow/web exec playwright install chromium` или укажите PDF_CHROMIUM_PATH.",
      "EXTERNAL",
      500,
    );
  }
  try {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.route("**/*", (route) => (route.request().url().startsWith("data:") ? route.continue() : route.abort()));
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
