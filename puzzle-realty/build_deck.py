#!/usr/bin/env python3
"""Puzzle Realty — презентация «Системный подход к привлечению клиентов в поселок без бюджета».

Собирается на шаблоне конгресса (assets/congress-template.potx): баннер сверху приходит
с мастер-слайда, поэтому весь контент лежит ниже TOP.
Запуск:  python3 build_deck.py   ->  out/puzzle-realty-zero-budget.pptx
Шрифт Gilroy должен быть установлен на машине, где открывают файл.
"""
import os
import re
import shutil
import zipfile
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt
from PIL import Image
import qrcode

HERE = os.path.dirname(os.path.abspath(__file__))
PH = os.path.join(HERE, "assets", "photos")
LG = os.path.join(HERE, "assets", "logo")
TMP = os.path.join(HERE, "out", "tmp")
os.makedirs(TMP, exist_ok=True)

# ── фирменные токены ──────────────────────────────────────────────
FONT = "Gilroy"
RED = RGBColor(0xE7, 0x2F, 0x2A)
RED_DK = RGBColor(0xC4, 0x22, 0x1E)
PINK = RGBColor(0xFC, 0xE9, 0xE8)
PINK_2 = RGBColor(0xFA, 0xD5, 0xD4)
DARK = RGBColor(0x1A, 0x1A, 0x1A)
GREY = RGBColor(0x6B, 0x6B, 0x6B)
LIGHT = RGBColor(0xF4, 0xF4, 0xF6)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

W, H = 13.333, 7.5
TOP = 1.2  # ниже баннера конгресса из мастер-слайда


def _open_template():
    """python-pptx не открывает .potx — подменяем content-type на обычный .pptx."""
    src = os.path.join(HERE, "assets", "congress-template.potx")
    dst = os.path.join(TMP, "template.pptx")
    with zipfile.ZipFile(src) as zi, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zo:
        for it in zi.infolist():
            data = zi.read(it.filename)
            if it.filename == "[Content_Types].xml":
                data = data.replace(b"presentationml.template.main+xml", b"presentationml.presentation.main+xml")
            zo.writestr(it, data)
    p = Presentation(dst)
    for sid in list(p.slides._sldIdLst):  # пустой слайд-заготовка
        p.part.drop_rel(sid.rId)
        p.slides._sldIdLst.remove(sid)
    return p


prs = _open_template()
LAYOUT = next(l for l in prs.slide_layouts if l.name == "Только заголовок")


# ── помощники ─────────────────────────────────────────────────────
def _alpha(shape, pct):
    sf = shape.fill._xPr.find(qn("a:solidFill"))
    clr = sf[0]
    a = clr.makeelement(qn("a:alpha"), {"val": str(int(pct * 1000))})
    clr.append(a)


def _nostyle(sh):
    st = sh._element.find(qn("p:style"))
    if st is not None:
        sh._element.remove(st)


def rect(s, x, y, w, h, fill=None, line=None, lw=1.0, shape=MSO_SHAPE.RECTANGLE,
         radius=None, alpha=None, dash=False):
    sh = s.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    st = sh._element.find(qn("p:style"))
    if st is not None:
        sh._element.remove(st)
    if fill is None:
        sh.fill.background()
    else:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
        if alpha is not None:
            _alpha(sh, alpha)
    if line is None:
        sh.line.fill.background()
    else:
        sh.line.color.rgb = line
        sh.line.width = Pt(lw)
        if dash:
            ln = sh.line._get_or_add_ln()
            ln.append(ln.makeelement(qn("a:prstDash"), {"val": "dash"}))
    if radius is not None and shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        sh.adjustments[0] = radius
    return sh


def rrect(s, x, y, w, h, fill=None, line=None, lw=1.0, r=0.12, alpha=None):
    # радиус задаётся в долях от меньшей стороны
    return rect(s, x, y, w, h, fill, line, lw, MSO_SHAPE.ROUNDED_RECTANGLE,
                radius=min(0.5, r / min(w, h)), alpha=alpha)


def text(s, x, y, w, h, paras, size=16, color=DARK, bold=False, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, spacing=1.05, after=0, caps=False, italic=False):
    """paras: str | list[str | dict(text,size,color,bold,after,align,italic,runs)]"""
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    if isinstance(paras, str):
        paras = [paras]
    for i, p in enumerate(paras):
        if isinstance(p, str):
            p = {"text": p}
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = p.get("align", align)
        para.line_spacing = p.get("spacing", spacing)
        para.space_after = Pt(p.get("after", after))
        runs = p.get("runs") or [dict(text=p["text"])]
        for r in runs:
            run = para.add_run()
            t = r["text"]
            run.text = t.upper() if p.get("caps", caps) else t
            f = run.font
            f.name = FONT
            f.size = Pt(r.get("size", p.get("size", size)))
            f.bold = r.get("bold", p.get("bold", bold))
            f.italic = r.get("italic", p.get("italic", italic))
            f.color.rgb = r.get("color", p.get("color", color))
    return tb


