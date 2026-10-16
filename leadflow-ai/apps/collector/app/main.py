"""LeadFlow Collector — FastAPI-сервис сбора данных из разрешённых источников."""

from fastapi import FastAPI

from app.api.routes import VERSION, public, router

app = FastAPI(title="LeadFlow Collector", version=VERSION, docs_url="/docs", redoc_url=None)
app.include_router(public)
app.include_router(router)
