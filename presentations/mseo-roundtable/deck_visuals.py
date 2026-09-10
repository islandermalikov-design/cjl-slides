# -*- coding: utf-8 -*-
"""
Слайды, построенные по приёмам из референс-листа инфографики.

  #1  крупные цифры + кольцевая диаграмма   → slide_stat_donut
  #2  столбцы + линия + цветные выноски     → slide_combo
  #3  пилюли-теги у пунктов                 → tags= в slide_grid
  #4  цветная панель + изображение          → slide_image_hero, slide_image_side
  #5  ранжированный список с крупными № }   → slide_ranked
  #6  таблица «до / после / изменение»      → slide_compare
  #7  кольцо + плашка «эффект»              → slide_donut_effect
  #8  сетка нумерованных карточек           → slide_numbered_grid
"""

from pptx.util import Inches, Pt, Emu
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

from deck_core import (
    SW, SH, M, CW, TITLE_T, FOOT_Y,
    VIOLET_DEEP, VIOLET, VIOLET_MID, VIOLET_SOFT, MAGENTA, MAGENTA_HI,
    TEAL, TEAL_DEEP, NAVY, SLATE, SLATE_LIGHT, LILAC, LILAC_2, LILAC_3,
    WHITE, F_HEAD, F_BOLD, F_SER, LOGO_WHITE, MARK_WHITE,
    blank, bg_light, bg_gradient, hero_rings, rect, ring, para, textbox,
    picture, footer, set_alpha, soft_shadow, no_line,
    donut, pill, pill_row, image_fill, scrim, tint,
)
from deck_layouts import head, page, ACCENTS


# --------------------------------------------------- #1 цифры + кольцо ------
def slide_stat_donut(prs, kicker, title, stats, donut_data, center, legend,
                     note=None, source=None, num=None):
    """stats: [(число, единица, подпись)]; donut_data: [(значение, цвет)]."""
    s = page(prs, kicker, title, source=source, num=num)

    bottom = FOOT_Y - Inches(0.28)
    note_h = Inches(1.34)
    top = Inches(2.00)
    body_b = bottom - note_h - Inches(0.26) if note else bottom

    # --- левая колонка: крупные цифры со шкалой-разделителем
    lw = Inches(5.85)
    rh = int((body_b - top) / len(stats))
    for i, (val, unit, cap) in enumerate(stats):
        y = top + i * rh
        if i:
            rect(s, M, y, lw, Emu(9525), LILAC_3)
        acc = ACCENTS[i % 3]
        _, tf = textbox(s, M, y + Inches(0.22), Inches(2.45), Inches(0.62))
        para(tf, True, text=val, size=34, color=NAVY, font=F_HEAD, bold=True,
             line=1.0)
        _, tf = textbox(s, M, y + Inches(0.80), Inches(2.45), Inches(0.28))
        para(tf, True, text=unit, size=11, color=acc, font=F_BOLD, bold=True,
             caps=True, spacing=1.2)
        _, tf = textbox(s, M + Inches(2.60), y, lw - Inches(2.60), rh,
                        anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=cap, size=12, color=SLATE, font=F_BOLD, line=1.32)

    # --- правая карточка с кольцом
    cx0 = M + Inches(6.25)
    cwid = CW - Inches(6.25)
    card = rect(s, cx0, top, cwid, body_b - top, WHITE,
                shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.05)
    soft_shadow(card, blur=16, dist=4, alpha=0.09)

    d = Inches(2.35)
    dcx = cx0 + Inches(1.62)
    dcy = top + (body_b - top) / 2
    donut(s, dcx, dcy, d, donut_data, thickness=0.26)
    _, tf = textbox(s, dcx - Inches(1.0), dcy - Inches(0.42), Inches(2.0),
                    Inches(0.5))
    para(tf, True, text=center[0], size=25, color=NAVY, font=F_HEAD,
         bold=True, align=PP_ALIGN.CENTER, line=1.0)
    _, tf = textbox(s, dcx - Inches(0.72), dcy + Inches(0.06), Inches(1.44),
                    Inches(0.4))
    para(tf, True, text=center[1], size=9.5, color=SLATE, font=F_BOLD,
         align=PP_ALIGN.CENTER, caps=True, spacing=0.8, line=1.15)

    ly = dcy - Inches(0.30) * len(legend) / 2 - Inches(0.10)
    for label, color, value in legend:
        rect(s, cx0 + Inches(3.28), ly + Inches(0.055), Inches(0.16),
             Inches(0.16), color, shape=MSO_SHAPE.OVAL)
        _, tf = textbox(s, cx0 + Inches(3.58), ly, cwid - Inches(3.86),
                        Inches(0.28))
        para(tf, True, text=value, size=13, color=NAVY, font=F_HEAD,
             bold=True)
        _, tf = textbox(s, cx0 + Inches(3.58), ly + Inches(0.24),
                        cwid - Inches(3.86), Inches(0.4))
        para(tf, True, text=label, size=10, color=SLATE, font=F_BOLD,
             line=1.2)
        ly += Inches(0.86)

    if note:
        _band(s, bottom - note_h, note_h, note[0], note[1])
    return s


