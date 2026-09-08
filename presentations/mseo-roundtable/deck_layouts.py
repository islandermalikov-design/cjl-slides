# -*- coding: utf-8 -*-
"""Reusable slide templates for the MSEO round-table deck."""

from pptx.util import Inches, Pt, Emu
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

from deck_core import (
    SW, SH, M, CW, TITLE_T, FOOT_Y,
    VIOLET_DEEP, VIOLET, VIOLET_MID, VIOLET_SOFT, MAGENTA, MAGENTA_HI,
    TEAL, TEAL_DEEP, NAVY, SLATE, SLATE_LIGHT, LILAC, LILAC_2, LILAC_3,
    WHITE, F_HEAD, F_BOLD, F_SER,
    LOGO_WHITE, LOGO_COLOR, MARK_WHITE, MARK_COLOR,
    blank, bg_light, bg_gradient, hero_rings, rect, ring, block, para,
    textbox, picture, footer, eyebrow, title as put_title,
    set_alpha, soft_shadow, no_line,
)

ACCENTS = [MAGENTA, TEAL, VIOLET_MID, MAGENTA_HI, TEAL_DEEP]


def _title_size(text, base=27.0):
    n = len(text)
    if n > 92:
        return 21.0
    if n > 70:
        return 23.0
    if n > 52:
        return 25.0
    return base


def head(slide, kicker, text, dark=False):
    """Standard page header: kicker rule + eyebrow + title."""
    c_title = WHITE if dark else NAVY
    c_kick = MAGENTA_HI if dark else MAGENTA
    if kicker:
        rect(slide, M, TITLE_T + Inches(0.045), Inches(0.22), Inches(0.115),
             c_kick)
        _, tf = textbox(slide, M + Inches(0.36), TITLE_T, CW, Inches(0.26))
        para(tf, True, text=kicker, size=10.5, color=c_kick, font=F_BOLD,
             bold=True, caps=True, spacing=1.7)
    put_title(slide, text, color=c_title, t=Inches(0.98),
              size=_title_size(text))


def page(prs, kicker, text, source=None, num=None, dark=False, ground=LILAC):
    s = blank(prs)
    if dark:
        bg_gradient(s)
    else:
        bg_light(s, ground)
    head(s, kicker, text, dark=dark)
    footer(s, source=source, page=num, dark=dark)
    return s


# ------------------------------------------------------------------ title ---
def slide_title(prs, kicker, line1, line2_accent, subtitle, bullets, meta,
                source):
    s = blank(prs)
    bg_gradient(s, VIOLET_DEEP, VIOLET_MID, angle=30)
    # ambient geometry echoing the forum hero + the МСЭО circle mark
    hero_rings(s, Inches(11.55), Inches(2.35),
               sizes=(6.9, 5.4, 4.0, 2.7), color=MAGENTA_HI, alpha=0.30)
    ring(s, Inches(11.55), Inches(2.35), Inches(8.4), VIOLET_SOFT,
         width_pt=1.2)
    rect(s, Inches(0), Inches(0), Inches(0.10), SH, MAGENTA)

    _, tf = textbox(s, M, Inches(0.62), CW, Inches(0.3))
    para(tf, True, text=kicker, size=11, color=MAGENTA_HI, font=F_BOLD,
         bold=True, caps=True, spacing=2.6)

    _, tf = textbox(s, M, Inches(1.28), Inches(9.5), Inches(2.4))
    para(tf, True, text=line1, size=54, color=WHITE, font=F_HEAD, bold=True,
         line=0.98)
    para(tf, False, text=line2_accent, size=54, color=MAGENTA_HI, font=F_HEAD,
         bold=True, line=0.98)

    rect(s, M, Inches(3.62), Inches(2.1), Inches(0.05), MAGENTA)

    _, tf = textbox(s, M, Inches(3.95), Inches(8.4), Inches(0.6))
    para(tf, True, text=subtitle, size=15.5, color=WHITE, font=F_BOLD,
         line=1.3)

    y = Inches(4.72)
    for i, b in enumerate(bullets):
        rect(s, M + Inches(0.02), y + Inches(0.115), Inches(0.11),
             Inches(0.11), MAGENTA_HI if i == 0 else VIOLET_SOFT,
             shape=MSO_SHAPE.OVAL)
        _, tf = textbox(s, M + Inches(0.34), y, Inches(8.6), Inches(0.4))
        para(tf, True, text=b, size=12.5,
             color=WHITE if i == 0 else LILAC_3, font=F_BOLD,
             bold=(i == 0), line=1.25)
        y += Inches(0.44)

    # meta pills (date / venue / format) — borrowed from the forum site
    x = M
    for txt in meta:
        w = Inches(0.30) + Inches(0.088) * len(txt)
        pill = rect(s, x, Inches(6.16), w, Inches(0.40), WHITE,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5, alpha=0.0)
        pill.line.color.rgb = MAGENTA_HI
        pill.line.width = Pt(1.0)
        set_alpha(pill, 0.55, line=True)
        _, tf = textbox(s, x, Inches(6.245), w, Inches(0.3))
        para(tf, True, text=txt, size=10.5, color=LILAC_2, font=F_BOLD,
             align=PP_ALIGN.CENTER)
        x += w + Inches(0.16)

    # partner lock-up
    picture(s, LOGO_WHITE, SW - M - Inches(2.62), Inches(4.62), w=Inches(2.62))
    _, tf = textbox(s, SW - M - Inches(3.9), Inches(4.16), Inches(3.9),
                    Inches(0.3))
    para(tf, True, text="партнёр круглого стола", size=9.5, color=MAGENTA_HI,
         font=F_BOLD, bold=True, caps=True, spacing=2.0,
         align=PP_ALIGN.RIGHT)

    footer(s, source=source, page=None, dark=True, partner=False)
    return s


