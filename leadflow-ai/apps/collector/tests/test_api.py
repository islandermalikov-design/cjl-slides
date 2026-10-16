import httpx
import respx
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
AUTH = {"x-collector-token": "test-token"}


def test_health_is_public():
    assert client.get("/health").json()["status"] == "ok"


def test_token_required():
    assert client.get("/adapters").status_code == 401
    assert client.get("/adapters", headers={"x-collector-token": "wrong"}).status_code == 401


def test_adapters_list_and_dadata_unavailable_without_key():
    res = client.get("/adapters", headers=AUTH).json()
    keys = {a["key"]: a for a in res}
    assert "website" in keys and keys["website"]["available"] is True
    assert keys["dadata"]["available"] is False


@respx.mock
def test_website_discovery_respects_robots():
    respx.get("https://blocked.ru/robots.txt").mock(return_value=httpx.Response(200, text="User-agent: *\nDisallow: /"))
    home = respx.get("https://blocked.ru/").mock(return_value=httpx.Response(200, html="<a href='mailto:a@blocked.ru'>a</a>"))
    res = client.post("/discover", json={"adapter": "website", "query": {"urls": ["https://blocked.ru"]}}, headers=AUTH).json()
    assert res["candidates"] == []
    assert any("запрещён" in w for w in res["warnings"])
    assert not home.called


@respx.mock
def test_website_discovery_collects_contacts():
    respx.get("https://shop.ru/robots.txt").mock(return_value=httpx.Response(404))
    respx.get("https://shop.ru/").mock(
        return_value=httpx.Response(
            200,
            headers={"content-type": "text/html; charset=utf-8"},
            text="<html><head><title>Shop | Магазин</title></head><body><a href='/contacts'>Контакты</a><a href='https://ozon.ru/seller/1'>Ozon</a></body></html>",
        )
    )
    respx.get("https://shop.ru/contacts").mock(
        return_value=httpx.Response(
            200, headers={"content-type": "text/html"}, text="<a href='mailto:sales@shop.ru'>sales@shop.ru</a><a href='tel:88001234567'>tel</a>"
        )
    )
    res = client.post("/discover", json={"adapter": "website", "query": {"urls": ["shop.ru"]}}, headers=AUTH).json()
    cand = res["candidates"][0]
    assert cand["publicEmail"] == "sales@shop.ru"
    assert cand["publicPhone"] == "+7 (800) 123-45-67"
    assert cand["marketplace"] == "Ozon"
    assert cand["sourceUrl"] == "https://shop.ru/contacts"
    assert any(e["kind"] == "CONTACT" for e in cand["evidence"])


def test_ssrf_blocked_for_enrich():
    res = client.post("/enrich/website", json={"url": "http://169.254.169.254/latest/meta-data"}, headers=AUTH).json()
    assert res["candidate"] is None
    assert res["warnings"]


@respx.mock
def test_redirect_to_internal_address_is_blocked():
    respx.get("https://redirect.ru/robots.txt").mock(return_value=httpx.Response(404))
    respx.get("https://redirect.ru/").mock(return_value=httpx.Response(302, headers={"location": "http://127.0.0.1/admin"}))
    res = client.post("/enrich/website", json={"url": "https://redirect.ru/"}, headers=AUTH).json()
    assert res["candidate"] is None
    assert any("внутренней сети" in w for w in res["warnings"])


def test_unknown_adapter_404():
    assert client.post("/discover", json={"adapter": "nope", "query": {}}, headers=AUTH).status_code == 404
