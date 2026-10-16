// Синтаксическая проверка URL перед любым исходящим запросом (первая линия защиты от SSRF).
// Финальная проверка (DNS → приватные IP) выполняется в collector перед соединением.

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe80:/i,
  /^metadata\.google\.internal$/i,
];

export function isSafePublicUrl(input: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "Некорректный URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Разрешены только http и https" };
  }
  if (url.username || url.password) return { ok: false, reason: "URL с учётными данными запрещён" };
  if (url.port && !["80", "443"].includes(url.port)) {
    return { ok: false, reason: "Разрешены только стандартные порты 80/443" };
  }
  const host = url.hostname;
  if (PRIVATE_HOST_PATTERNS.some((re) => re.test(host))) {
    return { ok: false, reason: "Внутренние и приватные адреса запрещены" };
  }
  if (/^\d+$/.test(host) || /^0x/i.test(host)) return { ok: false, reason: "Числовой адрес хоста запрещён" };
  return { ok: true, url };
}
