# -*- coding: utf-8 -*-
"""One-off, hand-composed slides (charts, chains, closing pages)."""

from pptx.util import Inches, Pt, Emu
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

from deck_core import (
    SW, SH, M, CW, TITLE_T, FOOT_Y,
    VIOLET_DEEP, VIOLET, VIOLET_MID, VIOLET_SOFT, MAGENTA, MAGENTA_HI,
    TEAL, TEAL_DEEP, NAVY, SLATE, SLATE_LIGHT, LILAC, LILAC_2, LILAC_3,
    WHITE, F_HEAD, F_BOLD, F_SER, LOGO_WHITE, LOGO_COLOR,
    blank, bg_light, bg_gradient, hero_rings, rect, ring, para, textbox,
    picture, footer, set_alpha, soft_shadow, no_line,
)
from deck_layouts import head, page, ACCENTS


# ------------------------------------------------------------ 4 layers -----
def slide_layers(prs, kicker, text, lead, layers, question, source=None,
                 num=None):
    s = page(prs, kicker, text, source=source, num=num)
    _, tf = textbox(s, M, Inches(1.92), Inches(11.4), Inches(0.4))
    para(tf, True, text=lead, size=14, color=SLATE, font=F_BOLD, line=1.3)

    top = Inches(2.44)
    rh = Inches(0.66)
    gap = Inches(0.115)
    for i, (name, desc) in enumerate(layers):
        y = top + i * (rh + gap)
        card = rect(s, M, y, CW - Inches(0.0), rh, WHITE,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.14)
        soft_shadow(card, blur=12, dist=3, alpha=0.08)
        acc = ACCENTS[i % len(ACCENTS)]
        chip = rect(s, M + Inches(0.20), y + Inches(0.145), Inches(0.37),
                    Inches(0.37), acc, shape=MSO_SHAPE.OVAL)
        _, tf = textbox(s, M + Inches(0.20), y + Inches(0.145), Inches(0.37),
                        Inches(0.37), anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=str(i + 1), size=12, color=WHITE, font=F_HEAD,
             bold=True, align=PP_ALIGN.CENTER)
        _, tf = textbox(s, M + Inches(0.78), y, Inches(4.5), rh,
                        anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=name, size=15, color=NAVY, font=F_HEAD, bold=True)
        _, tf = textbox(s, M + Inches(5.35), y, CW - Inches(5.7), rh,
                        anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=desc, size=12.5, color=SLATE, font=F_BOLD,
             line=1.25)

    y = top + 4 * (rh + gap) + Inches(0.16)
    rect(s, M, y, CW, Inches(0.74), VIOLET_DEEP,
         shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.18)
    rect(s, M, y + Inches(0.16), Inches(0.075), Inches(0.42), MAGENTA)
    _, tf = textbox(s, M + Inches(0.42), y, CW - Inches(0.9), Inches(0.74),
                    anchor=MSO_ANCHOR.MIDDLE)
    para(tf, True, text=question, size=15, color=WHITE, font=F_SER,
         italic=True, line=1.2)
    return s


