# -*- coding: utf-8 -*-
"""Кадрирование исходников под рамки слайдов."""
import pathlib
from PIL import Image, ImageOps

ROOT = pathlib.Path(".").resolve()
OUT = ROOT / "assets/photos"; OUT.mkdir(parents=True, exist_ok=True)

FRAME = 0.76 * 16 / 9        # рамка объекта: 76% ширины на всю высоту
COVER = 16 / 9               # обложка во весь слайд
TILE  = 1.42                 # плитка финального коллажа

# слот -> (исходник, целевое соотношение, вертикальный якорь 0..1)
JOBS = {
    "cover":                 ("assets/drive/gil_new_02.jpg",            COVER, 0.50),
    "giliarovskogo-before":  ("assets/drive/gil_old_01.jpg",            FRAME, 0.42),
    "giliarovskogo-after":   ("assets/drive/gil_new_00.jpg",            FRAME, 0.50),
    "borby-before":          ("assets/drive/borby_00.jpg",              FRAME, 0.45),
    "myasnickaya-after":     ("assets/drive/myasnickaya_p05_03.jpg",    FRAME, 0.48),
    "nikoloyamskaya-after":  ("assets/drive/nikoloyamskaya_p01_00.jpg", FRAME, 0.50),
    "okruzhnoy-before":      ("assets/drive/okr_04.jpg",                FRAME, 0.50),
    "okruzhnoy-after":       ("assets/drive/okr_03.jpg",                FRAME, 0.48),
    "pochtovaya-before":     ("assets/photos/pochtovaya_A.jpg",         FRAME, 0.62),
    "final-giliarovskogo":   ("assets/drive/gil_new_04.jpg",            TILE,  0.50),
    "final-myasnickaya":     ("assets/drive/myasnickaya_p04_02.jpg",    TILE,  0.50),
    "final-nikoloyamskaya":  ("assets/drive/nikoloyamskaya_p12_09.jpg", TILE,  0.50),
    "final-okruzhnoy":       ("assets/drive/okr_03.jpg",                TILE,  0.42),
}


def crop_to(src, ratio, anchor):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    w, h = im.size
    cur = w / h
    if cur > ratio:                       # шире цели — режем по бокам
        nw = int(round(h * ratio))
        left = (w - nw) // 2
        im = im.crop((left, 0, left + nw, h))
    elif cur < ratio:                     # выше цели — режем по высоте
        nh = int(round(w / ratio))
        top = int(round((h - nh) * anchor))
        im = im.crop((0, top, w, top + nh))
    if im.width > 2400:
        im = im.resize((2400, int(round(2400 / ratio))), Image.LANCZOS)
    return im


for slot, (src, ratio, anchor) in JOBS.items():
    p = ROOT / src
    if not p.exists():
        print("НЕТ ИСХОДНИКА:", src); continue
    im = crop_to(p, ratio, anchor)
    out = OUT / f"{slot}.jpg"
    im.save(out, quality=90, optimize=True)
    print(f"{slot:24} {im.size}  {round(im.width/im.height,3)}  {out.stat().st_size//1024} KB")
