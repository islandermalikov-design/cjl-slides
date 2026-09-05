# -*- coding: utf-8 -*-
"""Три направления арт-дирекшна для пары ДО/ПОСЛЕ (Гиляровского, 37к2)."""
import base64, pathlib

ROOT = pathlib.Path(".").resolve()
FONTS = (ROOT / "assets/fonts/fonts.css").read_text(encoding="utf-8")

def uri(p):
    b = base64.b64encode((ROOT / p).read_bytes()).decode()
    return f"data:image/jpeg;base64,{b}"

IMG = {n: uri(f"assets/art/{n}.jpg") for n in [
    "hero-before","hero-after","persp-after","det-before-net","det-before-port",
    "det-before-fence","det-after-port","det-after-corner","det-after-wing","det-before-vert"]}

SPECS = ["Площадь здания","Этажность","Год постройки","Состояние","Статус","Коммуникации"]
NAME_HTML = "Гиляровского,<br>37к2"
NAME_CAPS = "ГИЛЯРОВСКОГО"
NUM = "01"

BASE = """
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --color-primary:#1A1815;      /* глубокий тёплый графит */
  --color-secondary:#F2ECE3;    /* ivory */
  --color-accent:#9A7F5E;       /* приглушённая бронза */
  --graphite-2:#232019;
  --stone:#A9A092;              /* тёплый серо-бежевый */
  --taupe:#6E6459;
  --paper:#E8E1D5;
  --line-d:rgba(242,236,227,.18);
  --line-l:rgba(26,24,21,.16);
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


# ─────────────────────────────────────────────────────────────
# A — EDITORIAL / архитектурный журнал
# ─────────────────────────────────────────────────────────────
A_CSS = """
.a{background:var(--color-primary)}
.a.after{background:var(--color-secondary)}
.folio{position:absolute;left:calc(4.4*var(--u));right:calc(4.4*var(--u));
  bottom:calc(2.4*var(--u));display:flex;justify-content:space-between;align-items:baseline}
.a .folio{color:var(--stone)}
.a.after .folio{color:var(--taupe)}
.folio .rule{position:absolute;left:0;right:0;top:calc(-1.1*var(--u));height:1px;background:var(--line-d)}
.a.after .folio .rule{background:var(--line-l)}

.a-grid{position:absolute;inset:0;display:grid;
  grid-template-columns:calc(4.4*var(--u)) 30% 1fr;
  grid-template-rows:calc(4.4*var(--u)) 1fr calc(7.4*var(--u))}
.a.after .a-grid{grid-template-columns:40% calc(3.6*var(--u)) 1fr calc(2.6*var(--u)) 1fr calc(4.4*var(--u))}
.a-hero{grid-column:3/4;grid-row:1/3;background-size:cover;background-position:center}
.a.after .a-hero{grid-column:1/2;grid-row:1/3}
.a-txt{grid-column:2/3;grid-row:2/3;display:flex;flex-direction:column;
  padding:calc(1.6*var(--u)) calc(2.6*var(--u)) 0 0}
.a.after .a-txt{grid-column:3/4;grid-row:2/3;padding:calc(1.6*var(--u)) 0 0 0}
.a-col2{grid-column:5/6;grid-row:2/3;padding-top:calc(1.6*var(--u));display:flex;flex-direction:column}
.a-kick{color:var(--color-accent);margin-bottom:calc(1.5*var(--u))}
.a-name{font-family:var(--serif);font-weight:300;font-size:calc(3.1*var(--u));line-height:1.06;
  color:var(--color-secondary);letter-spacing:.005em}
