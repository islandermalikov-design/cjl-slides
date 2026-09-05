# -*- coding: utf-8 -*-
"""Три более премиальных, grid-ориентированных направления (D/E/F) — вторая волна."""
import base64, pathlib

ROOT = pathlib.Path(".").resolve()
FONTS = (ROOT / "assets/fonts/fonts.css").read_text(encoding="utf-8")


def uri(p):
    b = base64.b64encode((ROOT / p).read_bytes()).decode()
    return f"data:image/jpeg;base64,{b}"


IMG = {n: uri(f"assets/art/{n}.jpg") for n in [
    "hero-before", "hero-after", "persp-after", "det-before-net", "det-before-port",
    "det-before-fence", "det-after-port", "det-after-corner", "det-after-wing", "det-before-vert",
]}

SPECS = ["Площадь здания", "Этажность", "Год постройки", "Состояние", "Статус", "Коммуникации"]
NAME_HTML = "Гиляровского,<br>37к2"
NUM = "01"

BASE = """
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --color-primary:#1A1815;
  --color-secondary:#F2ECE3;
  --color-accent:#9A7F5E;
  --graphite-2:#232019;
  --stone:#A9A092;
  --taupe:#6E6459;
  --paper:#E8E1D5;
  --line-d:rgba(242,236,227,.18);
  --line-l:rgba(26,24,21,.16);
  --grid-d:rgba(242,236,227,.075);
  --grid-l:rgba(26,24,21,.065);
  --u:min(1vw,1.7778vh);
  --serif:'Cormorant Garamond','Noto Sans',Georgia,serif;
  --sans:'DM Sans','Noto Sans',sans-serif;
}
html,body{height:100%;background:#0C0B0A;overflow:hidden}
body{font-family:var(--sans);display:flex;align-items:center;justify-content:center}
.deck{position:relative;width:min(100vw,177.78vh);height:min(56.25vw,100vh)}
.slide{width:min(100vw,177.78vh);height:min(56.25vw,100vh);overflow:hidden;
  position:absolute;inset:0;opacity:0;visibility:hidden;
  transition:opacity .6s cubic-bezier(.22,.61,.36,1)}
.slide.on{opacity:1;visibility:visible}
.ph{background-size:cover;background-position:center;background-color:var(--graphite-2)}
.kick{font-size:calc(.58*var(--u));letter-spacing:.36em;text-transform:uppercase;font-weight:500}
.micro{font-size:calc(.55*var(--u));letter-spacing:.28em;text-transform:uppercase}
.hr{display:block;height:1px}
"""

NAV = """
const slides=[...document.querySelectorAll('.slide')];let i=0;
const show=n=>{i=Math.max(0,Math.min(slides.length-1,n));
  slides.forEach((s,k)=>s.classList.toggle('on',k===i));};
show(0);
addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='PageDown'){show(i+1);e.preventDefault();}
 if(e.key==='ArrowLeft'||e.key==='PageUp'){show(i-1);e.preventDefault();}});
let x0=null;
addEventListener('touchstart',e=>{x0=e.changedTouches[0].clientX;},{passive:true});
addEventListener('touchend',e=>{if(x0===null)return;const d=e.changedTouches[0].clientX-x0;
 if(Math.abs(d)>44)show(d<0?i+1:i-1);x0=null;},{passive:true});
"""


def page(title, comment, css, slides):
    return f"""<!-- {comment} -->
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<style>
{FONTS}
{BASE}
{css}
</style>
</head>
<body>
<div class="deck">
{slides}
</div>
<script>
{NAV}
</script>
</body>
</html>
"""


def spec_rows(cls="sp"):
    return "".join(f'<li><span class="{cls}-l">{s}</span><span class="{cls}-v"></span></li>' for s in SPECS)


def spec_rows_h(cls="hsp"):
    return "".join(f'<div class="{cls}"><span class="{cls}-l">{s}</span><span class="{cls}-v"></span></div>' for s in SPECS)


