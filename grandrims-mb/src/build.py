import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gfx import *
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
from lxml import etree

TOTAL = 13
F_L, F_R, F_M, F_S = 'Montserrat Light', 'Montserrat', 'Montserrat Medium', 'Montserrat SemiBold'
WHITE = (255, 255, 255); SILV = (196, 201, 206); COLD = (140, 147, 154); INK = (11, 13, 16); GRAYT = (74, 80, 88)
MARGIN = 84

px = lambda v: int(round(v * 6350))
rgb = lambda c: RGBColor(*c)

prs = Presentation()
prs.slide_width, prs.slide_height = Emu(6858000), Emu(12192000)
BLANK = prs.slide_layouts[6]


# ------------------------------------------------------------------ pptx helpers
def new_slide(bg_path):
    s = prs.slides.add_slide(BLANK)
    if bg_path:
        s.shapes.add_picture(bg_path, 0, 0, px(W), px(H))
    return s


def pic(s, path, x, y, w, h, name=None):
    p = s.shapes.add_picture(path, px(x), px(y), px(w), px(h))
    if name: p.name = name
    return p


def rect(s, x, y, w, h, color, alpha=None, line=None):
    r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, px(x), px(y), px(w), px(h))
    r.fill.solid(); r.fill.fore_color.rgb = rgb(color)
    if alpha is not None:
        sf = r.fill._xPr.find(qn('a:solidFill'))[0]
        a = etree.SubElement(sf, qn('a:alpha')); a.set('val', str(int(alpha * 100000)))
    r.line.fill.background()
    r.shadow.inherit = False
    return r


def hline(s, x, y, w, color, weight=1.0, alpha=None):
    return rect(s, x, y, w, max(1, weight), color, alpha)


def vline(s, x, y, h, color, weight=1.0, alpha=None):
    return rect(s, x, y, max(1, weight), h, color, alpha)


def text(s, x, y, w, h, paras, anchor='t', name=None):
    """paras: list of dict(runs=[(text,font,size_px,color,extra)], align, ls (px exact or None), after (px), spc)"""
    tb = s.shapes.add_textbox(px(x), px(y), px(w), px(h))
    if name: tb.name = name
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = {'t': MSO_ANCHOR.TOP, 'm': MSO_ANCHOR.MIDDLE, 'b': MSO_ANCHOR.BOTTOM}[anchor]
    first = True
    for pd in paras:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = {'l': PP_ALIGN.LEFT, 'r': PP_ALIGN.RIGHT, 'c': PP_ALIGN.CENTER}[pd.get('align', 'l')]
        if pd.get('ls'): p.line_spacing = Pt(pd['ls'] * 0.5)
        if pd.get('lsm'): p.line_spacing = pd['lsm']
        if pd.get('after') is not None: p.space_after = Pt(pd['after'] * 0.5)
        p.space_before = Pt(0)
        for run in pd['runs']:
            if run == 'BR':
                p.add_line_break(); continue
            t, font, size, color = run[:4]
            extra = run[4] if len(run) > 4 else {}
            r = p.add_run(); r.text = t
            r.font.size = Pt(size * 0.5); r.font.color.rgb = rgb(color); r.font.name = font
            rPr = r._r.get_or_add_rPr(); rPr.set('lang', 'ru-RU')
            if pd.get('spc') or extra.get('spc'):
                rPr.set('spc', str(int((extra.get('spc') or pd.get('spc')) * 50)))
            for tag in ('a:ea', 'a:cs'):
                e = etree.SubElement(rPr, qn(tag)); e.set('typeface', font)
    return tb


def P(*runs, **kw):
    d = dict(runs=list(runs)); d.update(kw); return d


def eyebrow(s, x, y, label, color=SILV, red=True, align='l', w=700):
    if red:
        rect(s, x, y + 12, 34, 2, RED)
        text(s, x + 54, y, w, 34, [P((label.upper(), F_M, 22, color, {'spc': 4}))])
    else:
        text(s, x, y, w, 34, [P((label.upper(), F_M, 22, color, {'spc': 4}))], name='eyebrow')


