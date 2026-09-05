# -*- coding: utf-8 -*-
"""Рендер эстетичных placeholder-изображений (дизайн идентичен HTML-версии)."""
import math, pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "build/ph"; OUT.mkdir(parents=True, exist_ok=True)
U = 19.2            # 1 юнит = 1vw эталонного слайда 1920px

C_LIGHT = (46, 42, 37)      # #2E2A25
C_DARK  = (27, 25, 23)      # #1B1917
ACCENT  = (178, 154, 124)   # #B29A7C
IVORY   = (242, 236, 227)


def _mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def render(w, h, scale=2, inner_frame=True, caption=None, mark_u=2.4, font=None):
    W, H = int(w * scale), int(h * scale)
    img = Image.new("RGB", (W, H))
    px = img.load()
    # radial-gradient(120% 90% at 62% 22%)
    cx, cy = 0.62 * W, 0.22 * H
    rx, ry = 1.20 * W, 0.90 * H
    step = 2
    for y in range(0, H, step):
        for x in range(0, W, step):
            d = math.hypot((x - cx) / rx, (y - cy) / ry) / 0.72
            t = min(1.0, d)
            c = _mix(C_LIGHT, C_DARK, t)
            for yy in range(y, min(y + step, H)):
                for xx in range(x, min(x + step, W)):
                    px[xx, yy] = c
    d = ImageDraw.Draw(img, "RGBA")
    # диагональная штриховка 45°, шаг 9px, alpha .055
    gap = 9 * scale
    for k in range(-H, W + H, gap):
        d.line([(k, 0), (k + H, H)], fill=ACCENT + (14,), width=max(1, scale // 2))
    # внутренняя рамка
    if inner_frame:
        m = int(1.5 * U * scale)
        d.rectangle([m, m, W - m - 1, H - m - 1], outline=IVORY + (33,), width=max(1, scale // 2))
    # знак «+»
    ml = mark_u * U * scale
    mx, my = W / 2, H / 2
    lw = max(1, scale // 2)
    d.line([(mx, my - ml / 2), (mx, my + ml / 2)], fill=ACCENT + (158,), width=lw)
    d.line([(mx - ml / 2, my), (mx + ml / 2, my)], fill=ACCENT + (158,), width=lw)
    # подпись
    if caption and font:
        fs = int(0.58 * U * scale)
        f = ImageFont.truetype(font, fs)
        tr = 0.34 * fs                       # letter-spacing .34em
        widths = [d.textlength(ch, font=f) for ch in caption]
        total = sum(widths) + tr * (len(caption) - 1)
        x = mx - total / 2
        y = my + ml / 2 + 1.35 * U * scale
        for ch, cw in zip(caption, widths):
            d.text((x, y), ch, font=f, fill=IVORY + (128,))
            x += cw + tr
    return img
