# -*- coding: utf-8 -*-
"""Скачивает фото со страниц поставщиков в catalog/photos/.

Запускать на машине с доступом в интернет:
    pip install requests beautifulsoup4 pillow
    python3 fetch_photos.py            # все позиции, у которых задан src
    python3 fetch_photos.py ir30 d360  # только указанные коды

Скрипт берёт самое крупное изображение со страницы товара, обрезает под 16:10
и сохраняет как photos/<код>.jpg. Итог обязательно просмотреть глазами:
автоматика ошибается на страницах со слайдерами и баннерами.
"""
import io
import os
import sys
from urllib.parse import urljoin, urlparse

try:
    import requests
    from bs4 import BeautifulSoup
    from PIL import Image
except ImportError:
    sys.exit("Установите зависимости: pip install requests beautifulsoup4 pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from data import PRODUCTS  # noqa: E402

OUT = os.path.join(HERE, "photos")
UA = {"User-Agent": "Mozilla/5.0 (compatible; catalog-image-fetch/1.0)"}
TARGET = (1600, 1000)          # 16:10
MIN_SIDE = 500
SKIP = ("logo", "icon", "sprite", "banner", "placeholder", "favicon", "watermark")


def candidates(page_url, html):
    soup = BeautifulSoup(html, "html.parser")
    urls = []
    for og in soup.select('meta[property="og:image"], meta[name="og:image"]'):
        if og.get("content"):
            urls.append(urljoin(page_url, og["content"]))
    for img in soup.find_all("img"):
        src = img.get("data-src") or img.get("data-original") or img.get("src")
        if not src:
            continue
        u = urljoin(page_url, src)
        if any(s in u.lower() for s in SKIP):
            continue
        urls.append(u)
    seen, out = set(), []
    for u in urls:
        if u not in seen and urlparse(u).scheme in ("http", "https"):
            seen.add(u)
            out.append(u)
    return out


def crop_16x10(im):
    im = im.convert("RGB")
    w, h = im.size
    want = TARGET[0] / TARGET[1]
    if w / h > want:
        nw = int(h * want)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w / want)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return im.resize(TARGET, Image.LANCZOS)


def grab(product):
    url = product.get("src")
    if not url:
        return "нет ссылки"
    try:
        page = requests.get(url, headers=UA, timeout=30)
        page.raise_for_status()
    except Exception as exc:
        return "страница недоступна: %s" % exc

    best, best_px = None, 0
    for u in candidates(url, page.text)[:25]:
        try:
            r = requests.get(u, headers=UA, timeout=30)
            r.raise_for_status()
            im = Image.open(io.BytesIO(r.content))
        except Exception:
            continue
        if min(im.size) < MIN_SIDE:
            continue
        px = im.size[0] * im.size[1]
        if px > best_px:
            best, best_px = im, px
    if best is None:
        return "подходящих изображений не найдено"

    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, product["id"] + ".jpg")
    crop_16x10(best).save(path, "JPEG", quality=88, optimize=True)
    return "сохранено %s (%d×%d исходник)" % (os.path.basename(path), *best.size)


if __name__ == "__main__":
    wanted = set(sys.argv[1:])
    items = [p for p in PRODUCTS if not wanted or p["id"] in wanted]
    for p in items:
        print("%-12s %-22s %s" % (p["id"], p["name"], grab(p)))
