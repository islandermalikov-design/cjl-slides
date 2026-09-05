import pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(".").resolve()
out = ROOT/"build/var"; out.mkdir(parents=True, exist_ok=True)
for f in out.glob("*.png"): f.unlink()
files = ["napravlenie-A-editorial.html","napravlenie-B-luxury.html","napravlenie-C-minimal.html"]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
                          args=["--no-sandbox","--font-render-hinting=none"])
    pg = b.new_page(viewport={"width":1920,"height":1080})
    for f in files:
        tag = f.split("-")[1]
        pg.goto((ROOT/f).as_uri()); pg.wait_for_timeout(1100)
        n = pg.evaluate("document.querySelectorAll('.slide').length")
        for i in range(n):
            pg.evaluate(f"show({i})"); pg.wait_for_timeout(650)
            pg.locator(".slide").nth(i).screenshot(path=str(out/f"{tag}{i}.png"))
        print(f, n)
    b.close()