# --------------------------------------------------------------- divider ----
def slide_divider(prs, num, kicker, text, lead, num_label=None):
    s = blank(prs)
    bg_gradient(s, VIOLET_DEEP, VIOLET, angle=20)
    hero_rings(s, Inches(11.2), Inches(4.5), sizes=(6.2, 4.7, 3.3),
               color=MAGENTA_HI, alpha=0.26)
    rect(s, Inches(0), Inches(0), Inches(0.10), SH, MAGENTA)

    _, tf = textbox(s, M, Inches(1.72), Inches(4.0), Inches(2.6))
    para(tf, True, text=num, size=118, color=VIOLET_SOFT, font=F_HEAD,
         bold=True, line=0.9)

    _, tf = textbox(s, M, Inches(3.34), Inches(8.3), Inches(0.3))
    para(tf, True, text=kicker, size=10.5, color=MAGENTA_HI, font=F_BOLD,
         bold=True, caps=True, spacing=2.4)

    _, tf = textbox(s, M, Inches(3.74), Inches(8.6), Inches(1.5))
    para(tf, True, text=text, size=36, color=WHITE, font=F_HEAD, bold=True,
         line=1.03)

    rect(s, M, Inches(5.28), Inches(1.7), Inches(0.05), MAGENTA)

    _, tf = textbox(s, M, Inches(5.62), Inches(8.2), Inches(0.9))
    para(tf, True, text=lead, size=13.5, color=LILAC_3, font=F_BOLD, line=1.35)

    if num_label:
        _, tf = textbox(s, SW - M - Inches(4.0), Inches(0.62), Inches(4.0),
                        Inches(0.3))
        para(tf, True, text=num_label, size=10, color=VIOLET_SOFT, font=F_BOLD,
             bold=True, caps=True, spacing=2.0, align=PP_ALIGN.RIGHT)
    return s


# --------------------------------------------------------------- metrics ----
def slide_metrics(prs, kicker, text, metrics, note=None, source=None,
                  num=None, lead=None):
    """metrics: list of (value, unit, caption). note: (label, text)."""
    s = page(prs, kicker, text, source=source, num=num)
    top = Inches(2.02)
    if lead:
        _, tf = textbox(s, M, Inches(1.92), Inches(11.0), Inches(0.4))
        para(tf, True, text=lead, size=14, color=SLATE, font=F_BOLD, line=1.3)
        top = Inches(2.52)

    n = len(metrics)
    gap = Inches(0.20)
    cw = int((CW - gap * (n - 1)) / n)
    note_h = Inches(1.46)
    bottom = FOOT_Y - Inches(0.28)
    ch = (bottom - note_h - Inches(0.28) - top) if note else (bottom - top)

    for i, m in enumerate(metrics):
        val, unit, cap = (m if len(m) == 3 else (m[0], "", m[1]))
        x = M + i * (cw + gap)
        card = rect(s, x, top, cw, ch, WHITE,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.045)
        soft_shadow(card, blur=16, dist=4, alpha=0.09)
        acc = ACCENTS[i % len(ACCENTS)]
        rect(s, x + Inches(0.26), top + Inches(0.30), Inches(0.42),
             Inches(0.055), acc)
        base_v = {1: 52, 2: 46, 3: 40}.get(n, 34 if n == 4 else 28)
        vsize = base_v if len(val) <= 6 else (
            base_v - 5 if len(val) <= 9 else base_v - 10)
        _, tf = textbox(s, x + Inches(0.26), top + Inches(0.60),
                        cw - Inches(0.52), Inches(0.86))
        para(tf, True, text=val, size=vsize, color=NAVY, font=F_HEAD,
             bold=True, line=1.0)
        if unit:
            _, tf = textbox(s, x + Inches(0.26), top + Inches(1.30),
                            cw - Inches(0.52), Inches(0.34))
            para(tf, True, text=unit, size=12, color=acc, font=F_BOLD,
                 bold=True, caps=True, spacing=1.2)
        _, tf = textbox(s, x + Inches(0.26), top + Inches(1.76),
                        cw - Inches(0.52), ch - Inches(2.06),
                        anchor=MSO_ANCHOR.BOTTOM)
        para(tf, True, text=cap, size=11.5, color=SLATE, font=F_BOLD,
             line=1.32)

    if note:
        ntop = bottom - note_h
        rect(s, M, ntop, CW, note_h, VIOLET_DEEP,
             shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.09)
        rect(s, M, ntop + Inches(0.30), Inches(0.075), note_h - Inches(0.60),
             MAGENTA)
        _, tf = textbox(s, M + Inches(0.44), ntop + Inches(0.30),
                        CW - Inches(1.0), Inches(0.3))
        para(tf, True, text=note[0], size=9.5, color=MAGENTA_HI, font=F_BOLD,
             bold=True, caps=True, spacing=1.8)
        _, tf = textbox(s, M + Inches(0.44), ntop + Inches(0.66),
                        CW - Inches(1.0), Inches(0.62))
        para(tf, True, text=note[1], size=15, color=WHITE, font=F_SER,
             italic=True, line=1.28)
    return s


