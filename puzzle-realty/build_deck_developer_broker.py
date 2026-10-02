#!/usr/bin/env python3
"""Презентация 2: «Как девелоперу и брокеру не перегрызть друг другу горло и удвоить продажи?»
(спикер — Федорова Мария).  Запуск: python3 build_deck_developer_broker.py
-> out/puzzle-realty-developer-broker.pptx"""
from deck_lib import *

start()
tg_qr()

# ══════════════ 1. ТИТУЛЬНЫЙ ═══════════════════════════════════════
s = slide()
pic(s, f"{PH}/dev_house_hands.jpg", 0, TOP, W, 4.05, focus=(0.5, 0.5))
rect(s, 0, 5.25, W, H - 5.25, fill=RED)
rect(s, 0.6, 5.55, 0.07, 1.3, fill=WHITE)
title(s, "Как девелоперу и брокеру не перегрызть друг другу горло и удвоить продажи?",
      x=0.9, y=5.5, w=8.5, size=24, color=WHITE, bar=None, lines=3)
text(s, 0.9, 6.7, 8.5, 0.55, "Опыт работы со стороны агентства и со стороны отдела продаж застройщика",
     size=13.5, color=WHITE, spacing=1.1)
logo(s, 10.2, 5.5, 2.4, white=True)
text(s, 9.9, 6.5, 3.2, 0.9,
     [dict(text="Федорова Мария", size=15, bold=True, caps=True),
      dict(text="управляющий партнёр, сооснователь агентства недвижимости Puzzle Realty", size=10.5)],
     color=WHITE, spacing=1.1)
notes(s, "СЛАЙД 1. Визуал по ТЗ: красивый современный дом по центру, слева рука брокера с папкой/планшетом, "
         "справа рука девелопера — будто две стороны одной сделки.")

# ══════════════ 2. КТО МЫ ══════════════════════════════════════════
s = slide()
title(s, "Мы сидим на двух стульях. И это наша суперсила.", x=0.9, y=1.55, w=11.6, size=28,
      kicker="Кто мы и почему имеем право говорить", lines=1)
ph_l = crop_file("dev_armchairs.jpg", (0.0, 0.0, 0.5, 1.0), "arm_l.jpg")
ph_r = crop_file("dev_armchairs.jpg", (0.5, 0.0, 1.0, 1.0), "arm_r.jpg")
pic(s, ph_l, 0.6, 2.35, 6.05, 1.55, focus=(0.5, 0.62))
pic(s, ph_r, 6.85, 2.35, 6.05, 1.55, focus=(0.5, 0.62))
roles = [
    ("Роль 1", "Мы — отдел продаж застройщика и эксклюзивный брокер проектов",
     ["Видим, как брокер теряет деньги из-за конфликтов с застройщиком",
      "Знаем, где рвётся коммуникация",
      "Понимаем мотивацию брокера изнутри"]),
    ("Роль 2", "Мы — агентство, работающее с застройщиком",
     ["Видим, как девелопер теряет клиентов из-за несистемной работы с брокерами",
      "Знаем, где застройщик недополучает продажи"]),
]
for i, (tag, head, its) in enumerate(roles):
    x = 0.6 + i * 6.25
    rrect(s, x, 4.05, 6.05, 2.4, fill=PINK, r=0.16)
    pill(s, x + 0.2, 4.2, 1.1, 0.4, tag, size=11)
    text(s, x + 1.5, 4.15, 4.35, 0.6, head, size=13, bold=True, spacing=1.05, anchor=MSO_ANCHOR.MIDDLE)
    bullets(s, x + 0.3, 4.95, 5.5, its, size=12.5, gap=5)
rect(s, 0.6, 6.6, 12.3, 0.65, fill=RED)
text(s, 0.9, 6.6, 11.8, 0.65, "Поэтому сегодня говорим не «с одной стороны», а честно — с двух.",
     size=15, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE)
notes(s, "СЛАЙД 2. Визуал по ТЗ: два стула / две позиции (кадр разрезан на две половины — по одному креслу над каждой ролью).")

