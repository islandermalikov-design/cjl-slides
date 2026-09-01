#!/usr/bin/env python3
"""Build the full 36-slide Algoritm deck as native PPTX."""
import math
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.oxml.ns import qn
from lxml import etree

PRIMARY = RGBColor(0x93, 0x40, 0x2B)
ACCENT = RGBColor(0x5A, 0x24, 0x17)
DEEPEST = RGBColor(0x3D, 0x16, 0x0E)
SECONDARY = RGBColor(0x14, 0x12, 0x12)
GREY_BG = RGBColor(0xF1, 0xEF, 0xEE)
STEEL = RGBColor(0xE7, 0xE9, 0xEA)
STEEL_DARK = RGBColor(0x38, 0x3D, 0x42)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
INK = RGBColor(0x14, 0x12, 0x12)
INK_MUTED = RGBColor(0x5A, 0x57, 0x57)
WHITE_MUTED = RGBColor(0xC9, 0xC4, 0xC4)
PINK = RGBColor(0xD9, 0xA8, 0x8F)
RULE = RGBColor(0xD8, 0xD4, 0xD3)
RULE_DARK = RGBColor(0x3A, 0x37, 0x37)
ROW_TINT = RGBColor(0xF3, 0xE9, 0xE6)

FONT = "DM Sans"
A = "assets/"
LOGO_COLOR = A + "logo.png"
LOGO_WHITE = A + "logo-white.png"
LOGO_ASPECT = 339 / 202

SW, SH = Inches(13.333), Inches(7.5)
ML, MR, MT = Inches(0.6), Inches(0.6), Inches(0.5)

prs = Presentation()
prs.slide_width = SW
prs.slide_height = SH
BLANK = prs.slide_layouts[6]

_img_size_cache = {}


def img_size(path):
    if path not in _img_size_cache:
        with Image.open(path) as im:
            _img_size_cache[path] = im.size
    return _img_size_cache[path]


def slide():
    return prs.slides.add_slide(BLANK)


def rect(s, l, t, w, h, color=None):
    shp = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    shp.shadow.inherit = False
    if color is not None:
        shp.fill.solid()
        shp.fill.fore_color.rgb = color
    else:
        shp.fill.background()
    shp.line.fill.background()
    return shp


def add_shadow(shape, blur=90000, dist=26000, alpha=24000, color="1A1815", direction=5400000):
    spPr = shape._element.spPr
    existing = spPr.find(qn("a:effectLst"))
    if existing is not None:
        spPr.remove(existing)
    effect_lst = etree.SubElement(spPr, qn("a:effectLst"))
    outer = etree.SubElement(effect_lst, qn("a:outerShdw"))
    outer.set("blurRad", str(blur))
    outer.set("dist", str(dist))
    outer.set("dir", str(direction))
    outer.set("rotWithShape", "0")
    clr = etree.SubElement(outer, qn("a:srgbClr"))
    clr.set("val", color)
    a = etree.SubElement(clr, qn("a:alpha"))
    a.set("val", str(alpha))


def gradient_rect(s, l, t, w, h, c1, c2, angle=45):
    shp = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    shp.shadow.inherit = False
    shp.line.fill.background()
    shp.fill.gradient()
    stops = shp.fill.gradient_stops
    stops[0].position = 0.0
    stops[0].color.rgb = c1
    stops[-1].position = 1.0
    stops[-1].color.rgb = c2
    try:
        shp.fill.gradient_angle = angle
    except Exception:
        pass
    return shp


def connector(s, x1, y1, x2, y2, color, dashed=False, width=1.0):
    ln = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
    ln.shadow.inherit = False
    ln.line.color.rgb = color
    ln.line.width = Pt(width)
    if dashed:
        ln.line.dash_style = MSO_LINE_DASH_STYLE.DASH
    return ln


def textbox(s, l, t, w, h, anchor=MSO_ANCHOR.TOP, wrap=True):
    tb = s.shapes.add_textbox(l, t, w, h)
    tf = tb.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    return tb, tf


def add_para(tf, text, size, color, bold=False, align=PP_ALIGN.LEFT, first=False,
             space_after=0, spacing=1.0, font=FONT, letter_caps=False):
    p = tf.paragraphs[0] if first and not tf.paragraphs[0].runs else tf.add_paragraph()
    p.alignment = align
    p.line_spacing = spacing
    p.space_after = Pt(space_after)
    p.space_before = Pt(0)
    run = p.add_run()
    run.text = text.upper() if letter_caps else text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.name = font
    run.font.color.rgb = color
    return p


def picture_h(s, path, l, t, height):
    width = Emu(int(height * LOGO_ASPECT))
    return s.shapes.add_picture(path, l, t, height=height, width=width)


def photo_box(s, l, t, w, h, path, caption=None, cap_size=9, pad=Inches(0.07)):
    mat = rect(s, l, t, w, h, STEEL)
    add_shadow(mat)
    inner_l, inner_t = l + pad, t + pad
    inner_w, inner_h = w - Emu(int(pad * 2)), h - Emu(int(pad * 2))
    iw, ih = img_size(path)
    box_ar = inner_w / inner_h
    img_ar = iw / ih
    if img_ar > box_ar:
        dw = inner_w
        dh = Emu(int(inner_w / img_ar))
    else:
        dh = inner_h
        dw = Emu(int(inner_h * img_ar))
    dl = inner_l + Emu(int((inner_w - dw) / 2))
    dt = inner_t + Emu(int((inner_h - dh) / 2))
    s.shapes.add_picture(path, dl, dt, width=dw, height=dh)
    if caption:
        cap_h = Inches(0.3)
        cap_t = dt + dh - cap_h
        cb = rect(s, dl, cap_t, dw, cap_h, SECONDARY)
        tf = cb.text_frame
        tf.margin_left = Inches(0.08); tf.margin_right = Inches(0.08)
        tf.margin_top = 0; tf.margin_bottom = 0
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        tf.word_wrap = True
        add_para(tf, caption, cap_size, WHITE, bold=True, first=True, spacing=1.05)
    return dl, dt, dw, dh


def data_table(s, l, t, w, headers, rows, col_widths=None, header_h=0.42, row_h=0.4, font_size=11):
    nrows = len(rows) + 1
    ncols = len(headers)
    total_h = Inches(header_h + row_h * len(rows))
    gframe = s.shapes.add_table(nrows, ncols, l, t, w, total_h)
    table = gframe.table
    table.first_row = False
    table.horz_banding = False
    if col_widths:
        for i, cw in enumerate(col_widths):
            table.columns[i].width = Inches(cw)
    table.rows[0].height = Inches(header_h)
    for r in range(1, nrows):
        table.rows[r].height = Inches(row_h)

    def style_cell(cell, text, bg, color, bold, size):
        cell.fill.solid()
        cell.fill.fore_color.rgb = bg
        tf = cell.text_frame
        tf.margin_left = Inches(0.09); tf.margin_right = Inches(0.05)
        tf.margin_top = 0; tf.margin_bottom = 0
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        run = p.add_run()
        run.text = text
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.name = FONT
        run.font.color.rgb = color

    for c, htext in enumerate(headers):
        style_cell(table.cell(0, c), htext.upper(), SECONDARY, WHITE, True, font_size - 1.5)
    for r, row in enumerate(rows, start=1):
        bg = ROW_TINT if r % 2 == 0 else WHITE
        for c, val in enumerate(row):
            style_cell(table.cell(r, c), str(val), bg, INK, False, font_size)
    return gframe