# ------------------------------------------------------------------ rows ----
def slide_rows(prs, kicker, text, rows, source=None, num=None, lead=None,
               accent_last=True):
    """rows: list of (label, body). Last row optionally highlighted."""
    s = page(prs, kicker, text, source=source, num=num)
    top = Inches(2.00)
    if lead:
        _, tf = textbox(s, M, Inches(1.90), Inches(11.4), Inches(0.4))
        para(tf, True, text=lead, size=14, color=SLATE, font=F_BOLD, line=1.3)
        top = Inches(2.46)

    n = len(rows)
    avail = FOOT_Y - Inches(0.26) - top
    gap = Inches(0.14)
    rh = int((avail - gap * (n - 1)) / n)
    lab_w = Inches(3.35)

    for i, (label, body) in enumerate(rows):
        y = top + i * (rh + gap)
        last = accent_last and i == n - 1
        bgc = VIOLET_DEEP if last else WHITE
        card = rect(s, M, y, CW, rh, bgc,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.10)
        soft_shadow(card, blur=14, dist=3, alpha=0.08 if not last else 0.16)
        acc = MAGENTA_HI if last else ACCENTS[i % len(ACCENTS)]
        rect(s, M, y + int(rh * 0.20), Inches(0.075), int(rh * 0.60), acc)
        lsize = 15 if len(label) <= 24 else (13.5 if len(label) <= 34 else 12.5)
        _, tf = textbox(s, M + Inches(0.40), y, lab_w, rh,
                        anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=label, size=lsize,
             color=WHITE if last else NAVY, font=F_HEAD, bold=True, line=1.12)
        bsize = 13 if len(body) <= 155 else 12
        _, tf = textbox(s, M + Inches(0.40) + lab_w, y, CW - lab_w -
                        Inches(0.86), rh, anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=body, size=bsize,
             color=LILAC_2 if last else SLATE,
             font=F_SER if last else F_BOLD, italic=last, line=1.32)
    return s


# ------------------------------------------------------------------ grid ----
def slide_grid(prs, kicker, text, cards, source=None, num=None, lead=None,
               footnote=None):
    """cards: list of (label, body) rendered as equal columns."""
    s = page(prs, kicker, text, source=source, num=num)
    top = Inches(2.02)
    if lead:
        _, tf = textbox(s, M, Inches(1.92), Inches(11.2), Inches(0.4))
        para(tf, True, text=lead, size=14, color=SLATE, font=F_BOLD, line=1.3)
        top = Inches(2.50)
    bottom = FOOT_Y - Inches(0.26)
    if footnote:
        bottom -= Inches(0.92)
    n = len(cards)
    gap = Inches(0.20)
    cw = int((CW - gap * (n - 1)) / n)
    ch = min(bottom - top, Inches(3.30))
    top = top + int(((bottom - top) - ch) / 2)

    for i, (label, body) in enumerate(cards):
        x = M + i * (cw + gap)
        card = rect(s, x, top, cw, ch, WHITE,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.05)
        soft_shadow(card, blur=16, dist=4, alpha=0.09)
        acc = ACCENTS[i % len(ACCENTS)]
        rect(s, x + Inches(0.28), top + Inches(0.34), Inches(0.42),
             Inches(0.055), acc)
        _, tf = textbox(s, x + Inches(0.28), top + Inches(0.62),
                        cw - Inches(0.56), Inches(0.8))
        para(tf, True, text=label, size=17, color=NAVY, font=F_HEAD,
             bold=True, line=1.08)
        _, tf = textbox(s, x + Inches(0.28), top + Inches(1.44),
                        cw - Inches(0.56), ch - Inches(1.72))
        para(tf, True, text=body, size=12, color=SLATE, font=F_BOLD,
             line=1.36)

    if footnote:
        y = bottom + Inches(0.26)
        rect(s, M, y, CW, Inches(0.66), VIOLET_DEEP,
             shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.20)
        rect(s, M, y + Inches(0.13), Inches(0.075), Inches(0.40), MAGENTA)
        _, tf = textbox(s, M + Inches(0.42), y, CW - Inches(0.9), Inches(0.66),
                        anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=footnote, size=14, color=WHITE, font=F_SER,
             italic=True, line=1.2)
    return s


