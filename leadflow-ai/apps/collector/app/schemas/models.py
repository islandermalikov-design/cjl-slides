"""Схемы API collector. Совпадают с CandidateSchema в apps/web/src/server/services/collector.ts."""

from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class Evidence(BaseModel):
    kind: Literal["FACT", "CONTACT", "SIGNAL"]
    field: str
    value: str
    url: str | None = None
    snippet: str | None = None


class Candidate(BaseModel):
    name: str
    legalName: str | None = None  # noqa: N815 — совместимость с web-клиентом
    inn: str | None = None
    website: str | None = None
    category: str | None = None
    niche: str | None = None
    city: str | None = None
    region: str | None = None
    marketplace: str | None = None
    publicEmail: str | None = None  # noqa: N815
    publicPhone: str | None = None  # noqa: N815
    sourceUrl: str | None = None  # noqa: N815
    evidence: list[Evidence] = Field(default_factory=list)
    isDemo: bool = False  # noqa: N815


class AdapterInfo(BaseModel):
    key: str
    name: str
    description: str
    sourceType: str  # noqa: N815
    available: bool
    reason: str | None = None
    legalNotes: str  # noqa: N815
    queryFields: list[str]  # noqa: N815


class DiscoverRequest(BaseModel):
    adapter: str
    query: dict = Field(default_factory=dict)
    limit: int = Field(default=30, ge=1, le=100)


class DiscoverResponse(BaseModel):
    candidates: list[Candidate]
    warnings: list[str] = Field(default_factory=list)


class EnrichRequest(BaseModel):
    url: HttpUrl


class EnrichResponse(BaseModel):
    candidate: Candidate | None
    warnings: list[str] = Field(default_factory=list)


class RobotsCheckRequest(BaseModel):
    url: HttpUrl


class RobotsCheckResponse(BaseModel):
    url: str
    allowed: bool
    robotsUrl: str  # noqa: N815
    crawlDelay: float | None = None  # noqa: N815
    message: str