def tile_grid(s, l, t, w, h, items, cols, on_dark=False, gap=0.12):
    n = len(items)
    rows = math.ceil(n / cols)
    gp = Inches(gap)
    cw = Emu(int((w - gp * (cols - 1)) / cols))
    ch = Emu(int((h - gp * (rows - 1)) / rows)) if rows > 1 else h
    for i, item in enumerate(items):
        head, body = item if isinstance(item, tuple) else (item, None)
        r = i // cols
        c = i % cols
        x = l + Emu(int(c * (cw + gp)))
        y = t + Emu(int(r * (ch + gp)))
        bg = RGBColor(0x22, 0x20, 0x20) if on_dark else GREY_BG
        rect(s, x, y, cw, ch, bg)
        rect(s, x, y, Inches(0.03), ch, PRIMARY)
        _, tf = textbox(s, x + Inches(0.13), y, cw - Inches(0.24), ch, anchor=MSO_ANCHOR.MIDDLE)
        add_para(tf, head, 11.5, WHITE if on_dark else INK, bold=True, first=True, spacing=1.08,
                 space_after=(3 if body else 0))
        if body:
            add_para(tf, body, 9.5, WHITE_MUTED if on_dark else INK_MUTED, spacing=1.25)
    return t + h


def feat_list(s, l, t, w, items, on_dark=False, row_h=0.95):
    y = t
    rh = Inches(row_h)
    for head, body in items:
        rect(s, l, y, Inches(0.035), rh - Inches(0.15), PRIMARY if not on_dark else PINK)
        _, tf = textbox(s, l + Inches(0.16), y, w - Inches(0.16), rh)
        add_para(tf, head, 12.5, PRIMARY if not on_dark else RGBColor(0xF0, 0x95, 0x8D),
                 bold=True, first=True, spacing=1.08, space_after=2)
        add_para(tf, body, 10.5, WHITE_MUTED if on_dark else INK_MUTED, spacing=1.28)
        y = y + rh
    return y


def stat_row(s, l, t, w, items, cols, on_dark=False, num_size=26, cap_size=9.5, row_h=1.35):
    n = len(items)
    gap = Inches(0.28)
    cw = Emu(int((w - gap * (cols - 1)) / cols))
    for i, (num, cap) in enumerate(items):
        r = i // cols
        c = i % cols
        x = l + Emu(int(c * (cw + gap)))
        y = t + Emu(int(r * Inches(row_h)))
        rect(s, x, y, cw, Pt(2.2), RULE_DARK if on_dark else RULE)
        _, tf = textbox(s, x, y + Inches(0.1), cw, Inches(0.5))
        add_para(tf, num, num_size, WHITE if on_dark else PRIMARY, bold=True, first=True)
        _, tf = textbox(s, x, y + Inches(0.62), cw, Inches(0.65))
        add_para(tf, cap, cap_size, WHITE_MUTED if on_dark else INK_MUTED, first=True, spacing=1.24)


def tag_row(s, l, t, tags, on_dark=False, max_w=None, size=10):
    x = l
    y = t
    h = Inches(0.36)
    for tag in tags:
        tw = Inches(0.28 + 0.085 * len(tag))
        if max_w is not None and (x + tw - l) > max_w:
            x = l
            y = y + h + Inches(0.12)
        box = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, tw, h)
        box.shadow.inherit = False
        box.fill.background()
        box.line.color.rgb = RGBColor(0x5A, 0x56, 0x56) if on_dark else RGBColor(0x8A, 0x86, 0x85)
        box.line.width = Pt(0.75)
        tf = box.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        tf.margin_left = Inches(0.08); tf.margin_right = Inches(0.08)
        add_para(tf, tag, size, WHITE if on_dark else INK, bold=True, align=PP_ALIGN.CENTER, first=True)
        x = x + tw + Inches(0.12)
    return y + h


def kicker(s, l, t, w, text, color):
    _, tf = textbox(s, l, t, w, Inches(0.28))
    add_para(tf, text, 10.5, color, bold=True, first=True, letter_caps=True)


def page_head(s, kick, title, sub=None, on_dark=False, title_size=21, kick_color=None):
    kicker(s, ML, MT, Inches(9), kick, kick_color or (RGBColor(0xF0, 0xC3, 0xBF) if on_dark else PRIMARY))
    _, tf = textbox(s, ML, MT + Inches(0.32), Inches(11.5), Inches(0.9))
    add_para(tf, title, title_size, WHITE if on_dark else INK, bold=True, first=True, spacing=1.02)
    y = MT + Inches(0.32) + Inches(0.45 if len(title) < 55 else 0.8)
    if sub:
        _, tf = textbox(s, ML, y, Inches(11.5), Inches(0.55))
        add_para(tf, sub, 11.5, WHITE_MUTED if on_dark else INK_MUTED, first=True, spacing=1.25)
        y = y + Inches(0.55)
    return y + Inches(0.15)


_page_counter = [0]


def page_no(s, on_dark=False):
    _page_counter[0] += 1
    text = f"{_page_counter[0]:02d}"
    _, tf = textbox(s, Inches(11.9), Inches(6.95), Inches(1.1), Inches(0.35))
    add_para(tf, text, 10, WHITE_MUTED if on_dark else INK_MUTED, bold=True, align=PP_ALIGN.RIGHT, first=True)


def divider_slide(title_lines):
    s = slide()
    rect(s, 0, 0, SW, SH, STEEL_DARK)
    diamond = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(7.0), Inches(-3.0), Inches(9.5), Inches(9.5))
    diamond.rotation = 45
    diamond.shadow.inherit = False
    diamond.line.fill.background()
    diamond.fill.gradient()
    dstops = diamond.fill.gradient_stops
    dstops[0].position = 0.0
    dstops[0].color.rgb = PRIMARY
    dstops[-1].position = 1.0
    dstops[-1].color.rgb = STEEL_DARK
    try:
        diamond.fill.gradient_angle = 135
    except Exception:
        pass
    rect(s, Inches(0.6), Inches(3.35), Inches(1.0), Pt(3.2), PRIMARY)
    _, tf = textbox(s, Inches(0.6), Inches(3.6), Inches(8.5), Inches(2.2))
    for i, line in enumerate(title_lines):
        add_para(tf, line, 30, WHITE, bold=True, first=(i == 0), spacing=1.03)
    picture_h(s, LOGO_WHITE, Inches(11.75), Inches(0.5), Inches(0.62))
    return s


def gateway_diagram(s, bx, by, bw, bh, wireless, gateway_label, protocol_label, sensor_label="",
                     server_label="LAN", server_cap="Локальная сеть", n_sensors=3, gw_fill=None, srv_fill=None):
    line_color = PRIMARY if wireless else RGBColor(0x6E, 0x6A, 0x69)
    bh_half = Emu(int(bh / 2))
    mid_y = by + bh_half
    sensor_x = bx + Inches(0.28)
    sensor_r = Inches(0.07)
    if n_sensors == 3:
        sensor_ys = [by + Inches(0.12), mid_y, by + bh - Inches(0.12)]
    else:
        span = bh - Inches(0.24)
        sensor_ys = [by + Inches(0.12) + Emu(int(span * i / (n_sensors - 1))) for i in range(n_sensors)]

    gw_w, gw_h = Inches(1.15), Inches(0.46)
    gw_x = bx + Inches(1.0)
    gw_y = mid_y - Emu(int(gw_h / 2))

    srv_w, srv_h = Inches(1.15), Inches(0.46)
    srv_x = bx + bw - srv_w - Inches(0.12)
    srv_y = mid_y - Emu(int(srv_h / 2))

    for sy in sensor_ys:
        connector(s, sensor_x + sensor_r, sy, gw_x, mid_y, line_color, dashed=wireless, width=1.1)
    for sy in sensor_ys:
        dot = s.shapes.add_shape(MSO_SHAPE.OVAL, sensor_x, sy - sensor_r, sensor_r * 2, sensor_r * 2)
        dot.shadow.inherit = False
        dot.fill.solid(); dot.fill.fore_color.rgb = SECONDARY
        dot.line.fill.background()

    if sensor_label:
        _, tf = textbox(s, sensor_x - Inches(0.4), by + bh - Inches(0.01), Inches(1.1), Inches(0.2))
        add_para(tf, sensor_label, 6.2, INK_MUTED, align=PP_ALIGN.CENTER, first=True)

    _, tf = textbox(s, gw_x - Inches(0.25), gw_y - Inches(0.2), gw_w + Inches(0.5), Inches(0.18))
    add_para(tf, protocol_label, 6.2, INK_MUTED, align=PP_ALIGN.CENTER, first=True)

    gbox = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, gw_x, gw_y, gw_w, gw_h)
    gbox.shadow.inherit = False
    gbox.fill.solid(); gbox.fill.fore_color.rgb = gw_fill or (line_color if wireless else SECONDARY)
    gbox.line.fill.background()
    try:
        gbox.adjustments[0] = 0.18
    except Exception:
        pass
    tf = gbox.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    add_para(tf, gateway_label, 9.5, WHITE, bold=True, align=PP_ALIGN.CENTER, first=True)

    connector(s, gw_x + gw_w, mid_y, srv_x, mid_y, srv_fill or (PRIMARY if not wireless else SECONDARY), width=1.1)

    sbox = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, srv_x, srv_y, srv_w, srv_h)
    sbox.shadow.inherit = False
    sbox.fill.solid(); sbox.fill.fore_color.rgb = srv_fill or (PRIMARY if not wireless else SECONDARY)
    sbox.line.fill.background()
    try:
        sbox.adjustments[0] = 0.18
    except Exception:
        pass
    tf = sbox.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    add_para(tf, server_label, 9, WHITE, bold=True, align=PP_ALIGN.CENTER, first=True)
    _, tf = textbox(s, srv_x - Inches(0.3), srv_y + srv_h + Inches(0.02), srv_w + Inches(0.6), Inches(0.18))
    add_para(tf, server_cap, 6.2, INK_MUTED, align=PP_ALIGN.CENTER, first=True)