def footer(s, n, dark=True, show_brand=True):
    c = COLD if dark else (110, 116, 122)
    text(s, MARGIN, 1838, 500, 30, [P(('GRANDRIMS', F_M, 20, c, {'spc': 5}))])
    rect(s, MARGIN - 20, 1846, 8, 8, RED)
    text(s, W - MARGIN - 300, 1838, 300, 30, [dict(runs=[(f'{n:02d}', F_M, 20, WHITE if dark else INK, {'spc': 3}), (f' / {TOTAL}', F_M, 20, c, {'spc': 3})], align='r')])


def notes(s, t):
    s.notes_slide.notes_text_frame.text = t


HL = lambda t, size=88, color=WHITE, font=F_L: (t, font, size, color)

# ------------------------------------------------------------------ assets
logo_path, (LW, LH) = logo_variants()
wh4 = load('wheels4'); gcl = load('g_class'); bset = load('brake_set'); bsingle = load('brake_single')
gls = load('gls_black'); sw = load('s_white'); w124 = load('w124'); may = load('maybach'); vcl = load('vclass')

# ================================================================== 01 COVER
bg = base_dark(hot=(0.8, 0.08), hot_amt=16)
bg = add_layer(bg, star_layer(880, 330, 470, alpha=0.075), (214, 220, 226))
# GLS: scale 1.2 -> 1536x864, crop 1080 around the car
ph = grade(crop_fill(gls, (233, 0, 1075, 674), (1080, 864)), sat=0.80, contrast=1.10, gamma=1.06, cool=0.05, vign=0.35, grain=3.0)
bg = paste_faded(bg, ph, 0, 600, fade_top=330, fade_bot=300)
cover_bg = save_jpg(bg, 'bg01.jpg')
s = new_slide(cover_bg)
pic(s, logo_path, MARGIN, 96, 236, 236 * LH / LW, 'GRANDRIMS logo')
text(s, W - MARGIN - 420, 108, 420, 34, [P(('КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ', F_M, 20, COLD, {'spc': 4}), align='r')])
text(s, MARGIN, 310, 920, 380, [
    P(('Индивидуальные', F_L, 92, WHITE), ls=100),
    P(('решения', F_L, 92, WHITE), ls=100),
    P(('для автомобилей', F_L, 92, SILV), ls=100),
    P(('Mercedes-Benz', F_M, 92, WHITE), ls=100)], name='Title')
hline(s, MARGIN, 1688, W - 2 * MARGIN, SILV, 1, 0.35)
rect(s, MARGIN, 1687, 60, 3, RED)
text(s, MARGIN, 1722, 900, 44, [P(('Mercedes-Benz. Управляй комфортом.', F_M, 32, WHITE, {'spc': 1}))])
notes(s, 'Обложка. Фото: чёрный GLS. Фраза «Mercedes-Benz. Управляй комфортом.» — статусная строка из брифа.')

# ================================================================== 02 IMAGE ENTRY (light)
bg = base_light()
photo = crop_fill(sw, (150, 0, 1230, 719), (1080, 719))
photo = grade(photo, sat=0.75, contrast=1.06, cool=0.04, grain=2.4, mult=0.97)
bg.paste(photo, (0, 1000))
b2 = save_jpg(bg, 'bg02.jpg')
s = new_slide(b2)
eyebrow(s, MARGIN, 96, 'Философия', color=GRAYT)
text(s, MARGIN, 200, 900, 330, [
    P(('Создано под', F_L, 96, INK), ls=104),
    P(('характер', F_L, 96, INK), ls=104),
    P(('автомобиля', F_L, 96, INK), ls=104)], name='Title')
text(s, MARGIN, 620, 800, 330, [P(
    ('GRANDRIMS создаёт индивидуальные колёсные решения для автомобилей Mercedes-Benz с учётом дизайна, параметров и характера конкретной модели.', F_L, 36, GRAYT), ls=54)], name='Body')
text(s, MARGIN, 1770, 600, 30, [P(('S-Class', F_M, 20, GRAYT, {'spc': 4}))])
footer(s, 2, dark=False)
notes(s, 'Имиджевый вход. Фото: белый S-Class.')