# ═════════════════════════════════════════════════════════════
# D — MODULAR GRID / ARCHITECTURAL BOARD
# ═════════════════════════════════════════════════════════════
D_CSS = """
.d{background:var(--color-primary)}
.d.after{background:var(--color-secondary)}
.d-sheet{position:absolute;inset:calc(4.6*var(--u));border:1px solid var(--line-d)}
.d.after .d-sheet{border-color:var(--line-l)}
.d-gridlines{position:absolute;inset:calc(4.6*var(--u));pointer-events:none;
  background-image:repeating-linear-gradient(to right,var(--grid-d) 0,var(--grid-d) 1px,transparent 1px,transparent 8.3333%)}
.d.after .d-gridlines{background-image:repeating-linear-gradient(to right,var(--grid-l) 0,var(--grid-l) 1px,transparent 1px,transparent 8.3333%)}
.d-coord{position:absolute;left:calc(5.3*var(--u));top:calc(5.35*var(--u));color:var(--taupe)}
.d-sheetnum{position:absolute;right:calc(5.3*var(--u));top:calc(5.35*var(--u));color:var(--taupe);text-align:right}

.d-hero{position:absolute;top:calc(4.6*var(--u));height:calc(47.05*var(--u))}
.d-hero.r{left:calc(42.43*var(--u));width:calc(52.97*var(--u))}
.d-hero.l{left:calc(4.6*var(--u));width:calc(52.97*var(--u))}

.d-txt{position:absolute;top:calc(9.6*var(--u));display:flex;flex-direction:column}
.d-txt.left{left:calc(4.6*var(--u));width:calc(35.5*var(--u))}
.d-txt.right{left:calc(61.9*var(--u));width:calc(33.5*var(--u))}
.d-kick{color:var(--color-accent);margin-bottom:calc(1.3*var(--u))}
.d-name{font-family:var(--serif);font-weight:300;font-size:calc(2.7*var(--u));line-height:1.08;
  color:var(--color-secondary)}
.d.after .d-name{color:var(--color-primary)}
.d-rule{height:1px;background:var(--line-d);margin:calc(1.25*var(--u)) 0 calc(.85*var(--u));width:calc(3.6*var(--u))}
.d.after .d-rule{background:var(--color-accent)}
.d-state{color:var(--stone)}
.d.after .d-state{color:var(--color-accent)}
.d-det{margin-top:calc(2.1*var(--u));width:calc(21*var(--u));height:calc(11.8*var(--u));
  background-size:cover;background-position:center}
.d-cap{margin-top:calc(.55*var(--u));color:var(--taupe)}
.d-specs{list-style:none;margin-top:calc(1.5*var(--u))}
.d-specs li{display:flex;align-items:baseline;gap:calc(.8*var(--u));
  padding-bottom:calc(.4*var(--u));margin-bottom:calc(.46*var(--u));border-bottom:1px solid var(--line-l)}
.d-specs .sp-l{font-size:calc(.54*var(--u));letter-spacing:.15em;text-transform:uppercase;
  color:var(--taupe);white-space:nowrap}
.d-specs .sp-v{flex:1;height:calc(.78*var(--u))}
"""

D_BEFORE = f"""<div class="slide d before">
  <div class="d-gridlines"></div>
  <div class="d-sheet"></div>
  <span class="micro d-coord">GIL — 37K2 / A</span>
  <span class="micro d-sheetnum">РЕСТАВРАЦИЯ<br>ОБЪЕКТОВ</span>
  <div class="d-hero r ph" style="background-image:url({IMG['hero-before']})"></div>
  <div class="d-txt left">
    <span class="kick d-kick">Объект {NUM} / 06</span>
    <h2 class="d-name">{NAME_HTML}</h2>
    <span class="hr d-rule"></span>
    <span class="micro d-state">До реставрации</span>
  </div>
</div>"""

D_AFTER = f"""<div class="slide d after">
  <div class="d-gridlines"></div>
  <div class="d-sheet"></div>
  <span class="micro d-coord">GIL — 37K2 / A</span>
  <span class="micro d-sheetnum">РЕСТАВРАЦИЯ<br>ОБЪЕКТОВ</span>
  <div class="d-hero l ph" style="background-image:url({IMG['hero-after']})"></div>
  <div class="d-txt right">
    <span class="kick d-kick">Объект {NUM} / 06</span>
    <h2 class="d-name">{NAME_HTML}</h2>
    <span class="hr d-rule"></span>
    <span class="micro d-state">После реставрации</span>
    <div class="d-det ph" style="background-image:url({IMG['det-after-port']})"></div>
    <span class="micro d-cap">Портик — тот же ракурс</span>
    <ul class="d-specs">{spec_rows()}</ul>
  </div>
</div>"""


