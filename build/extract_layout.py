# -*- coding: utf-8 -*-
"""Снимает точную геометрию отрендеренного HTML для сборки PPTX."""
import json, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
html = ROOT / "restavraciya-obektov-Luxury.html"

JS = r"""() => {
  const R = el => el.getBoundingClientRect();
  const out = [];
  const slides = [...document.querySelectorAll('.slide')];
  slides.forEach((s, i) => {
    show(i);
    const sr = R(s), rel = r => ({x:r.left-sr.left, y:r.top-sr.top, w:r.width, h:r.height});
    const cs = getComputedStyle(s);
    const rec = {i, w:sr.width, h:sr.height, bg:cs.backgroundColor, panels:[], frames:[],
                 texts:[], rules:[], scrim:null};

    s.querySelectorAll('.panel').forEach(p => {
      rec.panels.push({...rel(R(p)), bg:getComputedStyle(p).backgroundColor});
    });
    const sc = s.querySelector('.scrim');
    if (sc) rec.scrim = rel(R(sc));

    s.querySelectorAll('.frame').forEach(f => {
      rec.frames.push({...rel(R(f)), slot:f.dataset.slot, ph:f.classList.contains('ph'),
                       border:getComputedStyle(f.closest('.tile') ? f : f).borderTopWidth});
    });

    // тонкие линии
    s.querySelectorAll('.rule-s,.rule-w,.rule-c').forEach(r => {
      const c = getComputedStyle(r);
      rec.rules.push({...rel(R(r)), color:c.backgroundColor, kind:r.className});
    });
    // разделители характеристик (border-bottom у li)
    s.querySelectorAll('.specs li').forEach(li => {
      const r = R(li), c = getComputedStyle(li);
      rec.rules.push({x:r.left-sr.left, y:r.bottom-sr.top-1, w:r.width, h:1,
                      color:c.borderBottomColor, kind:'spec-line'});
    });
    // вертикальная линия панели
    s.querySelectorAll('.panel').forEach(p => {
      const r = R(p), right = s.classList.contains('ph-right');
      rec.rules.push({x:(right ? r.right-1 : r.left)-sr.left, y:0, w:1, h:sr.height,
                      color:getComputedStyle(document.documentElement).getPropertyValue('--line').trim(),
                      kind:'panel-edge'});
    });
    // рамка плитки финала
    s.querySelectorAll('.tile-f').forEach(t => {
      const c = getComputedStyle(t);
      rec.rules.push({...rel(R(t)), color:c.borderTopColor, kind:'tile-border'});
    });

    const SEL = 'h1,h2,p,.state,.idx,.sp-l,.ph-cap,.f-kick,.t-cap,.f-title';
    s.querySelectorAll(SEL).forEach(t => {
      if (!t.textContent.trim()) return;
      const c = getComputedStyle(t), r = R(t);
      let text = t.tagName === 'H2' && t.innerHTML.includes('<br>')
               ? t.innerHTML.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '')
               : t.textContent.trim();
      // <i> внутри .idx даёт другой цвет — оставляем один прогон
      out;
      rec.texts.push({...rel(r), text,
        size:parseFloat(c.fontSize), family:c.fontFamily.split(',')[0].replace(/['"]/g,''),
        weight:c.fontWeight, color:c.color, ls:c.letterSpacing, lh:c.lineHeight,
        transform:c.textTransform, tag:(t.className||t.tagName).toString()});
    });
    out.push(rec);
  });
  return out;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
                          args=["--no-sandbox"])
    pg = b.new_page(viewport={"width":1920,"height":1080})
    pg.goto(html.as_uri()); pg.wait_for_timeout(1000)
    data = pg.evaluate(JS)
    b.close()

(ROOT/"build/layout.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
print("slides:", len(data))
for s in data[:3]:
    print(s["i"], "panels",len(s["panels"]), "frames",len(s["frames"]),
          "texts",len(s["texts"]), "rules",len(s["rules"]))
