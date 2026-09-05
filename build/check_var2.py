import pathlib, json
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(".").resolve()
files = ["napravlenie-D-grid.html","napravlenie-E-bleed.html","napravlenie-F-gallery.html"]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width":1920,"height":1080})
    for f in files:
        pg.goto((ROOT/f).as_uri()); pg.wait_for_timeout(900)
        r = pg.evaluate("""() => {
          const out=[]; const sl=[...document.querySelectorAll('.slide')];
          sl.forEach((s,i)=>{show(i); const sr=s.getBoundingClientRect(); let over=[];
            s.querySelectorAll('*').forEach(el=>{const r=el.getBoundingClientRect();
              if(r.width===0&&r.height===0)return;
              if(r.right>sr.right+0.6||r.left<sr.left-0.6||r.bottom>sr.bottom+0.6||r.top<sr.top-0.6)
                over.push(el.className||el.tagName);});
            out.push({i,over:[...new Set(over)]});});
          return out;}""")
        print(f.split('-')[1], json.dumps(r, ensure_ascii=False))
    b.close()
