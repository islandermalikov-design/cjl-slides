// Общие настройки оформления и вспомогательные функции для сборки презентации.
const pptxgen = require("pptxgenjs");

const SK = "/root/.claude/skills/synced/7bc084e7-2165-4172-a544-b030b1c5bd5a_1eabd9df-c4b8-40f4-ac8f-7e4b9a5781cb/pptx";
const { applyTheme } = require(SK + "/scripts/apply_theme.js");

// ---------- Тема: спокойная, без чёрных заливок и резких контрастов ----------
const THEME = {
  name: "Научный стиль (спокойная гамма)",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "2F3E55", lt1: "FFFFFF", dk2: "3D5A80", lt2: "EEF2F7",
    accent1: "4F7CAC", accent2: "5A9AA0", accent3: "D9B77E", accent4: "B9C4D2", accent5: "8DB5A5", accent6: "B98B9A",
    hlink: "3D6A9E", folHlink: "6B7C93",
  },
};

const PAL = {
  text: "2F3E55", muted: "66768C", grid: "DDE3EB", border: "CBD5E1", tint: "EEF2F7",
  before: "C3CEDB", after: "6C94BE", m6: "3F6B97",
  ctrl: "B9C4D2", comp: "E0C28C", main: "5A9AA0",
  sitB: "C9D3DF", sitA: "5F8DBA", perB: "C6E0DF", perA: "4C9097",
  rose: "C99AA9", sand: "E0C28C", sage: "8DB5A5",
  mark: "A94F66", // цвет значков достоверности и овалов
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "КВЧ-терапия и амплипульстерапия с СРК — доклад к защите";
pres.author = "Привалова Н.И.";
const C = pres.SchemeColor;
const W = 13.33;

// ---------- Макеты ----------
pres.defineSlideMaster({
  title: "TITLE",
  background: { color: "FFFFFF" },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.4, w: 11.73, h: 1.9, fontSize: 28, bold: true, color: C.text2, align: "center", valign: "middle", margin: 0 }, text: "" } },
  ],
});

pres.defineSlideMaster({
  title: "SECTION",
  background: { color: "EEF2F7" },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.9, y: 0.9, w: 11.5, h: 1.0, fontSize: 30, bold: true, color: C.text2, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.9, y: 2.2, w: 11.5, h: 4.2, fontSize: 26, color: C.text1, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 12.3, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: "66768C", align: "right" },
});

pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: "FFFFFF" },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.28, w: 12.33, h: 0.9, fontSize: 26, bold: true, color: C.text2, align: "left", valign: "middle", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 12.3, y: 7.05, w: 0.55, h: 0.28, fontSize: 10, color: "66768C", align: "right" },
});

// ---------- Базовые элементы ----------
const tx = (slide, text, o = {}) =>
  slide.addText(text, Object.assign({ isTextBox: true, margin: 0, color: C.text1, fontSize: 16, valign: "top" }, o));

function card(slide, text, x, y, w, h, o = {}) {
  return slide.addText(text, Object.assign({
    isTextBox: true,
    shape: pres.ShapeType.roundRect, rectRadius: 0.08,
    x, y, w, h,
    fill: { color: C.background2 },
    line: { color: PAL.border, width: 0.75 },
    color: C.text1, fontSize: 16, valign: "middle", margin: [6, 10, 6, 10],
  }, o));
}

function arrow(slide, x1, y1, x2, y2, name) {
  const o = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: { color: "7F93AD", width: 1.75, endArrowType: "triangle" }, objectName: name || "Стрелка" };
  if (x2 < x1) o.flipH = true;
  if (y2 < y1) o.flipV = true;
  slide.addShape(pres.ShapeType.line, o);
}

const tag = (slide, text) =>
  tx(slide, text, { x: 9.8, y: 0.08, w: 3.03, h: 0.25, fontSize: 11, color: "66768C", align: "right", italic: true });

