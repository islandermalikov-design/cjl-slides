"""HTTP-клиент с защитой от SSRF.

Перед каждым запросом (и каждым редиректом):
  * разрешены только http/https и стандартные порты 80/443;
  * имя хоста разрешается через DNS, и ВСЕ полученные адреса проверяются:
    loopback, private, link-local, multicast, reserved, unspecified — запрещены;
  * редиректы обрабатываются вручную с повторной проверкой;
  * ответ ограничен по размеру и времени.

Остаточный риск DNS rebinding (повторное разрешение имени при соединении)
документирован в docs/integrations.md; для production рекомендуется egress-прокси.
"""

from __future__ import annotations

import asyncio
import ipaddress
import socket
import time
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit

import httpx

from app.config import get_settings


class UnsafeUrlError(ValueError):
    """URL указывает на запрещённый адрес или схему."""


class FetchError(RuntimeError):
    """Ошибка загрузки страницы."""


@dataclass
class FetchResult:
    url: str
    status: int
    content_type: str
    text: str


def _is_forbidden_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
        or (isinstance(ip, ipaddress.IPv4Address) and ip in ipaddress.ip_network("100.64.0.0/10"))
    )


def validate_url_syntax(url: str) -> tuple[str, int]:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        raise UnsafeUrlError("Разрешены только http и https")
    if parts.username or parts.password:
        raise UnsafeUrlError("URL с учётными данными запрещён")
    host = parts.hostname
    if not host:
        raise UnsafeUrlError("Не указан хост")
    port = parts.port or (443 if parts.scheme == "https" else 80)
    if port not in (80, 443):
        raise UnsafeUrlError("Разрешены только порты 80 и 443")
    lowered = host.lower()
    if lowered == "localhost" or lowered.endswith((".localhost", ".local", ".internal")):
        raise UnsafeUrlError("Внутренние имена запрещены")
    return host, port


async def resolve_and_check(host: str, port: int) -> list[str]:
    settings = get_settings()
    try:
        literal = ipaddress.ip_address(host)
        addresses = [str(literal)]
    except ValueError:
        loop = asyncio.get_running_loop()
        try:
            infos = await loop.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        except socket.gaierror as e:
            raise FetchError(f"Не удалось разрешить имя {host}") from e
        addresses = sorted({info[4][0] for info in infos})
    if not addresses:
        raise FetchError(f"Нет адресов для {host}")
    if not settings.allow_private_networks:
        for addr in addresses:
            if _is_forbidden_ip(ipaddress.ip_address(addr)):
                raise UnsafeUrlError(f"Адрес {addr} относится к внутренней сети — запрос запрещён")
    return addresses


class _HostThrottle:
    """Минимальная пауза между запросами к одному хосту (вежливый краулинг)."""

    def __init__(self) -> None:
        self._last: dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def wait(self, host: str, delay: float) -> None:
        async with self._lock:
            now = time.monotonic()
            last = self._last.get(host, 0.0)
            pause = last + delay - now
            self._last[host] = max(now, last + delay)
        if pause > 0:
            await asyncio.sleep(pause)


throttle = _HostThrottle()


async def safe_get(
    url: str,
    *,
    client: httpx.AsyncClient | None = None,
    accept_types: tuple[str, ...] = ("text/html", "text/plain", "application/xhtml+xml"),
    crawl_delay: float | None = None,
) -> FetchResult:
    settings = get_settings()
    own_client = client is None
    client = client or httpx.AsyncClient(
        timeout=settings.request_timeout,
        follow_redirects=False,
        headers={"User-Agent": settings.user_agent, "Accept": "text/html,text/plain;q=0.9,*/*;q=0.1"},
    )
    try:
        current = url
        for _ in range(settings.max_redirects + 1):
            host, port = validate_url_syntax(current)
            await resolve_and_check(host, port)
            await throttle.wait(host, max(settings.min_delay_per_host, crawl_delay or 0))
            async with client.stream("GET", current) as resp:
                if resp.status_code in (301, 302, 303, 307, 308):
                    location = resp.headers.get("location")
                    if not location:
                        raise FetchError("Редирект без адреса")
                    current = urljoin(current, location)
                    continue
                ctype = resp.headers.get("content-type", "").split(";")[0].strip().lower()
                if resp.status_code >= 400:
                    return FetchResult(url=current, status=resp.status_code, content_type=ctype, text="")
                if accept_types and ctype and not any(ctype.startswith(t) for t in accept_types):
                    raise FetchError(f"Неподдерживаемый тип содержимого: {ctype}")
                chunks: list[bytes] = []
                size = 0
                async for chunk in resp.aiter_bytes():
                    size += len(chunk)
                    if size > settings.max_response_bytes:
                        raise FetchError("Ответ превышает допустимый размер")
                    chunks.append(chunk)
                raw = b"".join(chunks)
                encoding = resp.encoding or "utf-8"
                try:
                    text = raw.decode(encoding, errors="replace")
                except LookupError:
                    text = raw.decode("utf-8", errors="replace")
                return FetchResult(url=current, status=resp.status_code, content_type=ctype, text=text)
        raise FetchError("Слишком много перенаправлений")
    except httpx.TimeoutException as e:
        raise FetchError("Превышено время ожидания") from e
    except httpx.HTTPError as e:
        raise FetchError(f"Ошибка соединения: {type(e).__name__}") from e
    finally:
        if own_client:
            await client.aclose()