.a.after .a-name{color:var(--color-primary)}
.a-rule{height:1px;background:var(--line-d);margin:calc(1.7*var(--u)) 0 calc(1.2*var(--u))}
.a.after .a-rule{background:var(--line-l)}
.a-state{color:var(--stone)}
.a.after .a-state{color:var(--color-accent)}
.a-det{margin-top:auto;margin-bottom:calc(1.4*var(--u))}
.a.after .a-det{margin-top:calc(2.6*var(--u));margin-bottom:0}
.a-det .plate{width:100%;height:calc(13*var(--u));background-size:cover;background-position:center}
.a.after .a-det .plate{height:calc(14.8*var(--u))}
.a-cap{margin-top:calc(.75*var(--u));color:var(--taupe)}
.a-specs{list-style:none;margin-top:calc(6.2*var(--u))}
.a-specs li{display:flex;align-items:baseline;gap:calc(.8*var(--u));
  padding-bottom:calc(.5*var(--u));margin-bottom:calc(.72*var(--u));
  border-bottom:1px solid var(--line-l)}
.a-specs .sp-l{font-size:calc(.56*var(--u));letter-spacing:.16em;text-transform:uppercase;
  color:var(--taupe);white-space:nowrap}
.a-specs .sp-v{flex:1;height:calc(.8*var(--u))}
"""

A_BEFORE = f"""<div class="slide a before">
  <div class="a-grid">
    <div class="a-hero ph" style="background-image:url({IMG['hero-before']})"></div>
    <div class="a-txt">
      <span class="kick a-kick">Объект {NUM} / 06</span>
      <h2 class="a-name">{NAME_HTML}</h2>
      <span class="hr a-rule"></span>
      <span class="micro a-state">До реставрации</span>
      <div class="a-det">
        <div class="plate ph" style="background-image:url({IMG['det-before-net']})"></div>
        <span class="micro a-cap">Фасад до начала работ</span>
      </div>
    </div>
  </div>
  <div class="folio"><span class="hr rule"></span>
    <span class="micro">Реставрация объектов</span><span class="micro">{NUM} / 06</span></div>
</div>"""

A_AFTER = f"""<div class="slide a after">
  <div class="a-grid">
    <div class="a-hero ph" style="background-image:url({IMG['hero-after']})"></div>
    <div class="a-txt">
      <span class="kick a-kick">Объект {NUM} / 06</span>
      <h2 class="a-name">{NAME_HTML}</h2>
      <span class="hr a-rule"></span>
      <span class="micro a-state">После реставрации</span>
      <div class="a-det">
        <div class="plate ph" style="background-image:url({IMG['persp-after']})"></div>
        <span class="micro a-cap">Фасад после реставрации</span>
      </div>
    </div>
    <div class="a-col2"><ul class="a-specs">{spec_rows()}</ul></div>
  </div>
  <div class="folio"><span class="hr rule"></span>
    <span class="micro">Реставрация объектов</span><span class="micro">{NUM} / 06</span></div>
</div>"""


# ─────────────────────────────────────────────────────────────
# B — LUXURY REAL ESTATE / брошюра
# ─────────────────────────────────────────────────────────────
B_CSS = """
.b{background:var(--color-primary);position:relative}
.b-hero{position:absolute;inset:0;background-size:cover;background-position:center}
.b-veil{position:absolute;inset:0;background:rgba(18,16,14,.34)}
.b.after .b-veil{background:rgba(18,16,14,.16)}
/* информационная панель — чёткий прямоугольник, без теней и скруглений */
.b-panel{position:absolute;left:calc(4.6*var(--u));bottom:calc(4.6*var(--u));
  width:calc(31*var(--u));padding:calc(2.6*var(--u)) calc(2.6*var(--u)) calc(2.3*var(--u));
  background:var(--color-primary);border-top:1px solid var(--color-accent)}
.b.after .b-panel{background:var(--color-secondary)}
.b-num{font-family:var(--serif);font-weight:300;font-size:calc(1.5*var(--u));
  letter-spacing:.22em;color:var(--color-accent);display:block}
.b-name{font-family:var(--serif);font-weight:300;font-size:calc(2.5*var(--u));line-height:1.08;
  color:var(--color-secondary);margin-top:calc(1.1*var(--u))}