const note = (slide, text, y = 6.45, h = 0.55, o = {}) =>
  tx(slide, text, Object.assign({ x: 0.5, y, w: 12.33, h, fontSize: 12, color: PAL.muted, valign: "top" }, o));

// подпись «Примечание» как в презентации Горяева (внутригрупповая и межгрупповая достоверность)
const SIG_NOTE = "Примечание: * – статистически значимые различия внутри групп до и после лечения; ▲ – статистически значимые различия между группами после лечения (p<0,05)";
const CODES_SHORT = "1 — контрольная группа, 2 — группа сравнения, 3 — основная группа; а — СРК-З (запор), б — СРК-Д (диарея)";
function sigNote(slide, o = {}) {
  const parts = [];
  if (o.codes) parts.push({ text: CODES_SHORT, options: { breakLine: true } });
  parts.push({ text: SIG_NOTE });
  tx(slide, parts, { x: 0.5, y: o.codes ? 6.42 : 6.62, w: 12.33, h: o.codes ? 0.6 : 0.4, fontSize: 12, color: PAL.muted, objectName: "Примечание (достоверность)" });
}

// ---------- Диаграммы ----------
const CATS6 = ["1а", "2а", "3а", "1б", "2б", "3б"]; // порядок как в диссертации
const ORD6 = [0, 3, 1, 4, 2, 5];                       // новый порядок: 1а 1б 2а 2б 3а 3б
const CHARTS = [];                                      // реестр для постобработки (значки достоверности)

const fmtVal = (v, fmt) => {
  if (v === null || v === undefined) return "";
  let s;
  if (fmt === "0.00") s = Number(v).toFixed(2);
  else if (fmt === "0.0") s = Number(v).toFixed(1);
  else s = String(v);
  return s.replace(".", ",");
};

function guessY(title) {
  const t = title || "";
  if (/lg КОЕ/.test(t)) return "lg КОЕ/г";
  if (/баллы|баллах/.test(t)) return "Баллы";
  if (/\(n\)|число пациентов, n|, n$/i.test(t)) return "Число пациентов, n";
  if (/месяц/.test(t)) return "Месяцы";
  if (/χ²/.test(t)) return "χ² Пирсона";
  if (/\(r\)/.test(t)) return "Коэффициент r";
  if (/%/.test(t)) return "% пациентов";
  return "Значение";
}