def _band(slide, y, h, label, text):
    rect(slide, M, y, CW, h, VIOLET_DEEP,
         shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.09)
    rect(slide, M, y + Inches(0.28), Inches(0.075), h - Inches(0.56), MAGENTA)
    _, tf = textbox(slide, M + Inches(0.44), y + Inches(0.26),
                    CW - Inches(1.0), Inches(0.3))
    para(tf, True, text=label, size=9.5, color=MAGENTA_HI, font=F_BOLD,
         bold=True, caps=True, spacing=1.8)
    _, tf = textbox(slide, M + Inches(0.44), y + Inches(0.60),
                    CW - Inches(1.0), h - Inches(0.72))
    para(tf, True, text=text, size=15, color=WHITE, font=F_SER, italic=True,
         line=1.28)


# ----------------------------------------- #7 кольцо + плашка «эффект» ------
def slide_donut_effect(prs, kicker, title, donut_data, center, legend, tiles,
                       effect, source=None, num=None):
    s = page(prs, kicker, title, source=source, num=num)
    top = Inches(2.00)
    bottom = FOOT_Y - Inches(0.28)

    # --- карточка с кольцом
    lw = Inches(5.35)
    card = rect(s, M, top, lw, bottom - top, WHITE,
                shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.05)
    soft_shadow(card, blur=16, dist=4, alpha=0.09)

    d = Inches(2.55)
    dcx, dcy = M + lw / 2, top + Inches(1.72)
    donut(s, dcx, dcy, d, donut_data, thickness=0.28)
    _, tf = textbox(s, dcx - Inches(1.2), dcy - Inches(0.44), Inches(2.4),
                    Inches(0.5))
    para(tf, True, text=center[0], size=27, color=NAVY, font=F_HEAD,
         bold=True, align=PP_ALIGN.CENTER, line=1.0)
    _, tf = textbox(s, dcx - Inches(0.80), dcy + Inches(0.08), Inches(1.60),
                    Inches(0.4))
    para(tf, True, text=center[1], size=9.5, color=SLATE, font=F_BOLD,
         align=PP_ALIGN.CENTER, caps=True, spacing=0.8, line=1.15)

    ly = top + Inches(3.42)
    for label, color, value in legend:
        rect(s, M + Inches(0.42), ly + Inches(0.06), Inches(0.16),
             Inches(0.16), color, shape=MSO_SHAPE.OVAL)
        _, tf = textbox(s, M + Inches(0.72), ly, Inches(1.35), Inches(0.3))
        para(tf, True, text=value, size=13, color=NAVY, font=F_HEAD,
             bold=True)
        _, tf = textbox(s, M + Inches(2.10), ly + Inches(0.02),
                        lw - Inches(2.5), Inches(0.5))
        para(tf, True, text=label, size=10.5, color=SLATE, font=F_BOLD,
             line=1.22)
        ly += Inches(0.56)

    # --- правая колонка: плитки + «эффект»
    rx = M + lw + Inches(0.28)
    rw = CW - lw - Inches(0.28)
    th = Inches(1.24)
    for i, (val, unit, cap) in enumerate(tiles):
        y = top + i * (th + Inches(0.18))
        t = rect(s, rx, y, rw, th, WHITE,
                 shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.08)
        soft_shadow(t, blur=14, dist=3, alpha=0.08)
        acc = ACCENTS[i % 3]
        rect(s, rx, y + Inches(0.30), Inches(0.075), th - Inches(0.60), acc)
        _, tf = textbox(s, rx + Inches(0.42), y + Inches(0.20), Inches(2.2),
                        Inches(0.6))
        para(tf, True, text=val, size=28, color=NAVY, font=F_HEAD, bold=True,
             line=1.0)
        _, tf = textbox(s, rx + Inches(0.42), y + Inches(0.76), Inches(2.2),
                        Inches(0.3))
        para(tf, True, text=unit, size=10, color=acc, font=F_BOLD, bold=True,
             caps=True, spacing=1.1)
        _, tf = textbox(s, rx + Inches(2.85), y, rw - Inches(3.2), th,
                        anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=cap, size=11.5, color=SLATE, font=F_BOLD,
             line=1.3)

    ey = top + 2 * (th + Inches(0.18))
    eh = bottom - ey
    rect(s, rx, ey, rw, eh, VIOLET_DEEP,
         shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.08)
    _, tf = textbox(s, rx + Inches(0.42), ey + Inches(0.28), rw - Inches(0.84),
                    Inches(0.3))
    para(tf, True, text=effect[0], size=9.5, color=MAGENTA_HI, font=F_BOLD,
         bold=True, caps=True, spacing=1.8)
    _, tf = textbox(s, rx + Inches(0.42), ey + Inches(0.62), rw - Inches(0.84),
                    eh - Inches(0.8))
    para(tf, True, text=effect[1], size=13.5, color=WHITE, font=F_SER,
         italic=True, line=1.3)
    return s