.b.after .b-name{color:var(--color-primary)}
.b-rule{height:1px;background:var(--line-d);margin:calc(1.4*var(--u)) 0 calc(1*var(--u))}
.b.after .b-rule{background:var(--line-l)}
.b-state{color:var(--stone)}
.b.after .b-state{color:var(--color-accent)}
.b-specs{list-style:none;margin-top:calc(1.6*var(--u));
  display:grid;grid-template-columns:1fr 1fr;gap:calc(.9*var(--u)) calc(1.4*var(--u))}
.b-specs li{display:flex;flex-direction:column;gap:calc(.34*var(--u));
  padding-bottom:calc(.42*var(--u));border-bottom:1px solid var(--line-l)}
.b-specs .sp-l{font-size:calc(.5*var(--u));letter-spacing:.16em;text-transform:uppercase;color:var(--taupe)}
.b-specs .sp-v{height:calc(.7*var(--u))}
/* небольшой кадр детали, прижат к правому краю */
.b-det{position:absolute;right:calc(4.6*var(--u));top:calc(4.6*var(--u));
  width:calc(15.5*var(--u));height:calc(21*var(--u));background-size:cover;background-position:center;
  outline:1px solid rgba(242,236,227,.35);outline-offset:calc(.5*var(--u))}
.b-detcap{position:absolute;right:calc(4.6*var(--u));top:calc(26.6*var(--u));
  color:rgba(242,236,227,.62);text-align:right;width:calc(15.5*var(--u))}
.b.after .b-detcap{color:rgba(242,236,227,.8)}
.b-mark{position:absolute;left:calc(4.6*var(--u));top:calc(4.6*var(--u));display:flex;
  align-items:center;gap:calc(1*var(--u));color:rgba(242,236,227,.72)}
.b-mark .hr{width:calc(2.6*var(--u));background:var(--color-accent)}
"""

B_BEFORE = f"""<div class="slide b before">
  <div class="b-hero ph" style="background-image:url({IMG['hero-before']})"></div>
  <div class="b-veil"></div>
  <div class="b-mark"><span class="hr"></span><span class="micro">Реставрация объектов</span></div>
  <div class="b-det ph" style="background-image:url({IMG['det-before-vert']})"></div>
  <div class="b-panel">
    <span class="b-num">{NUM} / 06</span>
    <h2 class="b-name">{NAME_HTML}</h2>
    <span class="hr b-rule"></span>
    <span class="micro b-state">До реставрации</span>
  </div>
</div>"""

B_AFTER = f"""<div class="slide b after">
  <div class="b-hero ph" style="background-image:url({IMG['hero-after']})"></div>
  <div class="b-veil"></div>
  <div class="b-mark"><span class="hr"></span><span class="micro">Реставрация объектов</span></div>
  <div class="b-det ph" style="background-image:url({IMG['det-after-corner']})"></div>
  <div class="b-panel">
    <span class="b-num">{NUM} / 06</span>
    <h2 class="b-name">{NAME_HTML}</h2>
    <span class="hr b-rule"></span>
    <span class="micro b-state">После реставрации</span>
    <ul class="b-specs">{spec_rows()}</ul>
  </div>
</div>"""


# ─────────────────────────────────────────────────────────────
# C — CONTEMPORARY MINIMAL
# ─────────────────────────────────────────────────────────────
C_CSS = """
.c{background:var(--color-primary)}
.c.after{background:var(--paper)}
.c-num{position:absolute;left:calc(5.2*var(--u));top:calc(6.4*var(--u));
  font-family:var(--serif);font-weight:300;font-size:calc(12*var(--u));line-height:.82;
  color:rgba(242,236,227,.13);letter-spacing:-.02em}
.c.after .c-num{color:rgba(26,24,21,.10)}
.c-id{position:absolute;left:calc(5.4*var(--u));top:calc(19.5*var(--u));max-width:calc(20*var(--u))}
.c-name{font-family:var(--serif);font-weight:300;font-size:calc(2*var(--u));line-height:1.1;
  color:var(--color-secondary);letter-spacing:.06em;text-transform:uppercase}