# -------------------------------------------------------------- value chain -
def slide_chain(prs, kicker, text, lead, steps, why, source=None, num=None):
    """steps: list of (short, ru_caption)."""
    s = page(prs, kicker, text, source=source, num=num)
    _, tf = textbox(s, M, Inches(1.92), Inches(11.4), Inches(0.5))
    para(tf, True, text=lead, size=15, color=SLATE, font=F_SER, italic=True,
         line=1.3)

    top = Inches(2.72)
    n = len(steps)
    gap = Inches(0.44)
    cw = int((CW - gap * (n - 1)) / n)
    ch = Inches(1.86)
    grade = [TEAL, TEAL_DEEP, VIOLET_MID, MAGENTA]
    for i, (short, cap) in enumerate(steps):
        x = M + i * (cw + gap)
        card = rect(s, x, top, cw, ch, WHITE,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06)
        soft_shadow(card, blur=16, dist=4, alpha=0.10)
        rect(s, x + Inches(0.24), top + Inches(0.28), Inches(0.42),
             Inches(0.055), grade[i % len(grade)])
        _, tf = textbox(s, x + Inches(0.24), top + Inches(0.52),
                        cw - Inches(0.48), Inches(0.5))
        para(tf, True, text=short, size=17, color=NAVY, font=F_HEAD,
             bold=True, line=1.05)
        _, tf = textbox(s, x + Inches(0.24), top + Inches(1.12),
                        cw - Inches(0.48), Inches(0.7))
        para(tf, True, text=cap, size=11.5, color=SLATE, font=F_BOLD,
             line=1.28)
        if i < n - 1:
            ar = rect(s, x + cw + Inches(0.10), top + Inches(0.80),
                      Inches(0.24), Inches(0.26), grade[i % len(grade)],
                      shape=MSO_SHAPE.ISOSCELES_TRIANGLE, rot=90)

    y = Inches(5.06)
    rect(s, M, y, CW, Inches(1.40), VIOLET_DEEP,
         shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.09)
    rect(s, M, y + Inches(0.30), Inches(0.075), Inches(0.80), MAGENTA)
    _, tf = textbox(s, M + Inches(0.42), y + Inches(0.26), CW - Inches(1.0),
                    Inches(0.3))
    para(tf, True, text="почему это не одно и то же", size=9.5,
         color=MAGENTA_HI, font=F_BOLD, bold=True, caps=True, spacing=1.8)
    _, tf = textbox(s, M + Inches(0.42), y + Inches(0.60), CW - Inches(1.0),
                    Inches(0.7))
    para(tf, True, text=why, size=14, color=LILAC_2, font=F_BOLD, line=1.32)
    return s


# --------------------------------------------------------------- waterfall --
def slide_waterfall(prs, kicker, text, source=None, num=None):
    s = page(prs, kicker, text, source=source, num=num)
    _, tf = textbox(s, M, Inches(1.90), Inches(8.6), Inches(0.4))
    para(tf, True,
         text="Иллюстративная модель. Показывает механику, а не оценку "
              "конкретного объекта.",
         size=12.5, color=SLATE, font=F_BOLD, line=1.3)

    # ---- chart geometry
    base = Inches(6.02)
    top_v = Inches(2.62)
    scale = (base - top_v) / 1000.0
    x0 = M + Inches(0.10)
    cw = Inches(1.30)
    gap = Inches(0.26)

    steps = [
        ("MV залога",        0,      1000.0, TEAL,        "1 000"),
        ("− дисконт 25%",    750.0,  1000.0, MAGENTA,     "−250"),
        ("− расходы 5%",     712.5,  750.0,  MAGENTA,     "−37,5"),
        ("− время: 2 г., 20%", 495.0, 712.5, MAGENTA_HI,  "−217,5"),
        ("Recovery, NPV",    0,      495.0,  VIOLET_MID,  "495"),
    ]
    prev_x2 = None
    for i, (label, lo, hi, color, val) in enumerate(steps):
        x = x0 + i * (cw + gap)
        y = base - hi * scale
        h = (hi - lo) * scale
        bar = rect(s, x, y, cw, h, color,
                   shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.10)
        soft_shadow(bar, blur=14, dist=4, alpha=0.16)
        # connector
        if prev_x2 is not None:
            rect(s, prev_x2, y - Emu(4763), x - prev_x2, Emu(9525), LILAC_3)
        prev_x2 = x + cw
        _, tf = textbox(s, x - Inches(0.1), y - Inches(0.40),
                        cw + Inches(0.2), Inches(0.34))
        para(tf, True, text=val, size=14, color=NAVY, font=F_HEAD, bold=True,
             align=PP_ALIGN.CENTER)
        _, tf = textbox(s, x - Inches(0.18), base + Inches(0.16),
                        cw + Inches(0.36), Inches(0.6))
        para(tf, True, text=label, size=10.5, color=SLATE, font=F_BOLD,
             align=PP_ALIGN.CENTER, line=1.22)

    rect(s, x0 - Inches(0.10), base, Inches(7.75), Emu(9525), LILAC_3)

    # ---- debt reference line
    dy = base - 667.0 * scale
    for k in range(26):
        rect(s, x0 - Inches(0.10) + k * Inches(0.30), dy, Inches(0.17),
             Emu(12700), NAVY)
    _, tf = textbox(s, x0 + Inches(1.45), dy + Inches(0.11), Inches(3.10),
                    Inches(0.3))
    para(tf, True, text="долг 667 млн  ·  LTV 66,7% «на бумаге»", size=10.5,
         color=NAVY, font=F_BOLD, bold=True, align=PP_ALIGN.RIGHT)

    # ---- verdict panel
    px = M + Inches(8.30)
    pw = CW - Inches(8.30)
    card = rect(s, px, Inches(2.32), pw, Inches(4.32), VIOLET_DEEP,
                shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06)
    soft_shadow(card, blur=20, dist=6, alpha=0.22)
    rect(s, px, Inches(2.32), pw, Inches(0.085), MAGENTA)

    _, tf = textbox(s, px + Inches(0.34), Inches(2.66), pw - Inches(0.68),
                    Inches(0.3))
    para(tf, True, text="параметры модели", size=9.5, color=MAGENTA_HI,
         font=F_BOLD, bold=True, caps=True, spacing=1.8)
    _, tf = textbox(s, px + Inches(0.34), Inches(3.02), pw - Inches(0.68),
                    Inches(1.0))
    for i, ln in enumerate(["дисконт к рынку — 25%",
                            "расходы реализации — 5%",
                            "срок реализации — 2 года",
                            "ставка дисконта — 20%"]):
        para(tf, i == 0, text="·  " + ln, size=11.5, color=LILAC_2,
             font=F_BOLD, line=1.5)

    rect(s, px + Inches(0.34), Inches(4.34), pw - Inches(0.68), Emu(9525),
         VIOLET_SOFT)

    _, tf = textbox(s, px + Inches(0.34), Inches(4.56), pw - Inches(0.68),
                    Inches(0.7))
    para(tf, True, text="74%", size=44, color=MAGENTA_HI, font=F_HEAD,
         bold=True, line=1.0)
    _, tf = textbox(s, px + Inches(0.34), Inches(5.26), pw - Inches(0.68),
                    Inches(1.2))
    para(tf, True,
         text="долга покрывает recovery экономически — при формальном "
              "покрытии 150%.",
         size=12.5, color=WHITE, font=F_BOLD, line=1.34)
    return s


