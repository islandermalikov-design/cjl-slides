# -*- coding: utf-8 -*-
"""Контурные иллюстрации по категориям — используются, пока не подложены реальные фото."""

_OPEN = ('<svg class="art" viewBox="0 0 240 132" role="img" aria-label="{alt}" '
         'fill="none" stroke="currentColor" stroke-width="2.4" '
         'stroke-linecap="round" stroke-linejoin="round">')
_GROUND = '<path d="M8 120 H232" stroke-width="1.2" opacity=".35"/>'


def _wheel(cx, cy, r, hub=True):
    s = f'<circle cx="{cx}" cy="{cy}" r="{r}"/>'
    if hub:
        s += f'<circle cx="{cx}" cy="{cy}" r="{r*0.38:.1f}" stroke-width="1.6" opacity=".7"/>'
    return s


def grader():
    return (
        '<path d="M30 46 h58 a6 6 0 0 1 6 6 v26 h-64 a6 6 0 0 1-6-6 V52 a6 6 0 0 1 6-6z"/>'
        '<path d="M56 46 V32 h30 v14" opacity=".8"/>'
        '<path d="M94 68 L146 60 H198"/>'
        '<path d="M124 90 L166 76" stroke-width="4"/>'
        '<path d="M138 68 v14 M154 66 v10" stroke-width="1.6" opacity=".7"/>'
        + _wheel(198, 96, 17) + _wheel(48, 100, 18) + _wheel(88, 100, 18) + _GROUND)


def truck():
    return (
        '<path d="M34 26 H146 l16 44 H36 z"/>'
        '<path d="M146 26 l14 12 h-24" opacity=".8"/>'
        '<path d="M36 70 H206 v14 H36 z"/>'
        '<path d="M164 42 h34 a6 6 0 0 1 6 6 v22 h-46 V48 a6 6 0 0 1 6-6z"/>'
        + _wheel(66, 98, 21) + _wheel(112, 98, 21) + _wheel(184, 98, 21) + _GROUND)


def excavator():
    return (
        '<path d="M40 58 h30 v-16 h26 l10 16 h18 v26 H40 z"/>'
        '<path d="M126 62 L162 26 L196 62" stroke-width="3"/>'
        '<path d="M196 62 l-6 22 l24 -6 l-4 -18 z"/>'
        '<path d="M34 84 h108 v10 H34 z" opacity=".9"/>'
        + _wheel(58, 104, 15) + _wheel(118, 104, 15) + _GROUND)


def dozer():
    return (
        '<path d="M82 44 h42 a6 6 0 0 1 6 6 v28 H76 V50 a6 6 0 0 1 6-6z"/>'
        '<path d="M56 78 h96 l14 12 v8 a8 8 0 0 1-8 8 H50 a8 8 0 0 1-8-8 v-6 z"/>'
        '<path d="M182 52 q-12 24 -2 54 h-14 q-10 -30 2 -54 z" stroke-width="3"/>'
        '<path d="M152 88 L170 92" />'
        + _wheel(58, 96, 8, False) + _wheel(148, 96, 8, False) + _GROUND)


def crane():
    return (
        '<path d="M26 74 h182 v16 H26 z"/>'
        '<path d="M44 50 h44 a5 5 0 0 1 5 5 v19 H39 V55 a5 5 0 0 1 5-5z"/>'
        '<path d="M74 60 L204 20" stroke-width="6"/>'
        '<path d="M204 20 L228 12" stroke-width="2.4" opacity=".8"/>'
        '<path d="M228 12 v22" stroke-width="1.4" opacity=".7"/>'
        '<path d="M224 34 h8 v7 h-8 z" stroke-width="1.6"/>'
        + _wheel(52, 98, 15) + _wheel(90, 98, 15) + _wheel(160, 98, 15) + _wheel(196, 98, 15) + _GROUND)


def telehandler():
    return (
        '<path d="M34 74 h146 v18 H34 z"/>'
        '<path d="M46 46 h34 a5 5 0 0 1 5 5 v23 H41 V51 a5 5 0 0 1 5-5z"/>'
        '<path d="M40 70 L150 40" stroke-width="7"/>'
        '<path d="M150 40 L206 26" stroke-width="4"/>'
        '<path d="M206 26 l6 22" />'
        '<path d="M212 48 l16 -4 M212 48 l14 8" stroke-width="3"/>'
        + _wheel(60, 100, 17) + _wheel(160, 100, 17) + _GROUND)


def loader():
    return (
        '<path d="M32 56 h50 v24 H32 z"/>'
        '<path d="M82 40 h34 a6 6 0 0 1 6 6 v34 H82 z"/>'
        '<path d="M122 66 L180 56" stroke-width="4"/>'
        '<path d="M110 78 L176 70" stroke-width="2" opacity=".7"/>'
        '<path d="M180 46 l28 8 l-8 30 l-24 -8 z" stroke-width="3"/>'
        + _wheel(58, 96, 20) + _wheel(146, 96, 20) + _GROUND)


ART = {
    "graders": ("Контур автогрейдера", grader),
    "trucks": ("Контур карьерного самосвала", truck),
    "excavators": ("Контур колёсного экскаватора", excavator),
    "dozers": ("Контур бульдозера", dozer),
    "cranes": ("Контур автокрана", crane),
    "telehandlers": ("Контур телескопического погрузчика", telehandler),
    "loaders": ("Контур фронтального погрузчика", loader),
}


def render(cat_id):
    alt, fn = ART[cat_id]
    return _OPEN.format(alt=alt) + fn() + "</svg>"