def bar_chart(s, x, y, w, h, title_lines, categories, values, bar_color, first_color, cat_color, val_color):
    _, tf = textbox(s, x, y, w, Inches(0.5))
    add_para(tf, title_lines[0], 11.5, val_color, bold=True, first=True, spacing=1.15, space_after=1)
    for extra in title_lines[1:]:
        add_para(tf, extra, 11.5, val_color, bold=True, spacing=1.15)

    title_h = Inches(0.15) * len(title_lines) + Inches(0.35)
    top = y + title_h
    y_base = y + h - Inches(0.32)
    avail_h = y_base - top - Inches(0.28)
    max_val = max(values)

    connector(s, x, y_base, x + w, y_base, RGBColor(0x8A, 0x86, 0x85), width=0.75)

    n = len(values)
    slot_w = Emu(int(w / n))
    bar_w = Emu(int(slot_w * 0.5))
    for i, (cat, val) in enumerate(zip(categories, values)):
        bar_h = Emu(int(avail_h * (val / max_val)))
        slot_x = x + Emu(slot_w * i)
        bar_x = slot_x + Emu(int((slot_w - bar_w) / 2))
        bar_y = y_base - bar_h
        color = first_color if i == 0 else bar_color
        rect(s, bar_x, bar_y, bar_w, bar_h, color)
        _, tf = textbox(s, bar_x - Inches(0.15), bar_y - Inches(0.28), bar_w + Inches(0.3), Inches(0.24))
        add_para(tf, f"{val}%", 11, color, bold=True, align=PP_ALIGN.CENTER, first=True)
        _, tf = textbox(s, slot_x, y_base + Inches(0.05), slot_w, Inches(0.3))
        add_para(tf, cat, 8, cat_color, bold=True, align=PP_ALIGN.CENTER, first=True, spacing=1.1)


# ============================================================ SLIDE 1 — COVER
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
gradient_rect(s, Inches(6.13), 0, Inches(7.2), SH, PRIMARY, ACCENT, angle=115)
picture_h(s, LOGO_COLOR, Inches(0.6), Inches(0.55), Inches(0.95))
rect(s, Inches(0.6), Inches(1.75), Inches(0.85), Inches(0.05), PRIMARY)
_, tf = textbox(s, Inches(0.6), Inches(2.0), Inches(5.1), Inches(2.7))
add_para(tf, "Предиктивное обслуживание и решения", 33, INK, bold=True, first=True, spacing=0.98)
add_para(tf, "для горнодобывающей", 33, INK, bold=True, spacing=0.98)
add_para(tf, "промышленности", 33, INK, bold=True, spacing=0.98)
_, tf = textbox(s, Inches(0.6), Inches(4.75), Inches(4.8), Inches(0.7))
add_para(tf, "ООО «Алгоритм» · Красноярск", 12.5, INK_MUTED, first=True, spacing=1.3)
add_para(tf, "Комплексный подход к решению задач", 12.5, INK_MUTED, spacing=1.3)
_, tf = textbox(s, Inches(7.8), Inches(5.2), Inches(5.1), Inches(1.2), anchor=MSO_ANCHOR.BOTTOM)
add_para(tf, "Прогнозное техническое обслуживание оборудования на базе промышленного мониторинга",
         14.5, WHITE, bold=True, align=PP_ALIGN.RIGHT, first=True, spacing=1.25)
_, tf = textbox(s, Inches(7.8), Inches(6.55), Inches(5.1), Inches(0.35))
add_para(tf, "Коммерческое предложение", 10.5, WHITE_MUTED, align=PP_ALIGN.RIGHT, first=True, letter_caps=True)
page_no(s, on_dark=True)

# ============================================================ SLIDE 2 — ACHIEVEMENTS (moved to front)
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Результаты внедрения", "Измеримые результаты предиктивного обслуживания",
              "Совокупный эффект от внедрения технологии на промышленных объектах — снижение затрат "
              "на техническое обслуживание оценивается в 4 000 000 $.", title_size=21)
hero_stats = [
    ("−57%", "отказов механического оборудования"),
    ("−80%", "времени простоя из-за механических отказов"),
    ("−37%", "затрат на аутсорсинг технического обслуживания"),
]
hw = Inches(3.85)
gap = Inches(0.3)
for i, (num, cap) in enumerate(hero_stats):
    x = ML + Emu(int(i * (hw + gap)))
    rect(s, x, y + Inches(0.15), hw, Pt(2.8), PRIMARY)
    _, tf = textbox(s, x, y + Inches(0.3), hw, Inches(1.1))
    add_para(tf, num, 44, PRIMARY, bold=True, first=True)
    _, tf = textbox(s, x, y + Inches(1.35), hw, Inches(0.6))
    add_para(tf, cap, 13.5, INK, bold=True, first=True, spacing=1.25)
    _, tf = textbox(s, x, y + Inches(2.05), hw, Inches(0.9))
    add_para(tf, "Данные подтверждены на основе анализа 34 000+ успешных кейсов в горнодобывающей отрасли.",
             9, RGBColor(0x8A, 0x86, 0x85), first=True, spacing=1.35)
picture_h(s, LOGO_COLOR, Inches(11.75), Inches(0.5), Inches(0.55))
page_no(s)

# ============================================================ SLIDE 3 — ABOUT
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
rect(s, 0, 0, SW, Inches(2.4), STEEL_DARK)
kicker(s, ML, Inches(0.4), Inches(5), "О компании", PRIMARY)
_, tf = textbox(s, ML, Inches(0.76), Inches(10.5), Inches(1.4))
add_para(tf, "ООО «Алгоритм» — ваш партнер в цифровизации", 22, WHITE, bold=True, first=True, spacing=1.02)
add_para(tf, "промышленности", 22, WHITE, bold=True, spacing=1.02)
cols = [
    (ML, None, "Мы предлагаем полный цикл внедрения систем прогнозного технического обслуживания: "
     "от аудита оборудования и подбора аппаратных решений до развертывания программного "
     "обеспечения и обучения персонала.", SECONDARY),
    (Inches(4.05), "Индивидуальный подход",
     "Адаптируем решения под специфику конкретного предприятия и отрасли.", PRIMARY),
    (Inches(7.15), "Экспертная поддержка",
     "Обеспечиваем консалтинг и сопровождение на всех этапах жизненного цикла системы.", PRIMARY),
    (Inches(10.25), "Мировые стандарты",
     "Опираемся на проверенную технологическую базу, успешно зарекомендовавшую себя на "
     "крупнейших промышленных объектах.", PRIMARY),
]
col_w = Inches(2.85)
top_y = Inches(2.85)
for l, heading, body, rule_color in cols:
    rect(s, l, top_y, col_w, Pt(2.5), rule_color)
    y = top_y + Inches(0.18)
    _, tf = textbox(s, l, y, col_w, Inches(3.2))
    first = True
    if heading:
        add_para(tf, heading, 14, PRIMARY, bold=True, first=True, spacing=1.1, space_after=6)
        first = False
    add_para(tf, body, 12, INK_MUTED if heading else INK, first=first, spacing=1.32)
