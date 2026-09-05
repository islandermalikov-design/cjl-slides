import pathlib, json
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(".").resolve()
files = ["napravlenie-A-editorial.html","napravlenie-B-luxury.html","napravlenie-C-minimal.html"]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width":1920,"height":1080})
    for f in files:
        pg.goto((ROOT/f).as_uri()); pg.wait_for_timeout(900)
        r = pg.evaluate("""() => {
          const out=[]; const sl=[...document.querySelectorAll('.slide')];
          sl.forEach((s,i)=>{show(i); const sr=s.getBoundingClientRect(); let over=[],mb=0,mt=1e9;
            s.querySelectorAll('*').forEach(el=>{const r=el.getBoundingClientRect();
              if(r.width===0&&r.height===0)return;
              if(r.right>sr.right+0.6||r.left<sr.left-0.6||r.bottom>sr.bottom+0.6||r.top<sr.top-0.6)
                over.push(el.className||el.tagName);
              if(el.matches('h1,h2,p,span,li,ul')){mb=Math.max(mb,r.bottom-sr.top);mt=Math.min(mt,r.top-sr.top);}});
            out.push({i,over:[...new Set(over)].filter(c=>!/hero|b-hero|b-veil|a-hero/.test(c)),
                      contentPct:Math.round((mb-mt)/sr.height*1000)/10});});
          return out;}""")
        print(f.split('-')[1], json.dumps(r, ensure_ascii=False))
    b.close()