function chart(slide, type, series, cats, o = {}) {
  let cs = cats;
  let ser = series.map((s) => ({ name: s.name, vals: s.vals.slice() }));
  let marks = o.marks || [];
  let ncat = cats.length;
  const isG6 = o.group6 || (cats.length === 6 && cats.join() === CATS6.join());
  if (isG6) {
    cs = ORD6.map((i) => cats[i]);
    ser = ser.map((s) => ({ name: s.name, vals: ORD6.map((i) => s.vals[i]) }));
    const oldToNew = {}; ORD6.forEach((oi, ni) => { oldToNew[oi] = ni; });
    marks = marks.map((m) => ({ s: m.s, pts: Object.fromEntries(Object.entries(m.pts).map(([k, v]) => [oldToNew[k], v])) }));
  }
  let colorsUse = o.colors;
  if (o.dir === "bar" && o.catReverse) {
    const n = cs.length, ns = ser.length;
    cs = cs.slice().reverse();
    ser = ser.map((s) => ({ name: s.name, vals: s.vals.slice().reverse() })).reverse();
    marks = marks.map((m) => ({ s: ns - 1 - m.s, pts: Object.fromEntries(Object.entries(m.pts).map(([k, v]) => [n - 1 - k, v])) }));
    if (Array.isArray(colorsUse)) colorsUse = colorsUse.slice().reverse();
  }
  const data = ser.map((s) => ({ name: s.name, labels: cs, values: s.vals }));
  const stacked = o.grouping === "stacked" || o.grouping === "percentStacked";
  const isRadar = type === pres.charts.RADAR;
  const hasLegend = o.legend !== false && series.length > 1;

  // геометрия области построения (дюймы) — нужна для овалов вокруг основной группы
  const L = o.padL !== undefined ? o.padL : 0.95, R = 0.15;
  const T = o.title ? 0.45 : 0.12;
  const legRows = o.legendRows || (series.length >= 4 ? 2 : 1);
  const B = (hasLegend ? 0.05 + 0.27 * legRows : 0) + 0.3 + (o.xTitle === false ? 0 : 0.3) + (o.padB || 0);
  const plot = { x: o.x + L, y: o.y + T, w: o.w - L - R, h: o.h - T - B };

  const opts = {
    x: o.x, y: o.y, w: o.w, h: o.h,
    objectName: o.name || o.title || "Диаграмма",
    showTitle: !!o.title, title: o.title || "", titleFontSize: o.titleSize || 14, titleColor: PAL.text, titleFontFace: "+mn-lt", titleBold: true,
    showLegend: hasLegend, legendPos: "b", legendFontSize: o.legendSize || 12, legendColor: PAL.text, legendFontFace: "+mn-lt",
    chartColors: colorsUse,
    showValue: o.labels !== false, dataLabelFontSize: o.labelSize || 11, dataLabelColor: PAL.text, dataLabelFontFace: "+mn-lt",
    dataLabelFormatCode: o.fmt || "General",
    dataLabelPosition: o.labelPos || (stacked ? "ctr" : "outEnd"),
    catAxisLabelFontSize: o.catSize || 12, catAxisLabelColor: PAL.text, catAxisLabelFontFace: "+mn-lt",
    valAxisLabelFontSize: 11, valAxisLabelColor: PAL.muted, valAxisLabelFontFace: "+mn-lt",
    valGridLine: o.grid === false ? { style: "none" } : { color: PAL.grid, size: 0.5 }, catGridLine: { style: "none" },
    valAxisLineShow: false, catAxisLineShow: true,
  };
  if (!isRadar) {
    opts.layout = { x: (plot.x - o.x) / o.w, y: (plot.y - o.y) / o.h, w: plot.w / o.w, h: plot.h / o.h };
    if (o.xTitle !== false) {
      opts.showCatAxisTitle = true; opts.catAxisTitle = o.xTitle || "Группы"; opts.catAxisTitleFontSize = 12; opts.catAxisTitleColor = PAL.text;
    }
    if (o.yTitle !== false && !o.valHidden) {
      opts.showValAxisTitle = true; opts.valAxisTitle = o.yTitle || guessY(o.title); opts.valAxisTitleFontSize = 12; opts.valAxisTitleColor = PAL.text;
    }
  }
  if (o.max !== undefined) opts.valAxisMaxVal = o.max;
  opts.valAxisMinVal = o.min !== undefined ? o.min : 0;
  if (o.major) opts.valAxisMajorUnit = o.major;
  if (o.valHidden) opts.valAxisHidden = true;
  if (type === pres.charts.BAR) {
    opts.barDir = o.dir || "col";
    opts.barGrouping = o.grouping || "clustered";
    opts.barGapWidthPct = o.gap !== undefined ? o.gap : 50;
    if (o.overlap !== undefined) opts.barOverlapPct = o.overlap;
    if (o.dir === "bar") { opts.valAxisLabelRotate = 0; opts.valAxisLabelFormatCode = o.valFmt || "General"; }
    if (o.catLow) opts.catAxisLabelPos = "low";
  }
  if (isRadar) {
    opts.radarStyle = "marker"; opts.lineSize = 2; opts.lineDataSymbolSize = 6;
    opts.showValue = false; opts.catAxisLabelFontSize = 13; opts.valAxisLabelFontSize = 9;
  }
  const labelPos = opts.dataLabelPosition;
  slide.addChart(type, data, opts);
  CHARTS.push({ name: o.name || o.title, marks, vals: ser.map((s) => s.vals), fmt: o.fmt || "General", pos: labelPos });

  // овал вокруг основной группы (последние n категорий из ncatTotal)
  if (o.circle && !isRadar && o.dir !== "bar") {
    const n = o.circle.n, tot = cs.length, pad = 0.06;
    const cx = plot.x + (plot.w * (tot - n)) / tot - pad, cw = (plot.w * n) / tot + 2 * pad;
    slide.addShape(pres.ShapeType.ellipse, {
      x: cx, y: plot.y - 0.02, w: Math.min(cw, o.x + o.w - cx - 0.02), h: plot.h + 0.14,
      fill: { color: "FFFFFF", transparency: 100 }, line: { color: PAL.mark, width: 2.25, dashType: "dash" },
      objectName: "Овал: динамика в основной группе",
    });
  }
  return plot;
}