def pic(s, path, x, y, w, h, focus=(0.5, 0.5)):
    """Картинка «cover»: заполняет рамку, лишнее обрезается вокруг точки focus."""
    iw, ih = Image.open(path).size
    box, img = w / h, iw / ih
    p = s.shapes.add_picture(path, Inches(x), Inches(y), Inches(w), Inches(h))
    if img > box:  # шире рамки — режем по бокам
        vis = box / img
        left = min(max(focus[0] - vis / 2, 0), 1 - vis)
        p.crop_left, p.crop_right = left, 1 - vis - left
    else:
        vis = img / box
        top = min(max(focus[1] - vis / 2, 0), 1 - vis)
        p.crop_top, p.crop_bottom = top, 1 - vis - top
    return p


def logo(s, x, y, w, white=False):
    path = os.path.join(LG, "logo_white.png" if white else "logo_dark.png")
    iw, ih = Image.open(path).size
    return s.shapes.add_picture(path, Inches(x), Inches(y), Inches(w), Inches(w * ih / iw))


def title(s, t, x=0.9, y=1.5, w=11.5, size=30, color=DARK, bar=RED, kicker=None, lines=None):
    """Заголовок слайда — настоящий title-плейсхолдер + фирменная красная черта."""
    lines = lines or 1 + int(len(t) * size * 0.0092 / w)
    hh = lines * size * 1.2 / 72 + 0.05
    if kicker:
        text(s, x, y - 0.32, w, 0.28, kicker, size=12, color=RED, bold=True, caps=True)
    if bar is not None:
        rect(s, x - 0.28, y - 0.03, 0.07, hh + 0.06, fill=bar)
    ph = s.shapes.title
    el = ph._element
    el.getparent().remove(el)
    s.shapes._spTree.append(el)  # поверх фоновых плашек
    ph.left, ph.top, ph.width, ph.height = Inches(x), Inches(y), Inches(w), Inches(hh)
    tf = ph.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.TOP
    p = tf.paragraphs[0]
    p.line_spacing = 1.0
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = t.upper()
    r.font.name, r.font.size, r.font.bold = FONT, Pt(size), True
    r.font.color.rgb = color
    return hh


def notes(s, t):
    s.notes_slide.notes_text_frame.text = t


def slide():
    # фон слайда закрыт картинкой мастера, поэтому цветные поля рисуем плашками
    return prs.slides.add_slide(LAYOUT)


def bullets(s, x, y, w, items, size=15, color=DARK, gap=7, dot=RED):
    """Список с красными ромбами-маркерами; возвращает высоту."""
    cy = y
    for it in items:
        lines = 1 + int(len(it) * size * 0.0078 / (w - 0.35))
        hh = lines * size * 1.25 / 72
        rect(s, x, cy + 0.07, 0.09, 0.09, fill=dot, shape=MSO_SHAPE.DIAMOND)
        text(s, x + 0.28, cy, w - 0.28, hh, it, size=size, color=color, spacing=1.05)
        cy += hh + gap / 72
    return cy - y


def pill(s, x, y, w, h, t, size=13, fill=RED, color=WHITE):
    rrect(s, x, y, w, h, fill=fill, r=h / 2)
    text(s, x, y, w, h, t, size=size, color=color, bold=True, caps=True,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)


def crop_file(src, box, name):
    im = Image.open(os.path.join(PH, src))
    iw, ih = im.size
    out = os.path.join(TMP, name)
    im.crop((int(box[0] * iw), int(box[1] * ih), int(box[2] * iw), int(box[3] * ih))).save(out, quality=92)
    return out


# ══════════════ 1. ОБЛОЖКА ═════════════════════════════════════════
s = slide()
pic(s, f"{PH}/cover_autumn.jpg", 0, TOP, W, H - TOP, focus=(0.45, 0.5))
rect(s, 0, TOP, 3.7, 1.45, fill=WHITE, alpha=92)
logo(s, 0.45, TOP + 0.3, 2.8)
rect(s, 3.55, 3.45, W - 3.55, H - 3.45, fill=RED, alpha=94)
rect(s, 4.05, 3.8, 0.07, 1.3, fill=WHITE)
title(s, "Системный подход к привлечению клиентов в посёлок без маркетингового бюджета",
      x=4.4, y=3.75, w=8.4, size=24, color=WHITE, bar=None, lines=3)
text(s, 4.4, 5.3, 8.4, 0.65,
     "Система из трёх каналов: UGC-контент • агенты влияния • партнёрский трафик",
     size=15, color=WHITE, spacing=1.1)
text(s, 4.05, 6.3, 5.2, 0.9,
     [dict(text="Шкурко Марина", size=17, bold=True, caps=True),
      dict(text="управляющий партнёр, сооснователь Puzzle Realty", size=12.5)],
     color=WHITE, spacing=1.15)
text(s, 9.1, 6.3, 3.7, 0.9, "Конференция «Маркетинг коттеджных посёлков», СПб / ЛО",
     size=12.5, color=WHITE, spacing=1.15)
notes(s, "СЛАЙД 1. Визуал по ТЗ: фото посёлка в ЛО (осенний кадр), поверх — полупрозрачная плашка с текстом. "
         "Внизу: логотип агентства, имя спикера, название конференции.")

