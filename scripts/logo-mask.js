const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b64 = fs.readFileSync('logo_src.webp').toString('base64');
  const br = await chromium.launch();
  const p = await br.newPage();
  await p.setContent('<body style="margin:0"></body>');
  const r = await p.evaluate(async (src) => {
    const img = new Image(); img.src = 'data:image/webp;base64,' + src; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    let d = x.getImageData(0, 0, W, H).data;
    const alpha = (i) => (238 - (0.299*d[i*4] + 0.587*d[i*4+1] + 0.114*d[i*4+2])) / 228;
    // границы эмблемы (верхняя связная полоса)
    const rows = [];
    for (let y = 0; y < H; y++) { let s = 0; for (let xx = 0; xx < W; xx++) s += Math.max(0, alpha(y*W+xx)); rows.push(s > 0.6); }
    let y0 = rows.indexOf(true), y1 = y0;
    for (let y = y0; y < H; y++) { if (rows[y]) y1 = y; else if (y - y1 > H*0.015) break; }
    let x0 = W, x1 = 0;
    for (let y = y0; y <= y1; y++) for (let xx = 0; xx < W; xx++)
      if (alpha(y*W+xx) > 0.15) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; }
    // апскейл x3 со сглаживанием -> субпиксельная точность краёв
    const S = 3, cw = x1-x0+1, ch = y1-y0+1;
    const up = document.createElement('canvas'); up.width = cw*S; up.height = ch*S;
    const ux = up.getContext('2d', { willReadFrequently: true });
    ux.imageSmoothingEnabled = true; ux.imageSmoothingQuality = 'high';
    ux.drawImage(img, x0, y0, cw, ch, 0, 0, cw*S, ch*S);
    const ud = ux.getImageData(0, 0, cw*S, ch*S).data;
    const out = new Uint8Array(cw*S * ch*S);
    for (let i = 0; i < out.length; i++) {
      const lum = 0.299*ud[i*4] + 0.587*ud[i*4+1] + 0.114*ud[i*4+2];
      out[i] = lum < 128 ? 1 : 0;              // порог 50%
    }
    return { w: cw*S, h: ch*S, crop: [x0, y0, cw, ch], mask: Array.from(out) };
  }, b64);
  fs.writeFileSync('mask.bin', Buffer.from(r.mask));
  fs.writeFileSync('mask.json', JSON.stringify({ w: r.w, h: r.h, crop: r.crop }));
  console.log('маска', r.w + 'x' + r.h, '| кроп эмблемы', r.crop, '| чёрных пикселей',
              r.mask.reduce((a, b) => a + b, 0));
  await br.close();
})();
