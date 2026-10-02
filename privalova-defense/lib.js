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
    dk1: "2F3E55", // основной текст (тёмно-синий, не чёрный)
    lt1: "FFFFFF",
    dk2: "3D5A80", // заголовки
    lt2: "EEF2F7", // мягкая подложка карточек
    accent1: "4F7CAC", // стальной синий
    accent2: "5A9AA0", // приглушённый бирюзовый (основная группа)
    accent3: "D9B77E", // песочный (группа сравнения)
    accent4: "B9C4D2", // серо-голубой (контрольная группа)
    accent5: "8DB5A5", // шалфей
    accent6: "B98B9A", // пыльная роза
    hlink: "3D6A9E",
    folHlink: "6B7C93",
  },
};

// Палитры для диаграмм (hex, т.к. в диаграммах схемные цвета не поддерживаются)
const PAL = {
  text: "2F3E55",
  muted: "66768C",
  grid: "DDE3EB",
  border: "CBD5E1",
  tint: "EEF2F7",
  // время наблюдения
  before: "C3CEDB",
  after: "6C94BE",
  m6: "3F6B97",
  // группы
  ctrl: "B9C4D2",
  comp: "E0C28C",
  main: "5A9AA0",
  // тревожность: ситуативная / личностная
  sitB: "C9D3DF",
  sitA: "5F8DBA",
  perB: "C6E0DF",
  perA: "4C9097",
  rose: "C99AA9",
  sand: "E0C28C",
  sage: "8DB5A5",
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "КВЧ-терапия и амплипульстерапия с СРК — доклад к защите";
pres.author = "Привалова Н.И.";
const C = pres.SchemeColor;

const W = 13.33;
const FOOT = "Привалова Н.И.  ·  КВЧ-терапия и амплипульстерапия в комплексном санаторно-курортном лечении с СРК";

// ---------- Макеты ----------
pres.defineSlideMaster({
  title: "TITLE",
  background: { color: "FFFFFF" },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 1.0, y: 1.35, w: 11.33, h: 2.25, fontSize: 32, bold: true, color: C.text2, align: "center", valign: "middle", margin: 0 }, text: "" } },
  ],
});

pres.defineSlideMaster({
  title: "SECTION",
  background: { color: "EEF2F7" },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.9, y: 0.9, w: 11.5, h: 1.0, fontSize: 30, bold: true, color: C.text2, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.9, y: 2.2, w: 11.5, h: 4.2, fontSize: 24, color: C.text1, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 12.3, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: "66768C", align: "right" },
});

pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: "FFFFFF" },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 12.33, h: 0.95, fontSize: 26, bold: true, color: C.text2, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { text: { text: FOOT, options: { x: 0.5, y: 7.03, w: 10.5, h: 0.28, fontSize: 9, color: "66768C", margin: 0, isTextBox: true } } },
  ],
  slideNumber: { x: 12.3, y: 7.03, w: 0.55, h: 0.28, fontSize: 10, color: "66768C", align: "right" },
});

// ---------- Вспомогательные функции ----------
const tx = (slide, text, o = {}) =>
  slide.addText(text, Object.assign({ isTextBox: true, margin: 0, color: C.text1, fontSize: 14, valign: "top" }, o));

// карточка-подложка с текстом внутри (фигура с текстом: правится в PowerPoint целиком)
function card(slide, text, x, y, w, h, o = {}) {
  return slide.addText(text, Object.assign({
    isTextBox: true,
    shape: pres.ShapeType.roundRect, rectRadius: 0.08,
    x, y, w, h,
    fill: { color: C.background2 },
    line: { color: PAL.border, width: 0.75 },
    color: C.text1, fontSize: 14, valign: "middle", margin: [6, 10, 6, 10],
  }, o));
}

function arrow(slide, x1, y1, x2, y2, name) {
  const o = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: { color: "7F93AD", width: 1.5, endArrowType: "triangle" }, objectName: name || "Стрелка" };
  if (x2 < x1) o.flipH = true;
  if (y2 < y1) o.flipV = true;
  slide.addShape(pres.ShapeType.line, o);
}