# ══════════════ 2. ПРОБЛЕМА ════════════════════════════════════════
s = slide()
title(s, "Бюджет 0 ₽. Посёлок продавать надо.", x=0.9, y=1.55, w=6.3, size=28, kicker="Проблема", lines=2)
cards = [
    ("244", "Конкуренция КП в ЛО", "в продаже 244 коттеджных посёлка от застройщика"),
    ("сезон", "Сезонность", "короткий строительный сезон"),
    ("CPL ↑", "Digital: контекст, таргет", "стоимость лида растёт каждый год"),
]
cy = 2.85
for big, head, body in cards:
    rrect(s, 0.6, cy, 6.55, 1.05, fill=PINK, r=0.16)
    rrect(s, 0.6, cy, 1.9, 1.05, fill=RED, r=0.16)
    text(s, 0.6, cy, 1.9, 1.05, big, size=30 if len(big) < 5 else 22, color=WHITE, bold=True,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 2.75, cy + 0.1, 4.2, 0.85,
         [dict(text=head, size=16, bold=True, after=3), dict(text=body, size=13.5, color=GREY)],
         anchor=MSO_ANCHOR.MIDDLE, spacing=1.05)
    cy += 1.2
rrect(s, 0.6, 6.5, 6.55, 0.7, fill=DARK, r=0.12)
text(s, 0.85, 6.5, 6.1, 0.7, "Что делать, если платный трафик недоступен, а продажи нужны?",
     size=14, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE)
pic(s, f"{PH}/map_lo.jpg", 7.55, 1.3, 5.25, 5.9, focus=(0.5, 0.62))
rect(s, 7.55, 1.3, 5.25, 5.9, line=RED, lw=2.25)
notes(s, "СЛАЙД 2. Визуал по ТЗ: карта ЛО с точками посёлков + график роста стоимости лида "
         "(график добавить по своим цифрам). Три блока: конкуренция, сезонность, digital.")

# ══════════════ 3. ГЛАВНАЯ МЫСЛЬ ═══════════════════════════════════
s = slide()
rect(s, 0, TOP, W, H - TOP, fill=RED)
title(s, "Нулевой бюджет — это не отсутствие маркетинга", x=0.9, y=1.55, w=11.4, size=30,
      color=WHITE, bar=WHITE, lines=1)
d = 2.5
cx = [3.2, 5.4, 7.6]
labels = [("UGC-", "контент"), ("Агенты", "влияния"), ("Партнёрский", "трафик")]
for i, (a, b) in enumerate(labels):
    rect(s, cx[i], 2.5, d, d, fill=WHITE, shape=MSO_SHAPE.OVAL, alpha=(18 if i != 1 else 26), line=WHITE, lw=2)
    text(s, cx[i], 2.5, d, d, [dict(text=a, size=18, bold=True, caps=True), dict(text=b, size=18, bold=True, caps=True)],
         color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, spacing=1.0)