picture_h(s, LOGO_COLOR, ML, Inches(6.6), Inches(0.5))
page_no(s)

# ============================================================ SLIDE 4 — SCALE & TECH BASE (merged 3+4+26)
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Технологическая база", "Масштаб и технологическая база платформы", title_size=21)
connector(s, Inches(6.67), y, Inches(6.67), Inches(7.0), RULE, width=0.75)

col_x = [ML, Inches(6.95)]
col_headings = ["Масштаб внедрения", "Научный потенциал платформы"]
col_stats = [
    [("882 000+", "установленных датчиков на промышленных объектах по всему миру"),
     ("188 000+", "единиц оборудования на платформе онлайн-мониторинга"),
     ("3.0 ТБ+", "данных телеметрии обрабатывается ежедневно")],
    [("42%", "специалистов НИОКР в общей численности персонала платформы"),
     ("250+", "патентов и зарегистрированных технологических решений"),
     ("35+", "стран внедрения технологии, 800+ сотрудников платформы")],
]
for cx, heading, stats in zip(col_x, col_headings, col_stats):
    kicker(s, cx, y, Inches(5.5), heading, PRIMARY)
    yy = y + Inches(0.4)
    for num, cap in stats:
        rect(s, cx, yy, Inches(5.6), Pt(2), RULE)
        _, tf = textbox(s, cx, yy + Inches(0.1), Inches(5.6), Inches(0.75))
        add_para(tf, num, 26, INK, bold=True, first=True)
        _, tf = textbox(s, cx, yy + Inches(0.78), Inches(5.6), Inches(0.55))
        add_para(tf, cap, 11, INK_MUTED, first=True, spacing=1.25)
        yy = yy + Inches(1.25)
picture_h(s, LOGO_COLOR, Inches(11.75), Inches(0.5), Inches(0.55))
page_no(s)

# ============================================================ SLIDE 5 — APPLICATIONS
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Область применения", "Диагностируемое вращающееся оборудование",
              "Цель — обеспечить долгосрочную надёжную и безопасную эксплуатацию оборудования, "
              "избежать незапланированных простоев и вторичных аварий.", title_size=19)
tile_grid(s, ML, y + Inches(0.1), Inches(12.1), Inches(3.2), [
    ("Мельницы", "Шаровые и полуавтоматические мельницы"),
    ("Компрессоры", "Винтовые и воздушные компрессоры"),
    ("Насосы", "Шламовые и центробежные насосы"),
    ("Конвейеры", "Ленточные конвейеры и приводы"),
    ("Подъёмные машины", "Шахтные подъёмные установки"),
    ("Вентиляторы", "Вентиляторы главного проветривания"),
    ("Дробилки", "Щековые, конусные, роторные дробилки"),
    ("Мостовые краны", "Грузоподъёмное оборудование"),
    ("Прокатные станы", "Металлургическое оборудование"),
    ("Прочее", "Ж/д транспорт, ЦБП, винодельческое и медицинское оборудование"),
], cols=5)
picture_h(s, LOGO_COLOR, Inches(11.75), Inches(0.5), Inches(0.55))
page_no(s)

prs.save("algoritm-full-partial.pptx")
print("saved batch 1 (slides 1-5)")


# ============================================================ SLIDE 6 — ARCHITECTURE
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
page_head(s, "Архитектура", "Архитектура сбора данных: гибкая интеграция в локальную сеть предприятия (LAN)",
          title_size=19)

box_y = Inches(1.7)
box_h = Inches(0.62)
boxes = [("Облачный сервер", Inches(1.3), False), ("Локальный сервер данных", Inches(5.75), True),
         ("Supercare", Inches(10.2), False)]
box_w = Inches(2.3)
for label, x, filled in boxes:
    b = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, box_y, box_w, box_h)
    b.shadow.inherit = False
    b.fill.solid()
    b.fill.fore_color.rgb = PRIMARY if filled else WHITE
    b.line.color.rgb = PRIMARY
    b.line.width = Pt(0) if filled else Pt(1.1)
    tf = b.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    add_para(tf, label, 13, WHITE if filled else INK, bold=True, align=PP_ALIGN.CENTER, first=True)
connector(s, Inches(3.6), box_y + Inches(0.31), Inches(5.75), box_y + Inches(0.31), RGBColor(0x8A, 0x86, 0x85), width=1.2)
connector(s, Inches(8.05), box_y + Inches(0.31), Inches(10.2), box_y + Inches(0.31), RGBColor(0x8A, 0x86, 0x85), width=1.2)

lan_y = Inches(2.85)
lan = rect(s, Inches(0.6), lan_y, Inches(12.1), Inches(0.42), GREY_BG)
tf = lan.text_frame
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
add_para(tf, "Локальная сеть предприятия (LAN)", 12.5, INK, bold=True, align=PP_ALIGN.CENTER, first=True)
connector(s, Inches(6.9), box_y + box_h, Inches(6.9), lan_y, RGBColor(0x8A, 0x86, 0x85), width=1.2)

levels = [
    (Inches(1.65), "Уровень A", "Кабель / оптика / Wi-Fi", "Дробилка, масляный пресс…", False),
    (Inches(6.05), "Уровень Б", "ZigBee / беспроводной шлюз", "Подъёмник, скребок, сушилка…", True),
    (Inches(10.45), "Уровень В", "LoRa / 4G / 5G", "Воздуходувка, насос, компрессор…", True),
]
icon_y = Inches(3.55)
icon_w, icon_h = Inches(0.85), Inches(0.62)
for cx, label, protocol, cap, wireless in levels:
    connector(s, cx, lan_y + Inches(0.42), cx, icon_y, RGBColor(0x8A, 0x86, 0x85), width=1.2)
    icon_l = cx - Emu(int(icon_w / 2))
    icon = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, icon_l, icon_y, icon_w, icon_h)
    icon.shadow.inherit = False
    icon.fill.solid(); icon.fill.fore_color.rgb = WHITE
    icon.line.color.rgb = PRIMARY if wireless else INK
    icon.line.width = Pt(1.3)
    if wireless:
        icon.line.dash_style = MSO_LINE_DASH_STYLE.DASH
        dot = s.shapes.add_shape(MSO_SHAPE.OVAL, cx - Inches(0.22), icon_y + Inches(0.2), Inches(0.13), Inches(0.13))
        dot.shadow.inherit = False
        dot.fill.solid(); dot.fill.fore_color.rgb = PRIMARY
        dot.line.fill.background()
        bar_x = cx - Inches(0.02)
        for bi, bh in enumerate([0.12, 0.2, 0.28]):
            bw = Inches(0.08)
            bx = bar_x + Emu(int(bi * (bw + Inches(0.03))))
            bar = rect(s, bx, icon_y + icon_h - Inches(0.12) - Inches(bh), bw, Inches(bh), PRIMARY)
    else:
        for li in range(3):
            ly = icon_y + Inches(0.16) + Emu(int(li * Inches(0.14)))
            lw = icon_w - Inches(0.42) if li < 2 else icon_w - Inches(0.55)
            connector(s, icon_l + Inches(0.14), ly, icon_l + Inches(0.14) + lw, ly, INK, width=1.8)
    badge_w = Inches(0.42)
    badge = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx + icon_w / 2 - Inches(0.1),
                                icon_y - Inches(0.16), badge_w, Inches(0.28))
    badge.shadow.inherit = False
    badge.fill.solid(); badge.fill.fore_color.rgb = PRIMARY if wireless else INK
    badge.line.fill.background()
    tf = badge.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    add_para(tf, "×N", 9, WHITE, bold=True, align=PP_ALIGN.CENTER, first=True)

    _, tf = textbox(s, cx - Inches(1.6), icon_y + icon_h + Inches(0.15), Inches(3.2), Inches(0.3))
    add_para(tf, label, 12.5, INK, bold=True, align=PP_ALIGN.CENTER, first=True)
    _, tf = textbox(s, cx - Inches(1.6), icon_y + icon_h + Inches(0.48), Inches(3.2), Inches(0.3))
    add_para(tf, protocol, 10.5, PRIMARY, bold=True, align=PP_ALIGN.CENTER, first=True)
    _, tf = textbox(s, cx - Inches(1.6), icon_y + icon_h + Inches(0.82), Inches(3.2), Inches(0.3))
    add_para(tf, cap, 9.5, INK_MUTED, align=PP_ALIGN.CENTER, first=True)

