"""Адаптер DaData: поиск организаций по названию или ИНН через официальный API.

Документация: https://dadata.ru/api/suggest/party/
Требуется ключ DADATA_API_KEY. Контакты возвращаются только если они есть в ответе API
(зависит от тарифа) — адаптер их не придумывает.
"""

from __future__ import annotations

import httpx

from app.adapters.base import Adapter
from app.config import get_settings
from app.schemas.models import Candidate, Evidence

API_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party"


class DadataAdapter(Adapter):
    key = "dadata"
    name = "DaData — реквизиты организаций"
    description = "Официальный API: юридическое название, ИНН, адрес и ОКВЭД по названию или ИНН."
    source_type = "OFFICIAL_API"
    legal_notes = "Данные ЕГРЮЛ через лицензированный API. Использование — по условиям тарифа DaData."
    query_fields = ["name", "inn", "region", "city"]

    def availability(self) -> tuple[bool, str | None]:
        if not get_settings().dadata_api_key:
            return False, "Не задан DADATA_API_KEY в окружении collector"
        return True, None

    async def discover(self, query: dict, limit: int) -> tuple[list[Candidate], list[str]]:
        settings = get_settings()
        q = (query.get("inn") or query.get("name") or "").strip()
        if not q:
            return [], ["Укажите название или ИНН"]
        body: dict = {"query": q, "count": min(limit, 20)}
        if query.get("city") or query.get("region"):
            body["locations"] = [{k: v for k, v in (("city", query.get("city")), ("region", query.get("region"))) if v}]
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            resp = await client.post(
                API_URL,
                json=body,
                headers={"Authorization": f"Token {settings.dadata_api_key}", "Accept": "application/json"},
            )
        if resp.status_code in (401, 403):
            return [], ["DaData: ключ недействителен или нет доступа"]
        if resp.status_code == 429:
            return [], ["DaData: превышен лимит запросов"]
        resp.raise_for_status()
        out: list[Candidate] = []
        for item in resp.json().get("suggestions", []):
            d = item.get("data") or {}
            if (d.get("state") or {}).get("status") not in (None, "ACTIVE"):
                continue
            addr = (d.get("address") or {}).get("data") or {}
            inn = d.get("inn")
            phones = [p.get("value") for p in (d.get("phones") or []) if p.get("value")]
            emails = [e.get("value") for e in (d.get("emails") or []) if e.get("value")]
            evidence = [Evidence(kind="FACT", field="egrul", value=f"ИНН {inn}, ОКВЭД {d.get('okved') or '—'}", url="https://dadata.ru/api/suggest/party/")]
            out.append(
                Candidate(
                    name=item.get("value") or (d.get("name") or {}).get("short_with_opf") or q,
                    legalName=(d.get("name") or {}).get("full_with_opf"),
                    inn=inn,
                    category=d.get("okved"),
                    city=addr.get("city"),
                    region=addr.get("region_with_type"),
                    publicEmail=emails[0] if emails else None,
                    publicPhone=phones[0] if phones else None,
                    sourceUrl=None,
                    evidence=evidence,
                )
            )
        return out[:limit], []