# ---------------------------------------------------------------- timeline --
def slide_timeline(prs, kicker, text, lead, segs, source=None, num=None):
    """segs: list of (label, minutes, caption)."""
    s = page(prs, kicker, text, source=source, num=num)
    _, tf = textbox(s, M, Inches(1.92), Inches(11.4), Inches(0.4))
    para(tf, True, text=lead, size=14, color=SLATE, font=F_BOLD, line=1.3)

    total = sum(m for _, m, _ in segs)
    n = len(segs)
    grade = [TEAL, TEAL_DEEP, VIOLET_MID, VIOLET, MAGENTA, MAGENTA_HI]

    # ---- proportional ribbon: segment width = share of the 90 minutes
    y = Inches(2.56)
    bh = Inches(0.72)
    x = M
    for i, (label, mins, cap) in enumerate(segs):
        w = int(CW * mins / total)
        if i == n - 1:
            w = int(M + CW - x)
        rect(s, x, y, w, bh, grade[i % len(grade)])
        _, tf = textbox(s, x, y, w, bh, anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text="%d мин" % mins, size=12.5, color=WHITE,
             font=F_HEAD, bold=True, align=PP_ALIGN.CENTER)
        if i:
            rect(s, x, y, Emu(9525), bh, WHITE)
        x += w

    # ---- equal-width caption cards, so narrow segments stay readable
    ctop = Inches(3.66)
    ch = FOOT_Y - Inches(0.34) - ctop
    gap = Inches(0.16)
    cw = int((CW - gap * (n - 1)) / n)
    for i, (label, mins, cap) in enumerate(segs):
        cx = M + i * (cw + gap)
        card = rect(s, cx, ctop, cw, ch, WHITE,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06)
        soft_shadow(card, blur=14, dist=3, alpha=0.08)
        rect(s, cx + Inches(0.20), ctop + Inches(0.28), Inches(0.34),
             Inches(0.05), grade[i % len(grade)])
        _, tf = textbox(s, cx + Inches(0.20), ctop + Inches(0.50),
                        cw - Inches(0.40), Inches(0.4))
        para(tf, True, text=label, size=13, color=NAVY, font=F_HEAD,
             bold=True, line=1.1)
        _, tf = textbox(s, cx + Inches(0.20), ctop + Inches(0.96),
                        cw - Inches(0.40), ch - Inches(1.2))
        para(tf, True, text=cap, size=11, color=SLATE, font=F_BOLD, line=1.3)
    return s