picture_h(s, LOGO_COLOR, Inches(11.75), Inches(0.5), Inches(0.55))
page_no(s)

# ============================================================ SLIDE 7 — WIRELESS
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Сценарии применения", "Беспроводной вариант решения", title_size=21)
data_table(s, ML, y + Inches(0.1), Inches(5.6),
           ["Оборудование", "Датчиков", "Тип датчика", "Тип шлюза"],
           [["Консольный насос", "4", "RH505", "RH560"],
            ["Двухопорный насос", "6", "RH605", "RH560"],
            ["Вентилятор", "6", "RH506", "RH570"]],
           col_widths=[1.9, 1.0, 1.3, 1.4])
_, tf = textbox(s, ML, y + Inches(1.75), Inches(5.6), Inches(0.9))
add_para(tf, "Одноосные и трёхосные беспроводные датчики вибрации (RH505/RH605, RW506/RW606) "
             "передают данные на шлюз по радиоканалу — без прокладки кабельных трасс.",
         11, INK_MUTED, first=True, spacing=1.3)
photo_box(s, Inches(6.55), y + Inches(0.1), Inches(3.0), Inches(2.0), A + "wireless_components.jpg")
photo_box(s, Inches(9.65), y + Inches(0.1), Inches(3.05), Inches(2.0), A + "wireless_software.jpg")
photo_box(s, Inches(6.55), y + Inches(2.2), Inches(6.15), Inches(1.85), A + "wireless_install.jpg",
          "Монтаж беспроводных датчиков на промышленном объекте")
picture_h(s, LOGO_COLOR, Inches(11.75), Inches(0.5), Inches(0.55))
page_no(s)

# ============================================================ SLIDE 8 — WIRED
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Сценарии применения", "Проводной вариант решения", title_size=21)
data_table(s, ML, y + Inches(0.1), Inches(5.6),
           ["Оборудование", "Датчиков", "Тип датчика", "Тип шлюза"],
           [["Гориз. дробилка", "10", "RH103T", "RH2000"],
            ["Верт. дробилка", "16", "RH104T", "RH2000"],
            ["Зубч. дробилка", "13", "RH113T", "RH2000"]],
           col_widths=[1.9, 1.0, 1.3, 1.4])
_, tf = textbox(s, ML, y + Inches(1.75), Inches(5.6), Inches(0.9))
add_para(tf, "Проводные датчики с верхним или боковым (360°) выходом кабеля подключаются к шлюзу "
             "RH2000 — стационарная схема для ответственных агрегатов с постоянным питанием.",
         11, INK_MUTED, first=True, spacing=1.3)
photo_box(s, Inches(6.55), y + Inches(0.1), Inches(3.0), Inches(2.0), A + "wired_sensors.jpg")
photo_box(s, Inches(9.65), y + Inches(0.1), Inches(3.05), Inches(2.0), A + "wired_gateway.jpg")
photo_box(s, Inches(6.55), y + Inches(2.2), Inches(6.15), Inches(1.85), A + "wired_software.jpg",
          "Программное обеспечение анализа вибрации в реальном времени")
picture_h(s, LOGO_COLOR, Inches(11.75), Inches(0.5), Inches(0.55))
page_no(s)

# ============================================================ SLIDE 9 — CASE STORY
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Кейс из практики", "Типичный случай предиктивного обслуживания", title_size=21)
cells = [
    (A + "case_chart1.jpg", "02:00, 2 июля. Вибрация на двигателе внезапно усилилась — данные передаются в реальном времени."),
    (A + "case_loader.jpg", "Ключевое оборудование. Подземный резервный погрузчик с установленными беспроводными датчиками."),
    (A + "case_workers.jpg", "Результат. Предотвращено внезапное незапланированное отключение и нарушение техники безопасности."),
    (A + "case_control_room.jpg", "+15 минут. Эксперт диагностического центра дал заключение обслуживающему инженеру."),
    (A + "case_bearing.jpg", "06:43. Инженер на месте заменил повреждённый подшипник — сепаратор был разрушен."),
    (A + "case_chart2.jpg", "После обслуживания. Форма волны вернулась к норме — оборудование работает штатно."),
]
cw = Inches(3.95)
ch = Inches(1.55)
gap = Inches(0.15)
for i, (img, txt) in enumerate(cells):
    r = i // 3
    c = i % 3
    x = ML + Emu(int(c * (cw + gap)))
    yy = y + Emu(int(r * (ch + Inches(0.7) + gap)))
    photo_box(s, x, yy, cw, ch, img)
    _, tf = textbox(s, x, yy + ch + Inches(0.05), cw, Inches(0.65))
    add_para(tf, txt, 9.5, INK_MUTED, first=True, spacing=1.25)
page_no(s)

prs.save("algoritm-full-partial.pptx")
print("saved batch 2 (slides 6-9)")


# ============================================================ SLIDE 10 — DIVIDER
divider_slide(["Проекты внедрения технологии", "(открытый карьер)"])

# ============================================================ SLIDE 11 — INDUSTRY SCENARIOS
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Область применения", "Сценарии для добычи, переработки и плавки полезных ископаемых",
              "Цель — обеспечить надёжную эксплуатацию оборудования, избежать экономических потерь "
              "и вторичных аварий из-за незапланированного простоя.", title_size=19)
tile_grid(s, ML, y + Inches(0.1), Inches(12.1), Inches(1.5), [
    ("Добыча полезных ископаемых", "Подъёмные машины, конвейеры, буровые установки, вентиляторы главного проветривания"),
    ("Переработка полезных ископаемых", "Дробилки, мельницы, флотационное и обогатительное оборудование"),
    ("Плавка и металлургия", "Прокатные станы, компрессоры, насосные станции, мостовые краны"),
], cols=3)
tag_row(s, ML, y + Inches(1.85), ["Мельница", "Дробилка", "Насос", "Вентилятор", "Конвейер",
        "Подъёмная машина", "Компрессор", "Мостовой кран"], max_w=Inches(12.1))
page_no(s)


