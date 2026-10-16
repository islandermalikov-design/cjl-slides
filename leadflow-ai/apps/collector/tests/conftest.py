import os

import pytest

os.environ.setdefault("COLLECTOR_TOKEN", "test-token")
os.environ["MIN_DELAY_PER_HOST"] = "0"
os.environ["DADATA_API_KEY"] = ""


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    from app.config import get_settings
    from app.services import robots

    get_settings.cache_clear()
    robots.clear_cache()

    async def fake_resolve(host: str, port: int) -> list[str]:
        # В тестах внешние домены «разрешаются» в публичный адрес документационного диапазона.
        from app.services.safe_http import UnsafeUrlError

        if host in {"127.0.0.1", "10.0.0.5", "169.254.169.254"}:
            raise UnsafeUrlError("Адрес относится к внутренней сети — запрос запрещён")
        return ["93.184.216.34"]

    monkeypatch.setattr("app.services.safe_http.resolve_and_check", fake_resolve)
    yield
