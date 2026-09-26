const pptxgen = require('pptxgenjs');
const sharp = require('sharp');

const OR = 'FF6A1A', INK = '262321', INK2 = '6B635D', INK3 = 'A59C95', SOFT = 'FFF1E7', MID = 'FFD2B5',
  LINE = 'EDE6E0', WHITE = 'FFFFFF', CARD = '33302D', CARD2 = '423E3A', MUTE = 'B9B0A9', BAD = 'D93B2B', GOOD = '2F9A5A',
  BG9 = 'F7F3EF';
const F = 'Arial';

const P = {
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  megaphone: 'M3 10v4h3l7 4V6l-7 4H3z M16.5 9a4 4 0 0 1 0 6 M19.5 6a8 8 0 0 1 0 12',
  mute: 'M4 5h16v11H9l-5 4z M9 9l6 4 M15 9l-6 4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M11 18h2',
  call: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',
  bag: 'M5 8h14l-1 13H6z M9 8V6a3 3 0 0 1 6 0v2',
  scooter: 'M6 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M8.5 16.5H15l2-7h-4 M17 9.5 15 4h-3',
  bowl: 'M3 11h18a9 9 0 0 1-18 0z M8 7.5c0-1.5 1-2 1-3.5 M12 7.5c0-1.5 1-2 1-3.5 M16 7.5c0-1.5 1-2 1-3.5',
  db: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3z M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  filter: 'M3 4h18l-7 8.5V19l-4 2v-8.5z',
  chart: 'M3 3v18h18 M7 15l4-4 3 3 5-6',
  fork: 'M12 21v-6 M12 15 6 9V3 M12 15l6-6V3',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
  sms: 'M4 4h16v12H8l-4 4z M8 9h8 M8 12h5',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z M10 21h4',
  percent: 'M19 5 5 19 M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  plug: 'M9 2v6 M15 2v6 M6 8h12v3a6 6 0 0 1-12 0z M12 17v5',
  building: 'M4 21V5l8-3 8 3v16 M2 21h20 M9 9h1 M14 9h1 M9 13h1 M14 13h1 M10 21v-4h4v4',
  heart: 'M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11z',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7z',
  gift: 'M4 10h16v11H4z M2 6h20v4H2z M12 6v15 M12 6C10 2 7 3 8 6 M12 6c2-4 5-3 4 0',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M10 17V7h3a3 3 0 0 1 0 6H8 M8 15h5',
  image: 'M3 5h18v14H3z M3 16l5-5 5 5 3-3 5 5 M16 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  flag: 'M5 21V4 M5 4h13l-2 4 2 4H5',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  arrow: 'M4 12h15 M13 6l6 6-6 6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v6 M12 7.5v.5',
};
const cache = {};
async function icon(name, color) {
  const k = name + color;
  if (!cache[k]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256"><path d="${P[name]}" fill="none" stroke="#${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    cache[k] = 'image/png;base64,' + (await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64');
  }
  return cache[k];
}