# ═════════════════════════════════════════════════════════════
# E — FULL-BLEED EDITORIAL / КАПШН-ПОЛОСА
# ═════════════════════════════════════════════════════════════
E_CSS = """
.e{background:var(--color-primary)}
.e-hero{position:absolute;inset:0;background-size:cover;background-position:center}
.e-mark{position:absolute;left:calc(4.6*var(--u));top:calc(4.6*var(--u));display:flex;
  align-items:center;gap:calc(1*var(--u));color:rgba(242,236,227,.85);text-shadow:0 1px 4px rgba(0,0,0,.55)}
.e-mark .hr{width:calc(2.4*var(--u));background:var(--color-accent)}
.e-fol{position:absolute;right:calc(4.6*var(--u));top:calc(4.6*var(--u));color:rgba(242,236,227,.85);text-shadow:0 1px 4px rgba(0,0,0,.55)}

.e-inset{position:absolute;right:calc(4.6*var(--u));top:calc(9*var(--u));
  width:calc(15.5*var(--u));height:calc(21*var(--u));background-size:cover;background-position:center;
  outline:1px solid rgba(242,236,227,.4);outline-offset:calc(.5*var(--u))}
.e-inscap{position:absolute;right:calc(4.6*var(--u));top:calc(31.2*var(--u));width:calc(15.5*var(--u));
  text-align:right;color:rgba(242,236,227,.85);text-shadow:0 1px 4px rgba(0,0,0,.55)}

.e-strip{position:absolute;left:0;right:0;bottom:0;background:var(--color-primary);
  display:flex;align-items:center;padding:0 calc(4.6*var(--u))}
.e.after .e-strip{background:var(--color-secondary)}
.e-strip.slim{height:calc(9.2*var(--u))}
.e-strip.full{height:calc(15.6*var(--u));flex-direction:column;align-items:stretch;
  justify-content:center;gap:calc(1.5*var(--u))}
.e-row{display:flex;align-items:baseline;justify-content:space-between}
.e-kick{color:var(--color-accent)}
.e-name{font-family:var(--serif);font-weight:300;font-size:calc(2.35*var(--u));
  color:var(--color-secondary);margin-top:calc(.5*var(--u))}
.e.after .e-name{color:var(--color-primary)}
.e-state{color:var(--stone)}
.e.after .e-state{color:var(--color-accent)}
.e-left{display:flex;flex-direction:column}
.e-hsp{display:grid;grid-template-columns:repeat(6,1fr);gap:calc(1.4*var(--u));
  border-top:1px solid var(--line-l);padding-top:calc(1.1*var(--u))}
.hsp{display:flex;flex-direction:column;gap:calc(.4*var(--u))}
.hsp-l{font-size:calc(.5*var(--u));letter-spacing:.12em;text-transform:uppercase;color:var(--taupe)}
.hsp-v{height:calc(.62*var(--u));border-bottom:1px solid var(--line-l)}
"""

E_BEFORE = f"""<div class="slide e before">
  <div class="e-hero ph" style="background-image:url({IMG['hero-before']})"></div>
  <div class="e-mark"><span class="hr"></span><span class="micro">Реставрация объектов</span></div>
  <span class="micro e-fol">{NUM} / 06</span>
  <div class="e-strip slim">
    <div class="e-row" style="width:100%">
      <div class="e-left">
        <span class="kick e-kick">Объект {NUM}</span>
        <h2 class="e-name">{NAME_HTML.replace('<br>', ' ')}</h2>
      </div>
      <span class="micro e-state">До реставрации</span>
    </div>
  </div>
</div>"""

E_AFTER = f"""<div class="slide e after">
  <div class="e-hero ph" style="background-image:url({IMG['hero-after']})"></div>
  <div class="e-mark"><span class="hr"></span><span class="micro">Реставрация объектов</span></div>
  <span class="micro e-fol">{NUM} / 06</span>
  <div class="e-inset ph" style="background-image:url({IMG['det-after-port']})"></div>
  <span class="micro e-inscap">Портик после реставрации</span>
  <div class="e-strip full">
    <div class="e-row">
      <div class="e-left">
        <span class="kick e-kick">Объект {NUM}</span>
        <h2 class="e-name">{NAME_HTML.replace('<br>', ' ')}</h2>
      </div>
      <span class="micro e-state">После реставрации</span>
    </div>
    <div class="e-hsp">{spec_rows_h()}</div>
  </div>
</div>"""


