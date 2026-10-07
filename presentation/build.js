// Builds Gaymorova_pazuha.pptx  (13.333" x 7.5" = 1920x1080 @144dpi, 16:9)
//   node schematics.js   -> small surgical schematics (slide 11)
//   python3 prep_images.py -> crops of the supplied source illustrations
//   node build.js        -> the deck
// To swap a picture: replace the file in ./images/ (same name) and run `node build.js`
// (or in PowerPoint: right-click the picture -> Change Picture; frames are already cropped to fit).
const path = require('path');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');
const React = require('react');
const RDS = require('react-dom/server');
const fa = require('react-icons/fa');
const { applyTheme } = require('/root/.claude/skills/synced/7bc084e7-2165-4172-a544-b030b1c5bd5a_1eabd9df-c4b8-40f4-ac8f-7e4b9a5781cb/pptx/scripts/apply_theme.js');

const IMG = (n) => path.join(__dirname, 'images', n + '.png');
const OUT = path.join(__dirname, 'Gaymorova_pazuha.pptx');

// ---------- theme ----------
const THEME = {
  name: 'Medical Academic',
  headFontFace: 'Cambria',
  bodyFontFace: 'Calibri',
  colors: {
    dk1: '0B2545', lt1: 'FFFFFF', dk2: '1B4965', lt2: 'F2F7FA',
    accent1: '1B759C', accent2: '0E8C8C', accent3: 'D62839',
    accent4: 'BEE3F0', accent5: '5C6F82', accent6: 'E58A1F',
    hlink: '1B759C', folHlink: '5C6F82',
  },
};
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'Гайморова пазуха: анатомия, гайморит и связь с зубами';
pres.subject = 'Медицинская презентация';
const C = pres.SchemeColor;
const HEAD = 'Cambria';

// tints / fixed-meaning colours that have no scheme slot
const TINT = { blue: 'E4F1F7', teal: 'E0F3F2', red: 'FDECEE', milk: 'F2F7FA', line: 'D5E2EA' };
const WALL = { 1: '1D6FD6', 2: '0E8F8F', 3: '6A4FC4', 4: 'D9435B', 5: 'E08A1E' };

const W = 13.333, H = 7.5, MX = 0.6, CW = W - 2 * MX; // content width 12.133

// ---------- layouts ----------
const titlePh = {
  placeholder: {
    options: { name: 'title', type: 'title', x: MX, y: 0.4, w: CW, h: 0.85, fontSize: 32, bold: true,
      fontFace: HEAD, color: C.text1, align: 'left', valign: 'middle', margin: 0 },
    text: '',
  },
};
const num = { x: 12.0, y: 7.02, w: 0.73, h: 0.3, fontSize: 11, color: '8A99A8', align: 'right' };
pres.defineSlideMaster({ title: 'COVER', background: { color: 'FFFFFF' }, objects: [] });
pres.defineSlideMaster({ title: 'CONTENT', background: { color: 'FFFFFF' }, objects: [titlePh], slideNumber: num });
pres.defineSlideMaster({ title: 'CONTENT_MILK', background: { color: 'F2F7FA' }, objects: [titlePh], slideNumber: num });
pres.defineSlideMaster({ title: 'CLOSING', background: { color: 'FFFFFF' }, objects: [titlePh] });

// ---------- helpers ----------
const shadow = () => ({ type: 'outer', color: '0B2545', opacity: 0.12, blur: 10, offset: 2.5, angle: 90 });
let uid = 0;
const nm = (s) => `${s}_${++uid}`;

