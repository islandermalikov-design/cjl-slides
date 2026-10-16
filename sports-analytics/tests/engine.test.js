// Запуск: node --test sports-analytics/tests
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
// игра с точки зрения команды; от новых к старым
const G = (date, gf, ga, extra = {}) => ({ date, opp: 'X', home: true, gf, ga, ff: gf, fa: ga, rf: gf, ra: ga, per: null, ot: '', first: null, ...extra });

test('settle: пример из ТЗ — 3:2, тотал 5', () => {
  assert.equal(E.settle(5, 3.5), 'over');
  assert.equal(E.settle(5, 4.5), 'over');
  assert.equal(E.settle(5, 5.5), 'under');
  assert.equal(E.settle(5, 5), 'push');
  assert.equal(E.settle(5, 4.75), 'half-over');   // 4.5 выиграла, 5 — возврат
  assert.equal(E.settle(5, 5.25), 'half-under');  // 5 — возврат, 5.5 проиграла
  assert.equal(E.settle(5, 5.75), 'under');
  assert.ok(E.validLine(4.25) && E.validLine(6) && !E.validLine(4.3));
});

test('lineStats: счёт, проценты, серии, дата последнего прохода', () => {
  const gs = [G('2026-10-10', 3, 2), G('2026-10-08', 4, 1), G('2026-10-06', 1, 1), G('2026-10-04', 5, 3), G('2026-10-02', 0, 1)];
  const s = E.lineStats(gs, 3.5);
  assert.equal(s.n, 5); assert.equal(s.over, 3); assert.equal(s.under, 2);
  near(s.pctOver, 0.6);
  assert.equal(s.cur, 'over'); assert.equal(s.curLen, 2);
  assert.equal(s.maxOver, 2); assert.equal(s.maxUnder, 1);
  assert.equal(s.lastOver.date, '2026-10-10'); assert.equal(s.lastUnder.date, '2026-10-06');
  const it = E.lineStats(gs, 2.5, 'for');   // ИТ команды
  assert.equal(it.over, 3);
  const ag = E.lineStats(gs, 0.5, 'against'); // пропущенные
  assert.equal(ag.over, 5);
  const p = E.lineStats([G('a', 3, 2), G('b', 2, 2)], 5); // целая линия: возврат исключается из процента
  assert.equal(p.push, 1); near(p.pctOver, 0);
});

test('runs: null прерывает серию', () => {
  const r = E.runs(['over', 'over', null, 'over', 'over', 'over', 'under'], ['over', 'under']);
  assert.equal(r.curLen, 2); assert.equal(r.max.over, 3); assert.equal(r.max.under, 1);
});

test('summary: средние, медиана, min/max', () => {
  const s = E.summary([G('a', 3, 2), G('b', 1, 0), G('c', 4, 4), G('d', 2, 1)]);
  assert.equal(s.n, 4); near(s.gf, 2.5); near(s.ga, 1.75); near(s.tot, 4.25);
  assert.equal(s.med, 4); assert.equal(s.min, 1); assert.equal(s.max, 8);
  assert.equal(E.summary([]).n, 0);
});

test('firstFromPeriods: только однозначные случаи', () => {
  assert.equal(E.firstFromPeriods([{ f: 0, a: 0 }, { f: 1, a: 0 }, { f: 0, a: 2 }]), 'f');
  assert.equal(E.firstFromPeriods([{ f: 1, a: 1 }, { f: 0, a: 0 }, { f: 0, a: 0 }]), null); // в одном периоде забили обе — неизвестно
  assert.equal(E.firstFromPeriods([{ f: 0, a: 0 }, { f: 0, a: 0 }, { f: 0, a: 0 }], 'OT', 1, 0), 'f');
  assert.equal(E.firstFromPeriods([{ f: 0, a: 0 }, { f: 0, a: 0 }, { f: 0, a: 0 }], 'SO', 1, 0), null);
  assert.equal(E.firstFromPeriods(null), null);
});

test('firstGoal: без событий — нет данных, а не догадки по счёту', () => {
  const none = E.firstGoal([G('a', 3, 1), G('b', 0, 2)]);
  assert.equal(none.n, 0); assert.equal(none.pctF, null);
  const gs = [G('a', 2, 1, { first: 'f' }), G('b', 1, 2, { first: 'f' }), G('c', 0, 1, { first: 'a' }), G('d', 2, 2)];
  const s = E.firstGoal(gs);
  assert.equal(s.total, 4); assert.equal(s.n, 3); assert.equal(s.f, 2); assert.equal(s.a, 1);
  assert.equal(s.cur, 'f'); assert.equal(s.curLen, 2); assert.equal(s.maxF, 2); assert.equal(s.maxA, 1);
});

