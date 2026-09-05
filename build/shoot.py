import sys, pathlib, os
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
html = ROOT / (sys.argv[1] if len(sys.argv) > 1 else "restavraciya-obektov-Luxury.html")
outdir = ROOT / "build/shots"; outdir.mkdir(parents=True, exist_ok=True)
for f in outdir.glob("*.png"): f.unlink()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
                          args=["--no-sandbox","--font-render-hinting=none"])
    pg = b.new_page(viewport={"width":1920,"height":1080}, device_scale_factor=1)
    pg.goto(html.as_uri()); pg.wait_for_timeout(1200)
    n = pg.evaluate("document.querySelectorAll('.slide').length")
    for i in range(n):
        pg.evaluate(f"show({i})"); pg.wait_for_timeout(750)
        pg.locator(".slide").nth(i).screenshot(path=str(outdir/f"s{i:02d}.png"))
    print("slides:", n)
    b.close()