# ----------------------------------------------------------------- sources --
def slide_sources(prs, kicker, text, items, num=None):
    s = page(prs, kicker, text, num=num)
    gap = Inches(0.24)
    half = int((CW - gap) / 2)
    rows = (len(items) + 1) // 2
    top = Inches(2.06)
    vgap = Inches(0.20)
    rh = int(((FOOT_Y - Inches(0.34) - top) - vgap * (rows - 1)) / rows)
    for i, (name, url) in enumerate(items):
        col, row = i % 2, i // 2
        x = M + col * (half + gap)
        y = top + row * (rh + vgap)
        card = rect(s, x, y, half, rh, WHITE,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.10)
        soft_shadow(card, blur=12, dist=3, alpha=0.07)
        rect(s, x, y + int(rh * 0.24), Inches(0.06), int(rh * 0.52),
             TEAL if col == 0 else MAGENTA)
        _, tf = textbox(s, x + Inches(0.34), y + Inches(0.26),
                        half - Inches(0.60), Inches(0.6))
        para(tf, True, text=name, size=12.5 if len(name) <= 44 else 11.5,
             color=NAVY, font=F_HEAD, bold=True, line=1.14)
        _, tf = textbox(s, x + Inches(0.34), y + Inches(0.90),
                        half - Inches(0.60), rh - Inches(1.02))
        up = para(tf, True, text=url, size=9.5, color=TEAL_DEEP, font=F_BOLD,
                  line=1.25)
        up.runs[0].hyperlink.address = "https://" + url
    return s


# ------------------------------------------------------------ closing page --
def slide_final(prs, kicker, text, steps, statement, source=None, num=None):
    s = blank(prs)
    bg_gradient(s, VIOLET_DEEP, VIOLET_MID, angle=30)
    hero_rings(s, Inches(11.9), Inches(1.5), sizes=(6.0, 4.5, 3.1),
               color=MAGENTA_HI, alpha=0.24)
    rect(s, Inches(0), Inches(0), Inches(0.10), SH, MAGENTA)
    head(s, kicker, text, dark=True)
    footer(s, source=source, page=num, dark=True, partner=False)

    top = Inches(2.26)
    n = len(steps)
    gap = Inches(0.36)
    cw = int((CW - gap * (n - 1)) / n)
    ch = Inches(2.30)
    for i, (abbr, full, cap) in enumerate(steps):
        x = M + i * (cw + gap)
        card = rect(s, x, top, cw, ch, WHITE,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.05, alpha=0.08)
        rect(s, x + Inches(0.30), top + Inches(0.32), Inches(0.42),
             Inches(0.055), [TEAL, VIOLET_MID, MAGENTA][i % 3])
        _, tf = textbox(s, x + Inches(0.30), top + Inches(0.56),
                        cw - Inches(0.6), Inches(0.6))
        para(tf, True, text=abbr, size=30, color=WHITE, font=F_HEAD,
             bold=True, line=1.0)
        _, tf = textbox(s, x + Inches(0.30), top + Inches(1.18),
                        cw - Inches(0.6), Inches(0.35))
        para(tf, True, text=full, size=10.5, color=MAGENTA_HI, font=F_BOLD,
             bold=True, caps=True, spacing=1.2, line=1.15)
        _, tf = textbox(s, x + Inches(0.30), top + Inches(1.58),
                        cw - Inches(0.6), Inches(0.66))
        para(tf, True, text=cap, size=12, color=LILAC_3, font=F_BOLD,
             line=1.3)
        if i < n - 1:
            rect(s, x + cw + Inches(0.06), top + Inches(1.00), Inches(0.24),
                 Inches(0.26), MAGENTA_HI,
                 shape=MSO_SHAPE.ISOSCELES_TRIANGLE, rot=90)

    y = Inches(5.02)
    picture(s, LOGO_WHITE, M, y + Inches(0.12), h=Inches(1.16))
    rect(s, M + Inches(2.10), y + Inches(0.14), Emu(9525), Inches(1.22),
         VIOLET_SOFT)
    _, tf = textbox(s, M + Inches(2.46), y + Inches(0.24),
                    CW - Inches(2.6), Inches(1.2))
    para(tf, True, text=statement, size=17, color=WHITE, font=F_SER,
         italic=True, line=1.34)
    return s


