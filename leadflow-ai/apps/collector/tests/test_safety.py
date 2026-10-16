import asyncio

import pytest

from app.services import safe_http
from app.services.safe_http import UnsafeUrlError, validate_url_syntax


@pytest.mark.parametrize(
    "url",
    [
        "ftp://example.ru/file",
        "http://localhost/admin",
        "http://intranet.local/",
        "http://user:pass@example.ru/",
        "https://example.ru:8443/",
        "file:///etc/passwd",
    ],
)
def test_rejects_unsafe_syntax(url):
    with pytest.raises(UnsafeUrlError):
        validate_url_syntax(url)


def test_accepts_public_url():
    assert validate_url_syntax("https://example.ru/contacts") == ("example.ru", 443)


@pytest.mark.parametrize("ip", ["127.0.0.1", "10.1.2.3", "192.168.0.10", "169.254.169.254", "::1", "100.64.1.1", "0.0.0.0"])
def test_real_resolver_blocks_private_ips(ip, monkeypatch):
    # Используем настоящую функцию (а не тестовую заглушку) с IP-литералом — DNS не нужен.
    import importlib

    module = importlib.reload(safe_http)
    with pytest.raises(module.UnsafeUrlError):
        asyncio.run(module.resolve_and_check(ip, 80))


def test_real_resolver_allows_public_ip():
    import importlib

    module = importlib.reload(safe_http)
    assert asyncio.run(module.resolve_and_check("93.184.216.34", 443)) == ["93.184.216.34"]
