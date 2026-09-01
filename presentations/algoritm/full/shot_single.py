from playwright.sync_api import sync_playwright
import sys, os
path = "deck.template.html"
target_idx = int(sys.argv[1]) - 1
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width":1600,"height":900})
    pg.goto("file://" + os.path.abspath(path))
    pg.wait_for_timeout(1500)
    for i in range(target_idx):
        pg.keyboard.press("ArrowRight")
        pg.wait_for_timeout(80)
    pg.screenshot(path="single.png")
    b.close()
