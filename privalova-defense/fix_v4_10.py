"""Правки к версии 4.10.26:
1) слайд 2: ссылки на авторов в квадратные скобки, единый стиль текста;
2) слайд 6: базы исследования в одном блоке, ссылки в квадратных скобках, единый стиль, блоки под текст;
3) слайд 7: слайд «Методы статистического исследования»;
4) слайд 27: легенда мельче и видимая.
Использование: python fix_v4_10.py in.pptx out.pptx
"""
import sys, re, copy
from pptx import Presentation
from pptx.util import Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from lxml import etree

NS = {"c": "http://schemas.openxmlformats.org/drawingml/2006/chart", "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
      "p": "http://schemas.openxmlformats.org/presentationml/2006/main"}
EMU = 914400.0
I = lambda v: Emu(int(round(v * EMU)))
TXT = RGBColor(0x2F, 0x3E, 0x55)
prs = Presentation(sys.argv[1])


def place(sh, x=None, y=None, w=None, h=None):
    if x is not None: sh.left = I(x)
    if y is not None: sh.top = I(y)
    if w is not None: sh.width = I(w)
    if h is not None: sh.height = I(h)


def by_name(s, n):
    return [sh for sh in s.shapes if sh.name == n]


def find(prefix):
    for s in prs.slides:
        for sh in s.shapes:
            if sh.has_text_frame and sh.text_frame.text.strip().startswith(prefix) and sh.top < I(1.2):
                return s


# ------------------------------------------------------------------ ссылки в квадратные скобки
CIT = re.compile(r"\(([^()]*?\d{4}[^()]*?)\)\s*$")


def bracket_paragraph(para, size=None):
    """Склеивает абзац в один стиль (по первому «основному» прогону), заключает ссылку в [ ]."""
    runs = para.runs
    if len(runs) < 2:
        return
    full = "".join(r.text for r in runs).replace(" ", " ")
    m = CIT.search(full)
    if m:
        full = full[:m.start()].rstrip() + " [" + m.group(1).strip() + "]"
    base = runs[0]
    base.text = re.sub(r"\s+", " ", full).strip()
    for r in runs[1:]:
        r._r.getparent().remove(r._r)
    base.font.name = None
    if size:
        base.font.size = Pt(size)


# ------------------------------------------------------------------ 2. Актуальность
s2 = find("Актуальность")
for n in ("Показатель 1", "Показатель 2", "Факт 1", "Факт 2", "Факт 3", "Вывод по актуальности", "Пустой блок 1", "Пустой блок 2"):
    for sh in by_name(s2, n):
        for para in sh.text_frame.paragraphs:
            if para.runs and len(para.runs) > 1 and para.runs[0].font.size and para.runs[0].font.size.pt <= 16:
                bracket_paragraph(para, 16)

# ------------------------------------------------------------------ 6. Дизайн исследования
s6 = find("Дизайн исследования")
# базы — в один блок
b1, b2 = by_name(s6, "База 1")[0], by_name(s6, "База 2")[0]
para = b1.text_frame.paragraphs[0]
r_lead, r_txt = para.runs[0], para.runs[1]
r_txt.text = ("Санаторий-профилакторий Научно-исследовательского Томского политехнического университета (НИ ТПУ); "
              "Томский научно-исследовательский институт курортологии и физиотерапии (Томский НИИКиФ ФФГБУ ФНКЦ МРИК ФМБА России)")
b2._element.getparent().remove(b2._element)
place(b1, x=0.5, y=1.0, w=12.33, h=0.9)

# ссылки в блоках методов: квадратные скобки, одинаковый шрифт
m1 = by_name(s6, "Метод 1")[0]
p1 = m1.text_frame.paragraphs[0]
runs = p1.runs
cit_runs = [r for r in runs if r.font.name == "Times New Roman"]
main = [r for r in runs if r.font.name != "Times New Roman"]
cit_text = re.sub(r"\s+", " ", "".join(r.text for r in cit_runs).replace(" ", " ")).strip()
cit_text = cit_text.replace("2020 Клинические", "2020; Клинические").replace("– Москва", "– Москва")
for r in cit_runs:
    r._r.getparent().remove(r._r)
main[-1].text = main[-1].text.rstrip() + " [" + cit_text + "]"
for r in p1.runs:
    r.font.size = Pt(16)
m2 = by_name(s6, "Метод 2")[0]
for para in m2.text_frame.paragraphs[1:]:
    full = re.sub(r"\s+", " ", "".join(r.text for r in para.runs)).strip()
    full = re.sub(r"^\((.*)\)$", r"[\1]", full)
    para.runs[0].text = full
    for r in para.runs[1:]:
        r._r.getparent().remove(r._r)
    r0 = para.runs[0]
    r0.font.name = None
    r0.font.size = Pt(16)
    r0.font.bold = True
for sh in by_name(s6, "Метод 3"):
    for para in sh.text_frame.paragraphs:
        if len(para.runs) > 1 and CIT.search("".join(r.text for r in para.runs)):
            bracket_paragraph(para, 16)