.c.after .c-name{color:var(--color-primary)}
.c-line{height:1px;background:var(--line-d);margin:calc(1.3*var(--u)) 0 calc(1*var(--u));width:calc(4.2*var(--u))}
.c.after .c-line{background:var(--line-l)}
.c-state{color:var(--stone)}
.c.after .c-state{color:var(--taupe)}
/* ДО — один кадр, много воздуха */
.c-single{position:absolute;right:calc(5.2*var(--u));top:calc(6.4*var(--u));
  width:calc(56*var(--u));height:calc(37.6*var(--u));background-size:cover;background-position:center}
/* ПОСЛЕ — диптих разного масштаба на общей базовой линии */
.c-tall{position:absolute;left:calc(30*var(--u));top:calc(8.6*var(--u));
  width:calc(24*var(--u));height:calc(35.4*var(--u));background-size:cover;background-position:center}
.c-wide{position:absolute;left:calc(56*var(--u));top:calc(19.4*var(--u));
  width:calc(38.8*var(--u));height:calc(24.6*var(--u));background-size:cover;background-position:center}
.c-specs{position:absolute;left:calc(5.4*var(--u));bottom:calc(5.4*var(--u));
  width:calc(20*var(--u));list-style:none}
.c-specs li{display:flex;justify-content:space-between;align-items:baseline;
  padding-bottom:calc(.36*var(--u));margin-bottom:calc(.5*var(--u));border-bottom:1px solid var(--line-l)}
.c-specs .sp-l{font-size:calc(.5*var(--u));letter-spacing:.16em;text-transform:uppercase;color:var(--taupe)}
.c-specs .sp-v{width:calc(4.6*var(--u));height:calc(.66*var(--u))}
.c-cap{position:absolute;color:var(--taupe)}
.c-cap.a1{left:calc(30*var(--u));top:calc(44.8*var(--u))}
.c-cap.a2{left:calc(56*var(--u));top:calc(44.8*var(--u))}
.c-cap.b1{right:calc(5.2*var(--u));top:calc(45*var(--u));color:rgba(242,236,227,.55)}
"""

C_BEFORE = f"""<div class="slide c before">
  <span class="c-num">{NUM}</span>
  <div class="c-id">
    <h2 class="c-name">{NAME_CAPS}<br>37к2</h2>
    <span class="hr c-line"></span>
    <span class="micro c-state">До реставрации</span>
  </div>
  <div class="c-single ph" style="background-image:url({IMG['hero-before']})"></div>
  <span class="micro c-cap b1">Гиляровского, 37к2 — 2024</span>
</div>"""

C_AFTER = f"""<div class="slide c after">
  <span class="c-num">{NUM}</span>
  <div class="c-id">
    <h2 class="c-name">{NAME_CAPS}<br>37к2</h2>
    <span class="hr c-line"></span>
    <span class="micro c-state">После реставрации</span>
  </div>
  <div class="c-tall ph" style="background-image:url({IMG['det-after-corner']})"></div>
  <div class="c-wide ph" style="background-image:url({IMG['hero-after']})"></div>
  <span class="micro c-cap a1">Фасад</span>
  <span class="micro c-cap a2">Главный вход</span>
  <ul class="c-specs">{spec_rows()}</ul>
</div>"""


OUTS = [
  ("napravlenie-A-editorial.html", "Направление A — Editorial", "风格 18：Luxury Fashion House / вариант A — editorial", A_CSS, A_BEFORE + A_AFTER),
  ("napravlenie-B-luxury.html",    "Направление B — Luxury real estate", "风格 18：Luxury Fashion House / вариант B — luxury", B_CSS, B_BEFORE + B_AFTER),
  ("napravlenie-C-minimal.html",   "Направление C — Contemporary minimal", "风格 17/18：Muji × Luxury / вариант C — minimal", C_CSS, C_BEFORE + C_AFTER),
]
for fn, title, comment, css, slides in OUTS:
    p = ROOT / fn
    p.write_text(page(title, comment, css, slides), encoding="utf-8")
    print(fn, round(p.stat().st_size/1024), "KB")