# ═════════════════════════════════════════════════════════════
# F — GALLERY PRECISION / HAIRLINE FRAMES
# ═════════════════════════════════════════════════════════════
F_CSS = """
.f{background:var(--color-primary)}
.f.after{background:var(--paper)}
.f-id{position:absolute;left:calc(6*var(--u));top:calc(8*var(--u));width:calc(21*var(--u))}
.f-kick{color:var(--color-accent);margin-bottom:calc(1.6*var(--u))}
.f-name{font-family:var(--serif);font-weight:300;font-size:calc(2.55*var(--u));line-height:1.1;
  color:var(--color-secondary)}
.f.after .f-name{color:var(--color-primary)}
.f-rule{height:1px;background:var(--line-d);margin:calc(1.5*var(--u)) 0 calc(1.1*var(--u));width:calc(3.4*var(--u))}
.f.after .f-rule{background:var(--color-accent)}
.f-state{color:var(--stone)}
.f.after .f-state{color:var(--color-accent)}
.f-specs{list-style:none;margin-top:calc(3.4*var(--u))}
.f-specs li{display:flex;flex-direction:column;gap:calc(.36*var(--u));
  padding-bottom:calc(.46*var(--u));margin-bottom:calc(.6*var(--u));border-bottom:1px solid var(--line-l)}
.f-specs .sp-l{font-size:calc(.52*var(--u));letter-spacing:.14em;text-transform:uppercase;color:var(--taupe)}
.f-specs .sp-v{height:calc(.7*var(--u))}

.f-frame{position:absolute;background-size:cover;background-position:center;
  outline:1px solid rgba(242,236,227,.32);outline-offset:calc(.55*var(--u))}
.f.after .f-frame{outline-color:rgba(26,24,21,.28)}
.f-main{left:calc(33*var(--u));top:calc(5.6*var(--u));width:calc(58*var(--u));height:calc(41*var(--u))}
.f-main.small{width:calc(46*var(--u));height:calc(30*var(--u))}
.f-second{left:calc(65*var(--u));top:calc(33.5*var(--u));width:calc(24*var(--u));height:calc(17.6*var(--u));z-index:2}
.f-cap{position:absolute;color:var(--taupe)}
"""

F_BEFORE = f"""<div class="slide f before">
  <div class="f-id">
    <span class="kick f-kick">Объект {NUM} / 06</span>
    <h2 class="f-name">{NAME_HTML}</h2>
    <span class="hr f-rule"></span>
    <span class="micro f-state">До реставрации</span>
  </div>
  <div class="f-frame f-main ph" style="background-image:url({IMG['hero-before']})"></div>
  <span class="micro f-cap" style="left:calc(33*var(--u));top:calc(48.1*var(--u))">Гиляровского, 37к2 — фасад</span>
</div>"""

F_AFTER = f"""<div class="slide f after">
  <div class="f-id">
    <span class="kick f-kick">Объект {NUM} / 06</span>
    <h2 class="f-name">{NAME_HTML}</h2>
    <span class="hr f-rule"></span>
    <span class="micro f-state">После реставрации</span>
    <ul class="f-specs">{spec_rows()}</ul>
  </div>
  <div class="f-frame f-main small ph" style="background-image:url({IMG['hero-after']})"></div>
  <div class="f-frame f-second ph" style="background-image:url({IMG['det-after-port']})"></div>
  <span class="micro f-cap" style="left:calc(33*var(--u));top:calc(37.1*var(--u))">Фасад после реставрации</span>
  <span class="micro f-cap" style="left:calc(65*var(--u));top:calc(51.6*var(--u))">Портик</span>
</div>"""


OUTS = [
    ("napravlenie-D-grid.html", "Направление D — Modular Grid", "风格 D：Modular Grid / Architectural Board", D_CSS, D_BEFORE + D_AFTER),
    ("napravlenie-E-bleed.html", "Направление E — Full-bleed Editorial", "风格 E：Full-bleed Editorial / Caption Strip", E_CSS, E_BEFORE + E_AFTER),
    ("napravlenie-F-gallery.html", "Направление F — Gallery Precision", "风格 F：Gallery Precision / Hairline Frames", F_CSS, F_BEFORE + F_AFTER),
]
for fn, title, comment, css, slides in OUTS:
    p = ROOT / fn
    p.write_text(page(title, comment, css, slides), encoding="utf-8")
    print(fn, round(p.stat().st_size / 1024), "KB")
