import type { Candidate } from "./collector";

// Синтетический DEMO-каталог. Компании вымышлены; домены в зоне .example зарезервированы (RFC 2606)
// и не могут принадлежать реальным организациям.

const CITIES: Array<[string, string]> = [
  ["Москва", "Москва"],
  ["Санкт-Петербург", "Санкт-Петербург"],
  ["Казань", "Республика Татарстан"],
  ["Екатеринбург", "Свердловская область"],
  ["Новосибирск", "Новосибирская область"],
  ["Краснодар", "Краснодарский край"],
  ["Нижний Новгород", "Нижегородская область"],
  ["Самара", "Самарская область"],
];

const TEMPLATES: Array<{ base: string; niche: string; category: string; marketplace: string | null; signal: string }> = [
  { base: "Текстиль Дом", niche: "Продавец Wildberries", category: "Домашний текстиль", marketplace: "Wildberries", signal: "Публикует прайс-лист в формате Excel" },
  { base: "ЭкоКосметика", niche: "Продавец Ozon", category: "Косметика", marketplace: "Ozon", signal: "Магазин на Ozon и Wildberries" },
  { base: "СтройОпт", niche: "Оптовая торговля", category: "Стройматериалы", marketplace: null, signal: "Оптовый прайс обновляется вручную" },
  { base: "Детский Мир Игрушек", niche: "Интернет-магазин", category: "Детские товары", marketplace: "Wildberries", signal: "Собственный интернет-магазин и витрина на WB" },
  { base: "МебельПро", niche: "Производство", category: "Мебель", marketplace: "Ozon", signal: "Производство под заказ, каталог в PDF" },
  { base: "Спорт Лайн", niche: "Продавец Wildberries", category: "Спорттовары", marketplace: "Wildberries", signal: "Более 300 карточек товаров" },
  { base: "ЗооМаркет", niche: "Розничный магазин", category: "Зоотовары", marketplace: null, signal: "Сеть из 4 розничных точек" },
  { base: "Автозапчасти Плюс", niche: "Интернет-магазин", category: "Автотовары", marketplace: "Ozon", signal: "Приём заказов по таблице на сайте" },
  { base: "Чайная Лавка", niche: "Продавец Ozon", category: "Продукты питания", marketplace: "Ozon", signal: "Сезонные поставки, учёт остатков" },
  { base: "ТехноДом", niche: "Оптовая торговля", category: "Бытовая техника", marketplace: "Яндекс Маркет", signal: "Дилерская сеть, прайс в Excel" },
  { base: "Fashion Room", niche: "Продавец Wildberries", category: "Одежда", marketplace: "Wildberries", signal: "Собственный бренд одежды" },
  { base: "Посуда Центр", niche: "Розничный магазин", category: "Посуда", marketplace: null, signal: "Магазин и доставка по городу" },
];

function slug(value: string) {
  const map: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya" };
  return value
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function allDemoCandidates(): Candidate[] {
  const out: Candidate[] = [];
  TEMPLATES.forEach((t, i) => {
    CITIES.forEach(([city, region], j) => {
      if ((i + j) % 3 === 2) return;
      const name = `${t.base} ${city === "Москва" ? "" : city}`.trim() + " (DEMO)";
      const domain = `${slug(t.base)}-${slug(city)}.example`;
      const hasSite = (i + j) % 4 !== 1;
      const hasContacts = (i * j) % 5 !== 2;
      out.push({
        name,
        legalName: null,
        inn: null,
        website: hasSite ? `https://${domain}` : null,
        category: t.category,
        niche: t.niche,
        city,
        region,
        marketplace: t.marketplace,
        publicEmail: hasContacts && hasSite ? `sales@${domain}` : null,
        publicPhone: hasContacts ? `+7 900 ${String(100 + i * 7 + j).padStart(3, "0")}-${String(10 + j).padStart(2, "0")}-${String(20 + i).padStart(2, "0")}` : null,
        sourceUrl: hasSite ? `https://${domain}/contacts` : null,
        evidence: [
          { kind: "FACT", field: "category", value: t.category, url: hasSite ? `https://${domain}` : null, snippet: null },
          { kind: "SIGNAL", field: "signal", value: t.signal, url: hasSite ? `https://${domain}` : null, snippet: null },
        ],
        isDemo: true,
      });
    });
  });
  return out;
}

export function demoCandidates(query: Record<string, unknown>, limit: number): Candidate[] {
  const q = (k: string) => (typeof query[k] === "string" ? (query[k] as string).toLowerCase().trim() : "");
  return allDemoCandidates()
    .filter((c) => !q("name") || c.name.toLowerCase().includes(q("name")))
    .filter((c) => !q("niche") || (c.niche ?? "").toLowerCase().includes(q("niche")))
    .filter((c) => !q("city") || (c.city ?? "").toLowerCase().includes(q("city")))
    .filter((c) => !q("region") || (c.region ?? "").toLowerCase().includes(q("region")))
    .filter((c) => !q("category") || (c.category ?? "").toLowerCase().includes(q("category")))
    .filter((c) => !q("marketplace") || (c.marketplace ?? "").toLowerCase().includes(q("marketplace")))
    .filter((c) => query.hasWebsite !== true || Boolean(c.website))
    .filter((c) => query.hasContacts !== true || Boolean(c.publicEmail || c.publicPhone))
    .slice(0, limit);
}