# ================================================================== 03 FORGED WHEELS
bg = base_dark(hot=(0.2, 0.3), hot_amt=12)
bg = add_layer(bg, star_layer(1040, 1100, 520, alpha=0.055), (214, 220, 226))
# two detail crops, staggered
d1 = grade(crop_fill(gls, (645, 318, 862, 640), (440, 700)), sat=0.85, contrast=1.10, cool=0.04, vign=0.25, grain=3.2)
d2 = grade(crop_fill(sw, (566, 296, 783, 618), (440, 700)), sat=0.80, contrast=1.06, cool=0.04, vign=0.25, grain=3.2)
bg.paste(d1, (84, 990)); bg.paste(d2, (556, 1060))
b3 = save_jpg(bg, 'bg03.jpg')
s = new_slide(b3)
eyebrow(s, MARGIN, 96, 'Кованые диски')
text(s, MARGIN, 190, 920, 300, [
    P(('Кованые диски', F_L, 84, WHITE), ls=92),
    P(('для Mercedes-Benz', F_L, 84, WHITE), ls=92),
    P(('под любые задачи', F_L, 84, SILV), ls=92)], name='Title')
text(s, MARGIN, 508, 880, 120, [P(('Инженерная точность, высокая прочность и сниженный вес.', F_L, 36, SILV), ls=54)])
hline(s, MARGIN, 690, W - 2 * MARGIN, SILV, 1, 0.3)
text(s, MARGIN, 700, 560, 220, [P(('18–24″', F_L, 168, WHITE), ls=190)], name='Sizes')
text(s, 650, 738, 346, 40, [P(('ДОСТУПНЫЕ РАЗМЕРЫ', F_M, 20, COLD, {'spc': 4}))])
text(s, 650, 790, 346, 150, [P(('Индивидуальное исполнение с учётом дизайна, параметров и нагрузок автомобиля.', F_L, 27, SILV), ls=39)])
text(s, 84, 1700, 440, 30, [P(('GLS', F_M, 20, COLD, {'spc': 4}))])
text(s, 556, 1770, 440, 30, [P(('S-CLASS', F_M, 20, COLD, {'spc': 4}))])
footer(s, 3)
notes(s, 'Кованые диски. Детали колёс — кадрированные фрагменты фото GLS и S-Class. Если пришлёт предметные фото дисков GRANDRIMS — заменить этими кадрами.')

# ================================================================== 04 TECH
bg = base_dark(hot=(0.9, 0.5), hot_amt=10)
wheel = crop_fill(sw, (570, 300, 790, 540), (1300, 1418))
wheel = wheel.filter(ImageFilter.GaussianBlur(5))
wa = grade(wheel, sat=0.3, contrast=1.05, mult=0.55, grain=2)
wbg = np.asarray(bg).astype(np.float32); wp = np.asarray(wa).astype(np.float32)
# ambient blurred wheel, right side, low alpha
canvas = np.zeros((H, W, 3), np.float32)
xo, yo = 0, 300
hh = min(1400, wp.shape[0])
crop_w = wp[0:hh, 220:220 + W]
mask = np.zeros((H, W), np.float32); mask[yo:yo + hh, :] = (0.22 * smooth(np.minimum(np.arange(hh) / 260.0, (hh - 1 - np.arange(hh)) / 260.0)))[:, None]
canvas[yo:yo + hh] = crop_w
bb = wbg * (1 - mask[..., None]) + canvas * mask[..., None]
bg = Image.fromarray(np.clip(bb, 0, 255).astype(np.uint8))
bg = add_layer(bg, star_layer(120, 1660, 470, alpha=0.06), (214, 220, 226))
b4 = save_jpg(bg, 'bg04.jpg')
s = new_slide(b4)
eyebrow(s, MARGIN, 96, 'Технологии')
text(s, MARGIN, 190, 920, 200, [
    P(('Технология', F_L, 84, WHITE), ls=92),
    P(('в основе', F_L, 84, SILV), ls=92)], name='Title')
