"""Адаптер «Корпоративные сайты»: сбор опубликованных деловых данных по списку URL."""

from __future__ import annotations

from urllib.parse import urljoin, urlsplit

import httpx

from app.adapters.base import Adapter
from app.config import get_settings
from app.schemas.models import Candidate, Evidence
from app.services.extract import CONTACT_PATHS, PageData, extract_page
from app.services.robots import check_robots
from app.services.safe_http import FetchError, UnsafeUrlError, safe_get


def _normalize_url(raw: str) -> str:
    raw = raw.strip()
    if not raw.lower().startswith(("http://", "https://")):
        raw = "https://" + raw
    return raw


async def enrich_website(url: str, client: httpx.AsyncClient | None = None) -> tuple[Candidate | None, list[str]]:
    """Загружает главную и контактную страницу (если разрешено robots.txt) и строит карточку."""
    warnings: list[str] = []
    url = _normalize_url(url)
    try:
        decision = await check_robots(url, client)
    except UnsafeUrlError as e:
        return None, [f"{url}: {e}"]
    if not decision.allowed:
        return None, [f"{url}: {decision.message}"]

    pages: list[PageData] = []
    try:
        home = await safe_get(url, client=client, crawl_delay=decision.crawl_delay)
    except (FetchError, UnsafeUrlError) as e:
        return None, [f"{url}: {e}"]
    if home.status >= 400:
        return None, [f"{url}: сайт ответил {home.status}"]
    home_data = extract_page(home.url, home.text)
    pages.append(home_data)

    contact_candidates = home_data.contact_links or [urljoin(home.url, p) for p in CONTACT_PATHS[:2]]
    for contact_url in contact_candidates[:2]:
        if urlsplit(contact_url).hostname != urlsplit(home.url).hostname:
            continue
        cd = await check_robots(contact_url, client)
        if not cd.allowed:
            warnings.append(f"{contact_url}: {cd.message}")
            continue
        try:
            res = await safe_get(contact_url, client=client, crawl_delay=cd.crawl_delay)
        except (FetchError, UnsafeUrlError) as e:
            warnings.append(f"{contact_url}: {e}")
            continue
        if res.status < 400:
            pages.append(extract_page(res.url, res.text))
            break

    emails = list(dict.fromkeys(e for p in pages for e in p.emails))
    phones = list(dict.fromkeys(ph for p in pages for ph in p.phones))
    evidence: list[Evidence] = []
    for p in pages:
        for e in p.emails:
            evidence.append(Evidence(kind="CONTACT", field="email", value=e, url=p.url))
        for ph in p.phones:
            evidence.append(Evidence(kind="CONTACT", field="phone", value=ph, url=p.url))
        for name, link in p.marketplaces:
            evidence.append(Evidence(kind="SIGNAL", field="marketplace", value=f"Ссылка на магазин: {name}", url=link))
        for s in p.signals:
            evidence.append(Evidence(kind="SIGNAL", field="signal", value=s, url=p.url))
    if home_data.description:
        evidence.append(Evidence(kind="FACT", field="description", value=home_data.description, url=home.url))
    # Дедупликация фактов
    seen: set[tuple[str, str]] = set()
    unique: list[Evidence] = []
    for ev in evidence:
        k = (ev.field, ev.value)
        if k not in seen:
            seen.add(k)
            unique.append(ev)

    contact_page = next((p.url for p in pages[1:] if p.emails or p.phones), None)
    name = home_data.site_name or (home_data.title.split("|")[0].split("—")[0].strip() if home_data.title else None) or urlsplit(home.url).hostname
    marketplace = home_data.marketplaces[0][0] if home_data.marketplaces else None
    return (
        Candidate(
            name=name or url,
            website=f"{urlsplit(home.url).scheme}://{urlsplit(home.url).netloc}",
            marketplace=marketplace,
            publicEmail=emails[0] if emails else None,
            publicPhone=phones[0] if phones else None,
            sourceUrl=contact_page or home.url,
            evidence=unique[:30],
        ),
        warnings,
    )


class WebsiteAdapter(Adapter):
    key = "website"
    name = "Корпоративные сайты (по списку URL)"
    description = "Загружает главную и страницу контактов указанных сайтов и извлекает опубликованные деловые контакты и признаки бизнеса."
    source_type = "WEBSITE"
    legal_notes = "Соблюдается robots.txt, пауза между запросами к одному сайту, без обхода CAPTCHA и авторизации. Только опубликованные деловые контакты."
    query_fields = ["urls"]

    async def discover(self, query: dict, limit: int) -> tuple[list[Candidate], list[str]]:
        urls = [u for u in (query.get("urls") or []) if isinstance(u, str) and u.strip()][: min(limit, 50)]
        if not urls:
            return [], ["Укажите адреса сайтов"]
        settings = get_settings()
        candidates: list[Candidate] = []
        warnings: list[str] = []
        async with httpx.AsyncClient(timeout=settings.request_timeout, follow_redirects=False, headers={"User-Agent": settings.user_agent}) as client:
            for u in urls:
                cand, w = await enrich_website(u, client)
                warnings.extend(w)
                if cand:
                    candidates.append(cand)
        return candidates, warnings
