# -*- coding: utf-8 -*-
"""Сборка единого самодостаточного HTML (стиль 18: Luxury Fashion House)."""
import base64, os, sys, pathlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import deck_spec as S

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "restavraciya-obektov-Luxury.html"


def data_uri(path):
    p = ROOT / path
    b = base64.b64encode(p.read_bytes()).decode()
    ext = p.suffix.lower().lstrip(".")
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else "image/png"
    return f"data:{mime};base64,{b}"


IMG = {k: data_uri(v) for k, v in S.PHOTOS.items()}


def frame(slot, extra_class=""):
    """Фото-слот: реальное фото или оформленный placeholder."""
    if slot in IMG:
        return (f'<div class="frame {extra_class}" data-slot="{slot}" '
                f'style="--img:url({IMG[slot]})"></div>')
    return (f'<div class="frame ph {extra_class}" data-slot="{slot}">'
            f'<div class="ph-in"><span class="ph-mark"></span>'
            f'<span class="ph-cap">{S.PLACEHOLDER_CAPTION}</span></div></div>')


def specs():
    rows = "".join(f'<li><span class="sp-l">{l}</span><span class="sp-v"></span></li>'
                   for l in S.SPEC_LABELS)
    return f'<ul class="specs">{rows}</ul>'


def panel(o, state, with_specs):
    label = "ПОСЛЕ РЕСТАВРАЦИИ" if state == "after" else "ДО РЕСТАВРАЦИИ"
    name = o["name"].replace("\n", "<br>")
    return f'''<div class="panel">
        <div class="p-top">
          <span class="rule-s"></span>
          <span class="idx">{o["idx"]}<i>/06</i></span>
        </div>
        <div class="p-mid">
          <h2>{name}</h2>
          <span class="rule-w"></span>
          <span class="state {state}">{label}</span>
        </div>
        <div class="p-bot">{specs() if with_specs else ""}</div>
      </div>'''


def object_slide(o, state):
    with_specs = (state == "after")
    body = [panel(o, state, with_specs), frame(f'{o["slug"]}-{state}')]
    if o["side"] == "left":
        body.reverse()
    return (f'<div class="slide obj {"ph-left" if o["side"]=="left" else "ph-right"}">'
            + "".join(body) + "</div>")


def cover():
    return f'''<div class="slide cover">
      {frame("cover", "bleed")}
      <div class="scrim"></div>
      <div class="c-in">
        <span class="rule-c"></span>
        <h1>{S.TITLE}</h1>
        <p>{S.SUBTITLE}</p>
      </div>
    </div>'''


def final():
    tiles = "".join(f'<div class="tile">{frame("final-"+o["slug"], "tile-f")}'
                    f'<span class="t-cap">{o["idx"]}</span></div>' for o in S.OBJECTS)
    return f'''<div class="slide final">
      <div class="f-head"><span class="rule-s"></span><span class="f-kick">ПОРТФОЛИО</span>
        <span class="f-title">{S.TITLE}</span></div>
      <div class="grid6">{tiles}</div>
    </div>'''


