import pathlib, json
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
html = ROOT / "restavraciya-obektov-Luxury.html"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width":1920,"height":1080})
    pg.goto(html.as_uri()); pg.wait_for_timeout(900)
    res = pg.evaluate("""() => {
      const out=[]; const slides=[...document.querySelectorAll('.slide')];
      slides.forEach((s,i)=>{ show(i);
        const sr=s.getBoundingClientRect();
        let over=[], maxB=0, minT=1e9, maxR=0;
        s.querySelectorAll('*').forEach(el=>{
          const r=el.getBoundingClientRect();
          if(r.width===0&&r.height===0) return;
          if(r.right>sr.right+0.6||r.left<sr.left-0.6||r.bottom>sr.bottom+0.6||r.top<sr.top-0.6)
             over.push(el.className||el.tagName);
          if(el.matches('h1,h2,p,span,li,ul')){ maxB=Math.max(maxB,r.bottom-sr.top); minT=Math.min(minT,r.top-sr.top);}        
        });
        // геометрия фото-рамки
        const fr=s.querySelector('.frame'); const f=fr?fr.getBoundingClientRect():null;
        out.push({i, over:[...new Set(over)],
          textTop:Math.round(minT), textBottom:Math.round(maxB),
          contentPct: Math.round((maxB-minT)/sr.height*1000)/10,
          frame: f?[Math.round(f.left-sr.left),Math.round(f.top-sr.top),Math.round(f.width),Math.round(f.height)]:null,
          framePct: f?Math.round(f.width*f.height/(sr.width*sr.height)*1000)/10:null});
      });
      return out;}""")
    print(json.dumps(res, ensure_ascii=False, indent=1))
    b.close()