# ══════════════ 3. ГОРЬКАЯ ПРАВДА ══════════════════════════════════
s = slide()
pic(s, f"{PH}/dev_conflict.jpg", 0, TOP, W, H - TOP, focus=(0.5, 0.5))
rect(s, 0, TOP, W, H - TOP, fill=DARK, alpha=35)
title(s, "Мы тратим энергию на войну вместо продаж.", x=0.9, y=1.5, w=11.6, size=30, color=WHITE, bar=RED,
      kicker=None, lines=1)
cards3 = [
    (0.6, 4.45, "Девелопер видит", "«Дорогой и нестабильный канал»", DARK),
    (8.28, 4.45, "Брокер видит", "«Неповоротливого гиганта»", DARK),
]
for x, w, h_, b, col in cards3:
    rrect(s, x, 5.0, w, 2.0, fill=col, alpha=72, r=0.16)
    text(s, x + 0.3, 5.15, w - 0.6, 0.4, h_, size=12.5, color=PINK_2, bold=True, caps=True)
    text(s, x + 0.3, 5.6, w - 0.6, 1.3, b, size=21, color=WHITE, bold=True, spacing=1.05, anchor=MSO_ANCHOR.MIDDLE)
rrect(s, 5.25, 5.35, 2.85, 1.65, fill=RED, r=0.16)
text(s, 5.4, 5.4, 2.55, 1.55,
     [dict(text="Результат", size=11, bold=True, caps=True, color=PINK_2, after=3),
      dict(text="Суды из-за комиссий, споры о лидах, слив сделок", size=12.5, bold=True)],
     color=WHITE, spacing=1.05, anchor=MSO_ANCHOR.MIDDLE)
notes(s, "СЛАЙД 3. Визуал по ТЗ: разделённый экран. Слева — боли девелопера, справа — боли брокера, по центру — разрыв.")

# ══════════════ 4. ДИАГНОСТИКА ═════════════════════════════════════
s = slide()
title(s, "Три точки разрыва.", x=0.9, y=1.6, w=8, size=32, kicker="Диагностика: почему механизм ломается?", lines=1)
links = [("1", "Продукт", "Ожидания рынка ≠ Реальность стройки"),
         ("2", "Репутационные потери", ""),
         ("3", "Разрозненные данные CRM", "")]