const bar = (slide, series, cats, o) => chart(slide, pres.charts.BAR, series, cats, o);

// постобработка: значки * и ▲ внутри подписей данных (остаются привязанными к столбцам)
async function applyMarks(file) {
  const JSZip = require("jszip");
  const fs = require("fs");
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const names = Object.keys(zip.files).filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
  if (names.length !== CHARTS.length) throw new Error("charts mismatch " + names.length + " vs " + CHARTS.length);
  let nmarks = 0;
  for (let i = 0; i < names.length; i++) {
    const meta = CHARTS[i];
    if (!meta.marks.length) continue;
    let xml = await zip.file(names[i]).async("string");
    const parts = xml.split("<c:ser>");
    for (const m of meta.marks) {
      let seg = parts[m.s + 1];
      if (seg === undefined) throw new Error("no series " + m.s + " in " + meta.name);
      const dl = Object.entries(m.pts).map(([pt, sym]) => {
        const v = fmtVal(meta.vals[m.s][pt], meta.fmt);
        nmarks++;
        return '<c:dLbl><c:idx val="' + pt + '"/><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p>' +
          '<a:r><a:rPr lang="ru-RU" sz="1100" b="0"><a:solidFill><a:srgbClr val="' + PAL.text + '"/></a:solidFill><a:latin typeface="+mn-lt"/></a:rPr><a:t>' + v + '</a:t></a:r>' +
          '<a:r><a:rPr lang="ru-RU" sz="1300" b="1"><a:solidFill><a:srgbClr val="' + PAL.mark + '"/></a:solidFill><a:latin typeface="+mn-lt"/></a:rPr><a:t> ' + sym + '</a:t></a:r>' +
          '</a:p></c:rich></c:tx><c:dLblPos val="' + meta.pos + '"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbl>';
      }).join("");
      if (!seg.includes("<c:dLbls>")) throw new Error("no dLbls in series " + m.s + " of " + meta.name);
      parts[m.s + 1] = seg.replace("<c:dLbls>", "<c:dLbls>" + dl);
    }
    zip.file(names[i], parts.join("<c:ser>"));
  }
  for (const n of names) {
    const x = await zip.file(n).async("string");
    if (/undefined|NaN|Infinity/.test(x)) throw new Error("invalid token in " + n);
  }
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(file, buf);
  return nmarks;
}

// ---------- прочее ----------
const BA = [PAL.before, PAL.after];
const BA6 = [PAL.before, PAL.after, PAL.m6];
const GRP = [PAL.ctrl, PAL.comp, PAL.main];

function pow10(v) {
  if (v === "0" || v === 0) return [{ text: "0", options: {} }];
  return [{ text: "10", options: {} }, { text: String(v), options: { superscript: true } }];
}

function addSlideC(title, section, notes) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  if (notes) s.addNotes(notes);
  return s;
}

module.exports = { pres, C, PAL, THEME, applyTheme, tx, card, arrow, tag, note, sigNote, chart, bar, applyMarks, BA, BA6, GRP, CATS6, pow10, addSlideC, W };
