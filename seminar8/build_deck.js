// Генератор презентации «Экранирование электрических и магнитных полей»
// Запуск: node build_deck.js  (нужны pptxgenjs, sharp, react, react-dom, react-icons)
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const RDS = require("react-dom/server");
const fa = require("react-icons/fa");
const tb = require("react-icons/tb");

const IMG = process.env.IMG_DIR || path.join(__dirname, "images");
const OUT = process.env.OUT || path.join(__dirname, "Ekranirovanie_polej.pptx");

// ---------- палитра ----------
const NAVY = "0B1F3A";
const NAVY2 = "13305A";
const GRAPH = "2B3440";
const CYAN = "1FB6D4";
const TEAL = "0E9AA7";
const BG = "F3F6F9";
const WHITE = "FFFFFF";
const MUTED = "64748B";
const LINE = "DDE5EC";
const ICE = "E4F2F8";
const FONT = "Arial";

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625
pres.title = "Экранирование электрических и магнитных полей";
pres.subject = "Физические основы защиты информации, семинар № 8";

// ---------- вспомогательные функции ----------
const shadow = () => ({ type: "outer", color: NAVY, opacity: 0.1, blur: 8, offset: 2, angle: 90 });

async function icon(Comp, color, size = 256) {
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: String(size) }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// картинка → обрезка по области → скруглённые углы → base64
async function prepImg(file, left, cropW, outW, aspect, radiusFrac) {
  const cropH = Math.min(941, Math.round(cropW / aspect));
  const outH = Math.round(outW / aspect);
  const r = Math.round(outW * radiusFrac);
  const base = await sharp(path.join(IMG, file))
    .extract({ left, top: 0, width: cropW, height: cropH })
    .resize(outW, outH)
    .toBuffer();
  const mask = Buffer.from(`<svg width="${outW}" height="${outH}"><rect width="${outW}" height="${outH}" rx="${r}" ry="${r}"/></svg>`);
  const buf = await sharp(base).composite([{ input: mask, blend: "dest-in" }]).png({ compressionLevel: 9 }).toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

function txt(slide, t, x, y, w, h, o = {}) {
  slide.addText(t, Object.assign({ x, y, w, h, fontFace: FONT, margin: 0, valign: "top", isTextBox: true }, o));
}

function card(slide, x, y, w, h, o = {}) {
  slide.addShape(pres.ShapeType.roundRect, Object.assign({
    x, y, w, h, rectRadius: 0.08, fill: { color: WHITE }, line: { color: LINE, width: 0.75 }, shadow: shadow(),
  }, o));
}

function circleIcon(slide, img, cx, cy, d, fill) {
  slide.addShape(pres.ShapeType.ellipse, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 } });
  const s = d * 0.5;
  slide.addImage({ data: img, x: cx - s / 2, y: cy - s / 2, w: s, h: s });
}

let pageNo = 0;
function baseSlide(tag, title, notes) {
  const s = pres.addSlide();
  pageNo += 1;
  s.background = { color: BG };
  txt(s, tag, 0.5, 0.36, 6, 0.22, { fontSize: 9, bold: true, color: TEAL, charSpacing: 3 });
  txt(s, title, 0.5, 0.6, 9, 0.6, { fontSize: 27, bold: true, color: NAVY, valign: "middle" });
  txt(s, "Физические основы защиты информации  ·  Семинар № 8", 0.5, 5.3, 6, 0.2, { fontSize: 8, color: MUTED });
  txt(s, String(pageNo).padStart(2, "0"), 8.5, 5.3, 1, 0.2, { fontSize: 8, color: MUTED, align: "right", bold: true });
  s.addNotes(notes);
  return s;
}

// Catmull–Rom по контрольным точкам → ломаная с большим числом точек
function catmull(ctrl, n = 14) {
  const P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

function poly(slide, pts, color, width, dash) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minx = Math.min(...xs), miny = Math.min(...ys);
  const w = Math.max(Math.max(...xs) - minx, 0.01), h = Math.max(Math.max(...ys) - miny, 0.01);
  const line = { color, width };
  if (dash) line.dashType = dash;
  slide.addShape(pres.ShapeType.custGeom, {
    x: minx, y: miny, w, h,
    points: pts.map((p, i) => ({ x: p[0] - minx, y: p[1] - miny, moveTo: i === 0 })),
    line,
  });
}

function arrowHead(slide, pts, idx, color, size = 0.1) {
  const i1 = Math.min(pts.length - 1, idx), i0 = Math.max(0, i1 - 2);
  const dx = pts[i1][0] - pts[i0][0], dy = pts[i1][1] - pts[i0][1];
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const [px, py] = pts[i1];
  slide.addShape(pres.ShapeType.triangle, {
    x: px - size / 2, y: py - size / 2, w: size, h: size * 1.1, rotate: ang + 90,
    fill: { color }, line: { color, width: 0 },
  });
}

// линия поля: ломаная + стрелки в заданных долях длины
function fieldLine(slide, pts, color, width, fracs = [0.5], dash) {
  poly(slide, pts, color, width, dash);
  fracs.forEach((f) => arrowHead(slide, pts, Math.min(pts.length - 1, Math.round((pts.length - 1) * f)), color));
}

function straightArrow(slide, x1, y, x2, color, width) {
  slide.addShape(pres.ShapeType.line, {
    x: x1, y, w: x2 - x1, h: 0, line: { color, width, endArrowType: "triangle" },
  });
}

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 3 * t * t - 2 * t * t * t);

