# -*- coding: utf-8 -*-
"""Полная презентация в направлении E — Full-bleed Editorial."""
import base64, pathlib, sys
sys.path.insert(0, "build")
import deck_spec as S

ROOT = pathlib.Path(".").resolve()
OUT = ROOT / "restavraciya-obektov-E.html"
FONTS = (ROOT / "assets/fonts/fonts.css").read_text(encoding="utf-8")

# слоты, у которых нет реальной фотографии — оформленный placeholder
PLACEHOLDER_SLOTS = {"borby-after", "nikoloyamskaya-before", "pochtovaya-after"}
PLACEHOLDER_CAPTION = "ФОТОСЪЁМКА В ПРОЦЕССЕ"


def uri(path):
    p = ROOT / path
    b = base64.b64encode(p.read_bytes()).decode()
    return f"data:image/jpeg;base64,{b}"


IMG = {}
for f in (ROOT / "assets/e").glob("*.jpg"):
    IMG[f.stem] = uri(f"assets/e/{f.stem}.jpg")

PALETTE = {
    "primary": "#1A1815", "secondary": "#F2ECE3", "accent": "#9A7F5E",
    "graphite2": "#232019", "stone": "#A9A092", "taupe": "#6E6459", "paper": "#E8E1D5",
}

BASE = """
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --color-primary:%(primary)s; --color-secondary:%(secondary)s; --color-accent:%(accent)s;
  --graphite-2:%(graphite2)s; --stone:%(stone)s; --taupe:%(taupe)s; --paper:%(paper)s;
  --line-d:rgba(242,236,227,.18); --line-l:rgba(26,24,21,.16);
  --u:min(1vw,1.7778vh);
  --serif:'Cormorant Garamond','Noto Sans',Georgia,serif;
  --sans:'DM Sans','Noto Sans',sans-serif;
}
html,body{height:100%%;background:#0C0B0A;overflow:hidden}
body{font-family:var(--sans);display:flex;align-items:center;justify-content:center}
.deck{position:relative;width:min(100vw,177.78vh);height:min(56.25vw,100vh)}
.slide{width:min(100vw,177.78vh);height:min(56.25vw,100vh);overflow:hidden;
  position:absolute;inset:0;opacity:0;visibility:hidden;
  transition:opacity .62s cubic-bezier(.22,.61,.36,1)}
.slide.on{opacity:1;visibility:visible}
.ph{background-size:cover;background-position:center;background-color:var(--graphite-2)}
.ph.empty{
  background:repeating-linear-gradient(45deg,rgba(178,154,124,.055) 0 1px,transparent 1px 9px),
    radial-gradient(120%% 90%% at 62%% 22%%,#2E2A25 0%%,#1B1917 72%%);
  display:flex;align-items:center;justify-content:center}
.ph.empty::after{content:"";position:absolute;inset:calc(2*var(--u));border:1px solid rgba(242,236,227,.13)}
.ph-mark{position:relative;width:calc(2.6*var(--u));height:calc(2.6*var(--u))}
.ph-mark::before,.ph-mark::after{content:"";position:absolute;background:var(--color-accent);opacity:.62}
.ph-mark::before{left:50%%;top:0;width:1px;height:100%%}
.ph-mark::after{top:50%%;left:0;height:1px;width:100%%}
.ph-in{display:flex;flex-direction:column;align-items:center;gap:calc(1.4*var(--u))}
.ph-cap{font-family:var(--sans);font-size:calc(.58*var(--u));letter-spacing:.34em;
  color:rgba(242,236,227,.5);text-transform:uppercase}

.kick{font-size:calc(.58*var(--u));letter-spacing:.36em;text-transform:uppercase;font-weight:500}
.micro{font-size:calc(.55*var(--u));letter-spacing:.28em;text-transform:uppercase}
.hr{display:block;height:1px}

.hero{position:absolute;inset:0}
.scrim-top{position:absolute;left:0;right:0;top:0;height:calc(11*var(--u));
  background:linear-gradient(to bottom,rgba(10,9,8,.44),rgba(10,9,8,0));pointer-events:none}
.mark{position:absolute;left:calc(4.6*var(--u));top:calc(4.6*var(--u));display:flex;
  align-items:center;gap:calc(1*var(--u));color:rgba(242,236,227,.85);text-shadow:0 1px 4px rgba(0,0,0,.55)}
.mark .hr{width:calc(2.4*var(--u));background:var(--color-accent)}
.fol{position:absolute;right:calc(4.6*var(--u));top:calc(4.6*var(--u));
  color:rgba(242,236,227,.85);text-shadow:0 1px 4px rgba(0,0,0,.55)}

.inset{position:absolute;right:calc(4.6*var(--u));top:calc(9*var(--u));
  width:calc(15.5*var(--u));height:calc(21*var(--u));outline:1px solid rgba(242,236,227,.4);
  outline-offset:calc(.5*var(--u))}
.inscap{position:absolute;right:calc(4.6*var(--u));top:calc(31.2*var(--u));width:calc(15.5*var(--u));
  text-align:right;color:rgba(242,236,227,.85);text-shadow:0 1px 4px rgba(0,0,0,.55)}

.strip{position:absolute;left:0;right:0;bottom:0;background:var(--color-primary);
  display:flex;align-items:center;padding:0 calc(4.6*var(--u))}
.state-after .strip{background:var(--color-secondary)}
.strip.slim{height:calc(9.2*var(--u))}
.strip.full{height:calc(15.6*var(--u));flex-direction:column;align-items:stretch;
  justify-content:center;gap:calc(1.5*var(--u))}
.row{display:flex;align-items:baseline;justify-content:space-between;width:100%%}
.kick-a{color:var(--color-accent)}
.nm{font-family:var(--serif);font-weight:300;font-size:calc(2.35*var(--u));
  color:var(--color-secondary);margin-top:calc(.5*var(--u))}
.state-after .nm{color:var(--color-primary)}
.state-lbl{color:var(--stone)}
.state-after .state-lbl{color:var(--color-accent)}
.left-col{display:flex;flex-direction:column}
.hsp-row{display:grid;grid-template-columns:repeat(6,1fr);gap:calc(1.4*var(--u));
  border-top:1px solid var(--line-l);padding-top:calc(1.1*var(--u))}
.hsp{display:flex;flex-direction:column;gap:calc(.4*var(--u))}
.hsp-l{font-size:calc(.5*var(--u));letter-spacing:.12em;text-transform:uppercase;color:var(--taupe)}
.hsp-v{height:calc(.62*var(--u));border-bottom:1px solid var(--line-l)}

/* обложка */
.cov-title{position:absolute;left:calc(4.6*var(--u));bottom:calc(4.4*var(--u));
  color:var(--color-secondary)}
.cov-h1{font-family:var(--serif);font-weight:300;font-size:calc(4.3*var(--u));
  letter-spacing:.16em;line-height:1.05;text-transform:uppercase}
.cov-p{font-size:calc(1.15*var(--u));letter-spacing:.05em;color:rgba(242,236,227,.68);
  margin-top:calc(1.6*var(--u));font-weight:300}

/* финал */
.fin-strip{position:absolute;left:0;right:0;bottom:0;background:var(--color-secondary);
  height:calc(7.4*var(--u));display:flex;align-items:center;justify-content:center;gap:calc(2.6*var(--u));
  padding:0 calc(4.6*var(--u))}
.fin-item{display:flex;align-items:baseline;gap:calc(.6*var(--u));color:var(--taupe);
  padding:0 calc(1.3*var(--u));border-left:1px solid var(--line-l)}
.fin-item:first-child{border-left:none;padding-left:0}
.fin-item i{font-style:normal;color:var(--color-accent);font-weight:500}
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


def frame_style(slot):
    if slot in IMG:
        return f' style="background-image:url({IMG[slot]})"'
    return ""


def hero_div(slot):
    if slot in PLACEHOLDER_SLOTS:
        return (f'<div class="hero ph empty" data-slot="{slot}">'
                f'<div class="ph-in"><span class="ph-mark"></span>'
                f'<span class="ph-cap">{PLACEHOLDER_CAPTION}</span></div></div>')
    return f'<div class="hero ph" data-slot="{slot}"{frame_style(slot)}></div>'


def spec_row():
    return "".join(f'<div class="hsp"><span class="hsp-l">{s}</span><span class="hsp-v"></span></div>'
                   for s in S.SPEC_LABELS)


def before_slide(o):
    slot = f"{o['slug']}-before"
    name = o["name"].replace("\n", " ")
    return f'''<div class="slide state-before">
  {hero_div(slot)}
  <div class="scrim-top"></div>
  <div class="mark"><span class="hr"></span><span class="micro">Реставрация объектов</span></div>
  <span class="micro fol">{o["idx"]} / 06</span>
  <div class="strip slim">
    <div class="row">
      <div class="left-col">
        <span class="kick kick-a">Объект {o["idx"]}</span>
        <h2 class="nm">{name}</h2>
      </div>
      <span class="micro state-lbl">До реставрации</span>
    </div>
  </div>
</div>'''


def after_slide(o):
    slot = f"{o['slug']}-after"
    det_key = f"{slot}-det"
    name = o["name"].replace("\n", " ")
    inset = ""
    if det_key in IMG:
        cap = "Портик после реставрации" if o["slug"] == "giliarovskogo" else "Фрагмент фасада"
        inset = (f'<div class="inset ph" style="background-image:url({IMG[det_key]})"></div>'
                  f'<span class="micro inscap">{cap}</span>')
    return f'''<div class="slide state-after">
  {hero_div(slot)}
  <div class="scrim-top"></div>
  <div class="mark"><span class="hr"></span><span class="micro">Реставрация объектов</span></div>
  <span class="micro fol">{o["idx"]} / 06</span>
  {inset}
  <div class="strip full">
    <div class="row">
      <div class="left-col">
        <span class="kick kick-a">Объект {o["idx"]}</span>
        <h2 class="nm">{name}</h2>
      </div>
      <span class="micro state-lbl">После реставрации</span>
    </div>
    <div class="hsp-row">{spec_row()}</div>
  </div>
</div>'''


def cover_slide():
    return f'''<div class="slide state-before">
  <div class="hero ph" style="background-image:url({IMG['cover']})"></div>
  <div class="scrim-top"></div>
  <div class="cov-title">
    <h1 class="cov-h1">{S.TITLE}</h1>
    <p class="cov-p">{S.SUBTITLE}</p>
  </div>
</div>'''


def final_slide():
    items = "".join(f'<div class="fin-item"><i>{o["idx"]}</i><span class="micro">'
                     f'{o["name"].split(chr(10))[0]}</span></div>' for o in S.OBJECTS)
    return f'''<div class="slide state-after">
  <div class="hero ph" style="background-image:url({IMG['final']})"></div>
  <div class="scrim-top"></div>
  <div class="mark"><span class="hr"></span><span class="micro">Реставрация объектов</span></div>
  <span class="micro fol">Портфолио — 06 объектов</span>
  <div class="fin-strip">{items}</div>
</div>'''


slides = [cover_slide()]
for o in S.OBJECTS:
    slides.append(before_slide(o))
    slides.append(after_slide(o))
slides.append(final_slide())

doc = f'''<!-- 风格 E：Full-bleed Editorial — полная презентация -->
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Реставрация объектов — портфолио</title>
<style>
{FONTS}
{BASE % PALETTE}
</style>
</head>
<body>
<div class="deck">
{chr(10).join(slides)}
</div>
<script>
{NAV}
</script>
</body>
</html>
'''
OUT.write_text(doc, encoding="utf-8")
print("OK", OUT, round(OUT.stat().st_size/1024), "KB", "слайдов:", len(slides))
