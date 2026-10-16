"""Адаптер «Поиск сайтов (Яндекс Search API)»: находит сайты компаний по нише и городу.

Официальный API Yandex Cloud (v2, синхронный поиск, XML). Нужны YANDEX_SEARCH_API_KEY и YANDEX_FOLDER_ID.
Найденные сайты далее обрабатывает тот же сборщик, что и адаптер «Корпоративные сайты»:
robots.txt, пауза между запросами, только опубликованные деловые контакты.
"""

from __future__ import annotations

import asyncio
import base64
from urllib.parse import urlsplit

import httpx
from lxml import etree

from app.adapters.base import Adapter
from app.adapters.website import enrich_website
from app.config import get_settings
from app.schemas.models import Candidate

API_URL = "https://searchapi.api.cloud.yandex.net/v2/web/search"

# Агрегаторы, соцсети, маркетплейсы и справочники — не сайты самих компаний.
EXCLUDED = (
    "yandex.",
    "ya.ru",
    "google.",
    "wikipedia.org",
    "youtube.com",
    "vk.com",
    "ok.ru",
    "t.me",
    "dzen.ru",
    "avito.ru",
    "ozon.ru",
    "wildberries.ru",
    "wb.ru",
    "market.yandex",
    "megamarket.ru",
    "aliexpress",
    "2gis.",
    "zoon.ru",
    "yell.ru",
    "flamp.ru",
    "orgpage.ru",
    "hh.ru",
    "rusprofile.ru",
    "list-org.com",
    "checko.ru",
    "e-katalog.ru",
    "irecommend.ru",
    "otzovik.com",
    "pulscen.ru",
    "tiu.ru",
    "prom.ru",
    "youla.ru",
    "pinterest.",
    "instagram.com",
    "facebook.com",
    "rutube.ru",
    "vc.ru",
    "habr.com",
)


def is_company_site(host: str) -> bool:
    h = host.lower().removeprefix("www.")
    return bool(h) and "." in h and not any(x in h for x in EXCLUDED)


def registrable(host: str) -> str:
    parts = host.lower().removeprefix("www.").split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else host


def build_query_text(query: dict) -> str:
    what = (query.get("name") or query.get("niche") or query.get("category") or "").strip()
    place = (query.get("city") or query.get("region") or "").strip()
    return " ".join(x for x in (what, place, "официальный сайт") if x)


def parse_result_urls(xml_bytes: bytes) -> tuple[list[str], str | None]:
    """Возвращает адреса главных страниц найденных сайтов и текст ошибки поиска (если есть)."""
    parser = etree.XMLParser(resolve_entities=False, no_network=True, huge_tree=False)
    root = etree.fromstring(xml_bytes, parser)  # noqa: S320 — внешние сущности и сеть отключены
    error = root.find(".//error")
    if error is not None and (error.text or error.get("code")):
        return [], (error.text or f"код {error.get('code')}").strip()
    urls: list[str] = []
    for doc in root.iter("doc"):
        url = doc.findtext("url")
        if url:
            urls.append(url.strip())
    return urls, None


class YandexSearchAdapter(Adapter):
    key = "yandex_search"
    name = "Поиск сайтов по нише (Яндекс Search API)"
    description = "Вводите нишу и город — система находит сайты компаний через поиск Яндекса и сама собирает с них опубликованные деловые контакты."
    source_type = "PROVIDER"
    legal_notes = "Официальный платный API Yandex Cloud. Сайты читаются с соблюдением robots.txt; агрегаторы, соцсети и маркетплейсы исключаются."
    query_fields = ["niche", "category", "name", "city", "region"]

    def availability(self) -> tuple[bool, str | None]:
        s = get_settings()
        if not s.yandex_search_api_key or not s.yandex_folder_id:
            return False, "Не заданы YANDEX_SEARCH_API_KEY и YANDEX_FOLDER_ID в окружении collector"
        return True, None

    async def _search(self, text: str, want: int, warnings: list[str]) -> list[str]:
        s = get_settings()
        found: dict[str, str] = {}
        async with httpx.AsyncClient(timeout=30) as client:
            for page in range(3):
                body = {
                    "query": {
                        "searchType": "SEARCH_TYPE_RU",
                        "queryText": text,
                        "familyMode": "FAMILY_MODE_MODERATE",
                        "page": str(page),
                        "fixTypoMode": "FIX_TYPO_MODE_ON",
                    },
                    "sortSpec": {"sortMode": "SORT_MODE_BY_RELEVANCE"},
                    "groupSpec": {"groupMode": "GROUP_MODE_DEEP", "groupsOnPage": "30", "docsInGroup": "1"},
                    "maxPassages": "0",
                    "l10n": "LOCALIZATION_RU",
                    "folderId": s.yandex_folder_id,
                    "responseFormat": "FORMAT_XML",
                }
                resp = await client.post(API_URL, json=body, headers={"Authorization": f"Api-Key {s.yandex_search_api_key}"})
                if resp.status_code in (401, 403):
                    warnings.append("Яндекс Search API: ключ недействителен или нет доступа к каталогу")
                    break
                if resp.status_code == 429:
                    warnings.append("Яндекс Search API: превышен лимит запросов")
                    break
                if resp.status_code >= 400:
                    warnings.append(f"Яндекс Search API: ошибка {resp.status_code}")
                    break
                try:
                    xml = base64.b64decode(resp.json()["rawData"])
                    urls, error = parse_result_urls(xml)
                except (KeyError, ValueError, etree.XMLSyntaxError):
                    warnings.append("Яндекс Search API: неожиданный формат ответа")
                    break
                if error:
                    warnings.append(f"Яндекс Search API: {error}")
                    break
                if not urls:
                    break
                for u in urls:
                    host = urlsplit(u).hostname or ""
                    if is_company_site(host):
                        found.setdefault(registrable(host), f"{urlsplit(u).scheme or 'https'}://{host}")
                if len(found) >= want:
                    break
        return list(found.values())[:want]

    async def discover(self, query: dict, limit: int) -> tuple[list[Candidate], list[str]]:
        text = build_query_text(query)
        if not (query.get("niche") or query.get("category") or query.get("name")):
            return [], ["Укажите нишу, категорию или название"]
        warnings: list[str] = []
        urls = await self._search(text, min(limit, 30), warnings)
        if not urls:
            warnings.append(f"По запросу «{text}» сайты компаний не найдены")
            return [], warnings
        sem = asyncio.Semaphore(6)

        async def one(url: str) -> tuple[Candidate | None, list[str]]:
            async with sem:
                return await enrich_website(url)

        results = await asyncio.gather(*(one(u) for u in urls), return_exceptions=True)
        candidates: list[Candidate] = []
        for r in results:
            if isinstance(r, BaseException):
                continue
            cand, w = r
            warnings.extend(w)
            if cand:
                if query.get("city"):
                    cand.city = str(query["city"])
                if query.get("niche"):
                    cand.niche = str(query["niche"])
                candidates.append(cand)
        return candidates, warnings[:30]