def class_scenario_slide(title, wireless, gw_label, protocol, sensor_label, srv_label, srv_cap,
                          photo_key, photo_note, features, gw_fill=None, srv_fill=None, n_sensors=3):
    s = slide()
    rect(s, 0, 0, SW, SH, WHITE)
    y = page_head(s, "Сценарии применения", title, title_size=20)
    diagram_box_l, diagram_box_t = ML, y + Inches(0.1)
    diagram_box_w, diagram_box_h = Inches(6.85), Inches(2.5)
    rect(s, diagram_box_l, diagram_box_t, diagram_box_w, diagram_box_h, GREY_BG)
    gateway_diagram(s, diagram_box_l + Inches(0.3), diagram_box_t + Inches(0.25), diagram_box_w - Inches(0.6),
                     diagram_box_h - Inches(0.5), wireless, gw_label, protocol, sensor_label,
                     srv_label, srv_cap, n_sensors=n_sensors, gw_fill=gw_fill, srv_fill=srv_fill)
    photo_box(s, ML, diagram_box_t + diagram_box_h + Inches(0.2), Inches(3.35), Inches(1.5), A + photo_key)
    rect(s, ML + Inches(3.5), diagram_box_t + diagram_box_h + Inches(0.2), Inches(3.35), Inches(1.5), GREY_BG)
    _, tf = textbox(s, ML + Inches(3.65), diagram_box_t + diagram_box_h + Inches(0.35), Inches(3.05), Inches(1.2),
                     anchor=MSO_ANCHOR.MIDDLE)
    add_para(tf, photo_note, 10.5, INK_MUTED, first=True, spacing=1.3)
    feat_list(s, Inches(7.75), y + Inches(0.1), Inches(4.95), features, row_h=0.98)
    page_no(s)
    return s


class_scenario_slide(
    "Для оборудования класса «C/D» — сокращение персонала",
    True, "Шлюз LoRa", "LoRa, до 1 км", "Датчики RW161", "LAN", "Локальная сеть",
    "cd_install_photos.jpg", "RW161 — беспроводные датчики вибрации версии LoRa для оборудования уровня C/D",
    [
        ("Экономичность", "Конкурентоспособные цены для всех решений класса."),
        ("Удалённость", "Радиус действия LoRa-канала — до 1 км без прокладки кабеля."),
        ("Замена инспекций персоналом", "Сокращение ежедневных плановых и внеплановых проверок по сигналу тревоги."),
        ("Сбор формы волны", "Дополнительная функция по сравнению с типовыми датчиками LoRa других производителей."),
        ("Интеллектуальный анализ", "Автоматическая настройка порога и интеллектуальная сигнализация аварий."),
        ("Высокая степень защиты", "IP68 / ATEX — взрывозащищённое исполнение."),
    ], n_sensors=3)

class_scenario_slide(
    "Для оборудования класса «B» — анализ неисправностей",
    True, "RH570", "ZigBee", "RH505/605, RW625", "LAN", "Локальная сеть",
    "b_fault_photos.jpg", "RH570 — беспроводная станция сбора данных, датчики по ZigBee",
    [
        ("Высокая производительность", "Вибрация, температура, скорость (опц.) 3 в 1; диапазон 2–20 кГц (±3 дБ)."),
        ("Расширенный анализ", "Фильтр ложных сигналов, определение запуска, более 20 специальных индексов."),
        ("Длина сбора", "До 2048 Кб (819 200 линий) на измерение."),
        ("Срок службы батареи", "До 3 лет автономной работы."),
        ("Высокая степень защиты", "IP68 / ATEX — взрывозащищённый сертификат."),
    ], n_sensors=4)

class_scenario_slide(
    "Для оборудования класса «A» — анализ точности",
    False, "RH2000 / Exd", "RS485 / WiFi / 4-20mA", "IEPE, обороты, частицы масла", "SuperCare",
    "Система мониторинга",
    "a_fault_photos.jpg", "RH2000 / RH2000 Exd — взрывозащищённая станция сбора данных",
    [
        ("Высокая совместимость", "IEPE-датчики вибрации, датчики оборотов, частиц металла в масле."),
        ("Характеристики", "Постоянный сбор (индикация 30 с, форма волны 30 мин); 0,1–15 кГц (±3 дБ)."),
        ("Интеллектуальный анализ", "Более 50 специальных индексов, диагностика с помощью ИИ."),
        ("Высокая степень защиты", "IP68 / ATEX."),
    ], n_sensors=4)

# ============================================================ SLIDE 15 — FAULT CONTROL
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Диагностика", "Контроль неисправностей оборудования", title_size=21)
data_table(s, ML, y + Inches(0.1), Inches(5.6),
           ["Тип неисправности", "Специфические неисправности"],
           [["Дефект привода", "Дисбаланс, несоосность, ослабление, эксцентриситет ротора, изгиб вала"],
            ["Дефект подшипника", "Сколы, износ, раковины, трещины, деформация сепаратора, недостаток смазки"],
            ["Неисправность редуктора", "Недостаток смазки, плохое зацепление, износ и поломка зубьев"],
            ["Неисправность смазки", "Загрязнение масла, химический износ, посторонние предметы"]],
           col_widths=[1.9, 3.7], row_h=0.68, header_h=0.4, font_size=10.5)
photo_box(s, Inches(6.55), y + Inches(0.1), Inches(6.15), Inches(4.2), A + "defect_photo_grid.jpg")
page_no(s)

# ============================================================ SLIDE 16 — DIVIDER
divider_slide(["Программные решения для", "предиктивного технического", "обслуживания"])

# ============================================================ SLIDE 17 — SUPERCARE
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Программное обеспечение", "SuperCare — платформа предиктивного обслуживания", title_size=21)
photo_box(s, ML, y + Inches(0.1), Inches(5.9), Inches(2.5), A + "supercare_left.jpg")
photo_box(s, Inches(6.75), y + Inches(0.1), Inches(5.95), Inches(2.5), A + "supercare_right.jpg")
tile_grid(s, ML, y + Inches(2.75), Inches(12.1), Inches(1.55), [
    ("Архитектура больших данных", "Удовлетворяет потребности для долгосрочного использования"),
    ("B/S структура", "Совместима с различными браузерами, не требует установки"),
    ("Самоопределяемое размещение", "Быстрая настройка макета страницы под стилевые требования"),
    ("Профессиональная версия Pro", "Унифицированный контроль верхней группы предприятий"),
    ("Статистические таблицы", "Глубокая аналитика по всем предприятиям для руководителя"),
    ("Совместимость", "Интеграция с DCS/PLC/MES/SCADA и другими системами"),
], cols=3)
picture_h(s, LOGO_COLOR, Inches(11.75), Inches(0.5), Inches(0.55))
page_no(s)

# ============================================================ SLIDE 18 — AI DIAGNOSIS
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Программное обеспечение", "Профессиональная диагностика на основе ИИ", title_size=21)
photo_box(s, ML, y + Inches(0.1), Inches(5.9), Inches(3.1), A + "ai_panel_left.jpg")
photo_box(s, Inches(6.75), y + Inches(0.1), Inches(5.95), Inches(3.1), A + "ai_panel_right.jpg")
tile_grid(s, ML, y + Inches(3.35), Inches(12.1), Inches(1.0), [
    ("30+ инструментов профессиональной диагностики",
     "Удовлетворяют потребности инженеров в поиске всех видов неисправностей вращающегося оборудования."),
    ("AI-диагностика",
     "Алгоритм автоматически даёт выводы по диагностике неисправностей и рекомендации по обслуживанию."),
], cols=2)
page_no(s)

# ============================================================ SLIDE 19 — MOBILE APP
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Программное обеспечение", "Удобный доступ к оборудованию с мобильного устройства",
              "Контроль статуса в режиме реального времени, просмотр статистики и управление тревогами",
              title_size=19)
ph_h = Inches(4.3)
ph_w = Emu(int(ph_h * (9 / 19.5)))
photo_box(s, Inches(1.8), y + Inches(0.3), ph_w, ph_h, A + "phone_left.jpg")
rect(s, Inches(5.1), y + Inches(1.0), Inches(3.1), Inches(1.9), GREY_BG)
photo_box(s, Inches(5.2), y + Inches(1.1), Inches(2.9), Inches(1.7), A + "phone_chart.jpg")
photo_box(s, Inches(9.6), y + Inches(0.3), ph_w, ph_h, A + "phone_right.jpg")
page_no(s)