rows = [
    ('6061-T6', 'Кованый алюминиевый сплав авиационного класса'),
    ('18–24″', 'Размеры от 18 до 24 дюймов под параметры автомобиля'),
    ('3D', 'Визуализация и точная подгонка до запуска в производство'),
    ('от 15', 'рабочих дней — производство индивидуального комплекта'),
    ('∞', 'Гарантия на целостность конструкции дисков на весь срок эксплуатации'),
]
y0, rh = 460, 204
for i, (big, cap) in enumerate(rows):
    y = y0 + i * rh
    hline(s, MARGIN, y, W - 2 * MARGIN, SILV, 1, 0.28)
    if big == '∞':
        text(s, MARGIN, y + 34, 520, 140, [P(('Пожизненная', F_L, 64, WHITE), ls=72), P(('гарантия', F_L, 64, WHITE), ls=72)])
    else:
        text(s, MARGIN, y + 26, 520, 150, [P((big, F_L, 112, WHITE), ls=130)])
    text(s, 590, y + 40, 406, 150, [P((cap, F_L, 28, SILV), ls=39)])
hline(s, MARGIN, y0 + 5 * rh, W - 2 * MARGIN, SILV, 1, 0.28)
yb = y0 + 5 * rh + 44
text(s, MARGIN, yb, 420, 200, [
    P(('СЕРВИС', F_M, 20, COLD, {'spc': 4}), after=10),
    P(('Сопровождение на этапах дизайна, производства и установки.', F_L, 26, SILV), ls=37)])
text(s, 560, yb, 436, 200, [
    P(('ГОТОВЫЕ КОМПЛЕКТЫ', F_M, 20, COLD, {'spc': 4}), after=10),
    P(('Шины, датчики давления и аксессуары — в сборе.*', F_L, 26, SILV), ls=37)])
text(s, MARGIN, 1752, 912, 60, [P(('* Актуальные цены на шины, колёсные датчики и аксессуары предоставляются менеджером по запросу.', F_L, 20, COLD), ls=28)])
footer(s, 4)
notes(s, 'Технологии и преимущества. Все факты — из исходного КП: 6061-T6, 18–24″, 3D, от 15 рабочих дней, пожизненная гарантия на целостность конструкции, сервис, готовые комплекты.')

# ================================================================== 05 DESIGN (light)
bg = base_light()
def tile(im, box, size, **kw):
    return grade(crop_fill(im, box, size), **dict(dict(sat=0.95, contrast=1.06, cool=0.03, grain=2.6), **kw))
hero = tile(wh4, (0, 0, 1280, 1048), (912, 747), sat=1.0, contrast=1.05, cool=0.02, mult=1.0)
tw, th, ty0 = 288, 230, 1195
t1 = tile(sw, (578, 348, 788, 516), (tw, th))
t2 = tile(may, (685, 738, 895, 906), (tw, th))
t3 = tile(gls, (647, 368, 857, 536), (tw, th))
bg.paste(hero, (84, 420))
xs = (84, 84 + tw + 24, 84 + 2 * (tw + 24))
for x, t in zip(xs, (t1, t2, t3)): bg.paste(t, (x, ty0))
b5 = save_jpg(bg, 'bg05.jpg')
s = new_slide(b5)
eyebrow(s, MARGIN, 96, 'Дизайн дисков', color=GRAYT)
text(s, MARGIN, 190, 920, 240, [
    P(('Дизайн в характере', F_L, 84, INK), ls=92),
    P(('автомобиля', F_L, 84, INK), ls=92)], name='Title')
for (x, y), n in (((84, 420), '01'), ((xs[0], ty0), '02'), ((xs[1], ty0), '03'), ((xs[2], ty0), '04')):
    rect(s, x, y, 66, 44, INK, 0.62)
    text(s, x + 16, y + 9, 80, 30, [P((n, F_M, 22, WHITE, {'spc': 3}))])
leg = [('01', 'Кованый комплект', 'чёрный лак, контрастная кромка'), ('02', 'Многоспицевый', 'турбинный рисунок'),
       ('03', 'Maybach-style', 'хром и объём'), ('04', 'Массивный моноблок', 'чёрный лак, полированная кромка')]
