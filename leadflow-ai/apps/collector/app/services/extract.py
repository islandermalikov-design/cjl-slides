"""Извлечение опубликованных деловых данных со страницы компании.

Правила:
  * email — только из ссылок mailto: и видимого текста; отбрасываются адреса-заглушки,
    имена файлов (image@2x.png) и адреса на чужих доменах, кроме явно указанных в mailto;
  * телефон — из ссылок tel: и российских форматов в тексте контактной страницы;
  * сигналы — ссылки на витрины маркетплейсов и признаки ручных процессов (прайс в Excel).
Ничего не «догадывается»: если данных нет на странице — поле остаётся пустым.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlsplit

from bs4 import BeautifulSoup

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}")
PHONE_RE = re.compile(r"(?:\+7|8)[\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}")
IGNORED_EMAIL_PARTS = ("example.", "domain.", "email.", "yourmail", "sentry", "wixpress", "noreply", "no-reply")
FILE_SUFFIXES = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js")

MARKETPLACES = {
    "wildberries.ru": "Wildberries",
    "wb.ru": "Wildberries",
    "ozon.ru": "Ozon",
    "market.yandex.ru": "Яндекс Маркет",
    "megamarket.ru": "Мегамаркет",
}

MANUAL_SIGNALS = [
    (re.compile(r"\.(xlsx?|csv)(\?|$)", re.I), "На сайте публикуются файлы Excel/CSV (прайс или каталог)"),
    (re.compile(r"прайс[- ]?лист", re.I), "Упоминается прайс-лист"),
    (re.compile(r"оптов", re.I), "Оптовые продажи"),
]

CONTACT_PATHS = ("/contacts", "/contact", "/kontakty", "/contacts/", "/about")


@dataclass
class PageData:
    url: str
    title: str | None = None
    description: str | None = None
    site_name: str | None = None
    emails: list[str] = field(default_factory=list)
    phones: list[str] = field(default_factory=list)
    marketplaces: list[tuple[str, str]] = field(default_factory=list)  # (название, url)
    signals: list[str] = field(default_factory=list)
    contact_links: list[str] = field(default_factory=list)


def _registrable(host: str) -> str:
    parts = host.lower().removeprefix("www.").split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else host


def _clean_email(raw: str) -> str | None:
    email = raw.strip().strip(".,;:").lower()
    if not EMAIL_RE.fullmatch(email):
        return None
    if email.endswith(FILE_SUFFIXES) or any(p in email for p in IGNORED_EMAIL_PARTS):
        return None
    return email


def _normalize_phone(raw: str) -> str | None:
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 11 and digits[0] == "8":
        digits = "7" + digits[1:]
    if len(digits) == 11 and digits[0] == "7":
        return f"+7 ({digits[1:4]}) {digits[4:7]}-{digits[7:9]}-{digits[9:11]}"
    return None


def extract_page(url: str, html: str) -> PageData:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "template"]):
        tag.decompose()
    data = PageData(url=url)
    site_domain = _registrable(urlsplit(url).hostname or "")

    if soup.title and soup.title.string:
        data.title = soup.title.string.strip()[:200]
    desc = soup.find("meta", attrs={"name": "description"})
    if desc and desc.get("content"):
        data.description = str(desc["content"]).strip()[:500]
    og = soup.find("meta", attrs={"property": "og:site_name"})
    if og and og.get("content"):
        data.site_name = str(og["content"]).strip()[:200]

    emails: list[str] = []
    phones: list[str] = []
    for a in soup.find_all("a", href=True):
        href = str(a["href"]).strip()
        low = href.lower()
        if low.startswith("mailto:"):
            email = _clean_email(href[7:].split("?")[0])
            if email:
                emails.append(email)
        elif low.startswith("tel:"):
            phone = _normalize_phone(href[4:])
            if phone:
                phones.append(phone)
        else:
            absolute = urljoin(url, href)
            host = (urlsplit(absolute).hostname or "").lower().removeprefix("www.")
            for mp_host, mp_name in MARKETPLACES.items():
                if host == mp_host or host.endswith("." + mp_host):
                    data.marketplaces.append((mp_name, absolute))
            path = urlsplit(absolute).path.lower().rstrip("/")
            if _registrable(host) == site_domain and any(path.endswith(p.rstrip("/")) for p in CONTACT_PATHS):
                data.contact_links.append(absolute)
            for pattern, label in MANUAL_SIGNALS[:1]:
                if pattern.search(low):
                    data.signals.append(label)

    text = soup.get_text(" ", strip=True)
    for match in EMAIL_RE.findall(text):
        email = _clean_email(match)
        # Адреса из текста принимаем только на домене самой компании.
        if email and _registrable(email.split("@")[1]) == site_domain:
            emails.append(email)
    for match in PHONE_RE.findall(text):
        phone = _normalize_phone(match)
        if phone:
            phones.append(phone)
    for pattern, label in MANUAL_SIGNALS[1:]:
        if pattern.search(text):
            data.signals.append(label)

    data.emails = list(dict.fromkeys(emails))[:5]
    data.phones = list(dict.fromkeys(phones))[:5]
    data.marketplaces = list(dict.fromkeys(data.marketplaces))[:5]
    data.signals = list(dict.fromkeys(data.signals))[:5]
    data.contact_links = list(dict.fromkeys(data.contact_links))[:3]
    return data