// =====================================================================
async function main() {
  // ---------- иконки ----------
  const ic = {};
  const need = {
    micro: [fa.FaMicrochip, CYAN], microW: [fa.FaMicrochip, WHITE], microN: [fa.FaMicrochip, NAVY],
    tower: [fa.FaBroadcastTower, CYAN], shield: [fa.FaShieldAlt, CYAN], shieldW: [fa.FaShieldAlt, WHITE],
    weak: [fa.FaSignal, CYAN], eye: [fa.FaEye, CYAN], globe: [fa.FaBolt, CYAN],
    boltW: [fa.FaBolt, WHITE], linkW: [fa.FaLink, WHITE], layersW: [fa.FaLayerGroup, WHITE],
    toolsW: [fa.FaTools, WHITE], groundW: [tb.TbCircuitGround, WHITE],
    magnetW: [fa.FaMagnet, WHITE], atomW: [fa.FaAtom, WHITE], cubeW: [fa.FaCube, WHITE],
    waveW: [fa.FaWaveSquare, WHITE], buildW: [fa.FaBuilding, WHITE], plugW: [fa.FaPlug, WHITE],
    serverW: [fa.FaServer, WHITE], server: [fa.FaServer, WHITE],
    dish: [fa.FaSatelliteDish, WHITE], deskW: [fa.FaDesktop, WHITE], checkW: [fa.FaCheck, WHITE],
    boltC: [fa.FaBolt, CYAN], magnetC: [fa.FaMagnet, CYAN],
  };
  for (const [k, [c, col]] of Object.entries(need)) ic[k] = await icon(c, col);

  // ---------- картинки ----------
  const imgCage = await prepImg("2.webp", 0, 1558, 1100, 5.3 / 3.2, 0.03);
  const R = 0.05;
  const imgCable = await prepImg("3.webp", 380, 1192, 640, 1.267, R);
  const imgCase = await prepImg("4.webp", 240, 1192, 640, 1.267, R);
  const imgRoom = await prepImg("5.webp", 380, 1192, 640, 1.267, R);
  const imgRack = await prepImg("1.webp", 120, 1192, 640, 1.267, R);

  // =================================================================
  // СЛАЙД 2. Зачем нужно экранирование
  // =================================================================
  {
    const s = baseSlide("ВВЕДЕНИЕ", "Зачем вообще нужно экранирование?",
      "Начнём с вопроса: зачем вообще нужно экранирование? Любое электронное устройство — компьютер, монитор, кабель, блок питания — при работе создаёт электрические и магнитные поля. " +
      "Токи и напряжения в цепях постоянно меняются, а значит, вокруг устройства возникает электромагнитное излучение. " +
      "Проблема в том, что часть этих излучений связана с обрабатываемой информацией: по форме сигнала при определённых условиях можно восстановить сами данные. Такие излучения называют побочными электромагнитными излучениями. " +
      "Если поле выходит за границу контролируемой зоны, его теоретически может принять посторонний человек с чувствительной аппаратурой. " +
      "Внизу на схеме показана общая логика защиты. Источник создаёт поле, поле встречает экран, и за экраном остаётся уже сильно ослабленный сигнал. " +
      "Обратите внимание на столбики: слева уровень поля высокий, справа — низкий. Именно в этом смысл экранирования. " +
      "Дальше посмотрим, как это работает физически, и начнём с электрического поля."
    );
    const facts = [
      [ic.microW, "Устройства создают электромагнитные поля"],
      [ic.eye, "Часть излучений несёт информацию"],
      [ic.tower, "Поле выходит за контролируемую зону"],
      [ic.shieldW, "Экран уменьшает уровень поля"],
    ];
    const fillCols = [NAVY, NAVY, NAVY, TEAL];
    facts.forEach(([img, t], i) => {
      const x = 0.5 + i * 2.3;
      card(s, x, 1.4, 2.1, 1.0);
      circleIcon(s, img, x + 0.37, 1.9, 0.42, fillCols[i]);
      txt(s, t, x + 0.7, 1.5, 1.28, 0.8, { fontSize: 10, color: GRAPH, valign: "middle" });
    });
    txt(s, "ЛОГИКА ЗАЩИТЫ", 0.5, 2.62, 4, 0.2, { fontSize: 9, bold: true, color: MUTED, charSpacing: 3 });

    const nodes = [
      [ic.microW, NAVY, "Источник", "устройство с информативными сигналами", null],
      [ic.tower, NAVY, "Электромагнитное поле", "распространяется в пространстве", [0.3, 0.17, 0.26, 0.12, 0.3, 0.2, 0.26]],
      [ic.shieldW, TEAL, "Экран", "проводящий или магнитомягкий барьер", null],
      [ic.weak, GRAPH, "Ослабленный сигнал", "ниже уровня возможного перехвата", [0.07, 0.05, 0.07, 0.04, 0.07, 0.05, 0.06]],
    ];
    nodes.forEach(([img, col, title, sub, bars], i) => {
      const x = 0.5 + i * 2.35;
      card(s, x, 2.9, 1.95, 2.2);
      circleIcon(s, img === ic.weak ? ic.weak : img, x + 0.42, 3.32, 0.5, col === GRAPH ? NAVY : col);
      txt(s, title, x + 0.15, 3.72, 1.6, 0.4, { fontSize: 11.5, bold: true, color: NAVY });
      txt(s, sub, x + 0.15, 4.12, 1.6, 0.4, { fontSize: 9, color: MUTED });
      if (bars) {
        bars.forEach((h, k) => {
          const bx = x + 0.2 + k * 0.23;
          s.addShape(pres.ShapeType.roundRect, {
            x: bx, y: 4.95 - h * 1.3, w: 0.15, h: h * 1.3, rectRadius: 0.03,
            fill: { color: i === 1 ? CYAN : "9ADCEA" }, line: { color: i === 1 ? CYAN : "9ADCEA", width: 0 },
          });
        });
      }
      if (i < 3) {
        s.addShape(pres.ShapeType.rightArrow, {
          x: x + 2.0, y: 3.85, w: 0.32, h: 0.3, fill: { color: CYAN }, line: { color: CYAN, width: 0 },
        });
      }
    });
  }

  // =================================================================
  // СЛАЙД 3. Электрический экран
  // =================================================================
  {
    const s = baseSlide("ЭЛЕКТРИЧЕСКОЕ ПОЛЕ", "Как работает электрический экран",
      "Принцип работы электрического экрана хорошо виден на этой иллюстрации. Слева — заряженный источник, от него расходятся силовые линии электрического поля. " +
      "В центре — металлическая сетчатая коробка, внутри которой стоит лампочка. В металле есть свободные заряды — электроны. " +
      "Когда на них действует внешнее поле, они приходят в движение и перераспределяются: на одной стороне экрана накапливается отрицательный заряд, на другой — положительный. " +
      "Эти заряды создают собственное поле, направленное навстречу внешнему, и внутри проводника оно его компенсирует. " +
      "В итоге внутри замкнутой проводящей оболочки поле практически равно нулю, а силовые линии огибают экран снаружи. Это и есть знаменитая клетка Фарадея. " +
      "Важная деталь: сплошной металл не обязателен — сетка тоже работает, если размер ячейки много меньше длины волны. " +
      "Осталось посмотреть, в каких конструкциях этот принцип применяется на практике."
    );
    s.addImage({ data: imgCage, x: 0.5, y: 1.4, w: 5.3, h: 3.2 });
    s.addShape(pres.ShapeType.roundRect, { x: 0.7, y: 4.17, w: 1.9, h: 0.32, rectRadius: 0.16, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    txt(s, "Клетка Фарадея", 0.7, 4.17, 1.9, 0.32, { fontSize: 10.5, bold: true, color: WHITE, align: "center", valign: "middle" });

    const steps = [
      ["Внешнее поле", "действует на свободные заряды металла"],
      ["Перераспределение", "заряды смещаются к поверхности экрана"],
      ["Компенсация", "собственное поле зарядов гасит внешнее"],
      null,
    ];
    steps.forEach((st, i) => {
      const y = 1.4 + i * 0.9;
      card(s, 6.1, y, 3.4, 0.8);
      s.addShape(pres.ShapeType.ellipse, { x: 6.25, y: y + 0.2, w: 0.4, h: 0.4, fill: { color: i === 3 ? TEAL : NAVY }, line: { color: NAVY, width: 0 } });
      txt(s, String(i + 1), 6.25, y + 0.2, 0.4, 0.4, { fontSize: 13, bold: true, color: WHITE, align: "center", valign: "middle" });
      if (st) {
        txt(s, st[0], 6.8, y + 0.1, 2.6, 0.25, { fontSize: 12, bold: true, color: NAVY });
        txt(s, st[1], 6.8, y + 0.36, 2.6, 0.38, { fontSize: 9.5, color: MUTED });
      } else {
        txt(s, [
          { text: "Внутри E ≈ 0", options: { fontSize: 14, bold: true, color: NAVY, breakLine: true } },
          { text: "внутри оболочки поля нет", options: { fontSize: 9.5, color: MUTED } },
        ], 6.8, y + 0.08, 2.6, 0.66, { valign: "middle" });
      }
    });
    // подсказка под картинкой
    card(s, 0.5, 4.7, 5.3, 0.4, { shadow: undefined, fill: { color: ICE }, line: { color: ICE, width: 0 } });
    txt(s, "Сетка работает как сплошной экран, если размер ячейки ≪ длины волны", 0.65, 4.7, 5.0, 0.4, { fontSize: 10, color: NAVY, valign: "middle" });
  }

  // =================================================================
  // СЛАЙД 4. Экранирование электрического поля (практика)
  // =================================================================
  {
    const s = baseSlide("ЭЛЕКТРИЧЕСКОЕ ПОЛЕ", "Экранирование электрического поля",
      "На практике электрическое экранирование выполняется в трёх основных формах. " +
      "Первая — металлический корпус устройства: он не даёт полю выйти наружу и одновременно защищает электронику от внешних помех. " +
      "Вторая — экранированный кабель: вокруг жил проходит оплётка или фольга, а ведь именно кабели чаще всего работают как антенны. На схеме видно поперечное сечение: жилы, изоляция, экран и внешняя оболочка. " +
      "Третья — экранированное помещение, по сути большая клетка Фарадея с заземлением. " +
      "Эффективность экрана зависит от пяти факторов, они показаны внизу. Первый — проводимость материала: медь, алюминий, сталь. Второй — непрерывность экрана: любая щель или отверстие работает как окно для излучения. " +
      "Третий — толщина, особенно на низких частотах. Четвёртый — качество соединений: швы, контакты, токопроводящие прокладки. И пятый — заземление, которое отводит наведённые на экране заряды. " +
      "Как видите, электрическое поле экранировать относительно просто. Совсем другая картина с магнитным полем — к ней мы сейчас перейдём."
    );
    const cw = 2.85, gap = 0.225;
    const cx0 = (i) => 0.5 + i * (cw + gap);

    // (а) металлический корпус
    {
      const x = cx0(0);
      card(s, x, 1.4, cw, 2.2);
      const cy = 2.15;
      [-0.5, -0.25, 0, 0.25, 0.5].forEach((d) => straightArrow(s, x + 0.15, cy + d, x + 0.85, CYAN, 1.5));
      s.addShape(pres.ShapeType.roundRect, { x: x + 0.9, y: cy - 0.6, w: 1.1, h: 1.2, rectRadius: 0.06, fill: { color: WHITE }, line: { color: NAVY, width: 3.5 } });
      s.addImage({ data: ic.microN === undefined ? ic.micro : ic.micro, x: x + 1.2, y: cy - 0.18, w: 0.5, h: 0.36 });
      [-0.5, -0.25, 0, 0.25, 0.5].forEach((d) => s.addShape(pres.ShapeType.line, { x: x + 2.05, y: cy + d, w: 0.6, h: 0, line: { color: "C9D4DF", width: 1, dashType: "dash" } }));
      txt(s, "Металлический корпус", x + 0.15, 2.95, cw - 0.3, 0.25, { fontSize: 11.5, bold: true, color: NAVY });
      txt(s, "не выпускает поле наружу", x + 0.15, 3.22, cw - 0.3, 0.25, { fontSize: 9.5, color: MUTED });
    }
    // (б) экранированный кабель (сечение)
    {
      const x = cx0(1);
      card(s, x, 1.4, cw, 2.2);
      const cx = x + 0.95, cy = 2.15;
      const circ = (d, fill, line, w, dash) => s.addShape(pres.ShapeType.ellipse, {
        x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: fill }, line: dash ? { color: line, width: w, dashType: dash } : { color: line, width: w },
      });
      circ(1.3, GRAPH, GRAPH, 0.5);
      circ(1.06, "C3CDD8", "8794A3", 1.5, "sysDash");
      circ(0.86, WHITE, WHITE, 0.5);
      [-0.16, 0.16].forEach((d) => {
        s.addShape(pres.ShapeType.ellipse, { x: cx + d - 0.13, y: cy - 0.13, w: 0.26, h: 0.26, fill: { color: TEAL }, line: { color: NAVY, width: 1 } });
      });
      const labs = [["оболочка", cy - 0.6, cx + 0.55, cy - 0.5], ["экран (оплётка)", cy, cx + 0.5, cy], ["жилы", cy + 0.6, cx + 0.14, cy + 0.08]];
      labs.forEach(([t, ly, px, py]) => {
        s.addShape(pres.ShapeType.line, { x: Math.min(px, x + 1.85), y: Math.min(py, ly), w: Math.abs(x + 1.85 - px), h: Math.abs(ly - py), flipV: ly < py, line: { color: MUTED, width: 0.75 } });
        txt(s, t, x + 1.9, ly - 0.11, 0.9, 0.22, { fontSize: 9, color: GRAPH, valign: "middle" });
      });
      txt(s, "Экранированный кабель", x + 0.15, 2.95, cw - 0.3, 0.25, { fontSize: 11.5, bold: true, color: NAVY });
      txt(s, "оплётка или фольга вокруг жил", x + 0.15, 3.22, cw - 0.3, 0.25, { fontSize: 9.5, color: MUTED });
    }
    // (в) экранированное помещение
    {
      const x = cx0(2);
      card(s, x, 1.4, cw, 2.2);
      const rx = x + 0.95, ry = 1.55, rw = 1.7, rh = 1.0;
      [-0.33, -0.11, 0.11, 0.33].forEach((d) => straightArrow(s, x + 0.15, ry + rh / 2 + d, rx - 0.04, CYAN, 1.5));
      s.addShape(pres.ShapeType.rect, { x: rx, y: ry, w: rw, h: rh, fill: { color: WHITE }, line: { color: TEAL, width: 3.5 } });
      [0.22, 0.6, 0.98].forEach((dx) => s.addShape(pres.ShapeType.roundRect, { x: rx + dx, y: ry + 0.25, w: 0.32, h: 0.55, rectRadius: 0.03, fill: { color: NAVY }, line: { color: NAVY, width: 0 } }));
      s.addShape(pres.ShapeType.rect, { x: rx + rw - 0.02, y: ry + 0.3, w: 0.06, h: 0.6, fill: { color: ICE }, line: { color: TEAL, width: 1 } });
      // заземление
      s.addShape(pres.ShapeType.line, { x: rx + 0.3, y: ry + rh, w: 0, h: 0.18, line: { color: GRAPH, width: 1.5 } });
      [[0.32, 0], [0.2, 0.05], [0.09, 0.1]].forEach(([w, dy]) => s.addShape(pres.ShapeType.line, { x: rx + 0.3 - w / 2, y: ry + rh + 0.18 + dy, w, h: 0, line: { color: GRAPH, width: 1.5 } }));
      txt(s, "Экранированное помещение", x + 0.15, 2.95, cw - 0.3, 0.25, { fontSize: 11.5, bold: true, color: NAVY });
      txt(s, "клетка Фарадея с заземлением", x + 0.15, 3.22, cw - 0.3, 0.25, { fontSize: 9.5, color: MUTED });
    }

    txt(s, "ОТ ЧЕГО ЗАВИСИТ ЭФФЕКТИВНОСТЬ", 0.5, 3.75, 5, 0.2, { fontSize: 9, bold: true, color: MUTED, charSpacing: 3 });
    const fac = [
      [ic.boltW, "Проводимость", "Cu, Al, сталь"],
      [ic.linkW, "Непрерывность", "без щелей и окон"],
      [ic.layersW, "Толщина", "особенно на НЧ"],
      [ic.toolsW, "Соединения", "швы, прокладки"],
      [ic.groundW, "Заземление", "отвод зарядов"],
    ];
    fac.forEach(([img, t, sub], i) => {
      const x = 0.5 + i * 1.83;
      card(s, x, 4.05, 1.68, 1.05);
      circleIcon(s, img, x + 0.35, 4.38, 0.4, NAVY);
      txt(s, t, x + 0.15, 4.64, 1.45, 0.22, { fontSize: 11, bold: true, color: NAVY });
      txt(s, sub, x + 0.15, 4.86, 1.45, 0.2, { fontSize: 9, color: MUTED });
    });
  }

  // =================================================================
  // СЛАЙД 5. Почему магнитное поле сложнее
  // =================================================================
  {
    const s = baseSlide("МАГНИТНОЕ ПОЛЕ", "Почему магнитное поле экранировать сложнее",
      "Почему же магнитное поле экранировать сложнее? Слева показан обычный немагнитный материал — например, алюминий, медь или пластик. " +
      "Для постоянного и низкочастотного магнитного поля такой материал почти прозрачен: силовые линии проходят сквозь него практически без искажений. " +
      "Справа — материал с высокой магнитной проницаемостью. Магнитный поток как бы предпочитает идти именно по нему, потому что сопротивление магнитному потоку в таком материале намного меньше, чем в воздухе. " +
      "Линии втягиваются в пластину и концентрируются внутри неё. Именно это свойство и используют для экранирования. " +
      "Главная трудность связана с низкими частотами: вихревые токи в обычном проводнике при этом слабы, и тонкий металлический экран не помогает. " +
      "Поэтому применяют специальные магнитомягкие материалы — те, которые легко намагничиваются и размагничиваются. О них — на следующем слайде."
    );
    const panels = [
      { x: 0.5, title: "Обычный материал", sub: "μ ≈ 1: алюминий, медь, пластик — поле проходит насквозь", magnetic: false },
      { x: 5.2, title: "Материал с высокой μ", sub: "μ ≫ 1: пермаллой, электротехническая сталь — поток втягивается", magnetic: true },
    ];
    panels.forEach((p) => {
      card(s, p.x, 1.4, 4.3, 2.75);
      txt(s, p.title, p.x + 0.2, 1.52, 3.9, 0.28, { fontSize: 13, bold: true, color: NAVY });
      txt(s, p.sub, p.x + 0.2, 1.8, 3.9, 0.22, { fontSize: 10, color: MUTED });
      const yc = 3.2, x1 = p.x + 1.35, x2 = p.x + 2.95, xs = p.x + 0.15, xe = p.x + 4.15;
      s.addShape(pres.ShapeType.rect, {
        x: x1, y: yc - 0.25, w: x2 - x1, h: 0.5,
        fill: { color: p.magnetic ? NAVY2 : "DDE4EC" }, line: { color: p.magnetic ? NAVY : "9AA8B8", width: 1 },
      });
      const ds = [-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8];
      ds.forEach((d) => {
        const pts = [];
        for (let i = 0; i <= 60; i++) {
          const x = xs + (xe - xs) * (i / 60);
          let y = yc + d;
          if (p.magnetic) {
            const g = smooth((x - (x1 - 0.85)) / 0.85) - smooth((x - x2) / 0.85);
            y = yc + d * (1 - 0.76 * g);
          }
          pts.push([x, y]);
        }
        fieldLine(s, pts, p.magnetic ? CYAN : "5CC3D9", 1.25, [0.13, 0.9]);
      });
    });
    const pts3 = [
      [ic.waveW, "Поле проникает", "магнитное поле проходит через многие материалы"],
      [ic.atomW, "Сложнее на НЧ", "вихревые токи слабы — обычный экран не помогает"],
      [ic.magnetW, "Магнитомягкие материалы", "высокая проницаемость направляет поток"],
    ];
    pts3.forEach(([img, t, sub], i) => {
      const x = 0.5 + i * 3.05;
      card(s, x, 4.3, 2.9, 0.82);
      circleIcon(s, img, x + 0.4, 4.71, 0.44, i === 2 ? TEAL : NAVY);
      txt(s, t, x + 0.75, 4.38, 2.1, 0.22, { fontSize: 10.5, bold: true, color: NAVY });
      txt(s, sub, x + 0.75, 4.6, 2.1, 0.45, { fontSize: 8.5, color: MUTED });
    });
  }

  // =================================================================
  // СЛАЙД 6. Экранирование магнитного поля
  // =================================================================
  {
    const s = baseSlide("МАГНИТНОЕ ПОЛЕ", "Экранирование магнитного поля",
      "Принцип магнитного экранирования — не «остановить» поле, а перенаправить магнитный поток. Экран делают в виде замкнутой оболочки из материала с высокой магнитной проницаемостью. " +
      "Посмотрите на схему: силовые линии втягиваются в стенки экрана, идут по ним в обход защищаемой области и выходят с другой стороны. Внутри поле сильно ослаблено. " +
      "Чем выше проницаемость и чем толще стенки, тем лучше эффект. " +
      "Самые известные материалы — пермаллой, сплав железа и никеля с очень высокой проницаемостью, и электротехническая сталь: она значительно дешевле и применяется гораздо чаще. " +
      "Для более сильного ослабления используют многослойные экраны — несколько оболочек, разделённых зазором. " +
      "На высоких частотах картина меняется: там на первый план выходят вихревые токи, и хорошо помогают проводящие экраны из меди и алюминия. " +
      "И ещё одна практическая деталь: пермаллой чувствителен к ударам и деформациям, после них его свойства ухудшаются. Теперь сравним оба вида экранирования."
    );
    card(s, 0.5, 1.4, 5.6, 3.7);
    const cx = 3.3, cy = 3.0, sw = 1.2, sh = 0.85, wall = 0.2; // sw, sh — полуразмеры оболочки
    const X = (x) => cx + (x - 3.3);
    // оболочка
    s.addShape(pres.ShapeType.rect, { x: cx - sw, y: cy - sh, w: sw * 2, h: sh * 2, fill: { color: NAVY2 }, line: { color: NAVY, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x: cx - sw + wall, y: cy - sh + wall, w: sw * 2 - wall * 2, h: sh * 2 - wall * 2, fill: { color: "EAF6FA" }, line: { color: "EAF6FA", width: 0 } });
    s.addImage({ data: ic.micro, x: cx - 0.2, y: cy - 0.32, w: 0.4, h: 0.3 });
    txt(s, "Защищаемая область", cx - 0.85, cy + 0.02, 1.7, 0.2, { fontSize: 9, bold: true, color: NAVY, align: "center" });
    txt(s, "B ≈ 0", cx - 0.85, cy + 0.22, 1.7, 0.2, { fontSize: 9, color: TEAL, align: "center" });
    // силовые линии
    const ysU = [cy - 1.35, cy - 1.05, cy - 0.75];
    const yT = [cy - sh + 0.04, cy - sh + 0.1, cy - sh + 0.16];
    ysU.forEach((ys, i) => {
      const t = yT[i], m = (a) => 6.6 - a; // зеркально относительно центра (x)
      const up = [[0.8, ys], [1.55, ys + (t - ys) * 0.25], [2.05, ys + (t - ys) * 0.85], [2.4, t], [3.3, t], [4.2, t], [m(2.05), ys + (t - ys) * 0.85], [m(1.55), ys + (t - ys) * 0.25], [m(0.8), ys]];
      const pu = catmull(up);
      fieldLine(s, pu, CYAN, 1.5, [0.14, 0.9]);
      const lo = up.map(([x, y]) => [x, 2 * cy - y]);
      fieldLine(s, catmull(lo), CYAN, 1.5, [0.14, 0.9]);
    });
    [cy - 0.22, cy + 0.22].forEach((y) => {
      straightArrow(s, 0.8, y, cx - sw + 0.02, CYAN, 1.5);
      straightArrow(s, cx + sw, y, 5.8, CYAN, 1.5);
    });
    txt(s, "внешнее поле", 0.7, 1.5, 1.4, 0.2, { fontSize: 9, color: MUTED });
    txt(s, "Поток идёт по стенкам экрана и огибает область", 0.7, 4.62, 5.2, 0.3, { fontSize: 10.5, color: NAVY, bold: true, align: "left" });

    const items = [
      [ic.magnetW, "Высокая проницаемость μ", "поток «втягивается» в стенки"],
      [ic.atomW, "Пермаллой", "сплав Fe–Ni, μ до 10⁵"],
      [ic.cubeW, "Электротехническая сталь", "дешевле, μ порядка 10³–10⁴"],
      [ic.layersW, "Многослойные экраны", "слои с зазором усиливают эффект"],
      [ic.waveW, "Высокие частоты", "работают вихревые токи: Cu, Al"],
    ];
    items.forEach(([img, t, sub], i) => {
      const y = 1.4 + i * 0.745;
      card(s, 6.35, y, 3.15, 0.67);
      circleIcon(s, img, 6.7, y + 0.335, 0.4, i === 4 ? TEAL : NAVY);
      txt(s, t, 7.05, y + 0.1, 2.4, 0.24, { fontSize: 11, bold: true, color: NAVY });
      txt(s, sub, 7.05, y + 0.35, 2.4, 0.22, { fontSize: 9, color: MUTED });
    });
  }

  // =================================================================
  // СЛАЙД 7. Сравнение
  // =================================================================
  {
    const s = baseSlide("СРАВНЕНИЕ", "Электрическое и магнитное экранирование",
      "Давайте сведём всё в одно сравнение. Слева — электрическое поле. Для него применяют проводящие материалы, механизм защиты — перераспределение зарядов, задача решается сравнительно проще, а главное требование — непрерывность экрана. " +
      "Справа — магнитное поле. Здесь нужны магнитомягкие материалы, механизм — перенаправление магнитного потока, а задача особенно сложна на низких частотах. Ключевой параметр здесь — магнитная проницаемость. " +
      "Точки в средней строке условно показывают сложность: у электрического поля их две из пяти, у магнитного — четыре. " +
      "Обратите внимание: это разные физические механизмы, поэтому один и тот же экран не всегда защищает от обоих полей. " +
      "Тонкая медная фольга хорошо ослабит электрическое поле, но почти никак не повлияет на низкочастотное магнитное. " +
      "Поэтому при проектировании защиты сначала определяют, какое поле и на какой частоте нужно ослабить. А как понять, насколько хорошо экран справляется со своей задачей? Для этого вводят количественную меру."
    );
    const lx = 0.5, rx = 5.75, cwid = 3.75;
    const head = (x, fill, img, t) => {
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.4, w: cwid, h: 0.62, rectRadius: 0.08, fill: { color: fill }, line: { color: fill, width: 0 }, shadow: shadow() });
      s.addImage({ data: img, x: x + 0.22, y: 1.58, w: 0.26, h: 0.26 });
      txt(s, t, x + 0.62, 1.4, cwid - 0.7, 0.62, { fontSize: 13, bold: true, color: WHITE, valign: "middle", charSpacing: 1.5 });
    };
    head(lx, NAVY, ic.boltW, "ЭЛЕКТРИЧЕСКОЕ ПОЛЕ");
    head(rx, TEAL, ic.magnetW, "МАГНИТНОЕ ПОЛЕ");
    const rows = [
      ["МАТЕРИАЛ", "Проводящие материалы", "Магнитомягкие материалы", null],
      ["МЕХАНИЗМ", "Перераспределение зарядов", "Перенаправление магнитного потока", null],
      ["СЛОЖНОСТЬ", "Сравнительно проще", "Особенно сложно на низких частотах", [2, 4]],
      ["КЛЮЧЕВОЕ", "Непрерывность экрана", "Магнитная проницаемость μ", null],
    ];
    rows.forEach(([lab, a, b, dots], i) => {
      const y = 2.15 + i * 0.75;
      txt(s, lab, 4.3, y, 1.4, 0.65, { fontSize: 8.5, bold: true, color: MUTED, align: "center", valign: "middle", charSpacing: 1.5 });
      [[lx, a, NAVY, dots && dots[0]], [rx, b, TEAL, dots && dots[1]]].forEach(([x, t, col, n]) => {
        card(s, x, y, cwid, 0.65);
        txt(s, t, x + 0.2, y, n ? cwid - 1.35 : cwid - 0.4, 0.65, { fontSize: 11.5, bold: true, color: NAVY, valign: "middle" });
        if (n) {
          for (let k = 0; k < 5; k++) {
            s.addShape(pres.ShapeType.ellipse, {
              x: x + cwid - 1.05 + k * 0.19, y: y + 0.26, w: 0.13, h: 0.13,
              fill: { color: k < n ? col : "D5DEE7" }, line: { color: k < n ? col : "D5DEE7", width: 0 },
            });
          }
        }
      });
    });
    // центральная плашка vs
    s.addShape(pres.ShapeType.ellipse, { x: 4.72, y: 1.47, w: 0.56, h: 0.48, fill: { color: WHITE }, line: { color: LINE, width: 1 } });
    txt(s, "vs", 4.72, 1.47, 0.56, 0.48, { fontSize: 11, bold: true, color: NAVY, align: "center", valign: "middle" });
  }

  // =================================================================
  // СЛАЙД 8. Эффективность экранирования
  // =================================================================
  {
    const s = baseSlide("КОЛИЧЕСТВЕННАЯ ОЦЕНКА", "Эффективность экранирования",
      "Эффективность экранирования обозначают буквами SE — от английского shielding effectiveness. Она показывает, во сколько раз экран ослабляет поле, и выражается в децибелах. " +
      "Формула на слайде: SE равно двадцати десятичным логарифмам отношения E нулевое к E первое. E нулевое — напряжённость поля в точке без экрана, E первое — в той же точке, но при наличии экрана. " +
      "Для магнитного поля используется такая же формула, только вместо E подставляют напряжённость магнитного поля H. " +
      "Чем больше SE, тем сильнее ослабление. Для запоминания: 20 децибел — это ослабление амплитуды в 10 раз, 40 децибел — в 100 раз, 60 децибел — в 1000 раз. Каждые лишние 20 децибел дают ещё десятикратное ослабление. " +
      "На диаграмме справа показан пример: без экрана уровень поля условно равен ста единицам, за экраном — десяти. Отношение десять, десятичный логарифм равен единице, умножаем на двадцать и получаем 20 децибел. " +
      "Теперь вернёмся к главной теме курса — защите информации, и посмотрим, где именно применяется всё сказанное."
    );
    s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 1.4, w: 5.4, h: 1.8, rectRadius: 0.1, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, shadow: shadow() });
    txt(s, "ЭФФЕКТИВНОСТЬ ЭКРАНИРОВАНИЯ, дБ", 0.5, 1.55, 5.4, 0.2, { fontSize: 9, bold: true, color: CYAN, align: "center", charSpacing: 3 });
    txt(s, [
      { text: "SE = 20 lg(E", options: { fontSize: 32, bold: true, color: WHITE } },
      { text: "0", options: { fontSize: 32, bold: true, color: WHITE, subscript: true } },
      { text: " / E", options: { fontSize: 32, bold: true, color: WHITE } },
      { text: "1", options: { fontSize: 32, bold: true, color: WHITE, subscript: true } },
      { text: ")", options: { fontSize: 32, bold: true, color: WHITE } },
    ], 0.5, 1.85, 5.4, 0.8, { align: "center", valign: "middle" });
    txt(s, [
      { text: "E", options: { color: CYAN, bold: true } }, { text: "0", options: { color: CYAN, bold: true, subscript: true } },
      { text: " — поле без экрана        ", options: { color: "C9D6E4" } },
      { text: "E", options: { color: CYAN, bold: true } }, { text: "1", options: { color: CYAN, bold: true, subscript: true } },
      { text: " — поле за экраном", options: { color: "C9D6E4" } },
    ], 0.5, 2.72, 5.4, 0.3, { fontSize: 11, align: "center", valign: "middle" });

    txt(s, "Чем выше SE, тем сильнее экран ослабляет поле", 0.5, 3.4, 5.4, 0.35, { fontSize: 14.5, bold: true, color: NAVY, valign: "middle" });
    [["20 дБ", "в 10 раз"], ["40 дБ", "в 100 раз"], ["60 дБ", "в 1000 раз"]].forEach(([a, b], i) => {
      const x = 0.5 + i * 1.85;
      card(s, x, 3.95, 1.7, 1.1);
      txt(s, a, x + 0.15, 4.05, 1.4, 0.45, { fontSize: 22, bold: true, color: i === 0 ? TEAL : NAVY, valign: "middle" });
      txt(s, "ослабление амплитуды", x + 0.15, 4.5, 1.45, 0.2, { fontSize: 8, color: MUTED });
      txt(s, b, x + 0.15, 4.7, 1.45, 0.25, { fontSize: 12, bold: true, color: GRAPH });
    });

    card(s, 6.2, 1.4, 3.3, 3.65);
    txt(s, "Уровень поля (отн. ед.)", 6.4, 1.52, 3.0, 0.25, { fontSize: 11, bold: true, color: NAVY });
    s.addChart(pres.charts.BAR, [
      { name: "Без экрана", labels: ["Без экрана", "За экраном"], values: [100, 0] },
      { name: "За экраном", labels: ["Без экрана", "За экраном"], values: [0, 10] },
    ], {
      x: 6.3, y: 1.85, w: 3.1, h: 2.55, barDir: "col", barGrouping: "stacked", barGapWidthPct: 45,
      chartColors: ["44546A", TEAL], showLegend: false, showTitle: false,
      showValue: true, dataLabelPosition: "ctr", dataLabelFontSize: 12, dataLabelFontBold: true, dataLabelColor: "FFFFFF",
      dataLabelFormatCode: "0;;;",
      valAxisHidden: true, valAxisMaxVal: 110, valAxisMinVal: 0,
      valGridLine: { style: "none" }, catGridLine: { style: "none" },
      catAxisLabelColor: GRAPH, catAxisLabelFontSize: 10, catAxisLabelFontFace: FONT,
      catAxisLineShow: true,
    });
    s.addShape(pres.ShapeType.roundRect, { x: 6.4, y: 4.5, w: 3.1 - 0.2, h: 0.4, rectRadius: 0.2, fill: { color: ICE }, line: { color: ICE, width: 0 } });
    txt(s, "SE = 20 lg(100 / 10) = 20 дБ", 6.4, 4.5, 2.9, 0.4, { fontSize: 11, bold: true, color: NAVY, align: "center", valign: "middle" });
  }

  // =================================================================
  // СЛАЙД 9. Экранирование в защите информации
  // =================================================================
  {
    const s = baseSlide("ПРИМЕНЕНИЕ", "Экранирование в защите информации",
      "Это один из ключевых слайдов. Посмотрите на схему объекта информатизации — места, где обрабатывается защищаемая информация. " +
      "Штриховой линией обозначена граница контролируемой зоны — территории, где доступ посторонних исключён или находится под контролем. " +
      "Внутри находится оборудование, которое создаёт информативные излучения, а вокруг него — экранированное помещение. Слева на схеме сигнал доходит до стенки, а за ней его уровень резко падает. " +
      "Справа за границей зоны условно показан злоумышленник с приёмной аппаратурой: до него сигнал либо не доходит, либо оказывается ниже уровня шума. " +
      "Задача экранирования — уменьшить возможность выхода информативного сигнала за контролируемую зону. " +
      "Справа перечислены основные средства: экранированные помещения, экранированные кабели, металлические корпуса, серверные шкафы. " +
      "Но экран сам по себе не работает: кабели питания и связи, входящие в помещение, могут вынести сигнал наружу, поэтому применяют фильтрацию и правильное заземление. Только комплекс мер даёт результат. " +
      "Посмотрим, как это выглядит в реальных конструкциях."
    );
    const zx = 0.5, zy = 1.4, zw = 4.55, zh = 3.0;
    card(s, zx, zy, 5.75, zh, { shadow: undefined, fill: { color: WHITE }, line: { color: LINE, width: 0.75 } });
    s.addShape(pres.ShapeType.roundRect, { x: zx + 0.1, y: zy + 0.1, w: zw, h: zh - 0.2, rectRadius: 0.1, fill: { type: "none" }, line: { color: "7C8CA0", width: 1.25, dashType: "dash" } });
    txt(s, "КОНТРОЛИРУЕМАЯ ЗОНА", zx + 0.3, zy + 0.2, 3, 0.2, { fontSize: 8.5, bold: true, color: MUTED, charSpacing: 2 });
    // экранированное помещение
    const rx = 0.85, ry = 1.95, rw = 2.5, rh = 2.0;
    s.addShape(pres.ShapeType.rect, { x: rx, y: ry, w: rw, h: rh, fill: { color: "EAF6FA" }, line: { color: TEAL, width: 4 } });
    txt(s, "Экранированное помещение", rx + 0.1, ry + 0.08, rw - 0.2, 0.2, { fontSize: 8.5, bold: true, color: TEAL, align: "left" });
    s.addShape(pres.ShapeType.ellipse, { x: rx + 0.35, y: ry + 0.75, w: 0.75, h: 0.75, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    s.addImage({ data: ic.serverW, x: rx + 0.55, y: ry + 0.95, w: 0.35, h: 0.35 });
    txt(s, "Объект информатизации", rx + 0.1, ry + 1.58, 1.6, 0.35, { fontSize: 8.5, bold: true, color: NAVY });
    // внутренние сигналы
    [ry + 0.85, ry + 1.12, ry + 1.39].forEach((y) => straightArrow(s, rx + 1.2, y, rx + rw - 0.07, CYAN, 1.5));
    // за стенкой
    [ry + 0.85, ry + 1.12, ry + 1.39].forEach((y) => s.addShape(pres.ShapeType.line, { x: rx + rw + 0.1, y, w: 0.35, h: 0, line: { color: "C7D2DE", width: 1, dashType: "dash" } }));
    txt(s, "сигнал ослаблен", rx + rw + 0.15, ry + 1.5, 0.9, 0.3, { fontSize: 8, color: MUTED, align: "left" });
    // ввод кабеля с фильтром и заземлением
    s.addShape(pres.ShapeType.line, { x: rx + 0.6, y: ry + rh, w: 0, h: 0.32, line: { color: GRAPH, width: 2 } });
    s.addShape(pres.ShapeType.roundRect, { x: rx + 0.4, y: ry + rh + 0.06, w: 0.4, h: 0.16, rectRadius: 0.03, fill: { color: WHITE }, line: { color: GRAPH, width: 1.25 } });
    txt(s, "фильтр", rx + 0.9, ry + rh + 0.03, 0.7, 0.22, { fontSize: 8, color: MUTED, valign: "middle" });
    // перехват за границей
    s.addShape(pres.ShapeType.ellipse, { x: 5.25, y: 2.55, w: 0.6, h: 0.6, fill: { color: GRAPH }, line: { color: GRAPH, width: 0 } });
    s.addImage({ data: ic.dish, x: 5.4, y: 2.7, w: 0.3, h: 0.3 });
    txt(s, "перехват", 5.05, 3.2, 1.0, 0.2, { fontSize: 8.5, color: GRAPH, bold: true, align: "center" });
    txt(s, "сигнал ниже шума", 4.95, 3.4, 1.2, 0.3, { fontSize: 8, color: MUTED, align: "center" });
    s.addShape(pres.ShapeType.ellipse, { x: 4.9, y: 2.62, w: 0.24, h: 0.24, fill: { color: WHITE }, line: { color: GRAPH, width: 1.25 } });
    txt(s, "✕", 4.9, 2.62, 0.24, 0.24, { fontSize: 9, bold: true, color: GRAPH, align: "center", valign: "middle" });

    const items = [
      [ic.buildW, "Экранированные помещения"],
      [ic.plugW, "Экранированные кабели"],
      [ic.cubeW, "Металлические корпуса"],
      [ic.serverW, "Серверные шкафы"],
      [ic.groundW, "Фильтрация и заземление"],
    ];
    items.forEach(([img, t], i) => {
      const y = 1.4 + i * 0.62;
      card(s, 6.5, y, 3.0, 0.53);
      circleIcon(s, img, 6.83, y + 0.265, 0.34, i === 4 ? TEAL : NAVY);
      txt(s, t, 7.15, y, 2.3, 0.53, { fontSize: 10.5, bold: true, color: NAVY, valign: "middle" });
    });
    s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 4.6, w: 9.0, h: 0.5, rectRadius: 0.08, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    txt(s, [
      { text: "Задача: ", options: { color: CYAN, bold: true } },
      { text: "уменьшить возможность выхода информативного сигнала за контролируемую зону", options: { color: WHITE } },
    ], 0.75, 4.6, 8.6, 0.5, { fontSize: 12, valign: "middle" });
  }

  // =================================================================
  // СЛАЙД 10. Практические примеры
  // =================================================================
  {
    const s = baseSlide("ПРАКТИКА", "Практические примеры",
      "Теперь несколько практических примеров. Первый — экранированный кабель. Оплётка и фольга вокруг жил снижают собственное излучение кабеля и защищают линию от внешних наводок. " +
      "Второй — металлический корпус компьютера или блока. Внутри него находится печатная плата, а сам корпус играет роль экрана. Эффективность в основном определяют швы, стыки и заземление. " +
      "Третий — экранированное помещение: стены из стали или металлической сетки, специальные двери с токопроводящими прокладками и фильтры на вводах кабелей. Такие помещения используют для обработки наиболее важной информации. " +
      "Четвёртый — серверный или телекоммуникационный шкаф с металлическими стенками и перфорированной дверью. Отверстия для вентиляции делают достаточно мелкими, чтобы они почти не ухудшали экранирование. " +
      "Во всех четырёх случаях принцип один: замкнутая проводящая оболочка плюс контроль всех отверстий, швов и вводов. Подведём итоги."
    );
    const cards = [
      [imgCable, "Экранированный кабель", "Оплётка и фольга снижают излучение и наводки."],
      [imgCase, "Металлический корпус", "Корпус ослабляет поля платы; важны швы и заземление."],
      [imgRoom, "Экранированное помещение", "Металлические стены и двери с контактными прокладками."],
      [imgRack, "Серверный шкаф", "Замкнутая конструкция с мелкой перфорацией."],
    ];
    cards.forEach(([img, t, sub], i) => {
      const x = 0.5 + i * 2.3;
      card(s, x, 1.4, 2.1, 3.15);
      s.addImage({ data: img, x: x + 0.1, y: 1.5, w: 1.9, h: 1.9 / 1.267 });
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.18, y: 1.58, w: 0.3, h: 0.3, fill: { color: NAVY }, line: { color: WHITE, width: 1 } });
      txt(s, String(i + 1), x + 0.18, 1.58, 0.3, 0.3, { fontSize: 10, bold: true, color: WHITE, align: "center", valign: "middle" });
      txt(s, t, x + 0.15, 3.15, 1.8, 0.5, { fontSize: 12, bold: true, color: NAVY });
      txt(s, sub, x + 0.15, 3.65, 1.8, 0.85, { fontSize: 10, color: MUTED });
    });
    s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 4.7, w: 9.0, h: 0.42, rectRadius: 0.08, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    txt(s, [
      { text: "Общий принцип: ", options: { color: CYAN, bold: true } },
      { text: "замкнутая проводящая оболочка + контроль отверстий, швов и вводов", options: { color: WHITE } },
    ], 0.75, 4.7, 8.6, 0.42, { fontSize: 12, valign: "middle" });
  }

  // =================================================================
  // СЛАЙД 11. Выводы
  // =================================================================
  {
    const s = pres.addSlide();
    pageNo += 1;
    s.background = { color: NAVY };
    txt(s, "ИТОГИ", 0.5, 0.36, 6, 0.22, { fontSize: 9, bold: true, color: CYAN, charSpacing: 3 });
    txt(s, "Выводы", 0.5, 0.6, 9, 0.6, { fontSize: 27, bold: true, color: WHITE, valign: "middle" });
    txt(s, "Физические основы защиты информации  ·  Семинар № 8", 0.5, 5.3, 6, 0.2, { fontSize: 8, color: "8FA6BF" });
    txt(s, String(pageNo).padStart(2, "0"), 8.5, 5.3, 1, 0.2, { fontSize: 8, color: "8FA6BF", align: "right", bold: true });
    const pts = [
      "Экранирование снижает уровень электромагнитных полей",
      "Электрические и магнитные поля требуют разных способов защиты",
      "Эффективность зависит от материала, частоты и конструкции",
      "Экранирование — один из физических способов защиты информации от технических каналов утечки",
    ];
    pts.forEach((t, i) => {
      const x = 0.5 + (i % 2) * 4.6, y = 1.35 + Math.floor(i / 2) * 1.2;
      s.addShape(pres.ShapeType.roundRect, { x, y, w: 4.4, h: 1.05, rectRadius: 0.08, fill: { color: NAVY2 }, line: { color: "24406B", width: 0.75 } });
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.18, y: y + 0.28, w: 0.48, h: 0.48, fill: { color: CYAN }, line: { color: CYAN, width: 0 } });
      txt(s, String(i + 1), x + 0.18, y + 0.28, 0.48, 0.48, { fontSize: 15, bold: true, color: NAVY, align: "center", valign: "middle" });
      txt(s, t, x + 0.85, y + 0.1, 3.4, 0.85, { fontSize: 12, color: WHITE, valign: "middle" });
    });
    s.addImage({ data: ic.shield, x: 0.5, y: 4.2, w: 0.5, h: 0.5 });
    txt(s, [
      { text: "Главная задача экрана — ", options: { color: WHITE } },
      { text: "не дать информативному сигналу выйти за пределы защищаемой области", options: { color: CYAN } },
    ], 1.2, 3.95, 8.3, 1.0, { fontSize: 20, bold: true, valign: "middle" });
    s.addNotes(
      "Подведём итоги. Первое: экранирование снижает уровень электромагнитных полей — как тех, что излучает само устройство, так и внешних. " +
      "Второе: электрические и магнитные поля требуют разных способов защиты. Для электрического поля подходят проводящие экраны, для низкочастотного магнитного — магнитомягкие материалы с высокой проницаемостью. " +
      "Третье: эффективность экрана зависит от материала, частоты поля и конструкции — от швов, отверстий, вводов кабелей и заземления. " +
      "И четвёртое: экранирование — один из физических способов защиты информации от технических каналов утечки. Применять его нужно вместе с фильтрацией, заземлением и организационными мерами. " +
      "Если сказать совсем коротко: главная задача экрана — не дать информативному сигналу выйти за пределы защищаемой области. " +
      "Спасибо за внимание, я готов ответить на ваши вопросы."
    );
  }

  await pres.writeFile({ fileName: OUT });
  console.log("saved", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
