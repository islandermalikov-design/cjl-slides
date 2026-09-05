# -*- coding: utf-8 -*-
"""Единый источник данных для HTML и PPTX версий презентации."""

PALETTE = {
    "primary":   "#1B1917",   # глубокий графит / тёмный шоколадно-серый
    "secondary": "#F2ECE3",   # ivory / молочный
    "accent":    "#B29A7C",   # тёплый бежевый
    "graphite2": "#26231F",
    "stone":     "#7A7168",   # приглушённый пастельный текст
    "line":      "#DCD3C6",
}

# Геометрия эталонного слайда 1920x1080
REF_W, REF_H = 1920.0, 1080.0
PANEL_RATIO = 0.24          # информационная колонка
PHOTO_RATIO = 0.76          # фотография

SPEC_LABELS = [
    "Площадь здания",
    "Этажность",
    "Год постройки",
    "Состояние",
    "Статус",
    "Коммуникации",
]

# side: сторона, на которой стоит фотография. Пара ДО/ПОСЛЕ всегда одинаковая.
OBJECTS = [
    {"idx": "01", "name": "Гиляровского,\n37к2",              "slug": "giliarovskogo", "side": "right"},
    {"idx": "02", "name": "Площадь Борьбы,\n13А",             "slug": "borby",         "side": "left"},
    {"idx": "03", "name": "Мясницкая,\n13 стр. 2",            "slug": "myasnickaya",   "side": "right"},
    {"idx": "04", "name": "Николоямская,\n51 стр. 2",         "slug": "nikoloyamskaya","side": "left"},
    {"idx": "05", "name": "Окружной проезд,\n16 и 16 стр. 2", "slug": "okruzhnoy",     "side": "right"},
    {"idx": "06", "name": "Большая Почтовая,\n18/20 стр. 15", "slug": "pochtovaya",    "side": "left"},
]

# Реальные фотографии с Google Drive: slot -> файл.
# Пустой слот рисуется как оформленный placeholder.
PHOTOS = {
    "cover":                "assets/photos/cover.jpg",
    "giliarovskogo-before": "assets/photos/giliarovskogo-before.jpg",
    "giliarovskogo-after":  "assets/photos/giliarovskogo-after.jpg",
    "borby-before":         "assets/photos/borby-before.jpg",
    "myasnickaya-after":    "assets/photos/myasnickaya-after.jpg",
    "myasnickaya-before":   "assets/photos/myasnickaya-before.jpg",
    "nikoloyamskaya-after": "assets/photos/nikoloyamskaya-after.jpg",
    "okruzhnoy-before":     "assets/photos/okruzhnoy-before.jpg",
    "okruzhnoy-after":      "assets/photos/okruzhnoy-after.jpg",
    "pochtovaya-before":    "assets/photos/pochtovaya-before.jpg",
    "final-giliarovskogo":  "assets/photos/final-giliarovskogo.jpg",
    "final-myasnickaya":    "assets/photos/final-myasnickaya.jpg",
    "final-nikoloyamskaya": "assets/photos/final-nikoloyamskaya.jpg",
    "final-okruzhnoy":      "assets/photos/final-okruzhnoy.jpg",
}

PLACEHOLDER_CAPTION = "ФОТОСЪЁМКА В ПРОЦЕССЕ"
TITLE = "РЕСТАВРАЦИЯ ОБЪЕКТОВ"
SUBTITLE = "Портфолио реализованных проектов"


def slots():
    """Полный список фото-слотов презентации в порядке следования."""
    out = [("cover", "Обложка")]
    for o in OBJECTS:
        out.append((f"{o['slug']}-before", f"{o['name'].replace(chr(10),' ')} — ДО"))
        out.append((f"{o['slug']}-after",  f"{o['name'].replace(chr(10),' ')} — ПОСЛЕ"))
    for o in OBJECTS:
        out.append((f"final-{o['slug']}", f"Финал / {o['name'].replace(chr(10),' ')}"))
    return out