# ============================================================ SLIDE 20 — EPM
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Программное обеспечение", "EPM — простой мониторинг и диагностика", title_size=21)
photo_box(s, ML, y + Inches(0.1), Inches(6.4), Inches(2.9), A + "epm_dashboard.jpg")
feat_list(s, Inches(7.2), y + Inches(0.1), Inches(5.5), [
    ("B/S структура", "Совместима с различным браузером, не требует установки на рабочем месте."),
    ("Статистика состояния оборудования", "Помогает управляющим быстро понять долгосрочный статус оборудования."),
    ("2.5D моделирование", "Реализует наглядное моделирование оборудования и точек измерения в реальном времени."),
], row_h=0.95)
photo_box(s, ML, y + Inches(3.2), Inches(6.15), Inches(1.9), A + "epm_machine3d.jpg",
          "Мониторинг состояния оборудования в реальном времени")
photo_box(s, Inches(6.85), y + Inches(3.2), Inches(5.85), Inches(1.9), A + "epm_waveform.jpg",
          "Профессиональные инструменты диагностики")
page_no(s)

prs.save("algoritm-full-partial.pptx")
print("saved batch 3 (slides 10-20)")


# ============================================================ SLIDE 21 — DIVIDER
divider_slide(["Сервисы для обеспечения", "предиктивного технического", "обслуживания"])

# ============================================================ SLIDE 22 — SIX SERVICES
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Сервисы поддержки", "Шесть услуг обеспечивают эффективность диагностики", title_size=21)
photo_box(s, ML, y + Inches(0.1), Inches(5.9), Inches(2.6), A + "services_control_room.jpg",
          "Круглосуточный мониторинг в реальном времени")
photo_box(s, Inches(6.75), y + Inches(0.1), Inches(5.95), Inches(2.6), A + "services_campus.jpg",
          "Синхронизация данных в облачном диагностическом центре")
tile_grid(s, ML, y + Inches(2.85), Inches(12.1), Inches(0.85), [
    "24×7 экспертный мониторинг", "Оценка после техобслуживания на месте", "Экспертный консалтинг",
    "Ежемесячный отчёт о состоянии", "Постоянное обучение персонала", "Консалтинг диагностического центра",
], cols=6)
page_no(s)

# ============================================================ SLIDE 23 — TRAINING
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Сервисы поддержки", "Обучение персонала и авторизация системы", title_size=21)
feat_list(s, ML, y + Inches(0.05), Inches(5.9), [
    ("Международный центр обучения", "Обучение вибродиагностике и сертификация инженеров уровней II, III и IV."),
    ("Передача компетенций", "Помощь клиентам в создании собственной системы O&M с ИИ-алгоритмом."),
], row_h=0.85)
feat_list(s, Inches(6.75), y + Inches(0.05), Inches(5.95), [
    ("Сертифицированная платформа", "Международная GL-сертифицированная платформа технического обслуживания."),
    ("Сопровождение внедрения", "Достижение интеллектуальной революции в перцепции и управлении оборудованием."),
], row_h=0.85)
photo_box(s, ML, y + Inches(1.95), Inches(5.9), Inches(2.15), A + "training_classroom.jpg",
          "Обучение инженеров вибродиагностике")
photo_box(s, Inches(6.75), y + Inches(1.95), Inches(5.95), Inches(2.15), A + "training_serverroom.jpg",
          "Инфраструктура диагностического центра")
_, tf = textbox(s, ML, y + Inches(4.25), Inches(6), Inches(0.3))
add_para(tf, "Сертификаты — справочно, в приложении к предложению", 9.5, INK_MUTED, first=True)
page_no(s)

# ============================================================ SLIDE 24 — DIVIDER
divider_slide(["Международный опыт", "применения технологии"])

# ============================================================ SLIDE 25 — GEOGRAPHY
s = slide()
rect(s, 0, 0, SW, SH, STEEL_DARK)
page_head(s, "Масштаб", "Продукты и услуги на базе технологии внедрены более чем в 35 странах",
          on_dark=True, title_size=19)
_, tf = textbox(s, ML, Inches(3.0), Inches(4), Inches(2))
add_para(tf, "35+", 60, WHITE, bold=True, first=True)
_, tf = textbox(s, ML, Inches(4.55), Inches(4.3), Inches(1.2))
add_para(tf, "стран, где решения на базе этой технологической платформы работают на "
             "промышленных объектах", 13, WHITE_MUTED, first=True, spacing=1.3)
tag_row(s, Inches(5.6), Inches(3.1),
        ["Россия", "Германия", "Великобритания", "Швеция", "Нидерланды", "Испания", "Италия",
         "Марокко", "Пакистан", "Индия", "Южная Корея", "Таиланд", "Малайзия", "Сингапур",
         "Индонезия", "Австралия", "США", "Мексика", "Бразилия", "Перу", "Чили", "Аргентина"],
        on_dark=True, max_w=Inches(6.9))
page_no(s, on_dark=True)

prs.save("algoritm-full-partial.pptx")
print("saved batch 4 (slides 21-26)")


def two_case_cards(title, cards, subtitle=None):
    s = slide()
    rect(s, 0, 0, SW, SH, WHITE)
    y = page_head(s, "Международный опыт", title, subtitle, title_size=20)
    cw = Inches(5.95)
    for i, (heading, bullets, photos) in enumerate(cards):
        x = ML + Emu(int(i * (cw + Inches(0.2))))
        rect(s, x, y + Inches(0.05), cw, Inches(4.6), GREY_BG)
        if len(photos) == 1:
            photo_box(s, x + Inches(0.2), y + Inches(0.2), cw - Inches(0.4), Inches(1.6), photos[0])
            next_y = y + Inches(2.0)
        else:
            pw = Emu(int((cw - Inches(0.5)) / 2))
            photo_box(s, x + Inches(0.2), y + Inches(0.2), pw, Inches(1.6), photos[0])
            photo_box(s, x + Inches(0.3) + pw, y + Inches(0.2), pw, Inches(1.6), photos[1])
            next_y = y + Inches(2.0)
        _, tf = textbox(s, x + Inches(0.2), next_y, cw - Inches(0.4), Inches(0.4))
        add_para(tf, heading, 13.5, PRIMARY, bold=True, first=True)
        _, tf = textbox(s, x + Inches(0.2), next_y + Inches(0.42), cw - Inches(0.4), Inches(0.7))
        for j, b in enumerate(bullets):
            add_para(tf, b, 10.5, INK_MUTED, first=(j == 0), spacing=1.25, space_after=2)
        if len(photos) > 2:
            photo_box(s, x + Inches(0.2), next_y + Inches(1.25), cw - Inches(0.4), Inches(1.3), photos[2])
    return s


s = two_case_cards("Типичные проекты за рубежом", [
    ("Клиент: Zijin Julong", ["Тип сырья: медная руда", "Датчиков установлено: 387"],
     [A + "case_zijin_site.jpg", A + "case_zijin_equip.jpg"]),
    ("Клиент: CNH Energy Heidaigou", ["Тип сырья: уголь", "Датчиков установлено: 1184"],
     [A + "case_cnh_site.jpg", A + "case_cnh_equip.jpg"]),
])
page_no(s)

s = two_case_cards("Типичные проекты за рубежом — Латинская Америка", [
    ("Расположение: Бразилия", ["Промышленность: горнодобывающая", "Датчиков установлено: 2000+"],
     [A + "case_brazil_photos.jpg"]),
    ("Расположение: Чили", ["Промышленность: горнодобывающая", "Датчиков установлено: 2000+"],
     [A + "case_chile_photos.jpg"]),
])
page_no(s)

# ============================================================ SLIDE 29 — ENTERPRISE PLATFORM CASE
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Международный опыт",
              "Кейс: интеграция с корпоративной платформой промышленной группы",
              "Разработка интеллектуальной системы и операционной модели для собственного центра "
              "удалённой диагностики заказчика; платформа объединяет 18 предприятий и 31 линию.",
              title_size=18)
photo_box(s, Inches(2.4), y + Inches(0.15), Inches(8.5), Inches(3.7), A + "cidc_dashboard.jpg",
          "Единая платформа удалённой диагностики группы предприятий")
page_no(s)