y = 1458
for n, a, b in leg:
    hline(s, MARGIN, y, W - 2 * MARGIN, INK, 1, 0.22)
    text(s, MARGIN, y + 18, 90, 40, [P((n, F_M, 22, GRAYT, {'spc': 3}))])
    text(s, 190, y + 10, 700, 44, [P((a, F_M, 30, INK))])
    text(s, 190, y + 46, 780, 34, [P((b, F_L, 24, GRAYT))])
    y += 88
footer(s, 5, dark=False)
notes(s, 'Дизайн дисков. 01 — предметное фото комплекта GRANDRIMS; 02–04 — фрагменты фото автомобилей (S-Class, Maybach GLS, GLS).')

# ================================================================== 06 MAYBACH
bg = base_dark(hot=(0.5, 0.35), hot_amt=10, lines=False)
ph = grade(crop_fill(may, (0, 0, 960, 1280), (1080, 1440)), sat=0.62, contrast=1.16, gamma=1.28, cool=0.06, vign=0.4, grain=3.0, mult=0.86)
bg = paste_faded(bg, ph, 0, 480, fade_top=420, fade_bot=160)
# detail ring (chrome wheel) bottom right
wd = grade(crop_fill(may, (696, 726, 884, 914), (280, 280)), sat=0.7, contrast=1.14, gamma=1.1, cool=0.05, grain=2.8, mult=0.9)
mask = Image.new('L', (280, 280), 0); ImageDraw.Draw(mask).ellipse((0, 0, 279, 279), fill=255)
bgc = bg.copy(); bgc.paste(wd, (716, 1500), mask)
dr = ImageDraw.Draw(bgc); dr.ellipse((716 - 10, 1500 - 10, 716 + 290, 1500 + 290), outline=(196, 201, 206), width=2)
bg = bgc
b6 = save_jpg(bg, 'bg06.jpg')
s = new_slide(b6)
eyebrow(s, MARGIN, 96, 'Maybach-style')
text(s, MARGIN, 180, 920, 300, [
    P(('Сдержанная', F_L, 100, WHITE), ls=108),
    P(('роскошь', F_L, 100, WHITE), ls=108)], name='Title')
hline(s, MARGIN, 1596, 470, SILV, 1, 0.5)
text(s, MARGIN, 1626, 540, 150, [P(('Полированный металл и монолитный рисунок. Фактура в главной роли.', F_L, 30, SILV), ls=44)])
footer(s, 6)
notes(s, 'Maybach / luxury. Фото: белый Maybach GLS с полированными дисками; круглая вставка — фрагмент колеса.')

# ================================================================== 07 AMG / PERFORMANCE
ph = crop_fill(w124, (175, 0, 895, 1280), (1080, 1920))
bg = grade(ph, sat=0.92, contrast=1.14, gamma=1.12, cool=0.03, vign=0.45, grain=3.4, mult=0.94)
a = np.maximum(vgrad(H, 0.55, 0.0, 0, 380), vgrad(H, 0.0, 0.92, 1240, 1760))
arr = np.zeros((H, W, 4), np.uint8); arr[..., :3] = (5, 6, 8); arr[..., 3] = (np.repeat(a[:, None], W, 1) * 255).astype(np.uint8)
bgi = bg.convert('RGBA'); bgi.alpha_composite(Image.fromarray(arr)); bg = bgi.convert('RGB')
b7 = save_jpg(bg, 'bg07.jpg')
s = new_slide(b7)
eyebrow(s, MARGIN, 96, 'Performance')
text(s, MARGIN, 1372, 920, 330, [
    P(('Динамика', F_L, 104, WHITE), ls=110),
    P(('в каждой', F_L, 104, WHITE), ls=110),
    P(('детали', F_L, 104, WHITE), ls=110)], name='Title')
text(s, MARGIN, 1716, 700, 70, [P(('Многоспицевые и спортивные рисунки — с характером, но без излишеств.', F_L, 27, SILV), ls=38)])
footer(s, 7)
notes(s, 'AMG / Performance. Фото: красный W124 с пятилучевыми дисками. Для более «AMG»-подачи можно заменить на фото с AMG-автомобилем.')

