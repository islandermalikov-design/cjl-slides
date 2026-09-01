from playwright.sync_api import sync_playwright
import sys, os
path = sys.argv[1] if len(sys.argv) > 1 else "deck.template.html"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width":1600,"height":900})
    pg.goto("file://" + os.path.abspath(path))
    pg.wait_for_timeout(2200)
    n = pg.evaluate("document.querySelectorAll('.slide').length")
    print("slides", n)
    for i in range(n):
        pg.screenshot(path=f"shots/s{i+1:02d}.png")
        pg.keyboard.press("ArrowRight")
        pg.wait_for_timeout(120)
    b.close()