# --------------------------------- #2 столбцы + линия + выноски -------------
def slide_combo(prs, kicker, title, lead, cats, bar_legend, line_legend,
                callouts, source=None, num=None, bar_unit="трлн ₽"):
    """cats: [(подпись, значение_столбца, значение_линии, текст_линии)]."""
    s = page(prs, kicker, title, source=source, num=num)
    _, tf = textbox(s, M, Inches(1.88), Inches(11.0), Inches(0.4))
    para(tf, True, text=lead, size=13.5, color=SLATE, font=F_BOLD, line=1.3)

    card = rect(s, M, Inches(2.28), CW, Inches(3.30), WHITE,
                shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.05)
    soft_shadow(card, blur=16, dist=4, alpha=0.09)

    base = Inches(5.00)
    bar_top = Inches(3.76)          # столбцы живут в нижней полосе карточки
    line_hi, line_lo = Inches(3.02), Inches(3.44)   # линия — в верхней
    plot_l = M + Inches(0.85)
    plot_w = CW - Inches(4.30)
    n = len(cats)
    slot = int(plot_w / n)
    bw = Inches(1.10)
    vmax = max(c[1] for c in cats)
    lvals = [c[2] for c in cats]
    lmin, lspan = min(lvals), (max(lvals) - min(lvals)) or 1.0

    rect(s, plot_l - Inches(0.30), base, plot_w + Inches(0.55), Emu(9525),
         LILAC_3)

    pts = []
    for i, (label, bar_v, line_v, line_txt) in enumerate(cats):
        cx = plot_l + i * slot + slot / 2
        h = int((base - bar_top) * bar_v / vmax)
        b = rect(s, cx - bw / 2, base - h, bw, h, TEAL,
                 shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06)
        soft_shadow(b, blur=12, dist=3, alpha=0.14)
        _, tf = textbox(s, cx - bw / 2, base - h + Inches(0.20), bw,
                        Inches(0.34))
        para(tf, True, text=("%.1f" % bar_v).replace(".", ","), size=17,
             color=WHITE, font=F_HEAD, bold=True, align=PP_ALIGN.CENTER)
        _, tf = textbox(s, cx - Inches(0.95), base + Inches(0.18),
                        Inches(1.90), Inches(0.4))
        para(tf, True, text=label, size=12.5, color=NAVY, font=F_HEAD,
             bold=True, align=PP_ALIGN.CENTER, line=1.15)
        ly = line_lo - int((line_lo - line_hi) * (line_v - lmin) / lspan)
        pts.append((cx, ly, line_txt))

    for i in range(len(pts) - 1):
        x1, y1, _ = pts[i]
        x2, y2, _ = pts[i + 1]
        conn = s.shapes.add_connector(1, int(x1), int(y1), int(x2), int(y2))
        conn.line.color.rgb = MAGENTA
        conn.line.width = Pt(2.25)
    for cx, cy, txt in pts:
        rect(s, cx - Inches(0.085), cy - Inches(0.085), Inches(0.17),
             Inches(0.17), MAGENTA, shape=MSO_SHAPE.OVAL)
        _, tf = textbox(s, cx - Inches(0.80), cy - Inches(0.42),
                        Inches(1.60), Inches(0.3))
        para(tf, True, text=txt, size=12, color=MAGENTA, font=F_HEAD,
             bold=True, align=PP_ALIGN.CENTER)

    # легенда справа внутри карточки
    lx = M + CW - Inches(3.10)
    ly = Inches(2.92)
    for label, color, kind in ((bar_legend, TEAL, "bar"),
                               (line_legend, MAGENTA, "line")):
        if kind == "bar":
            rect(s, lx, ly + Inches(0.03), Inches(0.20), Inches(0.20), color)
        else:
            rect(s, lx, ly + Inches(0.10), Inches(0.20), Inches(0.055), color)
            rect(s, lx + Inches(0.055), ly + Inches(0.065), Inches(0.09),
                 Inches(0.09), color, shape=MSO_SHAPE.OVAL)
        _, tf = textbox(s, lx + Inches(0.34), ly, Inches(2.5), Inches(0.6))
        para(tf, True, text=label, size=11, color=SLATE, font=F_BOLD,
             line=1.25)
        ly += Inches(0.72)

    # цветные выноски под графиком
    y = Inches(5.74)
    ch = Inches(0.84)
    cwid = int((CW - Inches(0.24)) / 2)
    for i, (label, text) in enumerate(callouts):
        x = M + i * (cwid + Inches(0.24))
        rect(s, x, y, cwid, ch, MAGENTA if i == 0 else TEAL_DEEP,
             shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.12)
        _, tf = textbox(s, x + Inches(0.34), y + Inches(0.14),
                        cwid - Inches(0.68), Inches(0.26))
        para(tf, True, text=label, size=9.5, color=WHITE, font=F_BOLD,
             bold=True, caps=True, spacing=1.6)
        _, tf = textbox(s, x + Inches(0.34), y + Inches(0.42),
                        cwid - Inches(0.68), Inches(0.42))
        para(tf, True, text=text, size=12, color=WHITE, font=F_BOLD,
             line=1.25)
    return s