# ================================================================== 08 G-CLASS
bg = base_dark(hot=(0.5, 0.4), hot_amt=12)
bg = add_layer(bg, star_layer(900, 300, 440, alpha=0.06), (214, 220, 226))
ph = grade(crop_fill(gcl, (50, 190, 1210, 930), (1080, 689)), sat=0.66, contrast=1.14, gamma=1.28, cool=0.06, vign=0.35, grain=3.0, mult=0.9)
bg = paste_faded(bg, ph, 0, 470, fade_top=300, fade_bot=230)
b8 = save_jpg(bg, 'bg08.jpg')
s = new_slide(b8)
eyebrow(s, MARGIN, 96, 'G-Class')
text(s, MARGIN, 1300, 920, 240, [
    P(('Характер', F_L, 88, WHITE), ls=98),
    P(('без компромиссов', F_L, 88, WHITE), ls=98)], name='Title')
text(s, MARGIN, 1550, 720, 100, [P(('Массивные кованые диски, рассчитанные на нагрузки и характер G-Class.', F_L, 30, SILV), ls=44)])
footer(s, 8)
notes(s, 'G-Class. Водяной знак с исходного фото убран кадрированием.')

# ================================================================== 09 BRAKES
bg = base_dark(hot=(0.5, 0.5), hot_amt=10)
bg = add_layer(bg, star_layer(960, 300, 400, alpha=0.06), (214, 220, 226))
b9 = save_jpg(bg, 'bg09.jpg')
ph9 = save_jpg(grade(crop_fill(bset, (60, 0, 1170, 885), (1080, 860)), sat=1.0, contrast=1.08, gamma=1.12, cool=0.02, vign=0.3, grain=2.6, mult=0.95), 'brakes_set.jpg')
s = new_slide(b9)
eyebrow(s, MARGIN, 96, 'Тормозные системы')
text(s, MARGIN, 186, 920, 400, [
    P(('Тормозные комплекты', F_L, 68, WHITE), ls=78),
    P(('на оригинальных', F_L, 68, WHITE), ls=78),
    P(('компонентах', F_L, 68, WHITE), ls=78),
    P(('Mercedes-Benz', F_M, 68, WHITE), ls=78)], name='Title')
pic(s, ph9, 0, 640, W, 860, 'Photo — brake set')
hline(s, 0, 640, W, SILV, 1, 0.4); hline(s, 0, 1500, W, SILV, 1, 0.4)
cols = [('СУППОРТЫ', 'AMG'), ('ДИСКИ', 'Карбон-керамика'), ('КОМПОНЕНТЫ', 'Оригинальные')]
cw = (W - 2 * MARGIN) / 3
for i, (a_, b_) in enumerate(cols):
    x = MARGIN + i * cw
    hline(s, x, 1570, cw - 24, SILV, 1, 0.4)
    text(s, x, 1592, cw - 24, 30, [P((a_, F_M, 20, COLD, {'spc': 4}))])
    text(s, x, 1630, cw - 10, 80, [P((b_, F_L, 32, WHITE), ls=40)])
footer(s, 9)
notes(s, 'Тормозные комплекты AMG Carbon Ceramic. Водяной знак с исходного фото убран кадрированием.')

# ================================================================== 10 CARBON CERAMIC G 63
bg = base_dark(hot=(0.5, 0.35), hot_amt=14, lines=False)
b10 = save_jpg(bg, 'bg10.jpg')
ph10 = save_jpg(grade(crop_fill(bsingle, (0, 5, 960, 645), (1080, 720)), sat=1.0, contrast=1.10, gamma=1.14, cool=0.02, vign=0.32, grain=2.6, mult=0.95), 'brake_g63.jpg')
s = new_slide(b10)
eyebrow(s, MARGIN, 96, 'Отдельное предложение')
text(s, MARGIN, 176, 920, 300, [
    P(('Карбон-керамическая', F_L, 66, WHITE), ls=76),
    P(('тормозная система', F_L, 66, WHITE), ls=76),
    P(('Mercedes-Benz G 63', F_M, 66, WHITE), ls=76)], name='Title')