lw, gap = 3.55, 0.82
for i, (n, h_, b) in enumerate(links):
    x = 0.6 + i * (lw + gap)
    rrect(s, x, 2.7, lw, 3.55, fill=WHITE, line=(RED if i != 1 else DARK), lw=5, r=0.7)
    text(s, x, 3.0, lw, 1.0, n, size=54, color=RED, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(s, x + 0.35, 4.2, lw - 0.7, 1.7,
         [dict(text=h_, size=18, bold=True, caps=True, align=PP_ALIGN.CENTER, after=6)] +
         ([dict(text=b, size=14, color=GREY, align=PP_ALIGN.CENTER)] if b else []),
         spacing=1.05)
    if i < 2:
        bx = x + lw + 0.08
        bolt = rect(s, bx, 3.55, gap - 0.16, 1.85, fill=RED, shape=MSO_SHAPE.LIGHTNING_BOLT)
rect(s, 0.6, 6.55, 12.3, 0.6, fill=PINK)
text(s, 0.9, 6.55, 11.8, 0.6, "Каждое звено держит цепочку продаж — рвётся одно, останавливается вся сделка.",
     size=13, color=DARK, bold=True, anchor=MSO_ANCHOR.MIDDLE)
notes(s, "СЛАЙД 4. Визуал по ТЗ: схема из трёх разорванных звеньев (звенья-кольца + молнии-разрывы). "
         "Нижняя строка — связка для докладчика, её можно убрать. Тексты звеньев 2 и 3 в ТЗ даны без расшифровки.")

# ══════════════ 5. ТРИ СТОЛПА ══════════════════════════════════════
s = slide()
title(s, "Модель Win-Win: системный конвейер продаж.", x=0.9, y=1.6, w=11.6, size=28,
      kicker="Решение: три столпа синергии", lines=1)
rect(s, 0.6, 2.6, 12.3, 0.55, fill=DARK)
text(s, 0.6, 2.6, 12.3, 0.55, "Win-Win", size=14, color=WHITE, bold=True, caps=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
pillars = [("Прозрачность данных", "1"), ("Синхронизация продукта и маркетинга", "2"), ("Единый стандарт сервиса", "3")]
pw = 3.4
for i, (t, n) in enumerate(pillars):
    x = 1.05 + i * 4.0
    rect(s, x - 0.15, 3.15, pw + 0.3, 0.2, fill=RED_DK)
    rect(s, x, 3.35, pw, 3.1, fill=RED)
    text(s, x, 3.5, pw, 0.9, n, size=40, color=PINK_2, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(s, x + 0.25, 4.45, pw - 0.5, 1.8, t, size=19, color=WHITE, bold=True, caps=True, align=PP_ALIGN.CENTER,
         anchor=MSO_ANCHOR.MIDDLE, spacing=1.05)
    rect(s, x - 0.15, 6.45, pw + 0.3, 0.2, fill=RED_DK)
rect(s, 0.6, 6.65, 12.3, 0.5, fill=DARK)
notes(s, "СЛАЙД 5. Визуал по ТЗ: три вертикальные колонны / опоры под общей крышей.")

# ══════════════ 6. СТОЛП №1 ════════════════════════════════════════
s = slide()
rect(s, 0, TOP, 4.4, H - TOP, fill=RED)
text(s, 0.5, 1.5, 3.6, 0.4, "Столп №1", size=14, color=PINK_2, bold=True, caps=True)
text(s, 0.5, 1.85, 3.6, 0.5, "Прозрачность данных", size=13, color=WHITE)
title(s, "Данные должны заменить эмоции.", x=0.5, y=2.8, w=3.6, size=26, color=WHITE, bar=None, lines=4)
logo(s, 0.5, 6.5, 1.8, white=True)
steps = [("Отказ от", "Excel-таблиц и переписок в WhatsApp", LIGHT, GREY),
         ("Переход к", "Единому информационному полю", PINK, DARK),
         ("Что это даёт", "Брокер видит актуальный стоп-лист → Девелопер видит реальную воронку", RED, WHITE)]
cy = 1.5
for i, (k, v, fill_, col) in enumerate(steps):
    rrect(s, 4.9, cy, 7.95, 1.45, fill=fill_, r=0.18)
    text(s, 5.25, cy, 2.2, 1.45, k, size=13, bold=True, caps=True, color=(RED if i < 2 else PINK_2), anchor=MSO_ANCHOR.MIDDLE)
    text(s, 7.5, cy, 5.1, 1.45, v, size=(18 if i < 2 else 16), bold=True, color=col, anchor=MSO_ANCHOR.MIDDLE, spacing=1.08)
    if i < 2:
        rect(s, 8.55, cy + 1.5, 0.5, 0.36, fill=RED, shape=MSO_SHAPE.DOWN_ARROW)
    cy += 1.95
notes(s, "СЛАЙД 6. Визуал по ТЗ: без визуала (схема «отказ → переход → результат» на нативных фигурах).")

# ══════════════ 7. СТОЛП №2 ════════════════════════════════════════
s = slide()
pic(s, f"{PH}/dev_masterplan.jpg", 6.9, TOP, W - 6.9, H - TOP, focus=(0.55, 0.5))
title(s, "Продукт, который хочет рынок.", x=0.9, y=1.6, w=5.6, size=30, kicker="Столп №2. Совместное проектирование", lines=2)
rows = [("Брокер", "это «глаза и уши» рынка"),
        ("Инструмент", "Продуктовый совет (раз в квартал)"),
        ("Цель", "внедрение планировок и фишек на основе реального спроса")]
cy = 3.2
for k, v in rows:
    rrect(s, 0.6, cy, 6.0, 1.0, fill=PINK, r=0.15)
    pill(s, 0.75, cy + 0.25, 1.6, 0.5, k, size=11)
    text(s, 2.55, cy, 3.9, 1.0, v, size=14, anchor=MSO_ANCHOR.MIDDLE, spacing=1.05)
    cy += 1.2
notes(s, "СЛАЙД 7. Визуал по ТЗ: архитектор + застройщик + брокер над планировкой/генпланом.")

# ══════════════ 8. СТОЛП №3 ════════════════════════════════════════
s = slide()
title(s, "Бесшовный клиентский путь.", x=0.9, y=1.6, w=8, size=30, kicker="Столп №3. Единый стандарт сервиса", lines=1)
rrect(s, 3.55, 2.65, 4.4, 1.85, fill=PINK, r=0.25)  # зона «бесшва» брокер → застройщик
text(s, 3.55, 2.7, 4.4, 0.4, "здесь клиент не должен заметить переход", size=10.5, color=RED, bold=True, align=PP_ALIGN.CENTER)
rect(s, 0.9, 3.5, 11.5, 0.14, fill=RED)  # одна непрерывная линия
stages = ["Лид", "Брокер", "Показ", "Застройщик", "Бронь", "Сделка"]
for i, t in enumerate(stages):
    cx = 1.2 + i * 2.18
    rect(s, cx - 0.27, 3.27, 0.54, 0.54, fill=WHITE, line=RED, lw=4, shape=MSO_SHAPE.OVAL)
    text(s, cx - 0.27, 3.27, 0.54, 0.54, str(i + 1), size=12, color=RED, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(s, cx - 1.0, 3.95, 2.0, 0.4, t, size=14, bold=True, caps=True, align=PP_ALIGN.CENTER)
pts = ["Клиент не должен чувствовать переход «Брокер → Застройщик»",
       "Синхронизация скриптов и сервисных стандартов",
       "Общий контроль качества на каждом этапе"]
for i, t in enumerate(pts):
    x = 0.6 + i * 4.15
    rrect(s, x, 5.1, 3.95, 1.9, fill=(RED if i == 0 else PINK), r=0.18)
    text(s, x + 0.3, 5.1, 3.35, 1.9, t, size=15, bold=True, color=(WHITE if i == 0 else DARK), anchor=MSO_ANCHOR.MIDDLE, spacing=1.08)
notes(s, "СЛАЙД 8. Визуал по ТЗ: customer journey Лид → брокер → показ → застройщик → бронь → сделка, "
         "но вместо разных блоков — одна непрерывная линия.")

# ══════════════ 9. ЭКОНОМИКА ПАРТНЁРСТВА ════════════════════════════
s = slide()
title(s, "От «торговли за процент» к «совместному управлению спросом».", x=0.9, y=1.6, w=11.6, size=26,
      kicker="Экономика партнёрства", lines=2)
models = [("Старая модель", ["Борьба за маржу", "Снижение качества", "Падение продаж"], DARK, GREY),
          ("Новая модель", ["Синергия", "Увеличение оборота", "Удвоение прибыли"], RED, RED)]
cy = 3.3
for name, chain, col, tag_col in models:
    pill(s, 0.6, cy + 0.35, 2.3, 0.6, name, size=12.5, fill=tag_col, color=WHITE)
    for i, t in enumerate(chain):
        x = 3.2 + i * 3.25
        sh = rect(s, x, cy, 3.35, 1.3, fill=col, shape=MSO_SHAPE.PENTAGON if i == 2 else MSO_SHAPE.CHEVRON)
        sh.adjustments[0] = 0.28
        text(s, x + 0.5, cy, 2.35, 1.3, t, size=15, color=WHITE, bold=True, caps=True, align=PP_ALIGN.CENTER,
             anchor=MSO_ANCHOR.MIDDLE, spacing=1.0)
    cy += 1.75
notes(s, "СЛАЙД 9. Визуал по ТЗ: без визуала (сравнение двух цепочек: старая модель vs новая модель).")

# ══════════════ 10. ЧТО ДЕЛАТЬ ЗАВТРА ═══════════════════════════════
s = slide()
title(s, "3 шага к изменениям.", x=0.9, y=1.6, w=8, size=32, kicker="Что делать завтра?", lines=1)
steps = [("1", "Аудит данных", "Найти способ синхронизировать остатки и воронку (API / интеграция)."),
         ("2", "Создать коммуникацию", "Назначить дату первого «Продуктового совета»."),
         ("3", "Выровнять стандарты", "Сверить скрипты и представления о сервисе.")]
for i, (n, h_, b) in enumerate(steps):
    x = 0.6 + i * 4.15
    rrect(s, x, 2.5, 3.95, 4.6, fill=(RED if i == 1 else PINK), r=0.22)
    text(s, x + 0.35, 2.7, 3.2, 1.5, n, size=80, bold=True, color=(PINK_2 if i == 1 else RED), anchor=MSO_ANCHOR.MIDDLE)
    text(s, x + 0.35, 4.35, 3.25, 2.6,
         [dict(text=h_, size=19, bold=True, caps=True, after=8, color=(WHITE if i == 1 else DARK)),
          dict(text=b, size=14, color=(WHITE if i == 1 else GREY))], spacing=1.1)
notes(s, "СЛАЙД 10. Визуал по ТЗ: три большие карточки.")

# ══════════════ 11. КЕЙС ═══════════════════════════════════════════
s = slide()
title(s, "Как система дала +15% продаж в элитном посёлке ЛО", x=0.9, y=1.55, w=11.6, size=27,
      kicker="Кейс: элитный посёлок в ЛО", lines=1)
rrect(s, 0.6, 2.3, 4.0, 4.9, fill=LIGHT, r=0.18)
text(s, 0.9, 2.45, 3.4, 0.35, "Ситуация", size=15, bold=True, color=GREY, caps=True)
bullets(s, 0.9, 2.95, 3.45, ["Элитный посёлок в Ленинградской области",
                             "Застройщик работал напрямую и с несколькими брокерами",
                             "Постоянные конфликты по клиентам, комиссиям, зонам ответственности",
                             "Негативный фон в агентском сообществе"], size=11.5, gap=6, dot=GREY)
rrect(s, 4.8, 2.3, 4.05, 4.9, fill=PINK, r=0.18)
text(s, 5.1, 2.45, 3.5, 0.35, "Что сделали", size=15, bold=True, color=RED, caps=True)
bullets(s, 5.1, 2.95, 3.5, ["Внедрили матрицу ответственности",
                            "Настроили CRM с фиксацией первого касания",
                            "Ввели единую мотивацию: МОП застройщика получает %",
                            "Провели совместное обучение: «продукт» от продавца и блок от брокеров (конъюнктура рынка, УТП, воронка клиента)"],
        size=11.5, gap=6)
rrect(s, 9.05, 2.3, 3.85, 4.9, fill=RED, r=0.18)
text(s, 9.35, 2.45, 3.3, 0.35, "Результат", size=15, bold=True, color=PINK_2, caps=True)
kp = [("0", "споров по клиентам"), ("+12%", "конверсия из показа в сделку"), ("+15%", "к выручке за квартал")]
cy = 2.95
for big, lab in kp:
    text(s, 9.35, cy, 3.3, 0.85, big, size=44, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 9.35, cy + 0.85, 3.3, 0.4, lab, size=12, color=PINK_2)
    cy += 1.38
notes(s, "СЛАЙД 11. Визуал по ТЗ: большие цифры, карточки «до / после». "
         "ТЗ к блоку «Кейсы и цифры»: покажите здесь или на слайде 12 одну реальную ситуацию из практики — "
         "как конфликт по клиенту стоил сделки в элитном сегменте (в ТЗ самой истории нет — добавить).")

# ══════════════ 12. СКОЛЬКО СТОИТ КОНФЛИКТ ══════════════════════════
s = slide()
title(s, "Сколько теряют обе стороны, когда воюют", x=0.9, y=1.6, w=11, size=30, kicker="Экономика: сколько стоит конфликт", lines=1)
hdr = ["Потеря", "Девелопер", "Брокер"]
tbl = [("Пересечение клиентов", "Тратит бюджет на «своего» клиента повторно", "Теряет комиссию"),
       ("Спор о комиссии", "Затягивает сделку", "Ждёт выплату месяцами"),
       ("Размытая ответственность", "Клиент уходит к конкуренту", "Репутация падает"),
       ("Отсутствие CRM", "Не видит источник лида", "Не может доказать своё участие")]
cw = [3.2, 4.6, 4.5]
cy = 2.45
cx0 = 0.6
for ci, h_ in enumerate(hdr):
    rect(s, cx0, cy, cw[ci], 0.55, fill=DARK)
    text(s, cx0 + 0.2, cy, cw[ci] - 0.4, 0.55, h_, size=12, color=WHITE, bold=True, caps=True, anchor=MSO_ANCHOR.MIDDLE)
    cx0 += cw[ci]
cy += 0.55
for ri, row in enumerate(tbl):
    cx0 = 0.6
    for ci, cell in enumerate(row):
        rect(s, cx0, cy, cw[ci], 0.85, fill=(PINK if ri % 2 == 0 else LIGHT), line=WHITE, lw=2)
        text(s, cx0 + 0.2, cy, cw[ci] - 0.4, 0.85, cell, size=(14 if ci == 0 else 13), bold=(ci == 0),
             color=(RED if ci == 0 else DARK), anchor=MSO_ANCHOR.MIDDLE, spacing=1.05)
        cx0 += cw[ci]
    cy += 0.85
rect(s, 0.6, 6.55, 12.3, 0.7, fill=RED)
text(s, 0.9, 6.55, 11.8, 0.7, "Одна потерянная сделка в элитном сегменте = стоимость года работы менеджера.",
     size=15, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE)
notes(s, "СЛАЙД 12. Визуал по ТЗ: без визуала (таблица). Сюда же можно вставить реальную историю из практики "
         "про потерянную по конфликту сделку — см. примечание к слайду 11.")

# ══════════════ 13. ФОРМУЛА ═════════════════════════════════════════
s = slide()
rect(s, 0, TOP, 7.5, H - TOP, fill=RED)
title(s, "Формула партнёрства девелопера и брокера", x=0.8, y=1.5, w=6.2, size=15, color=WHITE, bar=None, lines=2)
fl = ["Матрица ответственности", "+ Правило первого касания", "+ Единая мотивация", "+ CRM + обучение"]
cy = 2.35
for t in fl:
    text(s, 0.8, cy, 6.5, 0.65, t, size=24, color=WHITE, bold=True, caps=True)
    cy += 0.72
rect(s, 0.8, cy + 0.05, 6.0, 0.04, fill=WHITE)
text(s, 0.8, cy + 0.3, 6.5, 1.3, "= удвоение продаж без войны", size=26, color=WHITE, bold=True, caps=True, spacing=1.05)
text(s, 8.1, 1.5, 4.5, 0.4, "Выводы", size=14, color=RED, bold=True, caps=True)
concl = ["Конфликт — это не характер, это отсутствие системы", "Система защищает и брокера, и девелопера",
         "Клиент выигрывает — и возвращается с рекомендацией"]
cy = 2.05
for i, c in enumerate(concl):
    rrect(s, 8.1, cy, 4.8, 1.5, fill=PINK, r=0.18)
    text(s, 8.35, cy + 0.1, 1.0, 1.3, str(i + 1), size=44, color=RED, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 9.3, cy + 0.1, 3.4, 1.3, c, size=15, bold=True, anchor=MSO_ANCHOR.MIDDLE, spacing=1.08)
    cy += 1.7
notes(s, "СЛАЙД 13. Визуал по ТЗ: без визуала. Формула крупно + три вывода.")

# ══════════════ 14. ВЫВОДЫ ══════════════════════════════════════════
s = slide()
title(s, "Что забрать с собой", x=0.9, y=1.6, w=8, size=32, kicker="Выводы", lines=1)
th = [("1", "Зоны ответственности", "расписать до старта, а не после конфликта"),
      ("2", "CRM", "единственный источник правды, без неё партнёрства не будет"),
      ("3", "Единая мотивация", "комиссия не режется при передаче клиента")]
for i, (n, h_, b) in enumerate(th):
    x = 0.6 + i * 4.15
    rrect(s, x, 2.4, 3.95, 3.5, fill=PINK, r=0.22)
    text(s, x + 0.35, 2.5, 3.2, 1.5, n, size=88, bold=True, color=RED, anchor=MSO_ANCHOR.MIDDLE)
    text(s, x + 0.35, 4.05, 3.3, 1.8,
         [dict(text=h_, size=18, bold=True, caps=True, after=6), dict(text=b, size=14, color=GREY)], spacing=1.1)
rect(s, 0, 6.15, W, H - 6.15, fill=RED)
text(s, 0.9, 6.15, 11.8, H - 6.15, "В элитном сегменте побеждает не тот, кто громче торгуется. А тот, кто выстроил систему.",
     size=18.5, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE, spacing=1.05)
notes(s, "СЛАЙД 14. Визуал по ТЗ: три большие цифры (номера тезисов) + акцент внизу.")

# ══════════════ 15. ФИНАЛ — CTA + TELEGRAM ══════════════════════════
s = slide()
pic(s, f"{PH}/dev_armchairs.jpg", 0, TOP, W, H - TOP, focus=(0.5, 0.55))
rect(s, 0, TOP, W, H - TOP, fill=DARK, alpha=68)
logo(s, 0.7, TOP + 0.3, 2.3, white=True)
rect(s, 3.5, TOP + 0.35, 0.07, 0.85, fill=RED)
title(s, "Забирайте шаблоны и оставайтесь на связи", x=3.75, y=TOP + 0.35, w=9, size=28, color=WHITE, bar=None, lines=2)
rrect(s, 1.9, 2.85, 3.4, 3.4, fill=WHITE, r=0.18)
rrect(s, 2.15, 3.1, 2.9, 2.9, fill=None, line=RED, lw=1.5, r=0.08)
ln = s.shapes[-1].line._get_or_add_ln()
ln.append(ln.makeelement(qn("a:prstDash"), {"val": "dash"}))
text(s, 2.15, 3.1, 2.9, 2.9, [dict(text="вставить QR", size=16), dict(text="на шаблоны", size=16)],
     color=GREY, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
rrect(s, 8.03, 2.85, 3.4, 3.4, fill=WHITE, r=0.18)
s.shapes.add_picture(os.path.join(TMP, "qr_tg.png"), Inches(8.28), Inches(3.1), Inches(2.9), Inches(2.9))
text(s, 1.0, 6.4, 5.2, 0.85, [dict(text="Шаблоны и материалы", size=14, bold=True),
                              dict(text="матрица ответственности • правило первого касания • чек-лист продуктового совета", size=10.5)],
     color=WHITE, align=PP_ALIGN.CENTER, spacing=1.05)
text(s, 7.13, 6.4, 5.2, 0.85, [dict(text="Подпишитесь на наш Telegram-канал", size=14, bold=True),
                               dict(text="анонсы объектов по СПб и ЛО • скрипты, кейсы, шаблоны и материалы по загородной недвижимости", size=10.5)],
     color=WHITE, align=PP_ALIGN.CENTER, spacing=1.05)
notes(s, "СЛАЙД 15. Справа — QR на t.me/puzzlerealty (из контактов прежней презентации; проверьте, что это нужный канал). "
         "Слева — заглушка под QR на шаблоны. В ТЗ «что дать» ещё не решено: в подписи предложен набор из материалов этой "
         "презентации (матрица ответственности, правило первого касания, чек-лист продуктового совета) — подтвердите или замените.")

finish(os.path.join(HERE, "out", "puzzle-realty-developer-broker.pptx"))