# ------------------------------------------------------------------ bars ----
def slide_bars(prs, kicker, text, bars, source=None, num=None, lead=None,
               footnote=None, unit="трлн руб."):
    """bars: list of (label, value, delta_text)."""
    s = page(prs, kicker, text, source=source, num=num)
    top = Inches(2.12)
    if lead:
        _, tf = textbox(s, M, Inches(1.92), Inches(11.2), Inches(0.4))
        para(tf, True, text=lead, size=14, color=SLATE, font=F_BOLD, line=1.3)
        top = Inches(2.46)

    vmax = max(v for _, v, _ in bars)
    lab_w = Inches(3.05)
    val_w = Inches(2.20)
    track = CW - lab_w - val_w
    n = len(bars)
    rh = Inches(0.80)
    gap = Inches(0.32)

    for i, (label, value, delta) in enumerate(bars):
        y = top + i * (rh + gap)
        _, tf = textbox(s, M, y + Inches(0.10), lab_w - Inches(0.3),
                        Inches(0.5))
        para(tf, True, text=label, size=16, color=NAVY, font=F_HEAD,
             bold=True, line=1.1)
        bx = M + lab_w
        rect(s, bx, y + Inches(0.14), track, Inches(0.44), LILAC_2,
             shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5)
        w = int(track * value / vmax)
        bar = rect(s, bx, y + Inches(0.14), w, Inches(0.44), ACCENTS[i % 3],
                   shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5)
        soft_shadow(bar, blur=12, dist=3, alpha=0.14)
        _, tf = textbox(s, bx + track + Inches(0.22), y + Inches(0.14),
                        val_w - Inches(0.22), Inches(0.5))
        para(tf, True, text="%s %s" % (("%.1f" % value).replace(".", ","),
                                       unit),
             size=15, color=NAVY, font=F_HEAD, bold=True)
        _, tf = textbox(s, bx, y + Inches(0.62), track, Inches(0.3))
        para(tf, True, text=delta, size=11, color=SLATE, font=F_BOLD)

    if footnote:
        y = FOOT_Y - Inches(0.92)
        rect(s, M, y, CW, Inches(0.66), VIOLET_DEEP,
             shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.20)
        rect(s, M, y + Inches(0.13), Inches(0.075), Inches(0.40), MAGENTA)
        _, tf = textbox(s, M + Inches(0.42), y, CW - Inches(0.9), Inches(0.66),
                        anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=footnote, size=14, color=WHITE, font=F_SER,
             italic=True, line=1.2)
    return s


# ------------------------------------------------------------- questions ----
def slide_questions(prs, kicker, text, questions, source=None, num=None,
                    lead=None):
    s = blank(prs)
    bg_gradient(s, VIOLET_DEEP, VIOLET, angle=25)
    hero_rings(s, Inches(12.2), Inches(1.3), sizes=(5.4, 4.0, 2.7),
               color=MAGENTA_HI, alpha=0.22)
    head(s, kicker, text, dark=True)
    footer(s, source=source, page=num, dark=True)

    top = Inches(2.12)
    n = len(questions)
    avail = FOOT_Y - Inches(0.30) - top
    gap = Inches(0.13)
    rh = int((avail - gap * (n - 1)) / n)
    for i, q in enumerate(questions):
        y = top + i * (rh + gap)
        card = rect(s, M, y, CW, rh, WHITE,
                    shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.12, alpha=0.07)
        no_line(card)
        rect(s, M, y + int(rh * 0.22), Inches(0.075), int(rh * 0.56),
             MAGENTA_HI)
        _, tf = textbox(s, M + Inches(0.42), y, Inches(0.7), rh,
                        anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text="%02d" % (i + 1), size=18, color=MAGENTA_HI,
             font=F_HEAD, bold=True)
        _, tf = textbox(s, M + Inches(1.18), y, CW - Inches(1.8), rh,
                        anchor=MSO_ANCHOR.MIDDLE)
        para(tf, True, text=q, size=15, color=WHITE, font=F_SER, italic=True,
             line=1.26)
    return s