pic(s, ph10, 0, 440, W, 720, 'Photo — G 63 carbon ceramic')
hline(s, 0, 440, W, SILV, 1, 0.5); hline(s, 0, 1160, W, SILV, 1, 0.5)
text(s, MARGIN, 1196, 920, 400, [
    dict(runs=[('Стоимость представленного на фотографии комплекта карбон-керамической тормозной системы для Mercedes-Benz G 63 составляет', F_L, 34, SILV), 'BR', ('… ₽.', F_S, 150, WHITE)], lsm=1.25)
], name='Price text')
hline(s, MARGIN, 1610, 120, SILV, 1, 0.6)
text(s, MARGIN, 1634, 912, 150, [P(('Стоимость тормозной системы для конкретной модели автомобиля рассчитывается индивидуально с учётом конфигурации и необходимых компонентов.', F_L, 25, COLD), ls=36)], name='Note')
footer(s, 10)
notes(s, 'ТРЕБУЕТСЯ: внести цену вместо «…» в текстовом поле «Price text». Цена не придумана.')

# ================================================================== 11 PROCESS
bg = base_dark(hot=(0.15, 0.6), hot_amt=10)
bg = add_layer(bg, star_layer(980, 1500, 560, alpha=0.055), (214, 220, 226))
b11 = save_jpg(bg, 'bg11.jpg')
s = new_slide(b11)
eyebrow(s, MARGIN, 96, 'Процесс')
text(s, MARGIN, 190, 920, 300, [
    P(('От концепции', F_L, 84, WHITE), ls=92),
    P(('до готового', F_L, 84, WHITE), ls=92),
    P(('комплекта', F_L, 84, SILV), ls=92)], name='Title')
steps = [('01', 'Автомобиль', 'Модель, параметры и задачи'),
         ('02', 'Разработка дизайна', 'Рисунок диска под характер модели'),
         ('03', '3D-моделирование', 'Визуализация и точная подгонка параметров'),
         ('04', 'Производство', 'Сплав 6061-T6, от 15 рабочих дней'),
         ('05', 'Готовый комплект', 'С шинами, датчиками давления и аксессуарами')]
y0, rh = 580, 250
vline(s, 170, y0 + 30, rh * 4 + 20, SILV, 1, 0.3)
for i, (n, a_, b_) in enumerate(steps):
    y = y0 + i * rh
    text(s, MARGIN, y, 90, 60, [P((n, F_M, 26, SILV, {'spc': 3}))])
    rect(s, 166, y + 12, 9, 9, RED if i == 4 else SILV)
    text(s, 230, y - 8, 780, 60, [P((a_, F_L, 52, WHITE), ls=60)])
    text(s, 230, y + 62, 760, 90, [P((b_, F_L, 28, (168, 174, 180)), ls=40)])
footer(s, 11)
notes(s, 'Процесс: автомобиль → разработка дизайна → 3D → производство → готовый комплект.')

# ================================================================== 12 CONDITIONS (light)
bg = base_light()
b12 = save_jpg(bg, 'bg12.jpg')
s = new_slide(b12)
eyebrow(s, MARGIN, 96, 'Предложение', color=GRAYT)
text(s, MARGIN, 180, 920, 250, [
    P(('Индивидуальные условия', F_L, 66, INK), ls=76),
    P(('сотрудничества', F_L, 66, INK), ls=76)], name='Title')
items = ['Подбор решений', 'Визуализация', 'Производство', 'Комплектация', 'Сопровождение']
y = 400
for i, it in enumerate(items):
    hline(s, MARGIN, y, W - 2 * MARGIN, INK, 1, 0.2)
    text(s, MARGIN, y + 26, 80, 30, [P((f'{i + 1:02d}', F_M, 22, GRAYT, {'spc': 3}))])
    text(s, 190, y + 14, 800, 50, [P((it, F_L, 38, INK))])
    y += 78
