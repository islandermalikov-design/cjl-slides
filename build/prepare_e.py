# -*- coding: utf-8 -*-
"""Подготовка изображений для full-bleed редакционного дизайна (направление E)."""
import pathlib
from PIL import Image, ImageOps

ROOT = pathlib.Path(".").resolve()
OUT = ROOT / "assets/e"; OUT.mkdir(parents=True, exist_ok=True)

RATIO_HERO = 16 / 9
RATIO_DET = 0.72
GRAPHITE = (35, 32, 28)


def crop_to(src, ratio, anchor=0.5, max_w=2400):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    w, h = im.size
    cur = w / h
    if cur > ratio:
        nw = int(round(h * ratio)); left = int(round((w - nw) * anchor))
        im = im.crop((left, 0, left + nw, h))
    elif cur < ratio:
        nh = int(round(w / ratio)); top = int(round((h - nh) * anchor))
        im = im.crop((0, top, w, top + nh))
    if im.width > max_w:
        im = im.resize((max_w, int(round(max_w / ratio))), Image.LANCZOS)
    elif im.width < 1600:
        k = min(1600 / im.width, 1.9)
        im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    return im


def crop_box(src, box, ratio=RATIO_DET, max_w=1100):
    """box = (l,t,r,b) в долях исходника."""
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    w, h = im.size
    c = im.crop((int(w*box[0]), int(h*box[1]), int(w*box[2]), int(h*box[3])))
    cur = c.width / c.height
    if cur > ratio:
        nw = int(round(c.height * ratio)); left = (c.width - nw)//2
        c = c.crop((left, 0, left+nw, c.height))
    elif cur < ratio:
        nh = int(round(c.width / ratio)); top = (c.height - nh)//2
        c = c.crop((0, top, c.width, top+nh))
    if c.width < max_w:
        k = min(max_w/c.width, 2.0)
        c = c.resize((int(c.width*k), int(c.height*k)), Image.LANCZOS)
    elif c.width > max_w:
        c = c.resize((max_w, int(max_w/ratio)), Image.LANCZOS)
    return c


def letterbox(src, ratio=RATIO_HERO, inset=0.09, w=2400):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    h = int(round(w / ratio))
    box_w, box_h = int(w*(1-2*inset)), int(h*(1-2*inset))
    k = min(box_w/im.width, box_h/im.height, 2.2)
    im = im.resize((int(im.width*k), int(im.height*k)), Image.LANCZOS)
    canvas = Image.new("RGB", (w, h), GRAPHITE)
    canvas.paste(im, ((w-im.width)//2, (h-im.height)//2))
    return canvas


HERO = {
    "cover":                 ("assets/drive/gil_new_02.jpg",            0.50),
    "final":                 ("assets/drive/gil_new_01.jpg",            0.50),
    "giliarovskogo-before":  ("assets/drive/gil_old_01.jpg",            0.42),
    "giliarovskogo-after":   ("assets/drive/gil_new_00.jpg",            0.50),
    "borby-before":          ("assets/drive/borby_00.jpg",              0.45),
    "myasnickaya-after":     ("assets/drive/myasnickaya_p05_03.jpg",    0.48),
    "nikoloyamskaya-after":  ("assets/drive/nikoloyamskaya_p01_00.jpg", 0.50),
    "okruzhnoy-before":      ("assets/drive/okr_04.jpg",                0.50),
    "okruzhnoy-after":       ("assets/drive/okr_01.jpg",                0.50),
    "pochtovaya-before":     ("assets/photos/pochtovaya_A.jpg",         0.62),
}

LETTERBOX = {
    "myasnickaya-before": "build/pdfall/mya_p03_003.jpg",
}

DETAIL = {
    "giliarovskogo-after": ("assets/art/det-after-port.jpg", None),   # уже готов
    "myasnickaya-after":   ("assets/drive/myasnickaya_p05_03.jpg", (0.40, 0.30, 0.68, 0.90)),
    "nikoloyamskaya-after":("assets/drive/nikoloyamskaya_p01_00.jpg", (0.30, 0.30, 0.46, 0.62)),
    "okruzhnoy-after":     ("assets/drive/okr_03.jpg", (0.35, 0.05, 0.65, 0.55)),
}

for slot, (src, anchor) in HERO.items():
    im = crop_to(ROOT / src, RATIO_HERO, anchor)
    out = OUT / f"{slot}.jpg"; im.save(out, quality=90, optimize=True)
    print(f"{slot:24} {im.size}  hero  {out.stat().st_size//1024} KB")

for slot, src in LETTERBOX.items():
    im = letterbox(ROOT / src)
    out = OUT / f"{slot}.jpg"; im.save(out, quality=92, optimize=True)
    print(f"{slot:24} {im.size}  letterbox  {out.stat().st_size//1024} KB")

for slot, (src, box) in DETAIL.items():
    out = OUT / f"{slot}-det.jpg"
    if box is None:
        im = Image.open(ROOT / src)
        im.save(out, quality=90, optimize=True)
    else:
        im = crop_box(ROOT / src, box)
        im.save(out, quality=90, optimize=True)
    print(f"{slot+'-det':24} {im.size}  ratio={round(im.width/im.height,2)}  {out.stat().st_size//1024} KB")