# ============================================================ SLIDE 31 — LIGHTHOUSE
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Международный опыт",
              "Проект, отмеченный международным признанием эффективности",
              "Крупный проект по добыче гранита (500 млн тонн) включил интеллектуальную систему "
              "эксплуатации на базе этой платформы и вошёл в реестр Global Lighthouse Network, 2023.",
              title_size=17)
pw = Inches(3.95)
photo_box(s, ML, y + Inches(0.1), pw, Inches(3.9), A + "lighthouse_group.jpg", "01 — Обучение персонала диагностике")
photo_box(s, ML + pw + Inches(0.15), y + Inches(0.1), pw, Inches(3.9), A + "lighthouse_equip.jpg", "02 — Пусконаладка на объекте")
photo_box(s, ML + 2 * (pw + Inches(0.15)), y + Inches(0.1), pw, Inches(3.9), A + "lighthouse_list.jpg",
          "03 — Реестр Global Lighthouse Network, 2023")
page_no(s)

# ============================================================ SLIDE 32 — TIANYANG FAULT CASES
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Международный опыт", "Типичные случаи неисправностей на объекте по добыче гранита", title_size=19)
photo_box(s, ML, y + Inches(0.1), Inches(2.9), Inches(1.9), A + "tianyang_site1.jpg")
photo_box(s, ML, y + Inches(2.1), Inches(2.9), Inches(1.9), A + "tianyang_site2.jpg")
feat_list(s, Inches(3.75), y + Inches(0.1), Inches(8.95), [
    ("Случай 1 — износ муфты ударной дробилки",
     "Диагностирована неисправность муфты высокоскоростного вала; через 3 дня муфта заменена по плану. "
     "На фото — явный износ нейлонового стержня."),
    ("Случай 2 — ослабление болтов на вибрационном сите",
     "Диагностирована недостаточная жёсткость основания; выявлено отсутствие 8 болтов. Через неделю "
     "проведено техническое обслуживание."),
], row_h=1.85)
page_no(s)

# ============================================================ SLIDE 33 — WESTERN MINING GROUP
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Международный опыт", "Кейс: горнодобывающая группа — четыре объекта", title_size=21)
photo_box(s, ML, y + Inches(0.1), Inches(12.1), Inches(1.7), A + "western_mining_sites.jpg")
tile_grid(s, ML, y + Inches(2.0), Inches(12.1), Inches(1.0), [
    ("Объект 1", "121 ед. оборудования, 781 датчик, старт авг. 2021, 53 успешных кейса"),
    ("Объект 2", "24 ед. оборудования, 130 датчиков, старт авг. 2021, 11 успешных кейсов"),
    ("Объект 3", "62 ед. оборудования, 417 датчиков, старт авг. 2021, 27 успешных кейсов"),
    ("Объект 4", "91 ед. оборудования, 917 датчиков, старт ноя. 2022, 11 успешных кейсов"),
], cols=4)
_, tf = textbox(s, ML, y + Inches(3.15), Inches(12.1), Inches(0.7))
add_para(tf, "С 2021 года платформа помогла выявить неисправность основного подъёмника, пройти "
             "национальную сертификацию «умного месторождения», внедрить мониторинг подземного "
             "ключевого оборудования и расширить мониторинг масла.", 10.5, INK_MUTED, first=True, spacing=1.3)
page_no(s)

# ============================================================ SLIDE 34 — SPECIAL MINING TECH
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Международный опыт", "Технические решения для специального горного оборудования", title_size=19)
feat_list(s, ML, y + Inches(0.1), Inches(5.9), [
    ("Проблема", "При серьёзных перегрузках персонал не всегда в состоянии выявить скрытые "
     "неисправности — тяжёлые условия труда, сейсмическая опасность, сложность коммуникаций."),
    ("Решение", "Взрывозащищённые беспроводные датчики решают проблему монтажа кабелей в шахте; "
     "мониторинг масла, тока и напряжения; поддержка Ethernet/ВОЛС/WiFi/4G/5G."),
], row_h=1.7)
photo_box(s, Inches(6.75), y + Inches(0.1), Inches(5.95), Inches(2.6), A + "mining_sensor_products.jpg")
photo_box(s, Inches(6.75), y + Inches(2.85), Inches(2.9), Inches(1.4), A + "mining_install1.jpg")
photo_box(s, Inches(9.8), y + Inches(2.85), Inches(2.9), Inches(1.4), A + "mining_install2.jpg")
page_no(s)

# ============================================================ SLIDE 35 — TYPICAL FAULT CASES
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
y = page_head(s, "Международный опыт", "Несколько типичных случаев неисправности", title_size=21)
quad = [
    (A + "fault_springs.jpg", "Исключение незапланированных простоев 24/7",
     "В 3 часа ночи диагностирована сломанная пружина в соединении ремня. Пружина заменена "
     "своевременно, отключение исключено."),
    (A + "fault_ring.jpg", "Техобслуживание по производственным планам",
     "Диагностирован износ дорожки качения внутреннего кольца подшипника. Инженер провёл "
     "обслуживание раньше срока."),
    (A + "fault_bearing.jpg", "Долгосрочное отслеживание",
     "Обнаружено отслоение внутреннего кольца подшипника ролика; своевременное напоминание "
     "позволило спланировать ремонт."),
    (A + "fault_roller.jpg", "Руководство по выбору запасных частей",
     "Выявлен значительный износ ролика ремня. Причина — неправильный выбор модели подшипника."),
]
cw = Inches(5.95)
ch = Inches(1.95)
for i, (img, head, body) in enumerate(quad):
    r = i // 2
    c = i % 2
    x = ML + Emu(int(c * (cw + Inches(0.2))))
    yy = y + Emu(int(r * (ch + Inches(0.15))))
    photo_box(s, x, yy, Inches(1.7), ch, img)
    _, tf = textbox(s, x + Inches(1.85), yy, cw - Inches(1.85), ch)
    add_para(tf, head, 12, PRIMARY, bold=True, first=True, spacing=1.1, space_after=3)
    add_para(tf, body, 10, INK_MUTED, spacing=1.28)
page_no(s)

# ============================================================ SLIDE 36 — CONTACTS
s = slide()
rect(s, 0, 0, SW, SH, WHITE)
rect(s, 0, 0, Inches(5.87), SH, STEEL_DARK)
picture_h(s, LOGO_WHITE, Inches(0.6), Inches(2.95), Inches(0.85))
_, tf = textbox(s, Inches(0.6), Inches(4.05), Inches(4.4), Inches(0.6))
add_para(tf, "ООО «Алгоритм»", 20, WHITE, bold=True, first=True)
_, tf = textbox(s, Inches(0.6), Inches(4.65), Inches(4.3), Inches(0.8))
add_para(tf, "Комплексные решения для предиктивного обслуживания оборудования.",
         12.5, WHITE_MUTED, first=True, spacing=1.35)
rows = [
    ("Телефон", "+7 (988) 492-81-03"),
    ("E-mail", "info@algoritmkrsk.ru"),
    ("Сайт", "https://algoritmkrsk.ru/"),
    ("Адрес", "660075, Красноярский край, г. Красноярск,\nул. Маерчака, д. 8, офис 318"),
]
ry = Inches(2.15)
for label, value in rows:
    _, tf = textbox(s, Inches(6.55), ry, Inches(6.0), Inches(0.3))
    add_para(tf, label, 10.5, PRIMARY, bold=True, first=True, letter_caps=True)
    _, tf = textbox(s, Inches(6.55), ry + Inches(0.32), Inches(6.0), Inches(0.9))
    lines = value.split("\n")
    add_para(tf, lines[0], 17, INK, bold=True, first=True, spacing=1.15)
    for extra in lines[1:]:
        add_para(tf, extra, 17, INK, bold=True, spacing=1.15)
    if label != "Адрес":
        rect(s, Inches(6.55), ry + Inches(1.15), Inches(6.0), Pt(0.75), RULE)
    ry = ry + Inches(1.3)
page_no(s)

prs.save("algoritm-predictive-maintenance-Swiss-full.pptx")
print("saved FINAL: 36 slides")
