"""Проверка robots.txt перед загрузкой любой страницы сайта."""

from __future__ import annotations

import time
from dataclasses import dataclass
from urllib.parse import urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser

import httpx

from app.config import get_settings
from app.services.safe_http import FetchError, safe_get

_CACHE_TTL = 3600.0


@dataclass
class RobotsDecision:
    allowed: bool
    robots_url: str
    crawl_delay: float | None
    message: str


_cache: dict[str, tuple[float, RobotFileParser | None, str]] = {}


def robots_url_for(url: str) -> str:
    p = urlsplit(url)
    return urlunsplit((p.scheme, p.netloc, "/robots.txt", "", ""))


async def _load(url: str, client: httpx.AsyncClient | None) -> tuple[RobotFileParser | None, str]:
    """Возвращает парсер или None (None = robots.txt отсутствует → ограничений нет)."""
    robots_url = robots_url_for(url)
    cached = _cache.get(robots_url)
    if cached and time.monotonic() - cached[0] < _CACHE_TTL:
        return cached[1], cached[2]
    try:
        res = await safe_get(robots_url, client=client, accept_types=())
    except FetchError:
        # robots.txt недоступен (сеть/таймаут) — осторожно считаем, что сбор запрещён.
        parser = RobotFileParser()
        parser.parse(["User-agent: *", "Disallow: /"])
        note = "robots.txt недоступен — сбор не выполняется"
        _cache[robots_url] = (time.monotonic(), parser, note)
        return parser, note
    if res.status in (401, 403):
        parser = RobotFileParser()
        parser.parse(["User-agent: *", "Disallow: /"])
        note = f"robots.txt вернул {res.status} — доступ запрещён"
    elif res.status >= 400:
        parser = None
        note = "robots.txt отсутствует — ограничений нет"
    else:
        parser = RobotFileParser()
        parser.parse(res.text.splitlines())
        note = "robots.txt загружен"
    _cache[robots_url] = (time.monotonic(), parser, note)
    return parser, note


async def check_robots(url: str, client: httpx.AsyncClient | None = None) -> RobotsDecision:
    settings = get_settings()
    parser, note = await _load(url, client)
    robots_url = robots_url_for(url)
    if parser is None:
        return RobotsDecision(True, robots_url, None, note)
    allowed = parser.can_fetch(settings.user_agent, url)
    delay = parser.crawl_delay(settings.user_agent)
    msg = "Сбор разрешён robots.txt" if allowed else "Сбор запрещён robots.txt для этого адреса"
    return RobotsDecision(allowed, robots_url, float(delay) if delay else None, f"{msg} ({note})")


def clear_cache() -> None:
    _cache.clear()
