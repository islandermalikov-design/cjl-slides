"""Design spec for the two redesigned Alfa-Bank slides.

Everything lives in one 1920x1080 coordinate space. Renderers (SVG / PPTX /
HTML) consume the primitives below, so all three outputs are geometrically
identical.

Text is modelled as (left edge, baseline) with explicit line breaks — no
auto-wrapping — which is what keeps PowerPoint and SVG in sync.

Content is a verbatim copy of the source deck: no figure, wording or ordering
has been changed, and nothing moved between the two slides.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from metrics import text_width

# ---------------------------------------------------------------- tokens ----

W, H = 1920, 1080
MARGIN = 80

RED = "#EF3124"          # Alfa red — primary accent
BLACK = "#1D1D1D"        # primary type
GREEN = "#2FBD4F"        # positive metrics only (share-of-sales badges)
GRAY = "#5A5A62"         # body copy
GRAY_MID = "#8A8A90"     # labels
GRAY_SOFT = "#A5A5AB"    # captions, footnotes
LINE = "#E7E7EB"         # hairlines on white
LINE_SOFT = "#DCDCE2"    # hairlines on grey
PANEL = "#F6F6F7"        # secondary information panel
CARD = "#F5F5F7"         # KPI card fill
CARD_LINE = "#EAEAEE"
CARD_RULE = "#DFDFE5"
FONT = "Inter"

CAP = 0.72               # cap height as a share of font size, used for centring

# --------------------------------------------------------------- objects ----


@dataclass
class Run:
    text: str
    size: float
    weight: int = 400
    color: str = BLACK
    tracking: float = 0.0   # letter-spacing, in em


@dataclass
class Text:
    """One or more lines of text. `y` is the baseline of the first line."""
    x: float
    y: float
    lines: list[list[Run]]
    step: float = 0.0       # baseline-to-baseline distance


@dataclass
class Rect:
    x: float
    y: float
    w: float
    h: float
    r: float = 0
    fill: str | None = None
    stroke: str | None = None
    sw: float = 1


@dataclass
class Line:
    x1: float
    y1: float
    x2: float
    y2: float
    color: str = LINE
    sw: float = 1


@dataclass
class Img:
    name: str
    x: float
    y: float
    w: float
    h: float


@dataclass
class Slide:
    name: str
    title: str
    elements: list = field(default_factory=list)

    def add(self, *els):
        self.elements.extend(els)


def one(*runs) -> list[list[Run]]:
    """Single-line helper."""
    return [list(runs)]


def vcentered(x: float, center: float, lines: list[list[Run]], step: float) -> Text:
    """Text block whose cap-height box is centred on `center`."""
    size = max(r.size for r in lines[0])
    first = center + size * CAP / 2 - step * (len(lines) - 1) / 2
    return Text(x, first, lines, step)


def page_number(n: str) -> Text:
    w = text_width(n, 15, 700)
    return Text(W - MARGIN - w, 1030, one(Run(n, 15, 700, GRAY_SOFT)))


def logo(x: float = 1800, y: float = 62, h: float = 62) -> Img:
    return Img("logo", x, y, h * 265 / 411, h)


def badge(x: float, y: float, label: str) -> list:
    """Compact green share-of-sales pill. `y` is the top edge."""
    fs, pad, bh = 17, 11, 28
    tw = text_width(label, fs, 700)
    bw = tw + pad * 2
    return [
        Rect(x, y, bw, bh, bh / 2, fill=GREEN),
        Text(x + pad, y + bh / 2 + fs * CAP / 2, one(Run(label, fs, 700, "#FFFFFF"))),
    ], bw


# ================================================================ slide 1 ====


def slide_sources() -> Slide:
    s = Slide("slide-01-sources", "5 ключевых источников")

    # ---- header
    s.add(
        Text(MARGIN, 106, [
            [Run("5 ключевых источников обеспечивают", 56, 800, BLACK)],
            [Run("35% онлайн-продаж карт и 19% РКО в Альфа-Банке", 56, 800, RED)],
        ], step=66),
        logo(),
    )

    # legend: green pill + explanation
    s.add(
        Rect(MARGIN, 196, 38, 26, 13, fill=GREEN),
        Text(MARGIN + (38 - text_width("%", 15, 700)) / 2, 196 + 13 + 15 * CAP / 2,
             one(Run("%", 15, 700, "#FFFFFF"))),
        Text(MARGIN + 52, 214, one(Run("— доля продаж банка*", 17, 400, GRAY))),
    )

    # ---- matrix of the five sources -----------------------------------------
    box_y, box_h = 244, 312
    inner_l, inner_r = MARGIN + 40, W - MARGIN - 40
    col_l, col_w = 310, 298
    r1_y, r2_y = 332, 444                       # horizontal rules
    row1_c = (r1_y + r2_y) / 2                  # 388
    row2_c = (r2_y + box_y + box_h) / 2         # 500

    s.add(Rect(MARGIN, box_y, W - 2 * MARGIN, box_h, 28, fill="#FFFFFF",
               stroke=LINE, sw=1))
    s.add(Line(inner_l, r1_y, inner_r, r1_y, LINE),
          Line(inner_l, r2_y, inner_r, r2_y, LINE))
    for k in range(1, 5):
        x = col_l + col_w * k
        s.add(Line(x, box_y + 28, x, box_y + box_h - 28, LINE))

    # row labels, left gutter, optically centred on the row
    s.add(
        vcentered(inner_l, row1_c, [
            [Run("КАРТОЧНЫЕ", 13.5, 700, GRAY_MID, 0.05)],
            [Run("ПРОДУКТЫ, шт.", 13.5, 700, GRAY_MID, 0.05)],
            [Run("за 8 мес. 2026", 13.5, 400, GRAY_SOFT, 0.02)],
        ], 19),
        vcentered(inner_l, row2_c, [
            [Run("РКО, СЧЕТОВ", 13.5, 700, GRAY_MID, 0.05)],
            [Run("за 8 мес. 2026", 13.5, 400, GRAY_SOFT, 0.02)],
        ], 19),
    )

    sources = [
        (["Реферальная", "программа"], ("930", "13%"), ("27", "5%")),
        (["Органическое", "привлечение"], ("655", "9%"), ("37", "7%")),
        (["CPA-канал"], ("415", "6%"), ("25", "4%")),
        (["Кросс-продажи"], ("336", "5%"), None),
        (["Контекстная", "реклама"], ("237", "4%"), ("16", "5%")),
    ]

    for k, (head, card, rko) in enumerate(sources):
        cx = col_l + col_w * k + 26
        # column head, bottom-aligned on a shared baseline
        last = r1_y - 26
        s.add(Text(cx, last - 30 * (len(head) - 1),
                   [[Run(t, 24, 600, BLACK)] for t in head], step=30))

        for center, value in ((row1_c, card), (row2_c, rko)):
            base = center + 22
            if value is None:
                s.add(vcentered(cx, center, [
                    [Run("на этапе заявки", 17, 400, GRAY_SOFT)],
                    [Run("и выдачи", 17, 400, GRAY_SOFT)],
                ], 24))
                continue
            num, pct = value
            nw = text_width(num, 58, 800)
            s.add(Text(cx, base, one(Run(num, 58, 800, RED))))
            els, _ = badge(cx + nw + 12, base - 58 * CAP - 2, pct)
            s.add(*els)
            s.add(Text(cx + nw + 12, base, one(Run("тыс", 17, 600, RED))))

    # footnote belongs to the percentage badges above it
    s.add(Text(MARGIN, 592, one(Run(
        "*Доли других каналов привлечения карточных продуктов в Рознице: "
        "от 1% до 25%, в ММБ от 7% до 37%", 13.5, 400, GRAY_SOFT))))

    # ---- product panel ------------------------------------------------------
    p_y, p_h = 620, 380
    s.add(Rect(MARGIN, p_y, W - 2 * MARGIN, p_h, 28, fill=PANEL))

    s.add(Text(inner_l, 692, one(
        Run("Более 30 ", 28, 800, RED),
        Run("продвигаемых продуктов трёх линий бизнеса", 28, 800, BLACK))))

    retail_a = ["Дебетовые карты", "Кредитные карты", "Кредит под залог недвижимости",
                "Кредит наличными", "МКК", "Самозанятость", "Ипотека"]
    retail_b = ["Перевод пенсии", "Вклады", "Накопительные счета", "Alfa Only",
                "Альфа-Мобайл (MVNO)", "Карты для иностранцев", "Валютобмен"]
    mmb = ["РКО", "Регистрация бизнеса", "Интернет-эквайринг", "Торговый эквайринг",
           "Кредиты для бизнеса", "Бизнес-карта", "Альфа-Конфа", "Касса 3в1"]
    skb = ["Альфа-Будущее", "Массовый подбор", "Хакатоны", "HR-бренд", "РКО СКБ",
           "Эквайринг", "Депозиты для бизнеса", "Альфа-Босс"]

    head_base, rule_y, item_base, item_step = 748, 766, 794, 24.5

    groups = [
        ("РОЗНИЧНЫЙ БИЗНЕС", inner_l, 555, [(inner_l, retail_a), (inner_l + 305, retail_b)]),
        ("ММБ", 730, 260, [(730, mmb)]),
        ("СКБ", 1040, 290, [(1040, skb)]),
    ]
    for title, gx, gw, columns in groups:
        s.add(Text(gx, head_base, one(Run(title, 15, 700, BLACK, 0.08))))
        s.add(Line(gx, rule_y, gx + gw, rule_y, LINE_SOFT))
        for cx, items in columns:
            s.add(Text(cx, item_base,
                       [[Run(t, 17, 400, GRAY)] for t in items], step=item_step))

    # "А ещё": the games note lives in the panel's right column, set off by a
    # hairline rather than a card so the panel keeps one background
    s.add(Line(1390, p_y + 44, 1390, p_y + p_h - 44, LINE_SOFT))
    s.add(Img("trophy", 1444, 676, 112, 112))
    s.add(Text(1444, 844, one(Run("А ЕЩЁ", 18, 700, RED, 0.14))))
    nw = text_width("8", 84, 800)
    s.add(Text(1444, 924, one(Run("8", 84, 800, RED))))
    s.add(Text(1444 + nw + 14, 924, one(Run("млн человек", 28, 800, RED))))
    # last line sits on the same baseline as the last product in the lists
    s.add(Text(1444, 964, one(Run("сыграют в игры в 2026 году", 20, 500, BLACK))))

    s.add(page_number("2"))
    return s


# ================================================================ slide 2 ====


def slide_volumes() -> Slide:
    s = Slide("slide-02-volumes", "Объёмы привлечения")

    s.add(
        Text(MARGIN, 106, [
            [Run("Объёмы привлечения на банковские продукты", 56, 800, BLACK)],
            [Run("за 8 месяцев 2026 через онлайн-канал", 56, 800, BLACK)],
        ], step=66),
        logo(),
        Img("star", 1596, 146, 148, 148 * 606 / 619),
    )

    # ---- three KPI cards ----------------------------------------------------
    card_y, card_h, card_w, gap = 336, 384, 560, 40
    cards = [
        ("+1,8", "млн", ["новых розничных клиентов"], None),
        ("+205", "млрд руб.", ["розничных кредитных продуктов"], "КН, КПЗН, МКК"),
        ("+108", "тыс.", ["предпринимателей малого,", "среднего и крупного бизнеса"], None),
    ]
    for i, (num, unit, desc, caption) in enumerate(cards):
        x = MARGIN + (card_w + gap) * i
        cx = x + 44
        inner_w = card_w - 88
        s.add(Rect(x, card_y, card_w, card_h, 28, fill=CARD, stroke=CARD_LINE, sw=1))
        nw = text_width(num, 104, 800)
        s.add(Text(cx, 494, one(Run(num, 104, 800, RED))))
        s.add(Text(cx + nw + 14, 494, one(Run(unit, 30, 800, RED))))
        s.add(Line(cx, 552, cx + inner_w, 552, CARD_RULE))
        s.add(Text(cx, 600, [[Run(t, 28, 500, BLACK)] for t in desc], step=40))
        if caption:
            # pinned to the card's baseline grid, like the second line opposite
            s.add(Text(cx, 650, one(Run(caption, 20, 500, GRAY_SOFT))))

    # brand gem closes the composition in the lower right
    s.add(Img("gem", 1572, 772, 252, 252 * 612 / 777))

    s.add(page_number("3"))
    return s


SLIDES = [slide_sources, slide_volumes]