# ------------------------------------- #6 таблица «до / после / Δ» ----------
def slide_compare(prs, kicker, title, lead, headers, rows, note=None,
                  source=None, num=None):
    """rows: [(показатель, до, после, дельта, вниз?)]"""
    s = page(prs, kicker, title, source=source, num=num)
    _, tf = textbox(s, M, Inches(1.88), Inches(11.2), Inches(0.4))
    para(tf, True, text=lead, size=13.5, color=SLATE, font=F_BOLD, line=1.3)

    top = Inches(2.40)
    bottom = FOOT_Y - Inches(0.28) - (Inches(1.06) if note else 0)
    hh = Inches(0.62)
    n = len(rows)
    rh = int((bottom - top - hh) / n)

    colx = [M, M + Inches(5.90), M + Inches(8.05), M + Inches(10.05)]
    colw = [Inches(5.70), Inches(2.05), Inches(1.90), Inches(1.90)]

    rect(s, M, top, CW, hh, NAVY, shape=MSO_SHAPE.ROUNDED_RECTANGLE,
         radius=0.14)
    for i, htxt in enumerate(headers):
        _, tf = textbox(s, colx[i] + (Inches(0.36) if i == 0 else 0), top,
                        colw[i], hh, anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=htxt, size=10, color=WHITE, font=F_BOLD,
             bold=True, caps=True, spacing=1.4,
             align=PP_ALIGN.LEFT if i == 0 else PP_ALIGN.CENTER)

    for r, (name, before, after, delta, arrow_dir, good) in enumerate(rows):
        y = top + hh + r * rh
        if r % 2 == 0:
            rect(s, M, y, CW, rh, WHITE)
        else:
            rect(s, M, y, CW, rh, LILAC_2, alpha=0.55)
        rect(s, M, y, CW, Emu(9525), LILAC_3)
        _, tf = textbox(s, colx[0] + Inches(0.36), y, colw[0] - Inches(0.5),
                        rh, anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=name, size=13, color=NAVY, font=F_HEAD, bold=True,
             line=1.15)
        for i, (txt, color) in enumerate(((before, SLATE), (after, TEAL_DEEP))):
            _, tf = textbox(s, colx[i + 1], y, colw[i + 1], rh,
                            anchor=MSO_ANCHOR.MIDDLE)
            para(tf, True, text=txt, size=17, color=color, font=F_HEAD,
                 bold=True, align=PP_ALIGN.CENTER)
        arrow = {"down": "▼ ", "up": "▲ "}.get(arrow_dir, "")
        acc = SLATE if good is None else (TEAL if good else MAGENTA)
        _, tf = textbox(s, colx[3], y, colw[3], rh, anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=arrow + delta, size=16, color=acc, font=F_HEAD,
             bold=True, align=PP_ALIGN.CENTER)

    if note:
        y = FOOT_Y - Inches(1.06)
        rect(s, M, y, CW, Inches(0.78), VIOLET_DEEP,
             shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.20)
        rect(s, M, y + Inches(0.17), Inches(0.075), Inches(0.44), MAGENTA)
        _, tf = textbox(s, M + Inches(0.42), y, CW - Inches(0.9), Inches(0.78),
                        anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=note, size=14, color=WHITE, font=F_SER,
             italic=True, line=1.2)
    return s


