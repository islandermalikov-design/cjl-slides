"""Text metrics used by every renderer.

SVG/HTML are set in Inter (embedded in the files); the PPTX is set in Arial so
that it opens correctly on any machine. Shape positions that depend on a string
width — the green percent badges, the unit next to a number — are therefore
measured with the metrics of the font that output actually uses.

Call `use("arial")` before building the spec for the PPTX, `use("inter")`
(the default) for SVG/HTML.
"""

from __future__ import annotations

import os
from functools import lru_cache

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))

# Inter ships here as two variable-font subsets (cyrillic + latin).
INTER = (
    os.path.join(HERE, "fonts", "inter-cyrillic.woff2"),
    os.path.join(HERE, "fonts", "inter-latin.woff2"),
)
# Liberation Sans is metric-compatible with Arial and is what LibreOffice
# substitutes when it renders the PPTX for preview.
LIBERATION = "/usr/share/fonts/truetype/liberation/LiberationSans-%s.ttf"

# hhea ascent/descent as a share of the em, used to turn a baseline into the
# top edge of a PowerPoint text frame.
ASCENT = {"inter": 0.9688, "arial": 0.9052}
DESCENT = {"inter": 0.2422, "arial": 0.2119}

_font = "inter"


def use(name: str) -> None:
    global _font
    assert name in ("inter", "arial")
    _font = name


def current() -> str:
    return _font


def ascent(font: str | None = None) -> float:
    return ASCENT[font or _font]


@lru_cache(maxsize=None)
def _advances(font: str, weight: int) -> dict[str, float]:
    """char -> advance width in em units."""
    table: dict[str, float] = {}
    if font == "inter":
        paths = INTER
    else:
        paths = (LIBERATION % ("Bold" if weight >= 600 else "Regular"),)

    for path in paths:
        f = TTFont(path)
        if "fvar" in f:
            f = instancer.instantiateVariableFont(
                f, {"wght": weight}, inplace=True, updateFontNames=False
            )
        upem = f["head"].unitsPerEm
        hmtx = f["hmtx"]
        for code, name in f.getBestCmap().items():
            ch = chr(code)
            if ch not in table:
                table[ch] = hmtx[name][0] / upem
        f.close()
    return table


def text_width(text: str, size: float, weight: int = 400, tracking: float = 0.0,
               font: str | None = None) -> float:
    """Width in px of `text` at `size` px. `tracking` is letter-spacing in em."""
    adv = _advances(font or _font, weight)
    fallback = adv.get("n", 0.6)
    total = sum(adv.get(ch, fallback) for ch in text)
    return total * size + tracking * size * max(len(text) - 1, 0)


def runs_width(runs) -> float:
    return sum(text_width(r.text, r.size, r.weight, r.tracking) for r in runs)