function card(s, x, y, w, h, o = {}) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: o.r ?? 0.14,
    fill: { color: o.fill ?? C.background1, transparency: o.alpha ?? 0 },
    line: o.line ? { color: o.line, width: o.lw ?? 1 } : { type: 'none' },
    shadow: o.shadow === false ? undefined : shadow(),
    objectName: nm(o.name || 'card'),
  });
}
function txt(s, text, x, y, w, h, o = {}) {
  s.addText(text, {
    x, y, w, h, margin: 0, isTextBox: true, fontSize: 17, color: C.text1, valign: 'top', ...o,
    objectName: nm(o.name || 'text'),
  });
}
function dot(s, cx, cy, d, fill, label, o = {}) {
  s.addShape(pres.ShapeType.ellipse, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: fill }, line: o.line ? { color: o.line, width: 1.5 } : { type: 'none' }, objectName: nm('badge') });
  if (label !== undefined) txt(s, String(label), cx - d / 2, cy - d / 2, d, d, { fontSize: o.fs ?? 15, bold: true, color: o.color ?? C.background1, align: 'center', valign: 'middle', name: 'badge_text' });
}
const iconCache = {};
async function icon(name, color = 'FFFFFF') {
  const k = name + color;
  if (iconCache[k]) return iconCache[k];
  const svg = RDS.renderToStaticMarkup(React.createElement(fa[name], { color: '#' + color, size: 256 }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return (iconCache[k] = 'image/png;base64,' + buf.toString('base64'));
}
async function iconDot(s, name, cx, cy, d, fill, iconColor = 'FFFFFF') {
  dot(s, cx, cy, d, fill);
  const k = d * 0.5;
  s.addImage({ data: await icon(name, iconColor), x: cx - k / 2, y: cy - k / 2, w: k, h: k, altText: name, objectName: nm('icon') });
}
async function iconPlain(s, name, x, y, size, color) {
  s.addImage({ data: await icon(name, color), x, y, w: size, h: size, altText: name, objectName: nm('icon') });
}
// picture cropped to the frame (never stretched), optional rounded corners
const PX = 230;
async function pic(s, file, x, y, w, h, o = {}) {
  const pw = Math.round(w * PX), ph = Math.round(h * PX);
  let img = sharp(IMG(file)).resize(pw, ph, { fit: 'cover', position: o.pos || 'centre' });
  if (o.r !== 0) {
    const r = Math.round((o.r ?? 0.1) * PX);
    const mask = Buffer.from(`<svg width="${pw}" height="${ph}"><rect width="${pw}" height="${ph}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
    img = img.ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]);
  }
  const buf = await img.png().toBuffer();
  s.addImage({ data: 'image/png;base64,' + buf.toString('base64'), x, y, w, h, altText: o.alt || file, objectName: nm('pic_' + file) });
}
function arrowRight(s, x, y, w, color) {
  s.addShape(pres.ShapeType.rightArrow, { x, y, w, h: w * 0.8, fill: { color }, line: { type: 'none' }, objectName: nm('arrow') });
}
function arrowDown(s, cx, y, h, color) {
  s.addShape(pres.ShapeType.downArrow, { x: cx - h * 0.4, y, w: h * 0.8, h, fill: { color }, line: { type: 'none' }, objectName: nm('arrow') });
}
function runs(parts) { // [['text', {opts}], ...]
  return parts.map(([text, options], i) => ({ text, options: { ...(options || {}), breakLine: false } }));
}
function slide(layout, section, title) {
  const s = pres.addSlide({ masterName: layout, sectionTitle: section });
  if (title) s.addText(title, { placeholder: 'title' });
  return s;
}

// ================= SLIDES =================
async function build() {
  // ---------- 1. COVER ----------
  pres.addSection({ title: 'Анатомия' });
  {
    const s = slide('COVER', 'Анатомия');
    // head cross-section with soft fade into the white page
    const meta = await sharp(IMG('cover_head')).metadata();
    const iw = 8.1, ih = iw * meta.height / meta.width, ix = W - iw, iy = 1.75;
    const pw = meta.width, ph = meta.height;
    const fade = Buffer.from(`<svg width="${pw}" height="${ph}"><defs>
      <linearGradient id="a" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".32" stop-color="#fff" stop-opacity="1"/></linearGradient></defs>
      <rect width="${pw}" height="${ph}" fill="url(#a)"/></svg>`);
    const fadeV = Buffer.from(`<svg width="${pw}" height="${ph}"><defs>
      <linearGradient id="b" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".14" stop-color="#fff" stop-opacity="1"/><stop offset=".86" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <rect width="${pw}" height="${ph}" fill="url(#b)"/></svg>`);
    const buf = await sharp(IMG('cover_head')).ensureAlpha()
      .composite([{ input: fade, blend: 'dest-in' }]).png().toBuffer()
      .then((b) => sharp(b).composite([{ input: fadeV, blend: 'dest-in' }]).png().toBuffer());
    s.addImage({ data: 'image/png;base64,' + buf.toString('base64'), x: ix, y: iy, w: iw, h: ih, altText: 'Анатомия: голова в разрезе, гайморова пазуха', objectName: 'cover_image' });

    // highlight of the sinus
    const rx = ix + iw * 0.435, ry = iy + ih * 0.19, rw = iw * 0.30, rh = ih * 0.40;
    s.addShape(pres.ShapeType.ellipse, { x: rx, y: ry, w: rw, h: rh, fill: { color: 'FFFFFF', transparency: 100 }, line: { color: C.accent2, width: 3, dashType: 'solid' }, objectName: 'sinus_highlight' });
    s.addShape(pres.ShapeType.line, { x: rx + rw * 0.5, y: ry - 0.42, w: 0, h: 0.42, line: { color: C.accent2, width: 2 }, objectName: 'sinus_leader' });
    s.addShape(pres.ShapeType.roundRect, { x: rx + rw * 0.5 - 1.55, y: ry - 0.86, w: 3.1, h: 0.44, rectRadius: 0.22, fill: { color: C.background1 }, line: { color: C.accent2, width: 1.5 }, shadow: shadow(), objectName: 'sinus_label_bg' });
    txt(s, 'Гайморова пазуха', rx + rw * 0.5 - 1.55, ry - 0.86, 3.1, 0.44, { fontSize: 16, bold: true, color: C.accent2, align: 'center', valign: 'middle', name: 'sinus_label' });

    txt(s, 'ОТОЛАРИНГОЛОГИЯ · СТОМАТОЛОГИЯ', 0.8, 0.85, 6, 0.35, { fontSize: 14, bold: true, color: C.accent2, charSpacing: 3 });
    txt(s, 'Гайморова\nпазуха', 0.8, 1.55, 6.2, 2.3, { fontSize: 66, bold: true, fontFace: HEAD, color: C.text1, valign: 'top', name: 'title' });
    txt(s, 'Анатомия, развитие гайморита и связь с зубами', 0.8, 4.0, 5.2, 1.3, { fontSize: 24, color: C.accent5, name: 'subtitle' });
    txt(s, 'Выполнил(а): ______________________', 0.8, 6.45, 6.2, 0.4, { fontSize: 18, color: C.text1, name: 'author' });
    s.addNotes('Тема: гайморова пазуха — её анатомия, механизм развития гайморита и связь с зубами верхней челюсти. План: анатомия (слайды 2–5), развитие и формы гайморита (6–7), зубы и пазуха (8–10), хирургическое лечение (11), выводы (12).');
  }

  // ---------- 2. ANATOMY ----------
  {
    const s = slide('CONTENT', 'Анатомия', 'Гайморова пазуха: анатомия');
    card(s, MX, 1.4, 5.3, 5.55, { r: 0.18 });
    await pic(s, 'anatomy_sagittal', MX + 0.1, 1.5, 5.1, 5.35, { r: 0.12, pos: 'top', alt: 'Гайморова пазуха, сагиттальный срез' });
    const X = 6.5, RW = W - MX - X;
    txt(s, runs([['Гайморова, или верхнечелюстная, пазуха — ', {}], ['самая крупная околоносовая пазуха', { bold: true, color: C.accent1 }]]),
      X, 1.4, RW, 0.9, { fontSize: 20, valign: 'top' });
    card(s, X, 2.4, RW, 1.4, { fill: TINT.blue, shadow: false });
    txt(s, '15–20 см³', X + 0.3, 2.4, 3.7, 1.4, { fontSize: 54, bold: true, fontFace: HEAD, color: C.accent1, valign: 'middle', name: 'stat_volume' });
    txt(s, 'объём пазухи у взрослого человека', X + 4.1, 2.4, RW - 4.3, 1.4, { fontSize: 17, color: C.text1, valign: 'middle' });
    const rows = [
      ['FaMapMarkerAlt', [['В толще верхней челюсти', {}]]],
      ['FaShapes', [['Четырёхгранная пирамида: ', { bold: true }], ['основание — к полости носа, верхушка — к скуловой кости', {}]]],
      ['FaWind', [['В норме заполнена воздухом', {}]]],
      ['FaLayerGroup', [['Выстлана слизистой оболочкой — ', {}], ['мембраной Шнайдера', { bold: true }]]],
    ];
    let y = 4.05;
    for (const [ic, parts] of rows) {
      await iconDot(s, ic, X + 0.27, y + 0.33, 0.54, C.accent2);
      txt(s, runs(parts), X + 0.75, y, RW - 0.75, 0.66, { fontSize: 17, valign: 'middle' });
      y += 0.72;
    }
    s.addNotes('Гайморова (верхнечелюстная) пазуха — самая крупная из околоносовых пазух, объём около 15–20 см³. Расположена в толще верхней челюсти, по форме — четырёхгранная пирамида: основание обращено к полости носа, верхушка — к скуловой кости. В норме содержит воздух, изнутри выстлана слизистой оболочкой (мембраной Шнайдера).');
  }

  // ---------- 3. FIVE WALLS ----------
  {
    const s = slide('CONTENT', 'Анатомия', 'Пять стенок гайморовой пазухи');
    const PW = 6.4, PH = PW * 615 / 894;
    card(s, MX, 1.4, PW + 0.2, PH + 0.2, { r: 0.16 });
    await pic(s, 'anatomy_walls', MX + 0.1, 1.5, PW, PH, { r: 0.1, alt: 'Пять стенок гайморовой пазухи' });
    const ty = 1.4 + PH + 0.2 + 0.18;
    card(s, MX, ty, PW + 0.2, 6.95 - ty, { fill: TINT.blue, shadow: false });
    await iconDot(s, 'FaBullseye', MX + 0.45, ty + (6.95 - ty) / 2, 0.46, C.accent1);
    txt(s, runs([['Клинически важнее всего: ', { bold: true }], ['внутренняя стенка (соустье) и нижняя (корни зубов)', {}]]),
      MX + 0.85, ty, PW - 0.7, 6.95 - ty, { fontSize: 16, valign: 'middle' });

    const walls = [
      [1, 'wall_1', 'Верхняя (глазничная)', 'тонкая; одновременно нижняя стенка глазницы'],
      [2, 'wall_2', 'Передняя (лицевая)', 'содержит клыковую ямку'],
      [3, 'wall_3', 'Задняя (заднелатеральная)', 'обращена к подвисочной и крыловидно-нёбной ямкам'],
      [4, 'wall_4', 'Внутренняя (носовая)', 'содержит естественное соустье с полостью носа'],
      [5, 'wall_5', 'Нижняя (дно)', 'в непосредственной близости к корням верхних зубов'],
    ];
    const X = MX + PW + 0.2 + 0.3, CWd = W - MX - X, ch = 1.02, gap = 0.1;
    for (let i = 0; i < 5; i++) {
      const [n, img, name, desc] = walls[i];
      const y = 1.4 + i * (ch + gap);
      card(s, X, y, CWd, ch, { r: 0.12 });
      dot(s, X + 0.34, y + ch / 2, 0.42, WALL[n], n, { fs: 15 });
      await pic(s, img, X + 0.65, y + 0.14, 1.0, ch - 0.28, { r: 0.07, alt: name });
      txt(s, name, X + 1.8, y + 0.09, CWd - 1.9, 0.3, { fontSize: 16, bold: true, color: C.text1 });
      txt(s, desc, X + 1.8, y + 0.4, CWd - 1.9, 0.56, { fontSize: 14, color: C.accent5 });
    }
    s.addNotes('Пять стенок. Верхняя (глазничная) — самая тонкая, одновременно нижняя стенка глазницы. Передняя (лицевая) — содержит клыковую ямку. Задняя (заднелатеральная) — обращена к подвисочной и крыловидно-нёбной ямкам. Внутренняя (носовая) — содержит естественное соустье. Нижняя (дно) — вплотную к корням верхних зубов. Цвета номеров соответствуют цветам подписей на иллюстрации.');
  }

  // ---------- 4. OSTIUM / DRAINAGE ----------
  {
    const s = slide('CONTENT', 'Анатомия', 'Почему содержимое пазухи может застаиваться?');
    const IW = 5.15, IH = IW * 415 / 507, IX = MX, IY = 1.4;
    card(s, IX, IY, IW + 0.2, IH + 0.2, { r: 0.16 });
    await pic(s, 'anatomy_frontal', IX + 0.1, IY + 0.1, IW, IH, { r: 0.1, alt: 'Фронтальный срез носа и гайморовых пазух' });
    // flow arrow: sinus floor -> high-lying ostium
    const fx = (f) => IX + 0.1 + IW * f, fy = (f) => IY + 0.1 + IH * f;
    s.addShape(pres.ShapeType.line, { x: fx(0.15), y: fy(0.57), w: fx(0.285) - fx(0.15), h: fy(0.745) - fy(0.57), flipV: true, line: { color: C.accent2, width: 4.5, endArrowType: 'triangle' }, objectName: 'flow_arrow' });
    s.addShape(pres.ShapeType.roundRect, { x: fx(0.02), y: fy(0.80), w: 2.35, h: 0.4, rectRadius: 0.2, fill: { color: C.accent2 }, line: { type: 'none' }, objectName: 'flow_label_bg' });
    txt(s, 'путь оттока секрета', fx(0.02), fy(0.80), 2.35, 0.4, { fontSize: 14, bold: true, color: C.background1, align: 'center', valign: 'middle', name: 'flow_label' });

    const X = 6.55, RW = W - MX - X, bh = 0.78, g = 0.3;
    const chain = [
      ['FaMapMarkerAlt', 'Высокое расположение соустья', TINT.blue, C.accent1],
      ['FaTint', 'Отёк слизистой', TINT.red, C.accent3],
      ['FaLink', 'Нарушение оттока', TINT.red, C.accent3],
      ['FaBacteria', 'Застой секрета', TINT.red, C.accent3],
    ];
    for (let i = 0; i < 4; i++) {
      const y = 1.4 + i * (bh + g);
      card(s, X, y, RW, bh, { fill: chain[i][2], shadow: false });
      await iconDot(s, chain[i][0], X + 0.52, y + bh / 2, 0.5, chain[i][3]);
      txt(s, chain[i][1], X + 1.0, y, RW - 1.1, bh, { fontSize: 21, bold: true, valign: 'middle' });
      if (i < 3) arrowDown(s, X + 0.52, y + bh + 0.04, g - 0.08, C.accent5);
    }
    const cy = 6.05, chh = 0.85;
    card(s, MX, cy, CW, chh, { fill: C.text1, shadow: false });
    await iconDot(s, 'FaInfoCircle', MX + 0.6, cy + chh / 2, 0.55, C.accent2);
    txt(s, 'Даже небольшой отёк может значительно ухудшить дренирование пазухи', MX + 1.15, cy, CW - 1.4, chh, { fontSize: 22, bold: true, color: C.background1, valign: 'middle' });
    s.addNotes('Естественное соустье расположено высоко на медиальной стенке — почти под крышей пазухи. Поэтому секрет вынужден оттекать вверх. Любой отёк слизистой (ОРВИ, аллергия) легко перекрывает узкое соустье — нарушается отток и секрет застаивается.');
  }

  // ---------- 5. TEETH PROXIMITY ----------
  {
    const s = slide('CONTENT_MILK', 'Анатомия', 'Гайморова пазуха и верхние зубы');
    const IH = 5.45, IW = IH * 212 / 286, IX = MX + 0.1, IY = 1.45;
    card(s, MX, 1.35, IW + 0.2, IH + 0.2, { r: 0.16 });
    await pic(s, 'near_teeth', IX, IY, IW, IH, { r: 0.1, pos: 'top', alt: 'Дно гайморовой пазухи и корни верхних зубов' });
    const mk = (fx_, fy_) => [IX + IW * fx_, IY + IH * fy_];
    const m1 = mk(0.68, 0.16), m2 = mk(0.66, 0.485), m3 = mk(0.33, 0.66);
    dot(s, m1[0], m1[1], 0.42, C.text1, 1, { line: 'FFFFFF' });
    dot(s, m2[0], m2[1], 0.42, C.accent2, 2, { line: 'FFFFFF' });
    dot(s, m3[0], m3[1], 0.42, C.text1, 3, { line: 'FFFFFF' });

    const X = IX + IW + 0.7, RW = W - MX - X;
    txt(s, '≈ 1–3 мм', X, 1.4, 4.3, 1.2, { fontSize: 64, bold: true, fontFace: HEAD, color: C.accent1, valign: 'middle', name: 'stat_distance' });
    txt(s, 'от дна пазухи до верхушек корней верхних зубов', X + 4.45, 1.4, RW - 4.45, 1.2, { fontSize: 18, valign: 'middle' });
    const legend = [
      [C.text1, 1, 'Гайморова пазуха'],
      [C.accent2, 2, 'Дно пазухи — расстояние до верхушек корней ≈ 1–3 мм'],
      [C.text1, 3, 'Корни верхних премоляров и моляров (зубы 5–6–7–8)'],
    ];
    let y = 2.8;
    for (const [col, n, t] of legend) {
      dot(s, X + 0.21, y + 0.25, 0.42, col, n);
      txt(s, t, X + 0.65, y, RW - 0.65, 0.5, { fontSize: 18, valign: 'middle' });
      y += 0.6;
    }
    card(s, X, 4.75, RW, 1.05, { fill: C.background1, shadow: false, line: TINT.line });
    await iconPlain(s, 'FaTeeth', X + 0.25, 4.75 + 0.26, 0.52, '0E8C8C');
    txt(s, 'В некоторых вариантах корни выступают в сторону пазухи и отделены от неё очень тонким слоем ткани', X + 1.0, 4.75, RW - 1.2, 1.05, { fontSize: 17, valign: 'middle' });
    card(s, X, 5.95, RW, 0.95, { fill: C.text1, shadow: false });
    txt(s, 'Поэтому воспаление зубов и воспаление гайморовой пазухи могут быть взаимосвязаны', X + 0.3, 5.95, RW - 0.6, 0.95, { fontSize: 20, bold: true, color: C.background1, valign: 'middle' });
    s.addNotes('Дно пазухи может находиться на расстоянии около 1–3 мм от верхушек корней верхних премоляров и моляров. Иногда корни выступают в просвет пазухи и отделены от неё лишь тонким слоем ткани. Поэтому воспаление зубов и воспаление гайморовой пазухи могут быть взаимосвязаны.');
  }

  // ---------- 6. DEVELOPMENT ----------
  pres.addSection({ title: 'Гайморит' });
  {
    const s = slide('CONTENT', 'Гайморит', 'Как развивается гайморит');
    const steps = [
      ['stage_1', 'Отёк слизистой', 'ОРВИ / аллергия / травма / полипы', '1B759C'],
      ['stage_2', 'Блокада соустья', 'отток секрета нарушается', '1B759C'],
      ['stage_3', 'Нарушение мукоцилиарного клиренса', 'реснички эпителия хуже удаляют слизь', '0E8C8C'],
      ['stage_4', 'Застой секрета', 'слизь становится более вязкой', 'C98A12'],
      ['stage_5', 'Присоединение бактериальной инфекции', 'воспалительный процесс усиливается', 'D62839'],
      ['stage_6', 'Накопление экссудата и симптомы', 'боль, давление, заложенность носа, возможна температура', 'A8192A'],
    ];
    const gap = 0.3, cw = (CW - 5 * gap) / 6, cy = 1.5, chh = 4.2;
    for (let i = 0; i < 6; i++) {
      const x = MX + i * (cw + gap);
      card(s, x, cy, cw, chh, { r: 0.14 });
      await pic(s, steps[i][0], x + 0.1, cy + 0.1, cw - 0.2, 1.8, { r: 0.1, alt: steps[i][1] });
      dot(s, x + 0.36, cy + 0.36, 0.4, steps[i][3], i + 1, { fs: 15, line: 'FFFFFF' });
      txt(s, steps[i][1], x + 0.12, cy + 2.02, cw - 0.24, 0.8, { fontSize: 14, bold: true, color: C.text1 });
      txt(s, steps[i][2], x + 0.12, cy + 2.9, cw - 0.24, 1.2, { fontSize: 14, color: C.accent5 });
      if (i < 5) arrowRight(s, x + cw + 0.04, cy + 0.95, gap - 0.08, '8FA3B5');
    }
    // progression bar: healthy -> inflamed
    const by = 6.05, seg = CW / 6;
    steps.forEach((st, i) => {
      s.addShape(pres.ShapeType.rect, { x: MX + i * seg, y: by, w: seg + 0.01, h: 0.2, fill: { color: st[3] }, line: { type: 'none' }, objectName: nm('progress') });
    });
    txt(s, 'Нормальная воздушная пазуха', MX, by + 0.3, 5, 0.35, { fontSize: 15, bold: true, color: C.accent1 });
    txt(s, 'Воспалённая пазуха с гноем и давлением', W - MX - 5.5, by + 0.3, 5.5, 0.35, { fontSize: 15, bold: true, color: C.accent3, align: 'right' });
    s.addNotes('Цепочка: отёк слизистой (вирусы, аллергия, травма, полипы) → блокада соустья → нарушение мукоцилиарного клиренса (реснички хуже удаляют слизь) → застой секрета, он становится вязким → присоединяется бактериальная инфекция → накопление экссудата, давление и симптомы: боль, заложенность носа, возможна температура.');
  }

  // ---------- 7. FORMS ----------
  {
    const s = slide('CONTENT_MILK', 'Гайморит', 'Гайморит по длительности течения');
    const forms = [
      ['type_acute', 'ОСТРЫЙ', 'до 4 недель', 'яркая гиперемия и отёк слизистой оболочки', C.accent1],
      ['type_subacute', 'ПОДОСТРЫЙ', '4–12 недель', 'воспаление затягивается, секрет остаётся в пазухе', C.accent2],
      ['type_chronic', 'ХРОНИЧЕСКИЙ', 'более 12 недель', 'длительное утолщение слизистой, полипозные изменения', C.accent3],
    ];
    const gap = 0.3, cw = (CW - 2 * gap) / 3, cy = 1.4, chh = 4.35;
    for (let i = 0; i < 3; i++) {
      const x = MX + i * (cw + gap);
      const [img, lab, dur, desc, col] = forms[i];
      card(s, x, cy, cw, chh, { r: 0.16 });
      await pic(s, img, x + 0.12, cy + 0.12, cw - 0.24, 2.0, { r: 0.1, alt: lab });
      txt(s, lab, x + 0.3, cy + 2.3, cw - 0.6, 0.4, { fontSize: 18, bold: true, color: col, charSpacing: 2 });
      txt(s, dur, x + 0.3, cy + 2.72, cw - 0.6, 0.65, { fontSize: 26, bold: true, fontFace: HEAD, color: C.text1, valign: 'middle', name: 'duration' });
      txt(s, desc, x + 0.3, cy + 3.45, cw - 0.6, 0.8, { fontSize: 16, color: C.accent5 });
      if (i < 2) arrowRight(s, x + cw + 0.04, cy + 1.0, gap - 0.08, '8FA3B5');
    }
    card(s, MX, 6.0, CW, 0.92, { fill: TINT.red, shadow: false });
    await iconDot(s, 'FaExclamationTriangle', MX + 0.6, 6.46, 0.55, C.accent3);
    txt(s, 'При хроническом процессе могут формироваться полипозные изменения и стойкое нарушение вентиляции пазухи',
      MX + 1.2, 6.0, CW - 1.5, 0.92, { fontSize: 18, valign: 'middle' });
    s.addNotes('По длительности: острый — до 4 недель, подострый — 4–12 недель, хронический — более 12 недель. При хроническом течении слизистая стойко утолщена, возможны полипозные изменения и постоянное нарушение вентиляции пазухи.');
  }

  // ---------- 8. WHY TEETH HURT ----------
  pres.addSection({ title: 'Связь с зубами' });
  {
    const s = slide('CONTENT', 'Связь с зубами', 'Почему при гайморите могут болеть зубы?');
    const IW = 5.1, IH = 5.0, IY = 1.4;
    card(s, MX, IY, IW + 0.2, IH + 0.2, { r: 0.16 });
    await pic(s, 'inflamed_teeth', MX + 0.1, IY + 0.1, IW, IH, { r: 0.1, alt: 'Воспалённая гайморова пазуха и корни верхних зубов' });
    txt(s, 'Воспалённая пазуха и корни верхних зубов', MX, IY + IH + 0.32, IW + 0.2, 0.3, { fontSize: 14, italic: true, color: C.accent5 });
    const X = 6.35, RW = W - MX - X;
    const pts = [
      ['FaCompressArrowsAlt', 'Воспаление и давление в области пазухи могут восприниматься как боль в верхних зубах'],
      ['FaTeeth', 'Чаще неприятные ощущения затрагивают сразу несколько зубов'],
      ['FaExpandArrowsAlt', 'Возможны чувство давления и распирания в щеке'],
      ['FaStethoscope', 'Анатомическая близость корней затрудняет определение источника боли только по ощущениям'],
    ];
    let y = 1.4;
    for (const [ic, t] of pts) {
      await iconDot(s, ic, X + 0.28, y + 0.4, 0.56, C.accent2);
      txt(s, t, X + 0.85, y, RW - 0.85, 0.8, { fontSize: 17, valign: 'middle' });
      y += 0.92;
    }
    const qy = 5.2, qh = 1.7;
    card(s, X, qy, RW, qh, { fill: C.text1, shadow: false });
    await iconDot(s, 'FaTooth', X + 0.55, qy + qh / 2, 0.62, C.accent3);
    txt(s, runs([['При гайморите пациент нередко ощущает боль ', {}], ['сразу в нескольких верхних зубах', { color: C.accent4 }]]),
      X + 1.05, qy, RW - 1.3, qh, { fontSize: 22, bold: true, color: C.background1, valign: 'middle' });
    s.addNotes('Воспаление и давление в пазухе пациент нередко воспринимает как зубную боль. Характерно, что болят сразу несколько верхних зубов, часто есть ощущение давления и распирания в щеке. Из-за близости корней отличить источник боли только по ощущениям трудно.');
  }

  // ---------- 9. ODONTOGENIC ----------
  {
    const s = slide('CONTENT', 'Связь с зубами', 'Когда причиной гайморита становится зуб');
    const labels = ['Глубокий кариес', 'Пульпит', 'Апикальный периодонтит', 'Гранулёма / киста', 'Распространение инфекции в пазуху', 'Одонтогенный гайморит'];
    const ring = ['1B759C', '1B759C', '0E8C8C', 'C98A12', 'D62839', 'A8192A'];
    const d = 1.45, gp = (CW - 6 * d) / 5, cy = 1.5;
    for (let i = 0; i < 6; i++) {
      const x = MX + i * (d + gp);
      s.addShape(pres.ShapeType.ellipse, { x: x - 0.06, y: cy - 0.06, w: d + 0.12, h: d + 0.12, fill: { color: 'FFFFFF' }, line: { color: ring[i], width: 3 }, shadow: shadow(), objectName: nm('ring') });
      await pic(s, `tooth_step_${i + 1}`, x, cy, d, d, { r: 0, alt: labels[i] });
      txt(s, labels[i], x - gp / 2 + 0.05, cy + d + 0.2, d + gp - 0.1, 0.75, { fontSize: 15, bold: true, align: 'center', color: i === 5 ? C.accent3 : C.text1 });
      if (i < 5) arrowRight(s, x + d + gp / 2 - 0.2, cy + d / 2 - 0.16, 0.4, C.accent5);
    }
    txt(s, 'Один и тот же зуб: от кариеса до воспаления в пазухе', MX, 3.88, CW, 0.3, { fontSize: 14, italic: true, color: C.accent5, align: 'center' });

    // second route: after extraction
    const ry = 4.4, rh = 2.5, lw = 8.15;
    card(s, MX, ry, lw, rh, { fill: TINT.milk, shadow: false, line: TINT.line });
    txt(s, 'Другой путь: после удаления зуба', MX + 0.3, ry + 0.18, lw - 0.6, 0.4, { fontSize: 18, bold: true, color: C.accent1 });
    const st = [
      ['FaTooth', 'Удаление зуба', TINT.blue, C.accent1],
      ['FaDoorOpen', 'Ороантральное сообщение', 'FFF1D6', 'C98A12'],
      ['FaBacteria', 'Проникновение инфекции в пазуху', TINT.red, C.accent3],
    ];
    const sw = 2.2, sg = (lw - 0.6 - 3 * sw) / 2, sy = ry + 0.75, sh = 1.45;
    for (let i = 0; i < 3; i++) {
      const x = MX + 0.3 + i * (sw + sg);
      card(s, x, sy, sw, sh, { fill: st[i][2], shadow: false });
      await iconDot(s, st[i][0], x + sw / 2, sy + 0.42, 0.5, st[i][3]);
      txt(s, st[i][1], x + 0.1, sy + 0.78, sw - 0.2, 0.62, { fontSize: 15, bold: true, align: 'center', valign: 'top' });
      if (i < 2) arrowRight(s, x + sw + sg / 2 - 0.2, sy + sh / 2 - 0.16, 0.4, C.accent5);
    }
    const nx = MX + lw + 0.3, nw = W - MX - nx;
    card(s, nx, ry, nw, rh, { fill: C.background1, line: TINT.line, shadow: false });
    await iconDot(s, 'FaBookMedical', nx + 0.55, ry + 0.6, 0.6, C.accent2);
    txt(s, 'В литературе частота одонтогенного происхождения верхнечелюстного синусита существенно варьирует',
      nx + 0.3, ry + 1.05, nw - 0.6, 1.3, { fontSize: 16, valign: 'top' });
    s.addNotes('Одонтогенный путь: глубокий кариес → пульпит → апикальный периодонтит → гранулёма или киста → распространение инфекции в пазуху → одонтогенный гайморит. Второй путь — после удаления зуба, корень которого был близко к пазухе: возможно ороантральное сообщение, через которое инфекция попадает в пазуху. Частота одонтогенного происхождения синусита в литературе сильно различается, поэтому конкретной цифры не приводим (в исходных материалах была цифра «до 40%» без источника).');
  }

  // ---------- 10. TABLE ----------
  {
    const s = slide('CONTENT', 'Связь с зубами', 'Гайморит или пульпит?');
    const hdr = (t, fill) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: fill }, align: 'left', valign: 'middle', fontSize: 17 } });
    const lab = (t) => ({ text: t, options: { bold: true, color: '0B2545', fill: { color: 'EAF3F8' }, valign: 'middle', fontSize: 16 } });
    const cell = (t, fill) => ({ text: t, options: { color: '0B2545', fill: { color: fill }, valign: 'middle', fontSize: 16 } });
    const data = [
      ['Локализация боли', 'часто несколько верхних зубов / область щеки', 'чаще конкретный зуб'],
      ['Холодное / горячее', 'обычно не является ведущим провокатором', 'температурные раздражители часто провоцируют боль'],
      ['Ночная боль', 'не является специфичным признаком', 'может усиливаться ночью'],
      ['Наклон головы', 'боль / давление могут усиливаться', 'обычно не связано с наклоном'],
      ['Заложенность носа', 'характерна', 'отсутствует'],
      ['Состояние зуба', 'причинный зуб может не определяться визуально', 'возможны кариес, большая пломба, трещина и т. п.'],
    ];
    const rows = [[hdr('ПРИЗНАК', '5C6F82'), hdr('ГАЙМОРИТ', '1B759C'), hdr('ПУЛЬПИТ', 'B3263A')]];
    data.forEach((r, i) => rows.push([lab(r[0]), cell(r[1], i % 2 ? 'F4F9FB' : 'FFFFFF'), cell(r[2], i % 2 ? 'FEF3F4' : 'FFFFFF')]));
    s.addTable(rows, {
      x: MX, y: 1.4, w: CW, colW: [2.9, 4.6, CW - 7.5], rowH: [0.55, 0.68, 0.68, 0.68, 0.68, 0.68, 0.68],
      border: { type: 'solid', pt: 1, color: 'D5E2EA' }, margin: [0.05, 0.14, 0.05, 0.14], objectName: 'compare_table',
    });
    const py = 6.2, ph = 0.75;
    s.addShape(pres.ShapeType.roundRect, { x: MX, y: py, w: CW, h: ph, rectRadius: 0.12, fill: { color: C.accent3 }, line: { type: 'none' }, objectName: 'warning_plate' });
    await iconPlain(s, 'FaExclamationTriangle', MX + 0.3, py + 0.19, 0.38, 'FFFFFF');
    txt(s, 'Симптомы могут пересекаться.\nОкончательный диагноз устанавливают после осмотра и обследования',
      MX + 0.9, py, CW - 1.2, ph, { fontSize: 18, bold: true, color: C.background1, valign: 'middle' });
    s.addNotes('Сравнение: при гайморите боль обычно в нескольких верхних зубах и области щеки, есть заложенность носа, боль усиливается при наклоне головы; при пульпите боль чаще в одном конкретном зубе, провоцируется температурой, может усиливаться ночью, носа это не касается. Но симптомы могут пересекаться — диагноз ставят после осмотра и обследования.');
  }

  // ---------- 11. SURGERY ----------
  pres.addSection({ title: 'Лечение и выводы' });
  {
    const s = slide('CONTENT_MILK', 'Лечение и выводы', 'Операции при гайморите');
    const m = [
      ['surgery_1', 'Пункция верхнечелюстной пазухи', 'эвакуация содержимого, промывание по показаниям'],
      ['surgery_2', 'Эндоскопическая эндоназальная хирургия', 'доступ через нос; восстановление вентиляции и дренирования; удаление патологических тканей'],
      ['surgery_3', 'Микрогайморотомия', 'небольшой доступ через переднюю стенку; в отдельных клинических ситуациях'],
      ['surgery_4', 'Трансальвеолярный доступ', 'через область лунки зуба; при одонтогенной патологии, инородном теле'],
      ['surgery_5', 'Операция Колдуэлла–Люка', 'открытый доступ; сегодня значительно реже, по специальным показаниям'],
    ];
    const gap = 0.2, cw = (CW - 4 * gap) / 5, cy = 1.4, chh = 4.55;
    for (let i = 0; i < 5; i++) {
      const x = MX + i * (cw + gap);
      card(s, x, cy, cw, chh, { r: 0.14 });
      await pic(s, m[i][0], x + 0.1, cy + 0.1, cw - 0.2, 1.66, { r: 0.1, alt: m[i][1] });
      dot(s, x + 0.34, cy + 0.34, 0.4, C.text1, i + 1, { fs: 15, line: 'FFFFFF' });
      txt(s, m[i][1], x + 0.14, cy + 1.9, cw - 0.28, 0.95, { fontSize: 15, bold: true });
      txt(s, m[i][2], x + 0.14, cy + 2.85, cw - 0.28, 1.6, { fontSize: 14, color: C.accent5 });
    }
    // balloon dilation: a separate method
    const by = 6.1, bh = 0.85;
    card(s, MX, by, CW, bh, { fill: TINT.teal, shadow: false });
    await pic(s, 'balloon', MX + 0.12, by + 0.08, 1.05, bh - 0.16, { r: 0.08, alt: 'Баллонная дилатация соустья' });
    txt(s, runs([['Отдельный метод — баллонная дилатация соустья: ', { bold: true, color: C.accent2 }], ['расширение естественного пути дренирования специальным баллонным катетером', {}]]),
      MX + 1.4, by, CW - 1.6, bh, { fontSize: 17, valign: 'middle' });
    s.addNotes('Методы: пункция (эвакуация содержимого, промывание); эндоскопическая эндоназальная хирургия (доступ через нос, восстановление вентиляции и дренирования); микрогайморотомия (небольшой доступ через переднюю стенку); трансальвеолярный доступ через лунку зуба (одонтогенная патология, инородное тело); радикальная операция Колдуэлла–Люка — сегодня значительно реже. Баллонная дилатация соустья — отдельный метод (расширение естественного соустья баллонным катетером); ЯМИК-катетер — другой метод и не является баллонной синусопластикой. Схемы на карточках условные; реальные фото инструментария можно подставить вместо них (Change Picture).');
  }

  // ---------- 12. CONCLUSION ----------
  {
    const s = pres.addSlide({ masterName: 'CLOSING', sectionTitle: 'Лечение и выводы' });
    s.background = { color: 'FFFFFF' };
    {
      const meta = await sharp(IMG('cover_head')).metadata();
      const bw = 10.2, bh = bw * meta.height / meta.width;
      const pw = meta.width, ph = meta.height;
      const m1 = Buffer.from(`<svg width="${pw}" height="${ph}"><defs><linearGradient id="a" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".35" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></linearGradient></defs><rect width="${pw}" height="${ph}" fill="url(#a)"/></svg>`);
      const m2 = Buffer.from(`<svg width="${pw}" height="${ph}"><defs><linearGradient id="b" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff" stop-opacity="1"/><stop offset=".8" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="${pw}" height="${ph}" fill="url(#b)"/></svg>`);
      const buf = await sharp(IMG('cover_head')).ensureAlpha().composite([{ input: m1, blend: 'dest-in' }]).png().toBuffer()
        .then((x) => sharp(x).composite([{ input: m2, blend: 'dest-in' }]).png().toBuffer());
      s.addImage({ data: 'image/png;base64,' + buf.toString('base64'), x: W - bw, y: 1.0, w: bw, h: bh, altText: 'Фоновая иллюстрация: гайморова пазуха', objectName: 'bg_illustration' });
    }
    s.addText('Главное', { placeholder: 'title', align: 'left' });
    const pts = [
      ['01', 'Гайморова пазуха тесно связана с полостью носа.'],
      ['02', 'Её дно анатомически близко к корням верхних зубов.'],
      ['03', 'Нарушение вентиляции и дренирования способствует развитию воспаления.'],
      ['04', 'При одонтогенном синусите необходимо устранить не только воспаление пазухи, но и стоматологический источник инфекции.'],
    ];
    const gw = (CW - 0.3) / 2, gh = 2.0;
    pts.forEach(([n, t], i) => {
      const x = MX + (i % 2) * (gw + 0.3), y = 1.6 + Math.floor(i / 2) * (gh + 0.25);
      card(s, x, y, gw, gh, { r: 0.16, fill: 'FFFFFF', alpha: 12 });
      txt(s, n, x + 0.35, y + 0.15, 1.3, 0.9, { fontSize: 44, bold: true, fontFace: HEAD, color: i === 3 ? C.accent3 : C.accent2 });
      txt(s, t, x + 0.35, y + 0.95, gw - 0.7, gh - 1.05, { fontSize: i === 3 ? 17 : 19, bold: true });
    });
    txt(s, 'Спасибо за внимание', MX, 6.15, CW, 0.8, { fontSize: 32, italic: true, fontFace: HEAD, color: C.text1, align: 'center', valign: 'middle', name: 'thanks' });
    s.addNotes('Итоги: 1) пазуха тесно связана с полостью носа; 2) её дно близко к корням верхних зубов; 3) нарушение вентиляции и дренирования способствует воспалению; 4) при одонтогенном синусите нужно устранять и воспаление пазухи, и стоматологический источник инфекции. Спасибо за внимание.');
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log('written', OUT);
}
build().catch((e) => { console.error(e); process.exit(1); });
