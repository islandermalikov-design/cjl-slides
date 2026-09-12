"""Build the two redesigned slides into dist/: SVG, PPTX, HTML and PNG previews.

    python3 build.py            # svg + pptx + html
    python3 build.py --preview  # also render PNGs with Chromium (needs playwright)
"""

from __future__ import annotations

import os
import sys

import metrics
import render_pptx
import render_svg
import spec

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist")

HTML_SHELL = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Альфа-Банк — Онлайн-продажи, 2 слайда</title>
<style>
  html, body {{ margin: 0; height: 100%; background: #111; }}
  body {{ display: flex; align-items: center; justify-content: center; }}
  .deck {{ position: relative; width: min(100vw, 177.78vh); height: min(56.25vw, 100vh); overflow: hidden; }}
  .slide {{ position: absolute; inset: 0; opacity: 0; visibility: hidden;
            transition: opacity .28s ease; background: #fff; }}
  .slide.is-active {{ opacity: 1; visibility: visible; }}
  .slide svg {{ display: block; width: 100%; height: 100%; }}
</style>
</head>
<body>
<div class="deck">
{slides}
</div>
<script>
  const slides = Array.from(document.querySelectorAll('.slide'));
  let index = 0;
  const show = (i) => {{
    index = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, k) => s.classList.toggle('is-active', k === index));
  }};
  document.addEventListener('keydown', (e) => {{
    if (e.key === 'ArrowRight' || e.key === 'PageDown') show(index + 1);
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') show(index - 1);
  }});
  let touchX = null;
  document.addEventListener('touchstart', (e) => {{ touchX = e.changedTouches[0].clientX; }}, {{passive: true}});
  document.addEventListener('touchend', (e) => {{
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  }}, {{passive: true}});
  show(0);
</script>
</body>
</html>
"""


def build_svgs() -> list[tuple[spec.Slide, str]]:
    metrics.use("inter")
    slides = [factory() for factory in spec.SLIDES]
    images = render_svg.image_bank(slides)
    out = []
    for s in slides:
        svg = render_svg.render(s, images)
        path = os.path.join(DIST, f"{s.name}.svg")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(svg)
        out.append((s, svg))
        print(f"  svg   {os.path.relpath(path, HERE)}  ({len(svg) // 1024} KB)")
    return out


def build_html(rendered) -> str:
    parts = [f'<section class="slide" data-name="{s.name}">\n{svg}</section>'
             for s, svg in rendered]
    path = os.path.join(DIST, "alfa-online-sales-redesign.html")
    html = HTML_SHELL.format(slides="\n".join(parts))
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"  html  {os.path.relpath(path, HERE)}  ({len(html) // 1024} KB)")
    return path


def build_pptx() -> str:
    metrics.use("arial")
    slides = [factory() for factory in spec.SLIDES]
    path = os.path.join(DIST, "alfa-online-sales-redesign.pptx")
    render_pptx.build(slides, path)
    print(f"  pptx  {os.path.relpath(path, HERE)}  "
          f"({os.path.getsize(path) // 1024} KB)")
    metrics.use("inter")
    return path


def build_previews(rendered) -> None:
    from playwright.sync_api import sync_playwright

    # the session image ships Chromium at a fixed path; use it rather than
    # downloading a second copy
    pinned = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
    launch = {"executable_path": pinned} if os.path.exists(pinned) else {}

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": spec.W, "height": spec.H},
                                device_scale_factor=1)
        for s, _ in rendered:
            src = os.path.join(DIST, f"{s.name}.svg")
            page.goto("file://" + src)
            page.wait_for_timeout(400)
            out = os.path.join(DIST, f"{s.name}.png")
            page.screenshot(path=out)
            print(f"  png   {os.path.relpath(out, HERE)}")
        browser.close()


def main() -> None:
    os.makedirs(DIST, exist_ok=True)
    print("building:")
    rendered = build_svgs()
    build_html(rendered)
    build_pptx()
    if "--preview" in sys.argv:
        build_previews(rendered)


if __name__ == "__main__":
    main()