test('draws: хоккей — ничья по основному времени (ОТ/Б), футбол — по счёту', () => {
  const hk = [G('a', 3, 2, { ot: 'OT', rf: 2, ra: 2, ff: 3, fa: 2 }), G('b', 2, 1), G('c', 1, 2, { ot: 'SO', rf: 1, ra: 1, ff: 1, fa: 2, home: false }), G('d', 4, 0)];
  const d = E.draws(hk, 'hockey');
  assert.equal(d.n, 4); assert.equal(d.d, 2); near(d.pct, 0.5);
  assert.equal(d.scores['2:2'], 1); assert.equal(d.scores['1:1'], 1);
  assert.equal(d.last.date, 'a'); assert.equal(d.curDraw, 1); assert.equal(d.maxNoDraw, 1);
  assert.equal(d.away.d, 1); assert.equal(d.home.d, 1);
  const fb = E.draws([G('a', 0, 0), G('b', 1, 0), G('c', 2, 1), G('d', 1, 1)], 'football');
  assert.equal(fb.d, 2); assert.equal(fb.curNoDraw, 0); assert.equal(fb.maxNoDraw, 2); assert.equal(fb.scores['0:0'], 1);
});

test('outcome: ВО/ПБ в хоккее', () => {
  assert.equal(E.outcome(G('a', 3, 2, { ot: 'OT' }), 'hockey'), 'ВО');
  assert.equal(E.outcome(G('a', 1, 2, { ot: 'SO' }), 'hockey'), 'ПБ');
  assert.equal(E.outcome(G('a', 1, 1), 'football'), 'Н');
});

test('standings: очки хоккея (2/2/1/0) и футбола (3/1/0), дом/выезд', () => {
  const ms = [
    { date: '2026-10-01', home: 'A', away: 'B', hs: 3, as: 2, ot: 'OT' },
    { date: '2026-10-02', home: 'B', away: 'C', hs: 4, as: 1, ot: '' },
    { date: '2026-10-03', home: 'C', away: 'A', hs: 2, as: 1, ot: 'SO' },
  ];
  const t = E.standings(ms, 'hockey'), by = Object.fromEntries(t.map(r => [r.team, r]));
  assert.equal(by.A.pts, 3); assert.equal(by.A.otw, 1); assert.equal(by.A.otl, 1);
  assert.equal(by.B.pts, 3); assert.equal(by.C.pts, 2);
  assert.deepEqual(by.A.form, ['ПО', 'ВО']);
  const home = Object.fromEntries(E.standings(ms, 'hockey', 'home').map(r => [r.team, r]));
  assert.equal(home.A.gp, 1); assert.equal(home.B.gp, 1); assert.equal(home.C.gp, 1);
  const f = E.standings([{ date: 'x', home: 'A', away: 'B', hs: 1, as: 1 }, { date: 'y', home: 'A', away: 'C', hs: 2, as: 0 }], 'football');
  assert.equal(f[0].team, 'A'); assert.equal(f[0].pts, 4);
});

test('Пуассон: P(X=k) и сумма тотала двух независимых команд = Пуассон(λA+λB)', () => {
  near(E.poisPmf(0, 2.5), Math.exp(-2.5));
  near(E.poisPmf(3, 2.5), Math.exp(-2.5) * 2.5 ** 3 / 6);
  const M = E.scoreMatrix(3.1, 2.4, 0, 25), D = E.derive(M, false);
  for (let t = 0; t < 10; t++) near(D.reg[t], E.poisPmf(t, 5.5), 1e-9);
  // P(Total > 3.5) = 1 − P(Total ≤ 3)
  const p = E.overProb(D.reg, 3.5).over, cdf3 = [0, 1, 2, 3].reduce((s, k) => s + E.poisPmf(k, 5.5), 0);
  near(p, 1 - cdf3, 1e-9);
  near(D.w + D.d + D.l, 1, 1e-12);
});

test('Хоккей: итоговый тотал = основное время + 1 гол при ничьей', () => {
  const D = E.derive(E.scoreMatrix(2.8, 2.6, 0, 20), true);
  near(D.fin.reduce((a, b) => a + b, 0), 1, 1e-12);
  near(E.expect(D.fin), E.expect(D.reg) + D.d, 1e-9);
  // при ничьей 2:2 итог 5 — значит ТБ 4.5 в итоге вероятнее, чем в основное время
  assert.ok(E.overProb(D.fin, 4.5).over > E.overProb(D.reg, 4.5).over);
});

