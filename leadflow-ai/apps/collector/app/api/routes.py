from __future__ import annotations

import hmac

from fastapi import APIRouter, Depends, Header, HTTPException

from app.adapters.registry import ADAPTERS
from app.adapters.website import enrich_website
from app.config import get_settings
from app.schemas.models import (
    AdapterInfo,
    DiscoverRequest,
    DiscoverResponse,
    EnrichRequest,
    EnrichResponse,
    RobotsCheckRequest,
    RobotsCheckResponse,
)
from app.services.robots import check_robots
from app.services.safe_http import FetchError, UnsafeUrlError

VERSION = "0.1.0"


def require_token(x_collector_token: str = Header(default="")) -> None:
    expected = get_settings().collector_token
    if not expected:
        raise HTTPException(status_code=503, detail="COLLECTOR_TOKEN не настроен")
    if not hmac.compare_digest(x_collector_token.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Неверный токен")


public = APIRouter()
router = APIRouter(dependencies=[Depends(require_token)])


@public.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": VERSION}


@router.get("/adapters", response_model=list[AdapterInfo])
async def adapters() -> list[AdapterInfo]:
    return [a.info() for a in ADAPTERS.values()]


@router.post("/discover", response_model=DiscoverResponse)
async def discover(req: DiscoverRequest) -> DiscoverResponse:
    adapter = ADAPTERS.get(req.adapter)
    if not adapter:
        raise HTTPException(status_code=404, detail="Адаптер не найден")
    ok, reason = adapter.availability()
    if not ok:
        raise HTTPException(status_code=422, detail=reason or "Адаптер недоступен")
    candidates, warnings = await adapter.discover(req.query, req.limit)
    return DiscoverResponse(candidates=candidates, warnings=warnings)


@router.post("/enrich/website", response_model=EnrichResponse)
async def enrich(req: EnrichRequest) -> EnrichResponse:
    candidate, warnings = await enrich_website(str(req.url))
    return EnrichResponse(candidate=candidate, warnings=warnings)


@router.post("/robots/check", response_model=RobotsCheckResponse)
async def robots(req: RobotsCheckRequest) -> RobotsCheckResponse:
    try:
        d = await check_robots(str(req.url))
    except (UnsafeUrlError, FetchError) as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return RobotsCheckResponse(url=str(req.url), allowed=d.allowed, robotsUrl=d.robots_url, crawlDelay=d.crawl_delay, message=d.message)