# геометрия колонок и вертикальный ритм
cols = [(0.5, 5.5), (6.24, 3.15), (9.63, 3.2)]
for sh in by_name(s6, "Рандомизация"): place(sh, y=1.98, h=0.4)
groups = ["Группа контроля (n=43)", "Группа сравнения (n=47)", "Основная группа (n=45)"]
for k, (x, w) in enumerate(cols, 1):
    place(by_name(s6, groups[k - 1])[0], x=x, y=2.5, w=w, h=0.36)
    subs = sorted([sh for sh in s6.shapes if sh.name.startswith("Подгруппа %d" % k)], key=lambda z: z.name)
    for j, sub in enumerate(subs):
        place(sub, x=x + j * (w / 2), y=2.86, w=w / 2 - 0.02, h=0.58)
    place(by_name(s6, "Метод %d" % k)[0], x=x, y=3.64, w=w, h=2.42)
centers = [x + w / 2 for x, w in cols]
for sh in by_name(s6, "Стрелка"):
    y, x = sh.top / EMU, sh.left / EMU
    if abs(y - 2.0) < 0.05:
        place(sh, y=1.9, h=0.08)
    elif abs(y - 2.5) < 0.05:
        k = min(range(3), key=lambda i: abs(centers[i] - x) if False else abs([2.85, 7.21, 11.03][i] - x))
        place(sh, x=centers[k], y=2.38, h=0.12)
    elif abs(y - 3.58) < 0.05:
        k = min(range(3), key=lambda i: abs([2.85, 7.21, 11.03][i] - x))
        place(sh, x=centers[k], y=3.44, h=0.2)

# ------------------------------------------------------------------ 7. Методы статистического исследования
s7 = prs.slides[6]
ref = prs.slides[7]  # слайд «Методы исследования» (макет CONTENT)
assert s7.shapes[0].has_text_frame and "статистическ" in s7.shapes[0].text_frame.text
for rel in s7.part.rels.values():
    if rel.reltype == RT.SLIDE_LAYOUT:
        rel._target = ref.slide_layout.part
title = s7.shapes[0]
txb = title._element.find("p:txBody", NS)
for pp in txb.findall("a:p", NS):
    txb.remove(pp)
p_new = etree.SubElement(txb, "{%s}p" % NS["a"])
r_new = etree.SubElement(p_new, "{%s}r" % NS["a"])
etree.SubElement(r_new, "{%s}rPr" % NS["a"]).set("lang", "ru-RU")
etree.SubElement(r_new, "{%s}t" % NS["a"]).text = "Методы статистического исследования"
sp = title._element.find("p:spPr", NS)
for ch in list(sp):
    sp.remove(ch)
# номер слайда — как на других слайдах
for sh in ref.shapes:
    if sh.name.startswith("Slide Number"):
        el = copy.deepcopy(sh._element)
        ids = [int(x.get("id")) for x in s7._element.iter("{%s}cNvPr" % NS["p"])]
        el.find(".//p:cNvPr", NS).set("id", str(max(ids) + 1))
        s7.shapes._spTree.append(el)

src_head = [sh for sh in ref.shapes if sh.name == "Клинические"][0]
src_body = [sh for sh in ref.shapes if sh.name == "Клинические — перечень"][0]


def clone(src, slide, name, x, y, w, h):
    el = copy.deepcopy(src._element)
    ids = [int(c.get("id")) for c in slide._element.iter("{%s}cNvPr" % NS["p"])]
    el.find(".//p:cNvPr", NS).set("id", str(max(ids) + 1))
    el.find(".//p:cNvPr", NS).set("name", name)
    slide.shapes._spTree.append(el)
    sh = slide.shapes[-1]
    place(sh, x, y, w, h)
    return sh


def set_text(sh, parts, size, align=PP_ALIGN.LEFT):
    tf = sh.text_frame
    for pp in list(tf._txBody.findall("a:p", NS))[1:]:
        tf._txBody.remove(pp)
    para = tf.paragraphs[0]
    for r in list(para.runs):
        r._r.getparent().remove(r._r)
    pPr = para._p.find("a:pPr", NS)
    if pPr is not None:
        para._p.remove(pPr)
    para.alignment = align
    for text, bold in parts:
        r = para.add_run()
        r.text = text
        r.font.size = Pt(size)
        r.font.bold = bold
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE if align == PP_ALIGN.CENTER else MSO_ANCHOR.TOP
    tf.margin_left = tf.margin_right = I(0.12)
    tf.margin_top = tf.margin_bottom = I(0.06)


def block(slide, key, head, text, color, x, y, w, hh, hb, size=15):
    h = clone(src_head, slide, key + " — заголовок", x, y, w, hh)
    h.fill.solid(); h.fill.fore_color.rgb = RGBColor.from_string(color)
    h.line.color.rgb = RGBColor.from_string(color)
    set_text(h, [(head, True)], 16, PP_ALIGN.CENTER)
    b = clone(src_body, slide, key + " — текст", x, y + hh + 0.06, w, hb)
    set_text(b, text, size)