fb = s.shapes.build_freeform(Inches(4.15), Inches(5.05))
fb.add_line_segments([(Inches(9.15), Inches(5.05)), (Inches(7.7), Inches(5.65)), (Inches(5.6), Inches(5.65))])
fn = fb.convert_to_shape()
fn.fill.solid(); fn.fill.fore_color.rgb = WHITE; fn.line.fill.background(); _nostyle(fn)
text(s, 5.6, 5.08, 2.1, 0.55, "+ CRM", size=17, color=RED, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
text(s, 0.9, 5.85, 11.5, 0.55,
     "UGC-контент + Агенты влияния + Партнёрский трафик + CRM = управляемый поток лидов",
     size=19, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
text(s, 0.9, 6.55, 11.5, 0.4, "Три канала, которые работают бесплатно — если выстроить их в систему.",
     size=14.5, color=WHITE, align=PP_ALIGN.CENTER)
notes(s, "СЛАЙД 3. Визуал по ТЗ: схема из трёх кругов, сходящихся в одну воронку.")

# ══════════════ 4. БЛОК 1 — UGC-КОНТЕНТ ════════════════════════════
s = slide()
rect(s, 0, TOP, 4.1, H - TOP, fill=RED)
rect(s, 0.6, 1.85, 0.07, 1.4, fill=WHITE)
text(s, 0.9, 1.5, 2.9, 0.3, "Блок 1", size=12, color=WHITE, bold=True, caps=True)
title(s, "UGC-контент", x=0.9, y=1.85, w=2.9, size=30, color=WHITE, bar=None, lines=2)
text(s, 0.9, 3.55, 2.9, 2.2, "Контент создаёт не маркетолог, а локация и клиенты",
     size=17, color=WHITE, spacing=1.15)
logo(s, 0.7, 6.4, 1.9, white=True)
cols = [
    ("Reels / Клипы / Сторис*", ["Атмосфера: шум леса, вид из окна", "Проверка объекта перед показом",
                                 "«Директор отвечает на вопросы»"]),
    ("Мессенджеры", ["Telegram-канал «горячих» предложений", "WhatsApp / Тг / Макс: поздравления с фото",
                     "Рассылки только по согласию"]),
    ("Экспертный текст", ["Как выбрать участок", "Что проверить зимой", "Как проверить коммуникации"]),
]
for i, (h_, its) in enumerate(cols):
    x = 4.6 + i * 2.95
    rrect(s, x, 1.5, 2.75, 4.95, fill=PINK, r=0.18)
    rrect(s, x + 0.2, 1.72, 2.35, 0.75, fill=RED, r=0.12)
    text(s, x + 0.2, 1.72, 2.35, 0.75, h_, size=13.5, color=WHITE, bold=True, caps=True,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, spacing=1.0)
    bullets(s, x + 0.25, 2.85, 2.3, its, size=15, gap=22)
text(s, 4.6, 6.7, 8.5, 0.45,
     "* Instagram принадлежит Meta Platforms Inc., деятельность которой признана экстремистской и запрещена на территории РФ.",
     size=9.5, color=GREY, spacing=1.1)
notes(s, "СЛАЙД 4. Три колонки: Reels/клипы/сторис • мессенджеры • экспертный текст. Сноска про Instagram обязательна.")

# ══════════════ 5. UGC РУКАМИ КЛИЕНТОВ ═════════════════════════════
s = slide()
title(s, "Лучший контент — тот, который сняли ваши клиенты", x=0.9, y=1.55, w=11.6, size=28,
      kicker="UGC руками клиентов", lines=1)
rrect(s, 0.6, 2.35, 5.85, 1.95, fill=PINK, r=0.16)
text(s, 0.9, 2.5, 5.3, 0.35, "1. Видео-интервью после сделки (1 минута)", size=14.5, bold=True, color=RED)
bullets(s, 0.9, 2.95, 5.3, ["«Почему выбрали этот посёлок?»", "«Что понравилось в доме?»",
                            "«Что бы сказали тем, кто сомневается?»"], size=13.5, gap=8)
rrect(s, 0.6, 4.45, 5.85, 2.75, fill=PINK, r=0.16)
text(s, 0.9, 4.58, 5.3, 0.35, "2. Контент из реальной жизни", size=14.5, bold=True, color=RED)
text(s, 0.9, 4.95, 5.3, 0.3, "Фото и короткие видео клиентов:", size=12.5, color=GREY)
bullets(s, 0.9, 5.3, 5.3, ["первый день в новом доме", "вид из окна и территория", "прогулка по посёлку",
                           "обустройство дома и участка", "впечатления после переезда"], size=12.5, gap=3)
pic(s, f"{PH}/ugc_collage.jpg", 6.75, 2.35, 6.0, 3.375)
rect(s, 6.75, 5.85, 6.0, 1.35, fill=RED)
text(s, 7.05, 5.85, 5.4, 1.35,
     [dict(text="Стоимость такого контента — 0 ₽.", size=20, bold=True, after=3),
      dict(text="Конверсия — выше, чем у рекламы.", size=15),
      dict(text="Использовать — только с разрешения клиента.", size=11, color=PINK_2)],
     color=WHITE, anchor=MSO_ANCHOR.MIDDLE, spacing=1.05)
notes(s, "СЛАЙД 5. Визуал по ТЗ: атмосферные фото/видео от жителей.")

# ══════════════ 6. БЛОК 2 — АГЕНТЫ ВЛИЯНИЯ ═════════════════════════
s = slide()
pic(s, f"{PH}/guard_post.jpg", 7.4, TOP, W - 7.4, H - TOP, focus=(0.72, 0.5))
title(s, "Хранители посёлков — ваши внештатные агенты", x=0.9, y=1.6, w=5.9, size=26,
      kicker="Блок 2 · Агенты влияния", lines=2)
rows = [("Кто", "охрана, коменданты, управляющие"),
        ("Что", "визитки + небольшой гостинец (кофе, конфеты)"),
        ("Мотивация", "10% от вознаграждения — озвучить сумму в рублях"),
        ("Скрипт", "«Если кто-то спросит, не продаётся ли дом рядом — дайте мою визитку»")]
cy = 2.9
for k, v in rows:
    rrect(s, 0.6, cy, 6.4, 0.9, fill=PINK, r=0.14)
    pill(s, 0.75, cy + 0.2, 1.65, 0.5, k, size=11.5)
    text(s, 2.6, cy, 4.25, 0.9, v, size=13.5, anchor=MSO_ANCHOR.MIDDLE, spacing=1.05)
    cy += 1.05
rrect(s, 7.75, 5.7, 3.1, 1.5, fill=WHITE, r=0.1)
rect(s, 7.75, 5.7, 0.12, 1.5, fill=RED)
logo(s, 8.1, 5.85, 1.7)
text(s, 8.1, 6.45, 2.6, 0.6, [dict(text="Имя Фамилия", size=11, bold=True), dict(text="+7 (___) ___-__-__", size=10, color=GREY)],
     spacing=1.1)
notes(s, "СЛАЙД 6. Визуал по ТЗ: фото поста охраны / коменданта + образец визитки (в макете — условная визитка, заменить на реальную).")

# ══════════════ 7. ЧАТЫ И СОСЕДСКИЙ МАРКЕТИНГ ═══════════════════════
s = slide()
pic(s, f"{PH}/forest.jpg", 0, TOP, 2.5, H - TOP, focus=(0.5, 0.5))
title(s, "Сначала польза. Потом продажа.", x=3.2, y=1.6, w=9.5, size=32, kicker="Местные чаты и соседский маркетинг", lines=1)
rrect(s, 2.9, 2.45, 4.95, 3.05, fill=WHITE, line=RED, lw=1.5, r=0.18)
pill(s, 3.15, 2.65, 2.6, 0.5, "Чаты посёлков", size=12.5)
bullets(s, 3.2, 3.4, 4.4, ["Не рекламироваться в лоб",
                           "Подсказать: стройматериалы, трактор, сантехник",
                           "Стать авторитетом → сами спросят про участок"], size=14, gap=10)
rrect(s, 8.1, 2.45, 4.75, 3.05, fill=PINK, r=0.18)
pill(s, 8.35, 2.65, 3.0, 0.5, "Соседский маркетинг", size=12.5)
text(s, 8.35, 3.35, 4.25, 0.6, "Листовки в почтовые ящики / журнал Puzzle Media", size=13.5, bold=True, spacing=1.05)
text(s, 8.35, 4.05, 4.25, 0.95, "«Хотите, чтобы рядом поселились приятные люди? Посоветуйте наш посёлок друзьям — вам 10%»",
     size=13, italic=True, color=RED_DK, spacing=1.1)
text(s, 8.35, 5.05, 4.25, 0.35, "Люди заинтересованы в хороших соседях и деньгах", size=12, color=GREY)
rect(s, 2.9, 5.8, W - 2.9, H - 5.8, fill=RED)
text(s, 3.3, 5.8, 9.2, H - 5.8, "Сосед — самый мотивированный продавец вашего посёлка.",
     size=26, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE, spacing=1.05)
notes(s, "СЛАЙД 7. Левая колонка — чаты; правая — соседский маркетинг.")

# ══════════════ 8. ПРОГРАММА ЛОЯЛЬНОСТИ 10% ═════════════════════════
s = slide()
rect(s, 0, TOP, 4.4, H - TOP, fill=RED)
text(s, 0.5, 1.45, 3.6, 1.7, "10%", size=96, color=WHITE, bold=True, spacing=0.9)
title(s, "10% — не скидка. Это инструмент.", x=0.5, y=3.35, w=3.6, size=21, color=WHITE, bar=None, lines=3)
text(s, 0.5, 5.15, 3.5, 0.4, "Программа лояльности", size=13, color=PINK_2)
logo(s, 0.5, 6.5, 1.8, white=True)
blocks = [
    ("1", "Скрипт для клиента",
     "«Иван Иванович, если друзья захотят переехать за город — привезите их ко мне. "
     "Даже если сделка через год — 10% от нашего вознаграждения»."),
    ("2", "Digital-открытки", "Не просто картинка: голосовое или видео-поздравление лично от менеджера — повод напомнить о себе."),
    ("3", "Фиксация в CRM", "Лид закреплён за тем, кто привёл. Выплата — быстро, без сокращений."),
]
cy = 1.45
for n, h_, b in blocks:
    rrect(s, 4.9, cy, 7.95, 1.8, fill=PINK, r=0.18)
    rrect(s, 5.15, cy + 0.22, 0.7, 0.7, fill=RED, r=0.35)
    text(s, 5.15, cy + 0.22, 0.7, 0.7, n, size=22, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 6.15, cy + 0.2, 4.15 if n != "1" else 6.4, 1.45,
         [dict(text=h_, size=15.5, bold=True, color=RED, after=4), dict(text=b, size=12.5, spacing=1.08)], spacing=1.05)
    if n == "2":
        rrect(s, 10.65, cy + 0.25, 1.9, 1.3, fill=WHITE, r=0.1)
        rect(s, 10.8, cy + 0.38, 1.6, 0.62, fill=RED)
        text(s, 10.8, cy + 0.38, 1.6, 0.62, "С праздником!", size=11, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        text(s, 10.8, cy + 1.1, 1.6, 0.35, "▶  видео от менеджера", size=8.5, color=GREY, align=PP_ALIGN.CENTER)
    if n == "3":
        rrect(s, 10.65, cy + 0.25, 1.9, 1.3, fill=WHITE, r=0.1)
        for j in range(3):
            rect(s, 10.8, cy + 0.38 + j * 0.25, 1.6, 0.15, fill=LIGHT)
        rrect(s, 10.8, cy + 1.13, 1.6, 0.28, fill=RED, r=0.06)
        text(s, 10.8, cy + 1.13, 1.6, 0.28, "закреплён за: …", size=8.5, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    cy += 1.95
notes(s, "СЛАЙД 8. Визуал по ТЗ: образец открытки + скриншот CRM. В макете — условные мини-иллюстрации, "
         "заменить на реальную открытку и скриншот вашей CRM.")

# ══════════════ 9. БЛОК 3 — ПАРТНЁРСКИЙ ТРАФИК ══════════════════════
s = slide()
title(s, "Городские агенты — источник клиентов, которые уже хотят купить", x=0.9, y=1.6, w=8.2, size=26,
      kicker="Блок 3 · Партнёрский трафик (B2B)", lines=2)
steps = [("Партнёрская памятка", "контакты + УТП (10% от вознаграждения) + фраза «вы получаете 10% агентских без участия в сделке»"),
         ("Каналы", "лично в 5–10 агентств • профессиональные чаты • напоминание на городских показах"),
         ("Взаимность", "вы отдаёте «городских» клиентов — они загородных")]
cy = 2.85
for i, (h_, b) in enumerate(steps):
    rrect(s, 0.6, cy, 8.4, 1.05, fill=PINK, r=0.15)
    pill(s, 0.8, cy + 0.25, 2.1, 0.55, h_, size=11.5)
    text(s, 3.15, cy, 5.7, 1.05, b, size=13, anchor=MSO_ANCHOR.MIDDLE, spacing=1.08)
    cy += 1.2
rect(s, 0.6, 6.45, 8.4, 0.75, fill=RED)
text(s, 0.85, 6.45, 8.0, 0.75, "Сарафанное радио среди коллег работает быстрее, чем любой платный лид.",
     size=15, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE, spacing=1.05)
rrect(s, 9.55, 1.35, 3.25, 5.85, fill=WHITE, line=RED, lw=1.75, r=0.12)
rect(s, 9.7, 1.5, 2.95, 1.2, fill=RED)
text(s, 9.7, 1.5, 2.95, 1.2, "Партнёрская памятка", size=16, color=WHITE, bold=True, caps=True,
     align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
text(s, 9.85, 2.95, 2.65, 1.0, [dict(text="10%", size=52, color=RED, bold=True, align=PP_ALIGN.CENTER)])
text(s, 9.85, 4.15, 2.65, 1.0, "агентских без участия в сделке", size=15, bold=True, align=PP_ALIGN.CENTER, spacing=1.05)
rect(s, 10.0, 5.2, 2.35, 0.03, fill=PINK_2)
text(s, 9.85, 5.35, 2.65, 0.4, "Ваше имя • телефон • Telegram", size=10.5, color=GREY, align=PP_ALIGN.CENTER)
logo(s, 10.4, 6.05, 1.55)
notes(s, "СЛАЙД 9. Визуал по ТЗ: макет партнёрской памятки (можно взять с собой). В макете — условный вид, заменить на реальную памятку А5.")

# ══════════════ 10. КОЛЛАБОРАЦИИ И НАРУЖКА ═══════════════════════════
s = slide()
title(s, "Работаем как «свой парень» на территории", x=0.9, y=1.5, w=11.5, size=30, lines=1)
pa = crop_file("collab_outdoor.jpg", (0.0, 0.0, 0.455, 1.0), "collab_a.jpg")
pb = crop_file("collab_outdoor.jpg", (0.46, 0.0, 0.805, 1.0), "collab_b.jpg")
pc = crop_file("collab_outdoor.jpg", (0.81, 0.0, 1.0, 1.0), "collab_c.jpg")
text(s, 0.6, 2.2, 5.6, 0.35, "Коллаборации с бизнесами вокруг", size=15, bold=True, color=RED, caps=True)
pic(s, pa, 0.6, 2.65, 5.6, 1.95, focus=(0.5, 0.75))
for i, t in enumerate(["Кафе", "Банный комплекс", "Магазин для сада", "Детский клуб"]):
    pill(s, 0.6 + (i % 2) * 2.85, 4.75 + (i // 2) * 0.52, 2.7, 0.42, t, size=11, fill=PINK, color=RED)
bullets(s, 0.6, 5.95, 5.6, ["Вы рекомендуете их клиентам после показов",
                            "Они размещают ваши визитки / дают промокод"], size=12.5, gap=5)
text(s, 6.7, 2.2, 6.1, 0.35, "Наружка на два фронта", size=15, bold=True, color=RED, caps=True)
pic(s, pb, 6.7, 2.65, 2.95, 4.55, focus=(0.5, 0.5))
pic(s, pc, 9.85, 2.65, 2.95, 2.0, focus=(0.5, 0.62))
rrect(s, 9.85, 4.8, 2.95, 2.4, fill=PINK, r=0.14)
text(s, 10.0, 4.92, 2.65, 2.2,
     [dict(text="Дорхентеры — для продавцов", size=13, bold=True, color=RED, after=4),
      dict(text="«Хотите выгодно продать дом? Агентское вознаграждение — за наш счёт» + 10% соседям за рекомендацию", size=12)],
     spacing=1.05)
rrect(s, 6.85, 6.35, 2.65, 0.7, fill=WHITE, alpha=90, r=0.1)
text(s, 6.95, 6.35, 2.45, 0.7, [dict(text="Баннеры — для покупателей", size=10.5, bold=True, color=RED),
                                 dict(text="оффер + срочность + съёмный QR + стрелка", size=9)],
     anchor=MSO_ANCHOR.MIDDLE, spacing=1.0)
notes(s, "СЛАЙД 10. Визуал по ТЗ: фото баннера с QR + образец дорхентера (кадры собраны из присланного триптиха).")

# ══════════════ 11. ЧЕК-ЛИСТ МЕНЕДЖЕРА ═══════════════════════════════
s = slide()
title(s, "Три канала — одна система", x=0.9, y=1.6, w=8, size=30, kicker="Система: чек-лист менеджера", lines=1)
grid = [
    ("1", "Контент-план", "Digital", ["Снять 3 видео (атмосфера, объект, совет)",
                                     "Разместить в соцсетях, Telegram и на видеоплатформах",
                                     "Рассылка в WhatsApp с открыткой и ссылкой на видео"]),
    ("2", "Агенты влияния", "Offline", ["Объехать 3 посёлка, договориться с охраной / комендантами",
                                       "Вступить в 2 местных чата"]),
    ("3", "Работа с клиентами", "CRM", ["Обзвонить 5 клиентов, поздравить, напомнить про 10%",
                                       "Зафиксировать партнёров в таблице"]),
    ("4", "Физический якорь", "", ["На каждую встречу — журнал Puzzle Media с подписанной визиткой"]),
]
for i, (n, h_, tag, its) in enumerate(grid):
    x, y = 0.6 + (i % 2) * 6.3, 2.45 + (i // 2) * 2.4
    fillc = PINK if i in (0, 3) else LIGHT
    rrect(s, x, y, 6.05, 2.25, fill=fillc, r=0.18)
    rrect(s, x + 0.25, y + 0.2, 0.62, 0.62, fill=RED, r=0.31)
    text(s, x + 0.25, y + 0.2, 0.62, 0.62, n, size=20, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(s, x + 1.1, y + 0.2, 4.7, 0.62, [dict(runs=[dict(text=h_, bold=True, size=16, color=DARK),
                                                      dict(text=f"  {tag}" if tag else "", size=12, color=RED, bold=True)])],
         anchor=MSO_ANCHOR.MIDDLE)
    cy = y + 1.0
    for it in its:
        rect(s, x + 0.3, cy + 0.03, 0.2, 0.2, fill=WHITE, line=RED, lw=1.5)
        lines = 1 + int(len(it) * 12.5 * 0.0085 / 4.9)
        text(s, x + 0.7, cy, 5.0, lines * 0.22, it, size=12.5, spacing=1.05)
        cy += lines * 0.22 + 0.11
notes(s, "СЛАЙД 11. Визуал по ТЗ: чек-лист в виде иконок (чекбоксы + номера).")

# ══════════════ 12. ЭКОНОМИКА ════════════════════════════════════════
s = slide()
title(s, "Сколько стоит лид без бюджета", x=0.9, y=1.6, w=8, size=30, kicker="Экономика: стоимость лида 0 ₽", lines=1)
rowsT = [("Канал", "Стоимость лида", "Источник"),
         ("Контекст / таргет", "от 3 000 ₽", "Платно"),
         ("UGC-контент", "0 ₽", "Свои силы"),
         ("Агенты влияния", "0 ₽ (оплата по факту сделки)", "Охрана, соседи, чаты"),
         ("Партнёрский трафик", "0 ₽ (10% от сделки)", "Агентства, бизнесы")]
colw = [2.55, 2.75, 2.15]
tx, ty = 0.6, 2.45
rh = [0.55, 0.8, 0.8, 0.8, 0.8]
cy = ty
for ri, row in enumerate(rowsT):
    cx0 = tx
    for ci, cell in enumerate(row):
        if ri == 0:
            rect(s, cx0, cy, colw[ci], rh[ri], fill=DARK)
            text(s, cx0 + 0.15, cy, colw[ci] - 0.3, rh[ri], cell, size=12, color=WHITE, bold=True, caps=True, anchor=MSO_ANCHOR.MIDDLE)
        else:
            paid = ri == 1
            rect(s, cx0, cy, colw[ci], rh[ri], fill=(PINK if not paid else LIGHT), line=WHITE, lw=2)
            big = ci == 1
            text(s, cx0 + 0.15, cy, colw[ci] - 0.3, rh[ri], cell, size=(15 if big else 12.5),
                 bold=(ci in (0, 1)), color=(GREY if paid else (RED if big else DARK)), anchor=MSO_ANCHOR.MIDDLE, spacing=1.0)
        cx0 += colw[ci]
    cy += rh[ri]
rect(s, tx, 6.4, sum(colw), 0.8, fill=RED)
text(s, tx + 0.25, 6.4, sum(colw) - 0.5, 0.8, "Воронка: контент + агенты + партнёры → лиды → показы → сделки.",
     size=13.5, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE)
fx, fw = 8.9, 3.95
stages = [("Контент + агенты + партнёры", RED), ("Лиды", RED_DK), ("Показы", RGBColor(0x9C, 0x1A, 0x17)), ("Сделки", DARK)]
sy = 2.45
for i, (lab, col) in enumerate(stages):
    top_w = fw - i * 0.75
    bot_w = fw - (i + 1) * 0.75
    x0 = fx + (fw - top_w) / 2
    fb = s.shapes.build_freeform(Inches(x0), Inches(sy))
    fb.add_line_segments([(Inches(x0 + top_w), Inches(sy)),
                          (Inches(x0 + top_w - (top_w - bot_w) / 2), Inches(sy + 1.0)),
                          (Inches(x0 + (top_w - bot_w) / 2), Inches(sy + 1.0))])
    sh = fb.convert_to_shape()
    sh.fill.solid(); sh.fill.fore_color.rgb = col; sh.line.color.rgb = WHITE; sh.line.width = Pt(2); _nostyle(sh)
    text(s, x0 + 0.3, sy, top_w - 0.6, 1.0, lab, size=(11.5 if i == 0 else 15), color=WHITE, bold=True,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, caps=(i > 0), spacing=1.0)
    sy += 1.05
notes(s, "СЛАЙД 12. Визуал по ТЗ: воронка продаж + цифры по вашей практике. "
         "Добавьте свои цифры (лиды → показы → сделки) в блоки воронки — в макете стоят только названия этапов.")

# ══════════════ 13. ФОРМУЛА И ВЫВОДЫ ═════════════════════════════════
s = slide()
rect(s, 0, TOP, 7.3, H - TOP, fill=RED)
title(s, "Формула системы", x=0.8, y=1.5, w=6, size=15, color=WHITE, bar=None, lines=1)
fl = ["UGC-контент", "+ Агенты влияния", "+ Партнёрский трафик", "+ CRM"]
cy = 2.2
for t in fl:
    text(s, 0.8, cy, 6.2, 0.7, t, size=27, color=WHITE, bold=True, caps=True)
    cy += 0.8
rect(s, 0.8, cy + 0.05, 5.9, 0.04, fill=WHITE)
text(s, 0.8, cy + 0.3, 6.2, 1.3, "= поток клиентов без бюджета", size=27, color=WHITE, bold=True, caps=True, spacing=1.05)
text(s, 7.9, 1.5, 5, 0.4, "Выводы", size=14, color=RED, bold=True, caps=True)
concl = ["Нулевой бюджет — это система, а не разовые акции", "Каждый канал усиливает другой",
         "Главное — фиксировать и быстро платить"]
cy = 2.05
for i, c in enumerate(concl):
    rrect(s, 7.9, cy, 4.95, 1.5, fill=PINK, r=0.18)
    text(s, 8.15, cy + 0.1, 1.0, 1.3, str(i + 1), size=44, color=RED, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 9.1, cy + 0.1, 3.55, 1.3, c, size=16, bold=True, anchor=MSO_ANCHOR.MIDDLE, spacing=1.08)
    cy += 1.7
notes(s, "СЛАЙД 13. Формула крупно + три вывода.")

# ══════════════ 14. МАТЕРИАЛЫ И КОНТАКТЫ ═════════════════════════════
s = slide()
pic(s, f"{PH}/cover_autumn.jpg", 0, TOP, W, H - TOP, focus=(0.5, 0.5))
rect(s, 0, TOP, W, H - TOP, fill=DARK, alpha=62)
logo(s, 0.7, TOP + 0.3, 2.3, white=True)
rect(s, 3.5, TOP + 0.4, 0.07, 0.6, fill=RED)
title(s, "Материалы и контакты", x=3.75, y=TOP + 0.4, w=8.5, size=30, color=WHITE, bar=None, lines=1)
qr = qrcode.QRCode(border=1, box_size=10)
qr.add_data("https://t.me/puzzlerealty"); qr.make(fit=True)
qr.make_image(fill_color="black", back_color="white").save(os.path.join(TMP, "qr_tg.png"))
rrect(s, 1.9, 2.85, 3.4, 3.4, fill=WHITE, r=0.18)
rrect(s, 2.15, 3.1, 2.9, 2.9, fill=None, line=RED, lw=1.5, r=0.08, )
ln = s.shapes[-1].line._get_or_add_ln()
ln.append(ln.makeelement(qn("a:prstDash"), {"val": "dash"}))
text(s, 2.15, 3.1, 2.9, 2.9, [dict(text="вставить QR", size=16), dict(text="на материалы", size=16)],
     color=GREY, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
rrect(s, 8.03, 2.85, 3.4, 3.4, fill=WHITE, r=0.18)
s.shapes.add_picture(os.path.join(TMP, "qr_tg.png"), Inches(8.28), Inches(3.1), Inches(2.9), Inches(2.9))
text(s, 1.0, 6.45, 5.2, 0.75, [dict(text="Материалы к выступлению", size=14, bold=True),
                               dict(text="чек-лист менеджера • памятка А5 • шаблон дорхентера", size=10.5)],
     color=WHITE, align=PP_ALIGN.CENTER, spacing=1.05)
text(s, 7.13, 6.45, 5.2, 0.75, [dict(text="Telegram-канал", size=14, bold=True),
                                dict(text="скрипты, кейсы, шаблоны и материалы по загородной недвижимости в СПб и ЛО", size=10.5)],
     color=WHITE, align=PP_ALIGN.CENTER, spacing=1.05)
notes(s, "СЛАЙД 14. Два QR-кода крупно. Справа — QR на t.me/puzzlerealty (взято из контактов вашей прошлой презентации; "
         "проверьте, что это нужный канал). Слева — заглушка: вставить QR на материалы.")

# ══════════════ сохранение + тема (шрифт и цвета бренда) ═════════════
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
OUT = os.path.join(HERE, "out", "puzzle-realty-zero-budget.pptx")
raw = os.path.join(TMP, "raw.pptx")
prs.save(raw)

BRAND = {"accent1": "E72F2A", "accent2": "1B3A8C", "accent3": "E6C88F", "accent4": "FAD5D4",
         "accent5": "C4221E", "accent6": "6B6B6B", "dk2": "1A1A1A", "lt2": "FCE9E8"}
with zipfile.ZipFile(raw) as zi, zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zo:
    for it in zi.infolist():
        data = zi.read(it.filename)
        if it.filename.startswith("ppt/theme/theme") and it.filename.endswith(".xml"):
            t = data.decode("utf8")
            t = re.sub(r'(<a:(?:major|minor)Font>\s*<a:latin typeface=")[^"]*', r"\g<1>" + FONT, t)
            for k, v in BRAND.items():
                t = re.sub(rf'(<a:{k}>)<a:srgbClr val="[0-9A-Fa-f]{{6}}"', rf'\g<1><a:srgbClr val="{v}"', t)
            data = t.encode("utf8")
        zo.writestr(it, data)
print("saved", OUT)
