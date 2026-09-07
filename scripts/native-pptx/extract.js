const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await pg.goto('file:///home/user/cjl-slides/output/igra-pri-ras-minimal.html');
  await pg.addStyleTag({content:'*{animation:none !important;transition:none !important;}'});
  await pg.waitForTimeout(1200);

  const data = await pg.evaluate(() => {
    const slides = [...document.querySelectorAll('.slide')];
    const out = [];

    const vis = (c) => {
      if (!c) return false;
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return false;
      const p = m[1].split(',').map(s => parseFloat(s));
      return !(p.length > 3 && p[3] === 0);
    };
    const isInline = (el) => {
      const d = getComputedStyle(el).display;
      return d.startsWith('inline') || d === 'contents';
    };
    // «своя плашка»: заливка или рамка. Градиент маркера (.hl) плашкой не считается —
    // такие спаны остаются частью абзаца, а подсветка рисуется отдельным прямоугольником.
    const boxed = (el) => {
      const cs = getComputedStyle(el);
      return vis(cs.backgroundColor) || parseFloat(cs.borderTopWidth) > 0 ||
             parseFloat(cs.borderLeftWidth) > 0;
    };
    const hasText = (el) => {
      for (const n of el.childNodes)
        if (n.nodeType === 3 && n.textContent.trim()) return true;
      return [...el.children].some(c => hasText(c));
    };
    // абзац: содержит текст, и все дочерние элементы — простые инлайны без своей рамки
    const isPara = (el) => {
      if (!hasText(el)) return false;
      for (const c of el.children) {
        if (!isInline(c) || boxed(c)) return false;
        const cd = getComputedStyle(c).display;
        if (cd === 'flex' || cd === 'grid') return false;
        for (const g of c.children) { if (!isInline(g) || boxed(g)) return false; }
      }
      return true;
    };

    slides.forEach((s, si) => {
      slides.forEach(x => x.classList.remove('active'));
      s.classList.add('active');
      const R = s.getBoundingClientRect();
      const shapes = [], texts = [], images = [];
      const rel = (r) => ({ x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height });

      const pseudo = (el, which) => {
        const cs = getComputedStyle(el, which);
        if (!cs || cs.content === 'none' || cs.display === 'none') return;
        const r = el.getBoundingClientRect();
        const left = parseFloat(cs.left) || 0, top = parseFloat(cs.top) || 0;
        const w = parseFloat(cs.width) || 0, h = parseFloat(cs.height) || 0;
        const content = cs.content.replace(/^["']|["']$/g, '');
        const base = { x: r.left - R.left + left, y: r.top - R.top + top };
        if (content && content !== 'normal' && content !== '""') {
          texts.push({ ...base, w: Math.max(w, parseFloat(cs.fontSize) * 1.6), h: Math.max(h, parseFloat(cs.fontSize) * 1.4),
            align: 'left', lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2,
            runs: [{ t: content, size: parseFloat(cs.fontSize), color: cs.color, family: cs.fontFamily,
                     weight: parseInt(cs.fontWeight), ls: parseFloat(cs.letterSpacing) || 0 }] });
        } else if (w > 0 && h > 0 && vis(cs.backgroundColor)) {
          shapes.push({ ...base, w, h, fill: cs.backgroundColor, radius: parseFloat(cs.borderRadius) || 0 });
        }
      };

      const walk = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        if (el.classList.contains('counter')) return;
        const r = el.getBoundingClientRect();
        const rr = rel(r);

        if (el.tagName === 'IMG') {
          images.push({ ...rr, src: el.getAttribute('src').slice(0, 64), idx: images.length, full: el.getAttribute('src') });
          return;
        }

        // фон / рамка
        if (vis(cs.backgroundColor) && !el.classList.contains('slide')) {
          const bw = parseFloat(cs.borderTopWidth) || 0;
          shapes.push({ ...rr, fill: cs.backgroundColor, radius: parseFloat(cs.borderTopLeftRadius) || 0,
            line: bw > 0 ? { w: bw, color: cs.borderTopColor, style: cs.borderTopStyle } : null });
        } else {
          const bw = parseFloat(cs.borderTopWidth) || 0;
          if (bw > 0 && cs.borderTopStyle !== 'none')
            shapes.push({ ...rr, fill: null, radius: parseFloat(cs.borderTopLeftRadius) || 0,
              line: { w: bw, color: cs.borderTopColor, style: cs.borderTopStyle } });
          const lw = parseFloat(cs.borderLeftWidth) || 0;
          if (lw > 0 && bw === 0 && cs.borderLeftStyle !== 'none')
            shapes.push({ x: rr.x, y: rr.y, w: lw, h: rr.h, fill: cs.borderLeftColor, radius: 0 });
        }
        // маркер-выделение (градиент на инлайне)
        if (cs.backgroundImage.includes('linear-gradient')) {
          const col = el.classList.contains('hl-blue') ? '#B9C0EA' : '#C7E76A';
          for (const cr of el.getClientRects()) {
            const q = rel(cr);
            shapes.push({ x: q.x, y: q.y + q.h * 0.56, w: q.w, h: q.h * 0.38, fill: col, radius: 0, hl: true });
          }
        }
        pseudo(el, '::before');
        pseudo(el, '::after');

        if (isPara(el)) {
          // подсветка маркером у вложенных спанов (сам абзац дальше не обходим)
          el.querySelectorAll('*').forEach(sp => {
            const scs = getComputedStyle(sp);
            if (!scs.backgroundImage.includes('linear-gradient')) return;
            const c2 = sp.classList.contains('hl-blue') ? '#B9C0EA' : '#C7E76A';
            for (const cr of sp.getClientRects()) {
              const q = rel(cr);
              shapes.push({ x: q.x, y: q.y + q.h * 0.56, w: q.w, h: q.h * 0.38, fill: c2, radius: 0, hl: true });
            }
          });
          const runs = [];
          const push = (node, style) => {
            const t = node.textContent.replace(/\s+/g, ' ');
            if (!t.trim()) { if (runs.length && !/ $/.test(runs[runs.length-1].t)) runs.push({ t: ' ', ...style }); return; }
            runs.push({ t, ...style });
          };
          const collect = (node, parentEl) => {
            for (const n of node.childNodes) {
              if (n.nodeType === 3) {
                const c = getComputedStyle(parentEl);
                push(n, { size: parseFloat(c.fontSize), color: c.color, family: c.fontFamily,
                          weight: parseInt(c.fontWeight), ls: parseFloat(c.letterSpacing) || 0,
                          tt: c.textTransform });
              } else if (n.nodeType === 1) {
                if (getComputedStyle(n).display === 'none') continue;
                if (n.tagName === 'BR') { runs.push({ br: true }); continue; }
                collect(n, n);
              }
            }
          };
          collect(el, el);
          const merged = [];
          for (const rn of runs) {
            const last = merged[merged.length - 1];
            if (last && !rn.br && !last.br && last.size === rn.size && last.color === rn.color &&
                last.family === rn.family && last.weight === rn.weight && last.ls === rn.ls && last.tt === rn.tt) {
              last.t += rn.t;
            } else merged.push({ ...rn });
          }
          if (merged.some(m => m.t && m.t.trim())) {
            // геометрия самого текста: строки-прямоугольники, а не бокс элемента
            const rng = document.createRange();
            rng.selectNodeContents(el);
            const rects = [...rng.getClientRects()].filter(q => q.width > 0.5 && q.height > 0.5);
            const tops = [...new Set(rects.map(q => Math.round(q.top * 2) / 2))];
            const lines = Math.max(tops.length, 1);
            let tb;
            if (rects.length) {
              const L = Math.min(...rects.map(q => q.left)), T = Math.min(...rects.map(q => q.top)),
                    Rt = Math.max(...rects.map(q => q.right)), B = Math.max(...rects.map(q => q.bottom));
              tb = { x: L - R.left, y: T - R.top, w: Rt - L, h: B - T };
            } else tb = rr;
            // ширина: до правого края контентной области родительского бокса
            const padR = parseFloat(cs.paddingRight) || 0, padL = parseFloat(cs.paddingLeft) || 0;
            const boxRight = rr.x + rr.w - padR, boxLeft = rr.x + padL;
            const avail = Math.max(tb.w, boxRight - tb.x);
            const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
            const segRuns = [[]];
            for (const rn of merged) { if (rn.br) segRuns.push([]); else segRuns[segRuns.length-1].push(rn); }
            // строки, разбитые вручную через <br>: каждую выносим в свой блок,
            // тогда положение строки не зависит от трактовки интерлиньяжа редактором
            if (segRuns.length > 1 && lines <= segRuns.length) {
              const groups = [[]];
              for (const n of el.childNodes) {
                if (n.nodeType === 1 && n.tagName === 'BR') { groups.push([]); continue; }
                groups[groups.length-1].push(n);
              }
              let okAll = groups.length === segRuns.length;
              const boxes = [];
              if (okAll) {
                for (const g of groups) {
                  const nodes = g.filter(n => n.nodeType !== 3 || n.textContent.trim());
                  if (!nodes.length) { boxes.push(null); continue; }
                  const rg = document.createRange();
                  rg.setStartBefore(nodes[0]); rg.setEndAfter(nodes[nodes.length-1]);
                  const rs = [...rg.getClientRects()].filter(q => q.width > 0.5 && q.height > 0.5);
                  if (!rs.length) { boxes.push(null); continue; }
                  const L2 = Math.min(...rs.map(q => q.left)), T2 = Math.min(...rs.map(q => q.top)),
                        R2 = Math.max(...rs.map(q => q.right)), B2 = Math.max(...rs.map(q => q.bottom));
                  boxes.push({ x: L2 - R.left, y: T2 - R.top, w: R2 - L2, h: B2 - T2 });
                }
              }
              if (okAll && boxes.every(b => b)) {
                boxes.forEach((bx, k) => {
                  if (!segRuns[k].length) return;
                  texts.push({ x: bx.x, y: bx.y, w: bx.w, h: bx.h,
                    avail: Math.max(bx.w, boxRight - bx.x), align: cs.textAlign, lines: 1, lh,
                    runs: segRuns[k] });
                });
                return;
              }
            }
            texts.push({ x: tb.x, y: tb.y, w: tb.w, h: tb.h, avail, boxLeft, boxRight,
              align: cs.textAlign, lines, lh, runs: merged });
          }
          return; // внутрь абзаца не идём
        }
        for (const n of el.childNodes) {
          if (n.nodeType === 1) { walk(n); continue; }
          if (n.nodeType !== 3 || !n.textContent.trim()) continue;
          const rng = document.createRange(); rng.selectNode(n);
          const rects = [...rng.getClientRects()].filter(q => q.width > 0.5);
          if (!rects.length) continue;
          const L = Math.min(...rects.map(q => q.left)), T = Math.min(...rects.map(q => q.top)),
                Rt = Math.max(...rects.map(q => q.right)), B = Math.max(...rects.map(q => q.bottom));
          texts.push({ x: L - R.left, y: T - R.top, w: Rt - L, h: B - T,
            avail: Rt - L, align: 'left', lines: 1,
            lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3,
            runs: [{ t: n.textContent.replace(/\s+/g, ' '), size: parseFloat(cs.fontSize),
                     color: cs.color, family: cs.fontFamily, weight: parseInt(cs.fontWeight),
                     ls: parseFloat(cs.letterSpacing) || 0, tt: cs.textTransform }] });
        }
      };

      for (const c of s.children) walk(c);
      out.push({ n: si + 1, w: R.width, h: R.height, shapes, texts, images });
    });
    return out;
  });

  fs.writeFileSync('deck.json', JSON.stringify(data));
  console.log('slides:', data.length,
    'shapes:', data.reduce((a, s) => a + s.shapes.length, 0),
    'texts:', data.reduce((a, s) => a + s.texts.length, 0),
    'images:', data.reduce((a, s) => a + s.images.length, 0));
  await b.close();
})();