const tag = (slide, text) =>
  tx(slide, text, { x: 9.8, y: 0.08, w: 3.03, h: 0.25, fontSize: 10, color: "66768C", align: "right", italic: true });

const note = (slide, text, y = 6.62, h = 0.4) =>
  tx(slide, text, { x: 0.5, y, w: 12.33, h, fontSize: 10.5, color: PAL.muted, valign: "top" });

const CODES = "Группы: 1 — контрольная (базисное СКЛ); 2 — сравнения (+ амплипульстерапия); 3 — основная (+ амплипульстерапия + КВЧ-терапия); а — СРК-З (запор); б — СРК-Д (диарея)";

function chart(slide, type, series, cats, o = {}) {
  const data = series.map((s) => ({ name: s.name, labels: cats, values: s.vals }));
  const stacked = o.grouping === "stacked" || o.grouping === "percentStacked";
  const opts = {
    x: o.x, y: o.y, w: o.w, h: o.h,
    objectName: o.name || o.title || "Диаграмма",
    showTitle: !!o.title, title: o.title || "", titleFontSize: o.titleSize || 12, titleColor: PAL.text, titleFontFace: "+mn-lt", titleBold: true,
    showLegend: o.legend !== false && series.length > 1, legendPos: "b", legendFontSize: o.legendSize || 10, legendColor: PAL.text, legendFontFace: "+mn-lt",
    chartColors: o.colors,
    showValue: o.labels !== false, dataLabelFontSize: o.labelSize || 9, dataLabelColor: PAL.text, dataLabelFontFace: "+mn-lt",
    dataLabelFormatCode: o.fmt || "General",
    dataLabelPosition: o.labelPos || (stacked ? "ctr" : "outEnd"),
    catAxisLabelFontSize: o.catSize || 10, catAxisLabelColor: PAL.text, catAxisLabelFontFace: "+mn-lt",
    valAxisLabelFontSize: 9, valAxisLabelColor: PAL.muted, valAxisLabelFontFace: "+mn-lt",
    valGridLine: o.grid === false ? { style: "none" } : { color: PAL.grid, size: 0.5 }, catGridLine: { style: "none" },
    valAxisLineShow: false,
    catAxisLineShow: true,
  };
  if (o.max !== undefined) opts.valAxisMaxVal = o.max;
  opts.valAxisMinVal = o.min !== undefined ? o.min : 0;
  if (o.major) opts.valAxisMajorUnit = o.major;
  if (o.valHidden) opts.valAxisHidden = true;
  if (type === pres.charts.BAR) {
    opts.barDir = o.dir || "col";
    opts.barGrouping = o.grouping || "clustered";
    opts.barGapWidthPct = o.gap !== undefined ? o.gap : 60;
    if (o.overlap !== undefined) opts.barOverlapPct = o.overlap;
    if (o.catReverse) opts.catAxisOrientation = "maxMin";
    if (o.catLow) opts.catAxisLabelPos = "low";
  }
  if (type === pres.charts.RADAR) {
    opts.radarStyle = "marker";
    opts.lineSize = 2;
    opts.lineDataSymbolSize = 6;
    opts.showValue = false;
    opts.catAxisLabelFontSize = 11;
    opts.valAxisLabelFontSize = 8;
  }
  slide.addChart(type, data, opts);
}

const bar = (slide, series, cats, o) => chart(slide, pres.charts.BAR, series, cats, o);

// До / после
const BA = [PAL.before, PAL.after];
const BA6 = [PAL.before, PAL.after, PAL.m6];
const GRP = [PAL.ctrl, PAL.comp, PAL.main];

// «10 в степени n» для таблиц микробиоценоза
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

module.exports = { pres, C, PAL, THEME, applyTheme, tx, card, arrow, tag, note, chart, bar, BA, BA6, GRP, CODES, pow10, addSlideC, W };
