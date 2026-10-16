"""Адаптер «Справочник 2ГИС» (официальный Places API).

Организации по запросу (ниша/рубрика + город) сразу с адресом и контактами из справочника.
Нужен TWOGIS_API_KEY (platform.2gis.ru). Доступность полей контактов зависит от тарифа ключа,
а условия лицензии определяют, можно ли сохранять данные у себя — проверьте их перед активацией.
Адаптер не придумывает данные: берётся только то, что вернул API.
"""

from __future__ import annotations

import httpx

from app.adapters.base import Adapter
from app.config import get_settings
from app.schemas.models import Candidate, Evidence

API_URL = "https://catalog.api.2gis.com/3.0/items"
FIELDS = "items.contact_groups,items.address_name,items.rubrics,items.org,items.adm_div"


def _contacts(item: dict) -> tuple[list[str], list[str], str | None]:
    phones: list[str] = []
    emails: list[str] = []
    website: str | None = None
    for group in item.get("contact_groups") or []:
        for c in group.get("contacts") or []:
            kind = c.get("type")
            value = (c.get("value") or "").strip()
            text = (c.get("text") or "").strip()
            if kind == "phone" and value:
                phones.append(value)
            elif kind == "email" and value:
                emails.append(value)
            elif kind == "website" and not website:
                # value — ссылка-редирект 2ГИС; text содержит читаемый адрес сайта.
                website = text or value
    return phones, emails, website


def parse_items(payload: dict, query: dict) -> list[Candidate]:
    out: list[Candidate] = []
    for item in (payload.get("result") or {}).get("items") or []:
        if item.get("type") not in (None, "branch", "org"):
            continue  # пропускаем адреса, остановки и прочие объекты
        name = (item.get("name") or "").strip()
        if not name:
            continue
        phones, emails, website = _contacts(item)
        if website and not website.lower().startswith(("http://", "https://")):
            website = f"https://{website}"
        org_id = (item.get("org") or {}).get("id") or item.get("id")
        source_url = f"https://2gis.ru/firm/{str(org_id).split('_')[0]}" if org_id else None
        rubrics = [r.get("name") for r in item.get("rubrics") or [] if r.get("name")]
        evidence: list[Evidence] = []
        if item.get("address_name"):
            evidence.append(Evidence(kind="FACT", field="address", value=str(item["address_name"]), url=source_url))
        if rubrics:
            evidence.append(Evidence(kind="FACT", field="rubrics", value=", ".join(rubrics[:5]), url=source_url))
        for e in emails[:2]:
            evidence.append(Evidence(kind="CONTACT", field="email", value=e, url=source_url))
        for p in phones[:2]:
            evidence.append(Evidence(kind="CONTACT", field="phone", value=p, url=source_url))
        out.append(
            Candidate(
                name=name,
                legalName=(item.get("org") or {}).get("name"),
                website=website,
                category=rubrics[0] if rubrics else None,
                niche=str(query["niche"]) if query.get("niche") else None,
                city=str(query["city"]) if query.get("city") else ((item.get("adm_div") or [{}])[0].get("name") if item.get("adm_div") else None),
                publicEmail=emails[0] if emails else None,
                publicPhone=phones[0] if phones else None,
                sourceUrl=source_url,
                evidence=evidence,
            )
        )
    return out


class TwoGisAdapter(Adapter):
    key = "2gis"
    name = "Справочник 2ГИС (API)"
    description = "Организации по нише и городу из справочника 2ГИС — с адресом, телефоном, email и сайтом, если они есть в справочнике."
    source_type = "CATALOG"
    legal_notes = "Официальный API 2ГИС по ключу. Перед активацией проверьте условия тарифа: допускается ли хранение данных в вашей CRM."
    query_fields = ["niche", "category", "name", "city", "region"]

    def availability(self) -> tuple[bool, str | None]:
        if not get_settings().twogis_api_key:
            return False, "Не задан TWOGIS_API_KEY в окружении collector"
        return True, None

    async def discover(self, query: dict, limit: int) -> tuple[list[Candidate], list[str]]:
        what = (query.get("name") or query.get("niche") or query.get("category") or "").strip()
        if not what:
            return [], ["Укажите нишу, категорию или название"]
        place = (query.get("city") or query.get("region") or "").strip()
        q = f"{what} {place}".strip()
        s = get_settings()
        warnings: list[str] = []
        candidates: list[Candidate] = []
        seen: set[str] = set()
        async with httpx.AsyncClient(timeout=s.request_timeout) as client:
            for page in range(1, 6):
                resp = await client.get(
                    API_URL,
                    params={"q": q, "key": s.twogis_api_key, "fields": FIELDS, "page": page, "page_size": min(limit, 50), "locale": "ru_RU"},
                )
                if resp.status_code in (401, 403):
                    warnings.append("2ГИС: ключ недействителен или нет доступа к запрошенным полям")
                    break
                if resp.status_code == 429:
                    warnings.append("2ГИС: превышен лимит запросов")
                    break
                if resp.status_code >= 400:
                    warnings.append(f"2ГИС: ошибка {resp.status_code}")
                    break
                payload = resp.json()
                meta = payload.get("meta") or {}
                if meta.get("code") not in (None, 200):
                    msg = (meta.get("error") or {}).get("message") or f"код {meta.get('code')}"
                    if meta.get("code") != 404:  # 404 — результаты закончились
                        warnings.append(f"2ГИС: {msg}")
                    break
                for cand in parse_items(payload, query):
                    key = cand.sourceUrl or cand.name
                    if key not in seen:
                        seen.add(key)
                        candidates.append(cand)
                if len(candidates) >= limit:
                    break
        if not any(c.publicEmail or c.publicPhone for c in candidates) and candidates:
            warnings.append("В ответе 2ГИС нет контактов: возможно, ключ не включает поле contact_groups")
        return candidates[:limit], warnings