# ------------------------------- #8 сетка нумерованных карточек -------------
def slide_numbered_grid(prs, kicker, title, lead, cards, cols=3, source=None,
                        num=None):
    """cards: [(заголовок, текст)] — номер проставляется автоматически."""
    s = page(prs, kicker, title, source=source, num=num)
    top = Inches(2.00)
    if lead:
        _, tf = textbox(s, M, Inches(1.88), Inches(11.2), Inches(0.4))
        para(tf, True, text=lead, size=13.5, color=SLATE, font=F_BOLD,
             line=1.3)
        top = Inches(2.34)
    bottom = FOOT_Y - Inches(0.28)
    rows = (len(cards) + cols - 1) // cols
    gx, gy = Inches(0.24), Inches(0.20)
    cwid = int((CW - gx * (cols - 1)) / cols)
    rh = int((bottom - top - gy * (rows - 1)) / rows)

    for i, (label, body) in enumerate(cards):
        c, r = i % cols, i // cols
        x = M + c * (cwid + gx)
        y = top + r * (rh + gy)
        card = rect(s, x, y, cwid, rh, WHITE,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.10)
        soft_shadow(card, blur=14, dist=3, alpha=0.08)
        acc = ACCENTS[i % 3]
        rect(s, x + cwid - Inches(0.68), y + Inches(0.24),
             Inches(0.40), Inches(0.40), acc, shape=MSO_SHAPE.OVAL)
        _, tf = textbox(s, x + cwid - Inches(0.68), y + Inches(0.28),
                        Inches(0.40), Inches(0.4))
        para(tf, True, text=str(i + 1), size=13, color=WHITE, font=F_HEAD,
             bold=True, align=PP_ALIGN.CENTER)
        _, tf = textbox(s, x + Inches(0.36), y + Inches(0.28),
                        cwid - Inches(1.20), Inches(0.76))
        para(tf, True, text=label, size=15, color=NAVY, font=F_HEAD,
             bold=True, line=1.1)
        _, tf = textbox(s, x + Inches(0.36), y + Inches(1.06),
                        cwid - Inches(0.72), rh - Inches(1.28))
        para(tf, True, text=body, size=12, color=SLATE, font=F_BOLD,
             line=1.34)
    return s


