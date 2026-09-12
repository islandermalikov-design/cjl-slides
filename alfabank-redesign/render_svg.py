"""Spec -> standalone SVG.

The SVG keeps every piece of text as real text and every card, rule and badge
as a vector shape, so the file can be dropped straight into Figma (or opened in
a browser) and edited element by element.
"""

from __future__ import annotations

import base64
import math
import os
from xml.sax.saxutils import escape

import spec
from spec import Arc, Img, Line, Rect, Text

HERE = os.path.dirname(os.path.abspath(__file__))


def _b64(path: str) -> str:
    with open(path, "rb") as fh:
        return base64.b64encode(fh.read()).decode("ascii")


def font_face_css() -> str:
    """Inter, embedded as two variable-font subsets, so the file is standalone."""
    ranges = {
        "cyrillic": "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
        "latin": ("U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, "
                  "U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, "
                  "U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"),
    }
    out = []
    for subset, urange in ranges.items():
        data = _b64(os.path.join(HERE, "fonts", f"inter-{subset}.woff2"))
        out.append(
            "@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;"
            f"src:url(data:font/woff2;base64,{data}) format('woff2');"
            f"unicode-range:{urange};}}"
        )
    return "".join(out)


def _fmt(v: float) -> str:
    return f"{v:.2f}".rstrip("0").rstrip(".")


def _text(el: Text) -> str:
    out = []
    for i, line in enumerate(el.lines):
        y = el.y + el.step * i
        head = line[0]
        attrs = [
            f'x="{_fmt(el.x)}"', f'y="{_fmt(y)}"',
            f'font-size="{_fmt(head.size)}"',
            f'font-weight="{head.weight}"',
            f'fill="{head.color}"',
        ]
        if head.tracking:
            attrs.append(f'letter-spacing="{_fmt(head.tracking * head.size)}"')
        if len(line) == 1:
            out.append(f"<text {' '.join(attrs)}>{escape(head.text)}</text>")
            continue
        spans = []
        for run in line:
            sa = [f'font-size="{_fmt(run.size)}"', f'font-weight="{run.weight}"',
                  f'fill="{run.color}"']
            if run.tracking:
                sa.append(f'letter-spacing="{_fmt(run.tracking * run.size)}"')
            spans.append(f"<tspan {' '.join(sa)}>{escape(run.text)}</tspan>")
        out.append(f"<text {' '.join(attrs)}>{''.join(spans)}</text>")
    return "\n".join(out)


def _arc_path(a: Arc) -> str:
    x0 = a.cx + a.r * math.cos(math.radians(a.a0))
    y0 = a.cy + a.r * math.sin(math.radians(a.a0))
    x1 = a.cx + a.r * math.cos(math.radians(a.a1))
    y1 = a.cy + a.r * math.sin(math.radians(a.a1))
    large = 1 if abs(a.a1 - a.a0) > 180 else 0
    return (f"M {_fmt(x0)} {_fmt(y0)} A {_fmt(a.r)} {_fmt(a.r)} 0 {large} 1 "
            f"{_fmt(x1)} {_fmt(y1)}")


def render(slide: spec.Slide, images: dict[str, str]) -> str:
    body, defs, clip_id = [], [], 0

    for el in slide.elements:
        if isinstance(el, Rect):
            a = [f'x="{_fmt(el.x)}"', f'y="{_fmt(el.y)}"',
                 f'width="{_fmt(el.w)}"', f'height="{_fmt(el.h)}"']
            if el.r:
                a.append(f'rx="{_fmt(el.r)}"')
            a.append(f'fill="{el.fill}"' if el.fill else 'fill="none"')
            if el.stroke:
                a.append(f'stroke="{el.stroke}" stroke-width="{_fmt(el.sw)}"')
            body.append(f"<rect {' '.join(a)}/>")
        elif isinstance(el, Line):
            body.append(
                f'<line x1="{_fmt(el.x1)}" y1="{_fmt(el.y1)}" x2="{_fmt(el.x2)}" '
                f'y2="{_fmt(el.y2)}" stroke="{el.color}" '
                f'stroke-width="{_fmt(el.sw)}" stroke-linecap="square"/>')
        elif isinstance(el, Text):
            body.append(_text(el))
        elif isinstance(el, Img):
            body.append(
                f'<image x="{_fmt(el.x)}" y="{_fmt(el.y)}" width="{_fmt(el.w)}" '
                f'height="{_fmt(el.h)}" preserveAspectRatio="xMidYMid meet" '
                f'href="data:image/png;base64,{images[el.name]}"/>')
        elif isinstance(el, Arc):
            attrs = (f'd="{_arc_path(el)}" fill="none" stroke="{el.color}" '
                     f'stroke-width="{_fmt(el.sw)}" opacity="{el.opacity}"')
            if el.clip:
                clip_id += 1
                cid = f"clip{clip_id}"
                x, y, w, h = el.clip
                defs.append(f'<clipPath id="{cid}"><rect x="{_fmt(x)}" y="{_fmt(y)}" '
                            f'width="{_fmt(w)}" height="{_fmt(h)}" rx="28"/></clipPath>')
                attrs += f' clip-path="url(#{cid})"'
            body.append(f"<path {attrs}/>")
        else:
            raise TypeError(f"unsupported primitive: {el!r}")

    style = (f"{font_face_css()}text{{font-family:'{spec.FONT}','Helvetica Neue',"
             "Arial,sans-serif;white-space:pre;}")
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'viewBox="0 0 {spec.W} {spec.H}" width="{spec.W}" height="{spec.H}">\n'
        f"<title>{escape(slide.title)}</title>\n"
        f"<defs><style>{style}</style>{''.join(defs)}</defs>\n"
        f'<rect width="{spec.W}" height="{spec.H}" fill="#FFFFFF"/>\n'
        + "\n".join(body) + "\n</svg>\n"
    )


def image_bank(slides) -> dict[str, str]:
    names = {el.name for s in slides for el in s.elements if isinstance(el, Img)}
    return {n: _b64(os.path.join(HERE, "assets", f"{n}.png")) for n in sorted(names)}