FONTS = (ROOT / "assets/fonts/fonts.css").read_text(encoding="utf-8")

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --color-primary:%(primary)s;
  --color-secondary:%(secondary)s;
  --color-accent:%(accent)s;
  --graphite-2:%(graphite2)s;
  --stone:%(stone)s;
  --line:%(line)s;
  --u:min(1vw,1.7778vh);
  --serif:'Cormorant Garamond','Noto Sans',Georgia,serif;
  --sans:'DM Sans','Noto Sans',sans-serif;
}
html,body{height:100%%;background:#0E0D0C;overflow:hidden}
body{font-family:var(--sans);display:flex;align-items:center;justify-content:center}
.deck{position:relative;width:min(100vw,177.78vh);height:min(56.25vw,100vh)}
.slide{
  width:min(100vw,177.78vh);
  height:min(56.25vw,100vh);
  overflow:hidden;
  position:absolute;inset:0;
  background:var(--color-primary);
  opacity:0;visibility:hidden;
  transition:opacity .62s cubic-bezier(.22,.61,.36,1);
}
.slide.on{opacity:1;visibility:visible}

/* ---------- фото-слот и placeholder ---------- */
.frame{background-image:var(--img);background-size:cover;background-position:center;
  background-color:var(--graphite-2);position:relative}
.frame.ph{
  background:
    repeating-linear-gradient(45deg,rgba(178,154,124,.055) 0 1px,transparent 1px 9px),
    radial-gradient(120%% 90%% at 62%% 22%%,#2E2A25 0%%,#1B1917 72%%);
}
.frame.ph::after{content:"";position:absolute;inset:calc(1.5*var(--u));
  border:1px solid rgba(242,236,227,.13)}
.ph-in{position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:calc(1.35*var(--u))}
.ph-mark{position:relative;width:calc(2.4*var(--u));height:calc(2.4*var(--u));display:block}
.ph-mark::before,.ph-mark::after{content:"";position:absolute;background:var(--color-accent);opacity:.62}
.ph-mark::before{left:50%%;top:0;width:1px;height:100%%}
.ph-mark::after{top:50%%;left:0;height:1px;width:100%%}
.ph-cap{font-family:var(--sans);font-size:calc(.58*var(--u));letter-spacing:.34em;
  font-weight:400;color:rgba(242,236,227,.5);text-transform:uppercase}

/* ---------- слайд объекта ---------- */
.slide.obj{display:grid}
.slide.obj.ph-right{grid-template-columns:24%% 76%%}
.slide.obj.ph-left{grid-template-columns:76%% 24%%}
.panel{background:var(--color-secondary);display:flex;flex-direction:column;
  padding:calc(4.4*var(--u)) calc(2.5*var(--u)) calc(3.4*var(--u));position:relative}
.panel::after{content:"";position:absolute;top:0;bottom:0;width:1px;background:var(--line)}
.ph-right .panel::after{right:0}
.ph-left  .panel::after{left:0}
.p-top{display:flex;align-items:center;gap:calc(.9*var(--u))}
.rule-s{display:block;width:calc(2.2*var(--u));height:1px;background:var(--color-accent)}
.idx{font-size:calc(.66*var(--u));letter-spacing:.3em;color:var(--color-primary);font-weight:500}
.idx i{font-style:normal;color:var(--stone);font-weight:400}
.p-mid{margin-top:calc(2.9*var(--u))}
.panel h2{font-family:var(--serif);font-weight:300;font-size:calc(2.2*var(--u));
  line-height:1.14;color:var(--color-primary);letter-spacing:.005em}
.rule-w{display:block;height:1px;background:var(--line);margin:calc(1.7*var(--u)) 0 calc(1.25*var(--u))}
.state{display:block;font-size:calc(.63*var(--u));letter-spacing:.34em;font-weight:500;
  text-transform:uppercase}
.state.before{color:var(--stone)}
.state.after{color:#9A7F5E}
.p-bot{margin-top:auto;padding-top:calc(2*var(--u))}
.specs{list-style:none}
.specs li{display:flex;flex-direction:column;gap:calc(.42*var(--u));
  padding-bottom:calc(.62*var(--u));margin-bottom:calc(.72*var(--u));
  border-bottom:1px solid var(--line)}
.specs li:last-child{margin-bottom:0}
.sp-l{font-size:calc(.56*var(--u));letter-spacing:.2em;color:var(--stone);text-transform:uppercase}
.sp-v{display:block;height:calc(.85*var(--u))}

/* ---------- обложка ---------- */
.slide.cover{position:relative}
.slide.cover .frame{position:absolute;inset:0}
.scrim{position:absolute;inset:0;
  background:linear-gradient(105deg,rgba(20,18,16,.93) 0%%,rgba(20,18,16,.8) 46%%,rgba(20,18,16,.62) 100%%)}
.c-in{position:absolute;left:calc(7*var(--u));top:50%%;transform:translateY(-50%%);
  display:flex;flex-direction:column}
.rule-c{display:block;width:calc(5.4*var(--u));height:1px;background:var(--color-accent);
  margin-bottom:calc(3*var(--u))}
.cover h1{font-family:var(--serif);font-weight:300;font-size:calc(4.5*var(--u));
  letter-spacing:.2em;color:var(--color-secondary);line-height:1.06;text-transform:uppercase}
.cover p{font-size:calc(1.4*var(--u));letter-spacing:.06em;color:rgba(242,236,227,.62);
  margin-top:calc(2.4*var(--u));font-weight:300}

/* ---------- финал ---------- */
.slide.final{display:flex;flex-direction:column;
  padding:calc(3.6*var(--u)) calc(4.2*var(--u)) calc(3.6*var(--u));background:var(--color-primary)}
.f-head{display:flex;align-items:center;gap:calc(1*var(--u))}
.f-kick{font-size:calc(.6*var(--u));letter-spacing:.36em;color:var(--stone);text-transform:uppercase}
.grid6{flex:1;display:grid;grid-template-columns:repeat(3,1fr);
  grid-template-rows:repeat(2,1fr);gap:calc(1.5*var(--u)) calc(1.6*var(--u));
  margin:calc(2.4*var(--u)) 0 calc(2.4*var(--u))}
.tile{position:relative;display:flex;flex-direction:column}
.tile-f{flex:1;border:1px solid rgba(242,236,227,.12)}
.tile .frame.ph::after{content:none}
.tile .ph-cap{display:none}
.tile .ph-in{gap:0}
.tile .ph-mark{width:calc(1.7*var(--u));height:calc(1.7*var(--u))}
.t-cap{display:block;margin-top:calc(.8*var(--u));
  font-size:calc(.56*var(--u));letter-spacing:.26em;color:rgba(242,236,227,.42)}
.f-title{font-family:var(--serif);font-weight:300;font-size:calc(1.75*var(--u));
  letter-spacing:.28em;color:var(--color-secondary);text-transform:uppercase;margin-left:auto}
""" % S.PALETTE

JS = """
const slides=[...document.querySelectorAll('.slide')];let i=0;
const show=n=>{i=Math.max(0,Math.min(slides.length-1,n));
  slides.forEach((s,k)=>s.classList.toggle('on',k===i));};
show(0);
addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'||e.key==='PageDown'){show(i+1);e.preventDefault();}
  if(e.key==='ArrowLeft'||e.key==='PageUp'){show(i-1);e.preventDefault();}
});
let x0=null;
addEventListener('touchstart',e=>{x0=e.changedTouches[0].clientX;},{passive:true});
addEventListener('touchend',e=>{if(x0===null)return;
  const d=e.changedTouches[0].clientX-x0;
  if(Math.abs(d)>44)show(d<0?i+1:i-1);x0=null;},{passive:true});
"""

slides = [cover()]
for o in S.OBJECTS:
    slides.append(object_slide(o, "before"))
    slides.append(object_slide(o, "after"))
slides.append(final())

slot_doc = "\n".join(f"     {s:<24} {l}" for s, l in S.slots())

doc = f'''<!-- 风格 18：Luxury Fashion House -->
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Реставрация объектов — портфолио</title>
<!--
  ЗАМЕНА ФОТОГРАФИЙ
  Каждый фото-слот — это <div class="frame" data-slot="ИМЯ">.
  Чтобы вставить фотографию, найдите нужный data-slot и задайте ему:
      class="frame"  (убрать ph)  style="--img:url('путь/к/фото.jpg')"
  Слоты презентации:
{slot_doc}
-->
<style>
{FONTS}
{CSS}
</style>
</head>
<body>
<div class="deck">
{chr(10).join(slides)}
</div>
<script>
{JS}
</script>
</body>
</html>
'''
OUT.write_text(doc, encoding="utf-8")
print("OK", OUT, round(OUT.stat().st_size/1024), "KB", "slides:", len(slides))