# ------------------------------------ #5 ранжированный список ---------------
def slide_ranked(prs, kicker, title, lead, items, source=None, num=None,
                 label=None):
    s = page(prs, kicker, title, source=source, num=num)
    top = Inches(1.98)
    if lead:
        _, tf = textbox(s, M, Inches(1.86), Inches(11.2), Inches(0.4))
        para(tf, True, text=lead, size=13.5, color=SLATE, font=F_BOLD,
             line=1.3)
        top = Inches(2.30)
    bottom = FOOT_Y - Inches(0.28)
    n = len(items)
    rh = int((bottom - top) / n)
    for i, text in enumerate(items):
        y = top + i * rh
        if i:
            rect(s, M, y, CW, Emu(9525), LILAC_3)
        _, tf = textbox(s, M, y, Inches(1.30), rh, anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text="%02d" % (i + 1), size=34,
             color=ACCENTS[i % 3], font=F_HEAD, bold=True, line=1.0)
        _, tf = textbox(s, M + Inches(1.40), y, CW - Inches(1.6), rh,
                        anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=text, size=15.5, color=NAVY, font=F_SER,
             italic=True, line=1.28)
    return s


# ---------------------------- #4 изображение как герой слайда ---------------
def slide_image_hero(prs, kicker, title, lead, chips, image, source=None,
                     num=None):
    """Полноэкранная картинка + затемнение + ряд подписей внизу."""
    s = blank(prs)
    image_fill(s, image, 0, 0, SW, SH)
    tint(s, 0, 0, SW, SH, VIOLET_DEEP, alpha=0.34)
    scrim(s, 0, 0, Inches(8.6), SH, VIOLET_DEEP, a_from=0.86, a_to=0.0,
          angle=0)
    scrim(s, 0, Inches(4.30), SW, Inches(3.20), VIOLET_DEEP, a_from=0.0,
          a_to=0.94, angle=90)
    rect(s, 0, 0, Inches(0.10), SH, MAGENTA)

    head(s, kicker, title, dark=True)
    _, tf = textbox(s, M, Inches(2.02), Inches(7.6), Inches(0.7))
    para(tf, True, text=lead, size=15, color=LILAC_2, font=F_SER, italic=True,
         line=1.3)

    n = len(chips)
    gap = Inches(0.24)
    cwid = int((CW - gap * (n - 1)) / n)
    y, ch = Inches(5.06), Inches(1.54)
    grade = [TEAL, TEAL_DEEP, VIOLET_MID, MAGENTA]
    for i, (name, cap) in enumerate(chips):
        x = M + i * (cwid + gap)
        card = rect(s, x, y, cwid, ch, WHITE,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06,
                    alpha=0.10)
        rect(s, x + Inches(0.26), y + Inches(0.26), Inches(0.42),
             Inches(0.055), grade[i % len(grade)])
        _, tf = textbox(s, x + Inches(0.26), y + Inches(0.48),
                        cwid - Inches(0.52), Inches(0.4))
        para(tf, True, text=name, size=16, color=WHITE, font=F_HEAD,
             bold=True, line=1.05)
        _, tf = textbox(s, x + Inches(0.26), y + Inches(0.94),
                        cwid - Inches(0.52), Inches(0.5))
        para(tf, True, text=cap, size=11, color=LILAC_3, font=F_BOLD,
             line=1.26)
        if i < n - 1:
            rect(s, x + cwid + Inches(0.055), y + Inches(0.66), Inches(0.14),
                 Inches(0.17), MAGENTA_HI,
                 shape=MSO_SHAPE.ISOSCELES_TRIANGLE, rot=90)
    footer(s, source=source, page=num, dark=True)
    return s


def image_bleed_right(slide, image, w=Inches(4.55)):
    """Картинка «в обрез» по правому краю светлого слайда."""
    x = SW - w
    image_fill(slide, image, x, 0, w, SH)
    scrim(slide, x, 0, Inches(1.45), SH, LILAC, a_from=0.98, a_to=0.0,
          angle=0)
    return x