hline(s, MARGIN, y, W - 2 * MARGIN, INK, 1, 0.2)
# price table
ty = y + 56
text(s, MARGIN, ty, 700, 30, [P(('КОВАНЫЕ ДИСКИ · ПРАЙС-ЛИСТ', F_M, 22, GRAYT, {'spc': 4}))])
hy = ty + 50
cols_x = (MARGIN, 470, 996)
text(s, MARGIN, hy, 200, 30, [P(('РАЗМЕР', F_M, 20, GRAYT, {'spc': 3}))])
text(s, 400, hy, 260, 30, [P(('МОНОБЛОК', F_M, 20, GRAYT, {'spc': 3}), align='r')])
text(s, 700, hy, 296, 30, [P(('2-СОСТАВНЫЕ', F_M, 20, GRAYT, {'spc': 3}), align='r')])
mono = ['190 500', '201 500', '213 000', '235 000', '257 500', '280 000', '313 000']
two = ['320 000', '341 500', '364 000', '397 500', '442 500', '504 000', '543 000']
ry = hy + 46
for i, sz in enumerate(range(18, 25)):
    hline(s, MARGIN, ry, W - 2 * MARGIN, INK, 1, 0.16)
    text(s, MARGIN, ry + 18, 200, 44, [P((f'{sz}″', F_M, 34, INK))])
    text(s, 330, ry + 20, 330, 44, [P((f'от {mono[i]} ₽', F_L, 34, INK), align='r')])
    text(s, 666, ry + 20, 330, 44, [P((f'от {two[i]} ₽', F_L, 34, INK), align='r')])
    ry += 82
hline(s, MARGIN, ry, W - 2 * MARGIN, INK, 1, 0.16)
text(s, MARGIN, ry + 26, 912, 100, [P(('* Актуальные цены на шины, колёсные датчики и аксессуары предоставляются менеджером по запросу. Стоимость тормозных систем рассчитывается индивидуально.', F_L, 24, GRAYT), ls=34)])
footer(s, 12, dark=False)
notes(s, 'Прайс-лист перенесён без изменений из исходного КП (значения «от», моноблоки и 2-составные, 18–24″). Единица цены (за диск / за комплект) в исходнике не указана — при необходимости уточнить и добавить.')

# ================================================================== 13 FINAL
canvas = crop_fill(vcl, (0, 0, 731, 1280), (1080, 1920))
bg = grade(canvas, sat=0.55, contrast=1.14, gamma=1.22, cool=0.06, vign=0.4, grain=3.2, mult=0.9)
a = np.maximum(vgrad(H, 0.86, 0.0, 0, 760), vgrad(H, 0.0, 0.94, 1280, 1700))
arr = np.zeros((H, W, 4), np.uint8); arr[..., :3] = (5, 6, 8); arr[..., 3] = (np.repeat(a[:, None], W, 1) * 255).astype(np.uint8)
bgi = bg.convert('RGBA'); bgi.alpha_composite(Image.fromarray(arr)); bg = bgi.convert('RGB')
b13 = save_jpg(bg, 'bg13.jpg')
s = new_slide(b13)
pic(s, logo_path, MARGIN, 96, 236, 236 * LH / LW, 'GRANDRIMS logo')
text(s, MARGIN, 210, 920, 400, [
    P(('Создаём решения,', F_L, 88, WHITE), ls=98),
    P(('достойные', F_L, 88, WHITE), ls=98),
    P(('автомобиля', F_L, 88, SILV), ls=98)], name='Title')
y = 1470
hline(s, MARGIN, y, W - 2 * MARGIN, SILV, 1, 0.4); rect(s, MARGIN, y - 1, 60, 3, RED)
text(s, MARGIN, y + 34, 900, 40, [P(('г. Москва, ул. Барвихинская, д. 9', F_M, 32, WHITE))])
text(s, MARGIN, y + 100, 900, 44, [P(('8 800 201-72-94', F_M, 32, WHITE))])
text(s, MARGIN, y + 168, 460, 40, [P(('Telegram: @grand_rims', F_L, 28, SILV))])
text(s, 560, y + 168, 436, 40, [P(('info@grandrims.ru', F_L, 28, SILV), align='r')])
text(s, MARGIN, y + 218, 912, 40, [P(('www.grandrims.ru', F_L, 28, SILV))])
notes(s, 'Финал. Фото: чёрный V-Class. Контакты — из исходного КП.')

target = '/home/user/cjl-slides/grandrims-mb'
os.makedirs(target, exist_ok=True)
prs.save(os.path.join(target, 'GRANDRIMS_Mercedes-Benz_KP.pptx'))
print('saved')