# ---------------------------------------------------------------- contacts --
def slide_contacts(prs, kicker, headline, people, office, num=None):
    s = blank(prs)
    bg_gradient(s, VIOLET_DEEP, VIOLET_MID, angle=30)
    hero_rings(s, Inches(1.9), Inches(6.4), sizes=(5.6, 4.2, 2.9),
               color=MAGENTA_HI, alpha=0.20)
    rect(s, Inches(0), Inches(0), Inches(0.10), SH, MAGENTA)

    _, tf = textbox(s, M, Inches(0.72), CW, Inches(0.3))
    para(tf, True, text=kicker, size=11, color=MAGENTA_HI, font=F_BOLD,
         bold=True, caps=True, spacing=2.4)
    _, tf = textbox(s, M, Inches(1.16), Inches(7.6), Inches(1.4))
    para(tf, True, text=headline, size=34, color=WHITE, font=F_HEAD,
         bold=True, line=1.06)
    rect(s, M, Inches(2.52), Inches(1.7), Inches(0.05), MAGENTA)

    picture(s, LOGO_WHITE, SW - M - Inches(2.35), Inches(0.86), w=Inches(2.35))

    top = Inches(3.06)
    gap = Inches(0.30)
    cw = int((CW - gap) / 2)
    for i, (name, role, mail, phone) in enumerate(people):
        x = M + i * (cw + gap)
        card = rect(s, x, top, cw, Inches(2.10), WHITE,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06, alpha=0.09)
        rect(s, x + Inches(0.34), top + Inches(0.30), Inches(0.42),
             Inches(0.055), [MAGENTA, TEAL][i % 2])
        _, tf = textbox(s, x + Inches(0.34), top + Inches(0.52),
                        cw - Inches(0.68), Inches(0.4))
        para(tf, True, text=name, size=21, color=WHITE, font=F_HEAD,
             bold=True)
        _, tf = textbox(s, x + Inches(0.34), top + Inches(0.98),
                        cw - Inches(0.68), Inches(0.34))
        para(tf, True, text=role, size=11.5, color=MAGENTA_HI, font=F_BOLD,
             bold=True, caps=True, spacing=1.0, line=1.2)
        _, tf = textbox(s, x + Inches(0.34), top + Inches(1.36),
                        cw - Inches(0.68), Inches(0.6))
        para(tf, True, text=mail, size=12, color=LILAC_2, font=F_BOLD,
             line=1.35)
        para(tf, False, text=phone, size=12, color=LILAC_2, font=F_BOLD,
             line=1.35)

    y = Inches(5.42)
    rect(s, M, y, CW, Emu(9525), VIOLET_SOFT)
    cols = [("офис", office["office"]), ("сайт", office["site"]),
            ("телефон", office["phone"])]
    cw2 = int(CW / 3)
    for i, (lab, val) in enumerate(cols):
        x = M + i * cw2
        _, tf = textbox(s, x, y + Inches(0.30), cw2 - Inches(0.4), Inches(0.3))
        para(tf, True, text=lab, size=9.5, color=MAGENTA_HI, font=F_BOLD,
             bold=True, caps=True, spacing=1.8)
        _, tf = textbox(s, x, y + Inches(0.62), cw2 - Inches(0.4), Inches(0.9))
        para(tf, True, text=val, size=12.5, color=WHITE, font=F_BOLD,
             line=1.34)
    return s