# содержимое: (ключ, заголовок, текст[(строка, bold)], цвет)
rows = [
    ("Нормальность", "Проверка нормальности распределения",
     [("критерии Колмогорова–Смирнова, Шапиро–Уилка, Крамера–фон-Мизеса и Андерсона–Дарлинга", False)], "8DB5A5"),
    ("Сравнение групп", "Сравнение центральных параметров групп",
     [("параметрические и непараметрические методы: дисперсионный анализ (в т.ч. критерий Краскела–Уоллиса и ранговые метки Вилкоксона), медианный критерий, критерий Ван дер Вардена", False)], "6C94BE"),
    ("Описательная статистика", "Описательная статистика",
     [("средние арифметические и среднеквадратические (стандартные) ошибки среднего; в тексте M±s, где M — среднее, s — стандартное отклонение [94]", False)], "B9C4D2"),
    ("Качественные признаки", "Анализ качественных признаков",
     [("парные таблицы сопряжённости: χ² Пирсона, коэффициент Фи, коэффициент контингенции, V-коэффициент Крамера; при значимой связи — углублённый анализ частот в клетках таблицы [3, 127, 128]", False)], "E0C28C"),
    ("Корреляции", "Корреляционный анализ",
     [("коэффициенты Пирсона и Спирмена в подгруппах по градациям качественных признаков: при нормальном распределении — r-Пирсона, при ненормальном и n<30 — r-Спирмена", False)], "C99AA9"),
]
# раскладка: верхний блок на всю ширину, ниже две колонки
HH = 0.38
block(s7, "Организация", "Организация анализа и программное обеспечение",
      [("анализ выполнен в Центре БИОСТАТИСТИКА (leo.biostat@gmail.com) под руководством доцента, к.т.н. Леонова В.П.; пакеты SAS 9.4, STATISTICA 12 и IBM-SPSS-24", False)],
      "5A9AA0", 0.5, 1.12, 12.33, HH, 0.66)
block(s7, "Значимость", "Уровень значимости",
      [("критическое значение p — 0,05 либо 0,1; при превышении достигнутого уровня значимости принималась нулевая гипотеза", False)],
      "D9B77E", 0.5, 2.3, 6.05, HH, 0.72)
spec = [  # (индекс в rows, x, y, высота текста)
    (0, 6.78, 2.3, 0.72),
    (1, 0.5, 3.54, 1.17),
    (2, 6.78, 3.54, 1.17),
    (3, 0.5, 5.23, 1.15),
    (4, 6.78, 5.23, 1.15),
]
for i, x, y, hb in spec:
    key, head, text, color = rows[i]
    block(s7, key, head, text, color, x, y, 6.05, HH, hb)

# ------------------------------------------------------------------ 27. Легенда
s27 = find("Эффективность комплексного")
EMU_ = EMU
for sh in s27.shapes:
    if not sh.has_chart:
        continue
    cs = sh.chart._chartSpace
    fx, fy, fw, fh = sh.left / EMU, sh.top / EMU, sh.width / EMU, sh.height / EMU
    lg = cs.find(".//c:legend", NS)
    lay = lg.find("c:layout", NS)
    if lay is not None:
        lg.remove(lay)  # автоматическое положение внизу
    for d in lg.iter("{%s}defRPr" % NS["a"]):
        d.set("sz", "1200")
    plot = cs.find(".//c:plotArea", NS)
    ml = plot.find("c:layout/c:manualLayout", NS)
    title = cs.find("./c:chart/c:title", NS)
    ttxt = "".join(t.text or "" for t in title.iter("{%s}t" % NS["a"])) if title is not None else ""
    rows_leg = 2 if len(plot.findall(".//c:ser", NS)) >= 4 else 1
    T = 0.85 if len(ttxt) > 40 and fw < 6.5 and "Непосредственная" in ttxt else 0.6
    B = 0.34 + 0.32 + 0.12 + 0.24 * rows_leg + 0.08
    g = lambda t: float(ml.find("c:" + t, NS).get("val"))
    L = g("x") * fw
    pw = g("w") * fw
    ph = fh - T - B
    ml.find("c:y", NS).set("val", "%.5f" % (T / fh))
    ml.find("c:h", NS).set("val", "%.5f" % (ph / fh))
    # овал вокруг основной группы
    n_cat = len(plot.find(".//c:ser", NS).findall(".//c:cat//c:pt", NS))
    for ov in s27.shapes:
        if ov.name.startswith("Овал"):
            cx = (ov.left + ov.width / 2) / EMU
            if fx <= cx <= fx + fw and n_cat == 6:
                px = fx + L
                x = px + pw * 4 / 6 - 0.06
                w = min(pw * 2 / 6 + 0.12, fx + fw - x - 0.02)
                place(ov, x=x, y=fy + T - 0.02, w=w, h=ph + 0.14)

prs.save(sys.argv[2])