test('Диксон — Коулз: нормировка и сдвиг вероятности 0:0', () => {
  const M0 = E.scoreMatrix(1.4, 1.1, 0), M1 = E.scoreMatrix(1.4, 1.1, -0.1);
  near(M1.flat().reduce((a, b) => a + b, 0), 1, 1e-12);
  assert.ok(M1[0][0] > M0[0][0] && M1[1][1] > M0[1][1] && M1[1][0] < M0[1][0]);
});

test('fitStrengths: сильная атака получает att > 1; матчи после даты не используются', () => {
  const ms = [];
  const teams = ['A', 'B', 'C', 'D'];
  let d = 1;
  for (let r = 0; r < 6; r++) for (const h of teams) for (const a of teams) if (h !== a) {
    const date = '2026-0' + (1 + (d % 8)) + '-' + String(1 + (d % 27)).padStart(2, '0'); d++;
    ms.push({ date, home: h, away: a, rh: h === 'A' ? 5 : 2, ra: a === 'A' ? 5 : 2 });
  }
  const fit = E.fitStrengths(ms, { before: '2026-12-31' });
  assert.ok(fit.att.get('A') > 1.3 && fit.att.get('B') < 1);
  const cutoff = '2026-04-01', fitA = E.fitStrengths(ms, { before: cutoff });
  const future = ms.map(m => m.date >= cutoff ? { ...m, rh: 9, ra: 9 } : m); // меняем только будущее
  const fitB = E.fitStrengths(future, { before: cutoff });
  for (const t of teams) near(fitA.att.get(t), fitB.att.get(t), 1e-12);
  const p = E.predict(fit, 'A', 'B', 'hockey');
  assert.ok(p.lh > p.la && p.rse > 0);
  const rng = E.overWithRange(p, 5.5);
  assert.ok(rng.lo <= rng.over && rng.over <= rng.hi);
});

test('backtest: хронология без утечки — изменение будущих матчей не меняет прошлые прогнозы', () => {
  const teams = ['A', 'B', 'C', 'D', 'E', 'F'], ms = [];
  let day = 0, seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let r = 0; r < 4; r++) for (const h of teams) for (const a of teams) if (h !== a) {
    const dt = new Date(Date.UTC(2026, 0, 1) + (day++) * 864e5).toISOString().slice(0, 10);
    const rh = Math.floor(rnd() * 5), ra = Math.floor(rnd() * 4);
    ms.push({ date: dt, home: h, away: a, rh, ra, fh: rh + (rh === ra ? 1 : 0), fa: ra });
  }
  const bt = E.backtest(ms, 'hockey', { line: 5.5 });
  assert.ok(bt.n > 50);
  assert.ok(bt.brier > 0 && bt.brier < 0.5 && bt.logloss > 0);
  const cut = ms[90].date, past = ms.filter(m => m.date < cut);
  const a = E.backtest(past, 'hockey', { line: 5.5 }), b = E.backtest(ms.map(m => m.date < cut ? m : { ...m, rh: 9, ra: 0, fh: 9, fa: 0 }), 'hockey', { line: 5.5 });
  // прогнозы на матчи до cut одинаковы — сравним по среднему Brier на общей части через повторный прогон
  assert.equal(a.from, b.from);
  const fitPast = E.fitStrengths(ms, { before: cut }), fitMod = E.fitStrengths(ms.map(m => m.date < cut ? m : { ...m, rh: 9 }), { before: cut });
  near(E.predict(fitPast, 'A', 'B', 'hockey').lt, E.predict(fitMod, 'A', 'B', 'hockey').lt, 1e-12);
});

test('Коэффициенты: P = 1/K, маржа и нормировка', () => {
  near(E.implied(2), 0.5);
  const d = E.devig([1.9, 1.9]);
  near(d.margin, 2 / 1.9 - 1); near(d.fair[0], 0.5);
  assert.equal(E.devig([1.9, 0.9]), null);
});

test('sampleLevel', () => {
  assert.equal(E.sampleLevel(0), 'none'); assert.equal(E.sampleLevel(5), 'tiny'); assert.equal(E.sampleLevel(12), 'small'); assert.equal(E.sampleLevel(25), 'ok');
});
