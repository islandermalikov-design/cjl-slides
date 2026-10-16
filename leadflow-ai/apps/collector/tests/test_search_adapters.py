import base64
import json

import httpx
import respx
from fastapi.testclient import TestClient

from app.adapters.twogis import parse_items
from app.adapters.yandex_search import build_query_text, is_company_site, parse_result_urls
from app.config import get_settings
from app.main import app

client = TestClient(app)
AUTH = {"x-collector-token": "test-token"}

YANDEX_XML = """<?xml version="1.0" encoding="utf-8"?>
<yandexsearch version="1.0"><response><results><grouping>
<group><doc><url>https://www.techno-shop.ru/catalog/</url><domain>techno-shop.ru</domain></doc></group>
<group><doc><url>https://www.ozon.ru/category/elektronika</url></doc></group>
<group><doc><url>https://vk.com/technoclub</url></doc></group>
<group><doc><url>https://techno-shop.ru/about</url></doc></group>
<group><doc><url>http://volt-market.ru/</url></doc></group>
</grouping></results></response></yandexsearch>"""


def test_query_and_filters():
    assert build_query_text({"niche": "электроника", "city": "Казань"}) == "электроника Казань официальный сайт"
    assert not is_company_site("www.ozon.ru") and not is_company_site("vk.com") and not is_company_site("market.yandex.ru")
    assert is_company_site("techno-shop.ru")


def test_parse_yandex_xml_and_xxe_is_disabled():
    urls, err = parse_result_urls(YANDEX_XML.encode())
    assert err is None and len(urls) == 5
    evil = b'<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><yandexsearch><response><error code="15">&x;</error></response></yandexsearch>'  # noqa: E501
    _, error = parse_result_urls(evil)
    assert "root:" not in (error or "")


def test_adapters_unavailable_without_keys():
    keys = {a["key"]: a for a in client.get("/adapters", headers=AUTH).json()}
    assert keys["yandex_search"]["available"] is False and "YANDEX" in keys["yandex_search"]["reason"]
    assert keys["2gis"]["available"] is False


@respx.mock
def test_yandex_search_finds_sites_and_collects_contacts(monkeypatch):
    monkeypatch.setenv("YANDEX_SEARCH_API_KEY", "k")
    monkeypatch.setenv("YANDEX_FOLDER_ID", "f")
    get_settings.cache_clear()
    route = respx.post("https://searchapi.api.cloud.yandex.net/v2/web/search").mock(
        return_value=httpx.Response(200, json={"rawData": base64.b64encode(YANDEX_XML.encode()).decode()})
    )
    for host, email in (("www.techno-shop.ru", "info@techno-shop.ru"), ("volt-market.ru", None)):
        respx.get(f"https://{host}/robots.txt").mock(return_value=httpx.Response(404))
        respx.get(f"https://{host}/").mock(
            return_value=httpx.Response(
                200, headers={"content-type": "text/html"}, text=f"<title>{host}</title>" + (f"<a href='mailto:{email}'>x</a>" if email else "")
            )
        )
        respx.get(f"https://{host}/contacts").mock(return_value=httpx.Response(404))
        respx.get(f"https://{host}/contact").mock(return_value=httpx.Response(404))
    respx.get("http://volt-market.ru/robots.txt").mock(return_value=httpx.Response(404))
    respx.get("http://volt-market.ru/").mock(return_value=httpx.Response(200, headers={"content-type": "text/html"}, text="<title>volt</title>"))
    res = client.post("/discover", json={"adapter": "yandex_search", "query": {"niche": "электроника", "city": "Казань"}, "limit": 10}, headers=AUTH).json()
    body = json.loads(route.calls[0].request.content)
    assert body["query"]["queryText"] == "электроника Казань официальный сайт" and body["folderId"] == "f"
    assert route.calls[0].request.headers["authorization"] == "Api-Key k"
    names = {c["website"] for c in res["candidates"]}
    assert "https://www.techno-shop.ru" in names
    assert not any("ozon" in n or "vk.com" in n for n in names)
    shop = next(c for c in res["candidates"] if c["website"] == "https://www.techno-shop.ru")
    assert shop["publicEmail"] == "info@techno-shop.ru" and shop["city"] == "Казань" and shop["niche"] == "электроника"


@respx.mock
def test_yandex_errors_are_reported_not_raised(monkeypatch):
    monkeypatch.setenv("YANDEX_SEARCH_API_KEY", "bad")
    monkeypatch.setenv("YANDEX_FOLDER_ID", "f")
    get_settings.cache_clear()
    respx.post("https://searchapi.api.cloud.yandex.net/v2/web/search").mock(return_value=httpx.Response(403))
    res = client.post("/discover", json={"adapter": "yandex_search", "query": {"niche": "электроника"}}, headers=AUTH).json()
    assert res["candidates"] == [] and any("ключ" in w for w in res["warnings"])


TWOGIS = {
    "meta": {"code": 200},
    "result": {
        "total": 2,
        "items": [
            {
                "id": "70000001012345678_abc",
                "type": "branch",
                "name": "Техномаркет",
                "address_name": "ул. Баумана, 1",
                "rubrics": [{"name": "Магазины электроники"}],
                "org": {"id": "70000001012345678"},
                "contact_groups": [
                    {
                        "contacts": [
                            {"type": "phone", "value": "+78431234567"},
                            {"type": "email", "value": "shop@techno.example"},
                            {"type": "website", "value": "http://link.2gis.ru/xyz", "text": "techno.example"},
                        ]
                    }
                ],
            },
            {"id": "x", "type": "street", "name": "ул. Баумана"},
            {"id": "y", "type": "branch", "name": "Без контактов"},
        ],
    },
}


def test_parse_2gis_items():
    cands = parse_items(TWOGIS, {"niche": "электроника", "city": "Казань"})
    assert [c.name for c in cands] == ["Техномаркет", "Без контактов"]
    a = cands[0]
    assert a.publicEmail == "shop@techno.example" and a.publicPhone == "+78431234567"
    assert a.website == "https://techno.example" and a.sourceUrl == "https://2gis.ru/firm/70000001012345678"
    assert cands[1].publicEmail is None and cands[1].publicPhone is None


@respx.mock
def test_2gis_discovery(monkeypatch):
    monkeypatch.setenv("TWOGIS_API_KEY", "k")
    get_settings.cache_clear()
    route = respx.get("https://catalog.api.2gis.com/3.0/items").mock(return_value=httpx.Response(200, json=TWOGIS))
    res = client.post("/discover", json={"adapter": "2gis", "query": {"niche": "электроника", "city": "Казань"}, "limit": 5}, headers=AUTH).json()
    assert route.calls[0].request.url.params["q"] == "электроника Казань"
    assert len(res["candidates"]) == 2