(async () => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9'; // 10 x 5.625
  pres.title = 'Чат-бот в MAX для сбора обратной связи по заказам';
  const W = 10, H = 5.625;

  const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, fontFace: F, color: INK, margin: 0, valign: 'top' }, o));
  const eyebrow = (s, text, x, y, w) => T(s, text.toUpperCase(), { x, y, w: w || 5, h: 0.25, fontSize: 9, bold: true, color: OR, charSpacing: 2 });
  const rect = (s, x, y, w, h, fill, extra) => s.addShape(pres.shapes.RECTANGLE, Object.assign({ x, y, w, h, fill: { color: fill }, line: { type: 'none' } }, extra));
  const rrect = (s, x, y, w, h, fill, r, extra) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, Object.assign({ x, y, w, h, rectRadius: r || 0.12, fill: { color: fill }, line: { type: 'none' } }, extra));
  const circ = (s, x, y, d, fill, extra) => s.addShape(pres.shapes.OVAL, Object.assign({ x, y, w: d, h: d, fill: { color: fill }, line: { type: 'none' } }, extra));
  const img = async (s, name, color, x, y, d) => s.addImage({ data: await icon(name, color), x, y, w: d, h: d });
  const pageNo = (s, n, c) => T(s, String(n).padStart(2, '0') + ' / 12', { x: W - 1.2, y: H - 0.35, w: 1, h: 0.2, fontSize: 8, bold: true, color: c || INK3, align: 'right' });

  // ---------- 1. Титульный ----------
  {
    const s = pres.addSlide(); s.background = { color: WHITE };
    rect(s, 5.0, 0, 5.0, H, OR);
    eyebrow(s, 'Проект · обратная связь по заказам', 0.6, 0.75);
    T(s, [{ text: 'Чат-бот в ', options: {} }, { text: 'MAX', options: { color: OR } }, { text: '\nдля оценки заказов', options: {} }],
      { x: 0.6, y: 1.1, w: 4.2, h: 2.2, fontSize: 40, bold: true, lineSpacingMultiple: 0.95, valign: 'middle' });
    T(s, 'Слышим каждого клиента — автоматически', { x: 0.6, y: 3.45, w: 4.0, h: 0.7, fontSize: 18, color: INK });
    T(s, 'Для руководства компании  ·  2026', { x: 0.6, y: 4.5, w: 4, h: 0.3, fontSize: 10, color: INK2 });
    // bubbles
    rrect(s, 6.0, 1.2, 3.4, 1.15, WHITE, 0.18, { shadow: { type: 'outer', color: '7A2800', blur: 12, offset: 4, angle: 90, opacity: 0.25 } });
    T(s, 'Анна, как вам вчерашний заказ?', { x: 6.2, y: 1.35, w: 3.0, h: 0.3, fontSize: 12 });
    ['1', '2', '3', '4', '5★'].forEach((t, i) => {
      rrect(s, 6.2 + i * 0.61, 1.8, 0.54, 0.38, i === 4 ? OR : SOFT, 0.08);
      T(s, t, { x: 6.2 + i * 0.61, y: 1.8, w: 0.54, h: 0.38, fontSize: 11, bold: true, color: i === 4 ? WHITE : OR, align: 'center', valign: 'middle' });
    });
    rrect(s, 6.55, 2.55, 2.85, 0.52, INK, 0.18, { shadow: { type: 'outer', color: '7A2800', blur: 12, offset: 4, angle: 90, opacity: 0.25 } });
    T(s, '★★★★★ Всё горячее, спасибо!', { x: 6.7, y: 2.55, w: 2.6, h: 0.52, fontSize: 12, color: WHITE, valign: 'middle' });
    pageNo(s, 1, WHITE);
    s.addNotes('Добрый день. Сегодня я предлагаю проект, который поможет нам узнавать мнение каждого клиента о заказе без ручной работы операторов. Речь о чат-боте в мессенджере MAX, который сам собирает оценки и сразу сигнализирует о проблемах.');
  }

  // ---------- 2. Проблема ----------
  {
    const s = pres.addSlide(); s.background = { color: INK };
    eyebrow(s, 'Проблема', 0.6, 0.6);
    T(s, 'Мы узнаём о проблемах последними', { x: 0.6, y: 0.9, w: 3.7, h: 1.7, fontSize: 32, bold: true, color: WHITE, lineSpacingMultiple: 0.95 });
    rrect(s, 0.6, 3.55, 3.3, 1.45, CARD, 0.15);
    T(s, 'ОТЗЫВ НА КАРТАХ · ЧЕРЕЗ 3 ДНЯ', { x: 0.8, y: 3.7, w: 3, h: 0.2, fontSize: 8, bold: true, color: '8E857E', charSpacing: 1 });
    T(s, [{ text: '★★', options: { color: OR } }, { text: '★★★', options: { color: '5A544F' } }], { x: 0.8, y: 3.93, w: 3, h: 0.4, fontSize: 20 });
    T(s, '«Привезли холодное, курьер опоздал на 40 минут»', { x: 0.8, y: 4.38, w: 2.9, h: 0.5, fontSize: 11, color: 'D8D1CB' });
    const rows = [['mute', 'Клиенты молчат', 'Отзыв сами оставляют единицы'], ['megaphone', 'Негатив уходит наружу', 'Соцсети и карты вместо нас'], ['clock', 'Реагируем поздно', 'Клиент уже ушёл к конкуренту']];
    for (let i = 0; i < 3; i++) {
      const y = 1.2 + i * 1.12;
      circ(s, 4.7, y, 0.62, OR);
      await img(s, rows[i][0], WHITE, 4.85, y + 0.15, 0.32);
      T(s, rows[i][1], { x: 5.55, y: y + 0.02, w: 4, h: 0.32, fontSize: 17, bold: true, color: WHITE });
      T(s, rows[i][2], { x: 5.55, y: y + 0.34, w: 4, h: 0.28, fontSize: 13, color: MUTE });
      if (i < 2) s.addShape(pres.shapes.LINE, { x: 4.7, y: y + 0.9, w: 4.7, h: 0, line: { color: '3E3A36', width: 0.75 } });
    }
    pageNo(s, 2, '7D746E');
    s.addNotes('Довольные клиенты почти никогда не пишут отзывы сами, а недовольные чаще идут не к нам, а в соцсети и на карты. В итоге о проблеме мы узнаём через несколько дней, когда рейтинг уже просел, а клиент ушёл. У нас нет системного канала, который ловит недовольство раньше, чем оно становится публичным.');
  }

  // ---------- 3. Решение ----------
  {
    const s = pres.addSlide(); s.background = { color: WHITE };
    rect(s, 0, 0, 4.0, H, OR);
    T(s, 'Д+1', { x: 0.6, y: 1.35, w: 3.3, h: 1.6, fontSize: 96, bold: true, color: WHITE, valign: 'middle' });
    T(s, 'бот пишет клиенту на следующий день после заказа', { x: 0.6, y: 3.1, w: 2.9, h: 0.8, fontSize: 15, bold: true, color: WHITE });
    eyebrow(s, 'Решение', 4.6, 0.85);
    T(s, 'Мы спрашиваем первыми, клиенту остаётся нажать кнопку', { x: 4.6, y: 1.15, w: 4.9, h: 1.6, fontSize: 28, bold: true, lineSpacingMultiple: 0.95 });
    const st = [['bag', 'СЕГОДНЯ', 'Клиент получил заказ'], ['chat', 'ЗАВТРА', 'Бот в MAX пишет сам'], ['star', '1 КАСАНИЕ', 'Оценка от 1 до 5']];
    for (let i = 0; i < 3; i++) {
      const x = 4.6 + i * 1.75;
      rrect(s, x, 3.15, 0.55, 0.55, SOFT, 0.12);
      await img(s, st[i][0], OR, x + 0.13, 3.28, 0.29);
      T(s, st[i][1], { x, y: 3.85, w: 1.5, h: 0.2, fontSize: 8, bold: true, color: INK3, charSpacing: 1 });
      T(s, st[i][2], { x, y: 4.1, w: 1.35, h: 0.55, fontSize: 12, bold: true });
      if (i < 2) await img(s, 'arrow', MID, x + 1.25, 3.3, 0.25);
    }
    pageNo(s, 3);
    s.addNotes('Решение простое: на следующий день после доставки бот сам пишет клиенту в MAX и просит оценить заказ. Клиенту не нужно ничего искать или печатать — достаточно нажать одну кнопку со звёздами. Пауза в один день выбрана специально: впечатление ещё свежее, но сообщение не мешает самому заказу.');
  }

  // ---------- 4. Почему MAX ----------
  {
    const s = pres.addSlide(); s.background = { color: WHITE };
    rrect(s, 0.6, 0.6, 1.05, 1.05, INK, 0.25);
    T(s, 'MAX', { x: 0.6, y: 0.6, w: 1.05, h: 1.05, fontSize: 22, bold: true, color: WHITE, align: 'center', valign: 'middle' });
    eyebrow(s, 'Канал', 0.6, 1.95);
    T(s, 'Почему именно MAX', { x: 0.6, y: 2.25, w: 3.0, h: 1.7, fontSize: 34, bold: true, lineSpacingMultiple: 0.95 });
    rect(s, 4.0, 0, 6.0, H, SOFT);
    const tiles = [['flag', 'Национальный мессенджер', 'Аудитория быстро растёт'], ['phone', 'По номеру телефона', 'Пишем по номерам из нашей базы'],
      ['coin', 'Дешевле SMS', 'Сообщение стоит меньше, чем SMS'], ['image', 'Кнопки и картинки', 'Оценка в одно касание, фото блюд']];
    for (let i = 0; i < 4; i++) {
      const x = 4.0 + (i % 2) * 3.01, y = (i >> 1) * 2.825;
      rect(s, x, y, 2.99, 2.8, WHITE);
      await img(s, tiles[i][0], OR, x + 0.4, y + 0.6, 0.45);
      T(s, tiles[i][1], { x: x + 0.4, y: y + 1.2, w: 2.3, h: 0.6, fontSize: 16, bold: true, valign: 'bottom' });
      T(s, tiles[i][2], { x: x + 0.4, y: y + 1.9, w: 2.3, h: 0.5, fontSize: 12, color: INK2 });
    }
    pageNo(s, 4);
    s.addNotes('MAX — национальный мессенджер, и его аудитория быстро растёт, в том числе среди наших клиентов. Писать можно по номеру телефона, который у нас уже есть в базе заказов, а сообщение обходится дешевле SMS. Главное отличие от SMS — кнопки и картинки: клиент ставит оценку одним нажатием, а не отвечает текстом.');
  }

  // ---------- 5. Как это работает ----------
  {
    const s = pres.addSlide(); s.background = { color: WHITE };
    eyebrow(s, 'Как это работает', 0.6, 0.6);
    T(s, 'Пять шагов, без ручной работы', { x: 0.6, y: 0.9, w: 6, h: 0.65, fontSize: 32, bold: true });
    T(s, 'Запускается автоматически каждое утро', { x: 6.9, y: 1.05, w: 2.5, h: 0.5, fontSize: 12, color: INK2 });
    const cw = 1.8, y0 = 2.35, d = 0.72;
    s.addShape(pres.shapes.LINE, { x: 0.6 + d / 2, y: y0 + d / 2, w: cw * 4, h: 0, line: { color: MID, width: 2.5 } });
    const st = [['db', 'Выгрузка из CRM', 'Вчерашние доставленные заказы'], ['filter', 'Фильтрация', 'Без отказов от рассылок и повторов за неделю'],
      ['star', 'Сообщение в MAX', 'Кнопки ★1–5'], ['fork', 'Развилка', null], ['chart', 'CRM и дашборд', 'Оценка в карточке клиента']];
    for (let i = 0; i < 5; i++) {
      const x = 0.6 + i * cw, hl = i === 2;
      circ(s, x, y0, d, hl ? OR : WHITE, { line: { color: OR, width: 2.25 } });
      await img(s, st[i][0], hl ? WHITE : OR, x + 0.19, y0 + 0.19, 0.34);
      circ(s, x + 0.52, y0 - 0.06, 0.28, INK);
      T(s, String(i + 1), { x: x + 0.52, y: y0 - 0.06, w: 0.28, h: 0.28, fontSize: 9, bold: true, color: WHITE, align: 'center', valign: 'middle' });
      T(s, st[i][1], { x, y: y0 + 0.9, w: cw - 0.15, h: 0.5, fontSize: 13, bold: true });
      if (st[i][2]) T(s, st[i][2], { x, y: y0 + 1.42, w: cw - 0.2, h: 0.7, fontSize: 11, color: INK2 });
    }
    const fx = 0.6 + 3 * cw;
    rrect(s, fx, y0 + 1.42, 1.65, 0.48, 'E6F4EC', 0.08);
    T(s, '4–5 → «спасибо» и ссылка на карты', { x: fx + 0.08, y: y0 + 1.42, w: 1.5, h: 0.48, fontSize: 9, bold: true, color: '1F6E40', valign: 'middle' });
    rrect(s, fx, y0 + 1.98, 1.65, 0.48, 'FCE7E4', 0.08);
    T(s, '1–3 → уточнить причину', { x: fx + 0.08, y: y0 + 1.98, w: 1.5, h: 0.48, fontSize: 9, bold: true, color: 'A8281B', valign: 'middle' });
    pageNo(s, 5);
    s.addNotes('Каждое утро система забирает из CRM вчерашние доставленные заказы и убирает тех, кто отказался от сообщений или уже получал опрос недавно. Остальным бот отправляет сообщение с кнопками оценки, а дальше сценарий расходится: довольных благодарим и приглашаем оставить отзыв на картах, недовольных расспрашиваем о причине. Все ответы возвращаются в CRM и попадают на дашборд.');
  }

  // ---------- 6. Сценарий диалога ----------
  {
    const s = pres.addSlide(); s.background = { color: WHITE };
    eyebrow(s, 'Сценарий диалога', 0.6, 0.6);
    T(s, 'Коротко, по имени, с номером заказа', { x: 0.6, y: 0.9, w: 3.2, h: 2.0, fontSize: 30, bold: true, lineSpacingMultiple: 0.95 });
    [[GOOD, '5', 'Благодарим и зовём на карты'], [BAD, '2', 'Спрашиваем, что пошло не так']].forEach((r, i) => {
      circ(s, 0.6, 3.2 + i * 0.45, 0.3, r[0]);
      T(s, r[1], { x: 0.6, y: 3.2 + i * 0.45, w: 0.3, h: 0.3, fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle' });
      T(s, r[2], { x: 1.05, y: 3.2 + i * 0.45, w: 2.8, h: 0.3, fontSize: 12, valign: 'middle' });
    });
    rect(s, 4.0, 0, 6.0, H, OR);
    const phone = (x, name, num, sel, flow) => {
      const pw = 2.55, py = 0.3;
      rrect(s, x, py, pw, 5.6, INK, 0.3, { shadow: { type: 'outer', color: '501900', blur: 14, offset: 5, angle: 90, opacity: 0.35 } });
      rrect(s, x + 0.09, py + 0.09, pw - 0.18, 5.5, 'F6F2EE', 0.24);
      rect(s, x + 0.09, py + 0.35, pw - 0.18, 0.35, WHITE);
      rrect(s, x + 0.09, py + 0.09, pw - 0.18, 0.5, WHITE, 0.24);
      circ(s, x + 0.22, py + 0.2, 0.36, OR);
      T(s, 'Е', { x: x + 0.22, y: py + 0.2, w: 0.36, h: 0.36, fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle' });
      T(s, 'Еда рядом · бот', { x: x + 0.66, y: py + 0.2, w: 1.7, h: 0.2, fontSize: 10, bold: true });
      T(s, 'в сети', { x: x + 0.66, y: py + 0.4, w: 1.7, h: 0.16, fontSize: 8, bold: true, color: GOOD });
      const ix = x + 0.2, iw = pw - 0.4;
      let y = py + 0.95;
      const bub = (text, h, me) => {
        const bw = me ? 0.75 : iw * 0.92, bx = me ? ix + iw - bw : ix;
        rrect(s, bx, y, bw, h, me ? OR : WHITE, 0.1);
        T(s, text, { x: bx + 0.1, y, w: bw - 0.2, h, fontSize: 8.5, color: me ? WHITE : INK, bold: !!me, valign: 'middle', align: me ? 'center' : 'left' });
        y += h + 0.1;
      };
      bub([{ text: `Здравствуйте, ${name}! Вчера мы привезли ваш заказ ` }, { text: num, options: { bold: true } }, { text: '. Оцените его, пожалуйста:' }], 0.72);
      const kw = (iw - 0.16) / 5;
      ['1', '2', '3', '4', '5'].forEach((t, i) => {
        const on = i + 1 === sel;
        rrect(s, ix + i * (kw + 0.04), y, kw, 0.26, on ? OR : WHITE, 0.05, { line: { color: on ? OR : MID, width: 0.75 } });
        T(s, on ? t + '★' : t, { x: ix + i * (kw + 0.04), y, w: kw, h: 0.26, fontSize: 8, bold: true, color: on ? WHITE : OR, align: 'center', valign: 'middle' });
      });
      y += 0.36;
      bub('★'.repeat(sel), 0.3, true);
      flow(ix, iw, () => y, v => { y = v; }, bub);
    };
    phone(4.35, 'Анна', '№48213', 5, (ix, iw, gy, sy, bub) => {
      bub('Спасибо, Анна! Рады, что всё понравилось. Поделитесь впечатлением на картах?', 0.62);
      const y = gy();
      rrect(s, ix, y, iw, 0.3, INK, 0.06);
      T(s, 'Оставить отзыв', { x: ix, y, w: iw, h: 0.3, fontSize: 8.5, bold: true, color: WHITE, align: 'center', valign: 'middle' });
    });
    phone(7.15, 'Олег', '№48377', 2, (ix, iw, gy, sy, bub) => {
      bub('Жаль, что так вышло. Что пошло не так?', 0.42);
      let y = gy();
      const kw = (iw - 0.05) / 2;
      ['Еда', 'Время', 'Курьер', 'Комплектация'].forEach((t, i) => {
        const x = ix + (i % 2) * (kw + 0.05), yy = y + (i >> 1) * 0.31;
        rrect(s, x, yy, kw, 0.26, WHITE, 0.05, { line: { color: MID, width: 0.75 } });
        T(s, t, { x, y: yy, w: kw, h: 0.26, fontSize: 8, bold: true, color: OR, align: 'center', valign: 'middle' });
      });
      sy(y + 0.72);
      bub('Спасибо! Менеджер свяжется с вами сегодня.', 0.42);
    });
    s.addNotes('Так выглядит диалог глазами клиента: бот обращается по имени и называет номер заказа, поэтому сообщение не похоже на спам. При оценке 5 бот благодарит и предлагает оставить отзыв на картах. При оценке 2 он уточняет причину кнопками и обещает связь с менеджером. Название бота и тексты здесь условные, их доработаем с маркетингом.');
  }

  // ---------- 7. Работа с негативом ----------
  {
    const s = pres.addSlide(); s.background = { color: INK };
    eyebrow(s, 'Работа с негативом', 0.6, 0.6);
    T(s, [{ text: '1–3' }, { text: '★', options: { fontSize: 44 } }], { x: 0.6, y: 0.85, w: 3.4, h: 1.3, fontSize: 80, bold: true, color: OR, valign: 'middle' });
    T(s, 'Каждая плохая оценка сразу попадает к менеджеру', { x: 0.6, y: 2.35, w: 3.2, h: 2.0, fontSize: 26, bold: true, color: WHITE, lineSpacingMultiple: 0.95 });
    const X = 4.3, CW = 5.1;
    rrect(s, X, 0.9, CW, 1.45, CARD, 0.15);
    rrect(s, X + 0.2, 1.08, 0.42, 0.42, OR, 0.08); await img(s, 'chat', WHITE, X + 0.29, 1.17, 0.24);
    T(s, 'БОТ УТОЧНЯЕТ', { x: X + 0.8, y: 1.08, w: 3, h: 0.18, fontSize: 8, bold: true, color: '8E857E', charSpacing: 1 });
    T(s, 'Что пошло не так?', { x: X + 0.8, y: 1.26, w: 4, h: 0.3, fontSize: 15, bold: true, color: WHITE });
    const rs = [['bowl', 'Еда'], ['clock', 'Время'], ['scooter', 'Курьер'], ['box', 'Комплектация']], rw = [0.8, 0.95, 1.0, 1.7];
    let rx = X + 0.2;
    for (let i = 0; i < 4; i++) {
      rrect(s, rx, 1.7, rw[i], 0.42, CARD2, 0.08);
      await img(s, rs[i][0], OR, rx + 0.1, 1.79, 0.24);
      T(s, rs[i][1], { x: rx + 0.4, y: 1.7, w: rw[i] - 0.45, h: 0.42, fontSize: 11, bold: true, color: WHITE, valign: 'middle' });
      rx += rw[i] + 0.08;
    }
    rrect(s, X, 2.5, CW, 0.8, OR, 0.15);
    rrect(s, X + 0.2, 2.69, 0.42, 0.42, WHITE, 0.08); await img(s, 'bell', OR, X + 0.29, 2.78, 0.24);
    T(s, 'МГНОВЕННО', { x: X + 0.8, y: 2.66, w: 3, h: 0.18, fontSize: 8, bold: true, color: 'FFE3D2', charSpacing: 1 });
    T(s, 'Уведомление менеджеру филиала', { x: X + 0.8, y: 2.84, w: 4.2, h: 0.3, fontSize: 15, bold: true, color: WHITE });
    const hw = (CW - 0.15) / 2;
    const cards = [['call', 'В ТОТ ЖЕ ДЕНЬ', 'Звонок клиенту'], ['gift', 'ПО СИТУАЦИИ', 'Компенсация']];
    for (let i = 0; i < 2; i++) {
      const x = X + i * (hw + 0.15);
      rrect(s, x, 3.45, hw, 0.95, CARD, 0.15);
      rrect(s, x + 0.2, 3.71, 0.42, 0.42, OR, 0.08); await img(s, cards[i][0], WHITE, x + 0.29, 3.8, 0.24);
      T(s, cards[i][1], { x: x + 0.8, y: 3.68, w: 1.6, h: 0.18, fontSize: 8, bold: true, color: '8E857E', charSpacing: 1 });
      T(s, cards[i][2], { x: x + 0.8, y: 3.86, w: hw - 0.9, h: 0.3, fontSize: 14, bold: true, color: WHITE });
    }
    pageNo(s, 7, '7D746E');
    s.addNotes('Самое ценное в проекте — работа с негативом. Если клиент ставит от 1 до 3 звёзд, бот уточняет причину, а менеджер филиала сразу получает уведомление с номером заказа и ответом. Дальше мы звоним клиенту или предлагаем компенсацию, пока он ещё не написал отзыв на картах.');
  }

  // ---------- 8. Информирование ----------
  {
    const s = pres.addSlide(); s.background = { color: WHITE };
    circ(s, 7.7, -0.9, 2.8, SOFT);
    eyebrow(s, 'Больше, чем опрос', 0.6, 0.75);
    T(s, 'Тот же бот держит клиента в курсе', { x: 0.6, y: 1.05, w: 8.5, h: 0.65, fontSize: 32, bold: true });
    const cols = [['scooter', 'Статус заказа', 'Заказ №48213 уже у курьера, будет через 25 минут'], ['percent', 'Акции', 'В пятницу вторая пицца за полцены'], ['bell', 'Напоминания', 'Ваши бонусы сгорают через 3 дня']];
    const cw = 2.75;
    for (let i = 0; i < 3; i++) {
      const x = 0.6 + i * (cw + 0.3);
      s.addShape(pres.shapes.LINE, { x, y: 2.15, w: cw, h: 0, line: { color: OR, width: 3.5 } });
      rrect(s, x, 2.45, 0.55, 0.55, SOFT, 0.12); await img(s, cols[i][0], OR, x + 0.13, 2.58, 0.29);
      T(s, cols[i][1], { x: x + 0.72, y: 2.45, w: 2, h: 0.55, fontSize: 17, bold: true, valign: 'middle' });
      rrect(s, x, 3.2, cw, 0.8, SOFT, 0.14);
      T(s, cols[i][2], { x: x + 0.18, y: 3.2, w: cw - 0.36, h: 0.8, fontSize: 12, valign: 'middle' });
    }
    const bx = 0.6 + cw + 0.3;
    rrect(s, bx, 4.18, 2.35, 0.34, INK, 0.17);
    await img(s, 'shield', WHITE, bx + 0.12, 4.24, 0.22);
    T(s, 'Только с согласия клиента', { x: bx + 0.4, y: 4.18, w: 1.9, h: 0.34, fontSize: 9.5, bold: true, color: WHITE, valign: 'middle' });
    pageNo(s, 8);
    s.addNotes('Раз канал уже подключён, его можно использовать шире, чем для опросов. Бот может сообщать статус заказа, напоминать о бонусах и рассказывать об акциях. Рекламные сообщения отправляем только тем, кто дал на это отдельное согласие, чтобы не превратить канал в спам.');
  }

  // ---------- 9. Аналитика ----------
  {
    const s = pres.addSlide(); s.background = { color: BG9 };
    eyebrow(s, 'Аналитика', 0.5, 0.35);
    T(s, 'Дашборд качества за неделю', { x: 0.5, y: 0.6, w: 6.5, h: 0.55, fontSize: 28, bold: true });
    rrect(s, 7.75, 0.72, 1.75, 0.3, BG9, 0.15, { line: { color: INK3, width: 0.75, dashType: 'dash' } });
    T(s, 'ПРИМЕР · ДЕМО-ДАННЫЕ', { x: 7.75, y: 0.72, w: 1.75, h: 0.3, fontSize: 7.5, bold: true, color: INK2, align: 'center', valign: 'middle', charSpacing: 1 });
    const k = [['Средняя оценка', '4,6', '▲ 0,1 к прошлой неделе', GOOD], ['Доля негатива (1–3★)', '9%', '▲ 1 п.п. к прошлой неделе', BAD], ['Получено оценок', '1 240', '▲ 12%', GOOD], ['Ответили на опрос', '31%', 'от отправленных', INK2]];
    const kw = (9 - 0.36) / 4;
    k.forEach((r, i) => {
      const x = 0.5 + i * (kw + 0.12);
      rrect(s, x, 1.3, kw, 0.95, WHITE, 0.12);
      T(s, r[0], { x: x + 0.16, y: 1.4, w: kw - 0.3, h: 0.2, fontSize: 9, color: INK2 });
      T(s, r[1], { x: x + 0.16, y: 1.6, w: kw - 0.3, h: 0.4, fontSize: 22, bold: true });
      T(s, r[2], { x: x + 0.16, y: 2.0, w: kw - 0.3, h: 0.18, fontSize: 8, bold: true, color: r[3] });
    });
    const py = 2.42, ph = 2.9;
    // line chart
    rrect(s, 0.5, py, 3.5, ph, WHITE, 0.12);
    T(s, 'Средняя оценка по дням', { x: 0.66, y: py + 0.14, w: 3, h: 0.22, fontSize: 10, bold: true });
    s.addChart(pres.charts.LINE, [{ name: 'Средняя оценка', labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], values: [4.5, 4.6, 4.4, 4.7, 4.3, 4.6, 4.8] }], {
      x: 0.55, y: py + 0.42, w: 3.4, h: ph - 0.5, chartColors: [OR], lineSize: 2.5, lineDataSymbol: 'circle', lineDataSymbolSize: 6,
      valAxisMinVal: 4, valAxisMaxVal: 5, valAxisMajorUnit: 0.5, valAxisLabelFormatCode: '0.0',
      valAxisLabelColor: INK2, catAxisLabelColor: INK2, valAxisLabelFontSize: 8, catAxisLabelFontSize: 8, valAxisLabelFontFace: F, catAxisLabelFontFace: F,
      valGridLine: { color: LINE, size: 0.75 }, catGridLine: { style: 'none' }, catAxisLineShow: false, valAxisLineShow: false,
      showLegend: false, showValue: true, dataLabelPosition: 't', dataLabelFontSize: 7, dataLabelColor: INK2, dataLabelFormatCode: '0.0',
    });
    // filials + couriers
    const x2 = 4.12, w2 = 2.6;
    rrect(s, x2, py, w2, ph, WHITE, 0.12);
    T(s, 'По филиалам', { x: x2 + 0.16, y: py + 0.14, w: 2, h: 0.22, fontSize: 10, bold: true });
    s.addChart(pres.charts.BAR, [{ name: 'Оценка', labels: ['Центр', 'Север', 'Запад', 'Юг'], values: [4.7, 4.6, 4.4, 4.1] }], {
      x: x2 + 0.05, y: py + 0.36, w: w2 - 0.1, h: 1.3, barDir: 'bar', chartColors: [OR], barGapWidthPct: 60, catAxisOrientation: 'maxMin',
      valAxisMinVal: 0, valAxisMaxVal: 5, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, catAxisLineShow: false,
      catAxisLabelColor: INK2, catAxisLabelFontSize: 8, catAxisLabelFontFace: F, showLegend: false,
      showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 8, dataLabelColor: INK, dataLabelFontBold: true, dataLabelFormatCode: '0.0',
    });
    T(s, 'КУРЬЕРЫ', { x: x2 + 0.16, y: py + 1.72, w: 2, h: 0.18, fontSize: 7.5, bold: true, color: INK3, charSpacing: 1 });
    [['Иван К.', '4,9', INK], ['Олег С.', '4,8', INK], ['Дмитрий П. · внимание', '3,6', BAD]].forEach((r, i) => {
      const y = py + 1.95 + i * 0.28;
      T(s, r[0], { x: x2 + 0.16, y, w: 1.8, h: 0.26, fontSize: 9, valign: 'middle' });
      T(s, r[1], { x: x2 + w2 - 0.66, y, w: 0.5, h: 0.26, fontSize: 9, bold: true, color: r[2], align: 'right', valign: 'middle' });
      if (i < 2) s.addShape(pres.shapes.LINE, { x: x2 + 0.16, y: y + 0.27, w: w2 - 0.32, h: 0, line: { color: LINE, width: 0.75 } });
    });
    // reasons
    const x3 = 6.84, w3 = 2.66;
    rrect(s, x3, py, w3, ph, WHITE, 0.12);
    T(s, 'Топ причин недовольства', { x: x3 + 0.16, y: py + 0.14, w: 2.4, h: 0.22, fontSize: 10, bold: true });
    s.addChart(pres.charts.BAR, [{ name: 'Доля', labels: ['Время', 'Еда', 'Комплектация', 'Курьер'], values: [0.41, 0.27, 0.19, 0.13] }], {
      x: x3 + 0.05, y: py + 0.36, w: w3 - 0.1, h: 1.9, barDir: 'bar', chartColors: [OR], barGapWidthPct: 60, catAxisOrientation: 'maxMin',
      valAxisMinVal: 0, valAxisMaxVal: 0.5, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, catAxisLineShow: false,
      catAxisLabelColor: INK2, catAxisLabelFontSize: 8, catAxisLabelFontFace: F, showLegend: false,
      showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 8, dataLabelColor: INK, dataLabelFontBold: true, dataLabelFormatCode: '0%',
    });
    T(s, 'Доля от всех оценок 1–3★ за неделю', { x: x3 + 0.16, y: py + ph - 0.42, w: 2.4, h: 0.25, fontSize: 8.5, color: INK2 });
    pageNo(s, 9);
    s.addNotes('Все оценки собираются в дашборд, где видно среднюю оценку по дням, филиалам и курьерам, долю негатива и главные причины недовольства. Цифры на слайде демонстрационные, они показывают формат отчёта. На таком дашборде сразу видно, например, что в пятницу просели оценки, а основная претензия — время доставки.');
  }

  // ---------- 10. Ожидаемые результаты ----------
  {
    const s = pres.addSlide(); s.background = { color: WHITE };
    eyebrow(s, 'Ожидаемые результаты', 0.6, 0.55);
    T(s, 'Что получим через 3 месяца', { x: 0.6, y: 0.85, w: 8, h: 0.6, fontSize: 32, bold: true });
    const tiles = [
      ['chat', '×5', 'Больше отзывов', 'к текущему числу отзывов в месяц', OR, WHITE, WHITE, 'FFE3D2', 2.2],
      ['zap', '<30 мин', 'Реакция на негатив', 'от оценки до звонка клиенту', INK, OR, WHITE, 'CFC8C2', 2.5],
      ['heart', '+10%', 'Удержание', 'повторные заказы после компенсации', SOFT, OR, INK, INK2, 2.0],
      ['pin', '4,7★', 'Рейтинг на картах', 'средний по всем филиалам', SOFT, OR, INK, INK2, 2.0],
    ];
    let x = 0.6; const y = 1.7, h = 2.9, gap = 0.12;
    const total = 8.8 - gap * 3, sum = tiles.reduce((a, t) => a + t[8], 0);
    for (const t of tiles) {
      const w = total * t[8] / sum;
      rrect(s, x, y, w, h, t[4], 0.18);
      await img(s, t[0], t[5], x + 0.25, y + 0.28, 0.38);
      T(s, t[1], { x: x + 0.25, y: y + 0.85, w: w - 0.4, h: 0.8, fontSize: 36, bold: true, color: t[6], valign: 'middle', fit: 'shrink' });
      s.addShape(pres.shapes.LINE, { x: x + 0.25, y: y + 1.68, w: 0.9, h: 0, line: { color: t[6], width: 1.25, dashType: 'dash' } });
      T(s, t[2], { x: x + 0.25, y: y + 1.85, w: w - 0.4, h: 0.45, fontSize: 13, bold: true, color: t[6] });
      T(s, t[3], { x: x + 0.25, y: y + 2.33, w: w - 0.4, h: 0.5, fontSize: 10, color: t[7] });
      x += w + gap;
    }
    await img(s, 'info', OR, 0.6, 4.85, 0.2);
    T(s, 'Значения с пунктиром — заглушки. Точные цели зафиксируем по итогам пилота.', { x: 0.9, y: 4.83, w: 8, h: 0.25, fontSize: 10, color: INK2, valign: 'middle' });
    pageNo(s, 10);
    s.addNotes('Мы ожидаем четыре эффекта: больше отзывов, быструю реакцию на негатив, удержание недовольных клиентов и рост рейтинга на картах. Цифры с пунктиром пока условные: реальные цели мы зафиксируем после пилота на одном филиале, когда увидим фактический отклик. Главная метрика для решения — время от плохой оценки до звонка клиенту.');
  }

  // ---------- 11. Что нужно для запуска ----------
  {
    const s = pres.addSlide(); s.background = { color: WHITE };
    rect(s, 0, 0, 3.4, H, SOFT);
    eyebrow(s, 'Требования', 0.6, 0.6);
    T(s, 'Что нужно для запуска', { x: 0.6, y: 0.9, w: 2.6, h: 1.9, fontSize: 32, bold: true, lineSpacingMultiple: 0.95 });
    T(s, '4', { x: 0.6, y: 3.2, w: 1.5, h: 1.2, fontSize: 88, bold: true, color: OR, valign: 'bottom' });
    T(s, 'условия: три обязательных и одно резервное', { x: 0.6, y: 4.5, w: 2.5, h: 0.5, fontSize: 11, color: INK2 });
    const req = [['building', 'Бизнес-аккаунт MAX', 'Регистрация компании и бота', 'Маркетинг'], ['plug', 'Интеграция с CRM', 'Выгрузка заказов и запись оценок', 'IT'],
      ['shield', 'Согласие клиентов', '152-ФЗ: галочка при заказе, отказ в один клик', 'Юристы'], ['sms', 'SMS как резервный канал', 'Для тех, у кого нет MAX', 'IT']];
    for (let i = 0; i < 4; i++) {
      const y = 0.85 + i * 1.02, opt = i === 3;
      rrect(s, 3.9, y, 0.58, 0.58, opt ? WHITE : INK, 0.12, opt ? { line: { color: INK3, width: 1.25, dashType: 'dash' } } : {});
      await img(s, req[i][0], opt ? INK2 : WHITE, 4.05, y + 0.15, 0.28);
      T(s, req[i][1], { x: 4.7, y: y + 0.02, w: 3.6, h: 0.3, fontSize: 16, bold: true });
      T(s, req[i][2], { x: 4.7, y: y + 0.33, w: 3.7, h: 0.25, fontSize: 11, color: INK2 });
      const bw = req[i][3].length * 0.085 + 0.3;
      rrect(s, 9.4 - bw, y + 0.14, bw, 0.3, SOFT, 0.15);
      T(s, req[i][3], { x: 9.4 - bw, y: y + 0.14, w: bw, h: 0.3, fontSize: 9, bold: true, color: OR, align: 'center', valign: 'middle' });
      if (i < 3) s.addShape(pres.shapes.LINE, { x: 3.9, y: y + 0.84, w: 5.5, h: 0, line: { color: LINE, width: 0.75 } });
    }
    pageNo(s, 11);
    s.addNotes('Для запуска нужны четыре вещи: бизнес-аккаунт в MAX, интеграция с нашей CRM и корректно оформленное согласие клиентов на сообщения по 152-ФЗ. Четвёртый пункт, SMS, нужен как резерв для клиентов, у которых нет MAX. Справа указано, какой отдел отвечает за каждый пункт.');
  }

  // ---------- 12. План внедрения + Следующие шаги ----------
  {
    const s = pres.addSlide(); s.background = { color: WHITE };
    eyebrow(s, 'План внедрения', 0.6, 0.55);
    T(s, 'От договора до всей сети', { x: 0.6, y: 0.85, w: 8, h: 0.6, fontSize: 32, bold: true });
    const ty = 1.85, cw = 2.2;
    s.addShape(pres.shapes.LINE, { x: 0.6 + 0.13, y: ty + 0.13, w: 8.67, h: 0, line: { color: MID, width: 2.5 } });
    const ph = [['НЕДЕЛИ 1–2', 'Подготовка и договор', 'Аккаунт MAX, юристы, ТЗ для IT'], ['НЕДЕЛИ 3–4', 'Настройка сценария', 'Тексты, CRM, уведомления'],
      ['НЕДЕЛИ 5–8', 'Тест на одном филиале', 'Замеряем отклик и скорость реакции'], ['С НЕДЕЛИ 9', 'Запуск на всю сеть', 'Поэтапно, по филиалам']];
    ph.forEach((p, i) => {
      const x = 0.6 + i * cw;
      circ(s, x, ty, 0.26, i === 0 ? OR : WHITE, { line: { color: OR, width: 2.5 } });
      T(s, p[0], { x, y: ty + 0.45, w: cw - 0.2, h: 0.2, fontSize: 8.5, bold: true, color: OR, charSpacing: 1 });
      T(s, p[1], { x, y: ty + 0.72, w: cw - 0.25, h: 0.55, fontSize: 15, bold: true, color: i === 3 ? OR : INK });
      T(s, p[2], { x, y: ty + 1.3, w: cw - 0.3, h: 0.45, fontSize: 10.5, color: INK2 });
    });
    rect(s, 0, 4.2, W, H - 4.2, INK);
    T(s, 'Следующие шаги', { x: 0.6, y: 4.2, w: 2.2, h: H - 4.2, fontSize: 22, bold: true, color: OR, valign: 'middle' });
    ['Утвердить проект и бюджет пилота', 'Выбрать пилотный филиал и ответственных', 'Подать заявку на бизнес-аккаунт MAX'].forEach((t, i) => {
      const x = 3.0 + i * 2.2;
      circ(s, x, 4.62, 0.3, OR);
      T(s, String(i + 1), { x, y: 4.62, w: 0.3, h: 0.3, fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle' });
      T(s, t, { x: x + 0.42, y: 4.58, w: 1.65, h: 0.7, fontSize: 11.5, color: WHITE });
    });
    s.addNotes('Внедрение займёт около двух месяцев до запуска на всю сеть: две недели на подготовку, две на настройку, месяц на пилот в одном филиале. Пилот нужен, чтобы проверить тексты, отклик и нагрузку на менеджеров до масштабирования. От вас сегодня нам нужно три решения: утвердить проект, выбрать пилотный филиал и дать старт заявке на бизнес-аккаунт MAX.');
  }

  await pres.writeFile({ fileName: require('path').join(__dirname, 'max-feedback-bot.pptx') });
  console.log('written');
})();
