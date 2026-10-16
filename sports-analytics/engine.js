/* Аналитический движок «Серий матчей».
 * Чистые функции без DOM: страница подключает файл как window.HSEngine, тесты — через require().
 *
 * Игра с точки зрения команды (её строит страница, функция persp):
 *   { id, date:'YYYY-MM-DD', opp, home:bool, gf, ga,   // счёт по выбранному режиму (итог или основное время)
 *     ff, fa,                                           // итоговый счёт (с ОТ и буллитами)
 *     rf, ra,                                           // счёт основного времени (null, если неизвестен)
 *     per:[{f,a}]|null, ot:''|'OT'|'SO', first:'f'|'a'|null, firstSrc:'event'|'periods'|'' }
 * Массивы игр всегда отсортированы от новых к старым.
 */
(function (root, factory) {
  const E = factory();
  if (typeof module === 'object' && module.exports) module.exports = E; else root.HSEngine = E;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Тоталы ---------- */
  const isQuarter = L => Math.abs(L * 4 - Math.round(L * 4)) < 1e-9 && Math.abs(L * 2 - Math.round(L * 2)) > 1e-9;
  const validLine = L => Number.isFinite(L) && L >= 0 && Math.abs(L * 4 - Math.round(L * 4)) < 1e-9;
  function settleSimple(v, L) { return v > L ? 'over' : v < L ? 'under' : 'push'; }
  /** Результат ставки «больше» для значения v и линии L. Четвертная линия (x.25 / x.75) делится на две соседние. */
  function settle(v, L) {
    if (!isQuarter(L)) return settleSimple(v, L);
    const a = settleSimple(v, L - 0.25), b = settleSimple(v, L + 0.25);
    if (a === b) return a;
    if (a === 'over' || b === 'over') return 'half-over';
    return 'half-under';
  }
  const valueOf = (g, kind) => g.gf == null || g.ga == null ? null : kind === 'for' ? g.gf : kind === 'against' ? g.ga : g.gf + g.ga;

  /** Серия по последовательности значений (новые первыми). Ложные значения (null) прерывают обе серии. */
  function runs(seq, sides) {
    const cur = seq.length && seq[0] != null ? seq[0] : null;
    let curLen = 0; if (cur != null) while (curLen < seq.length && seq[curLen] === cur) curLen++;
    const max = {}; for (const s of sides) max[s] = 0;
    let prev = null, run = 0;
    for (const v of seq) { if (v != null && v === prev) run++; else run = v == null ? 0 : 1; prev = v; if (v != null && run > max[v]) max[v] = run; }
    return { cur, curLen, max };
  }

  /** Полная статистика тотала по линии. kind: 'match' — тотал матча, 'for' — ИТ команды, 'against' — ИТ соперника. */
  function lineStats(gs, L, kind = 'match') {
    const items = [];
    for (const g of gs) { const v = valueOf(g, kind); if (v != null) items.push({ g, v, r: settle(v, L) }); }
    const c = { over: 0, under: 0, push: 0, 'half-over': 0, 'half-under': 0 };
    for (const it of items) c[it.r]++;
    const n = items.length, decided = n - c.push;
    const pctOver = decided ? (c.over + 0.5 * c['half-over']) / decided : null;
    const pctUnder = decided ? (c.under + 0.5 * c['half-under']) / decided : null;
    const side = r => r === 'over' || r === 'half-over' ? 'over' : r === 'under' || r === 'half-under' ? 'under' : null;
    const rn = runs(items.map(it => side(it.r)), ['over', 'under']);
    const lastOf = s => { const it = items.find(x => side(x.r) === s); return it ? it.g : null; };
    return { line: L, kind, n, over: c.over, under: c.under, push: c.push, halfOver: c['half-over'], halfUnder: c['half-under'],
      pctOver, pctUnder, cur: rn.cur, curLen: rn.curLen, maxOver: rn.max.over, maxUnder: rn.max.under,
      lastOver: lastOf('over'), lastUnder: lastOf('under'), items };
  }

  /* ---------- Результативность ---------- */
  function median(a) { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function summary(gs) {
    const g = gs.filter(x => x.gf != null && x.ga != null), n = g.length;
    if (!n) return { n: 0, gf: null, ga: null, tot: null, med: null, min: null, max: null, sumF: 0, sumA: 0 };
    const sumF = g.reduce((s, x) => s + x.gf, 0), sumA = g.reduce((s, x) => s + x.ga, 0), t = g.map(x => x.gf + x.ga);
    return { n, gf: sumF / n, ga: sumA / n, tot: (sumF + sumA) / n, med: median(t), min: Math.min(...t), max: Math.max(...t), sumF, sumA };
  }
  /** Окно выборки: 'all' — весь набор, число — последние N матчей. */
  const windowOf = (gs, w) => w === 'all' || !w ? gs : gs.slice(0, +w);

  /* ---------- Первый гол ---------- */
  /** Кто забил первым, по счёту периодов (с точки зрения команды). Точно, только если в первом результативном
   *  периоде забивала одна команда; если основное время 0:0 и был овертайм — первым забил победитель ОТ. */
  function firstFromPeriods(per, ot, ff, fa) {
    if (!Array.isArray(per) || !per.length) return null;
    for (const p of per) {
      if (p.f + p.a === 0) continue;
      if (p.f > 0 && p.a === 0) return 'f';
      if (p.a > 0 && p.f === 0) return 'a';
      return null;
    }
    if (ot === 'OT' && ff != null && fa != null && ff !== fa) return ff > fa ? 'f' : 'a';
    return null;
  }
  function firstGoal(gs) {
    const all = gs.filter(g => g.gf != null), known = all.filter(g => g.first === 'f' || g.first === 'a');
    const f = known.filter(g => g.first === 'f').length, a = known.length - f;
    const noGoals = all.filter(g => g.ff === 0 && g.fa === 0).length;
    const rn = runs(known.map(g => g.first), ['f', 'a']);
    const byPeriod = [];
    for (const g of known) {
      if (!g.per) continue;
      let idx = g.per.findIndex(p => p.f + p.a > 0); if (idx < 0) idx = g.per.length;
      byPeriod[idx] = (byPeriod[idx] || 0) + 1;
    }
    return { total: all.length, n: known.length, f, a, pctF: known.length ? f / known.length : null, pctA: known.length ? a / known.length : null,
      noGoals, cur: rn.cur, curLen: rn.curLen, maxF: rn.max.f, maxA: rn.max.a, byPeriod, fromPeriods: known.filter(g => g.firstSrc === 'periods').length };
  }

  /* ---------- Ничьи ---------- */
  /** Ничья: в хоккее — по основному времени (матч ушёл в ОТ/буллиты), в футболе — по итоговому счёту. */
  function isDraw(g, sport) {
    if (sport === 'hockey') { if (g.ot) return true; if (g.rf != null && g.ra != null) return g.rf === g.ra; return g.ff == null ? null : g.ff === g.fa; }
    if (g.rf != null && g.ra != null) return g.rf === g.ra;
    return g.ff == null ? null : g.ff === g.fa;
  }
  function regScore(g) { if (g.rf != null && g.ra != null) return [g.rf, g.ra]; return null; }
  function draws(gs, sport) {
    const items = gs.map(g => ({ g, d: isDraw(g, sport) })).filter(x => x.d != null);
    const n = items.length, d = items.filter(x => x.d).length;
    const rn = runs(items.map(x => x.d), [true, false]);
    const scores = { '0:0': 0, '1:1': 0, '2:2': 0, '3:3': 0, '4:4+': 0, 'неизв.': 0 };
    for (const x of items) if (x.d) { const r = regScore(x.g); if (!r) scores['неизв.']++; else if (r[0] >= 4) scores['4:4+']++; else scores[r[0] + ':' + r[1]]++; }
    const sub = h => { const s = items.filter(x => x.g.home === h); return { n: s.length, d: s.filter(x => x.d).length }; };
    const last = items.find(x => x.d);
    return { n, d, pct: n ? d / n : null, last: last ? last.g : null, curNoDraw: rn.cur === false ? rn.curLen : 0, curDraw: rn.cur === true ? rn.curLen : 0,
      maxNoDraw: rn.max[false], maxDraw: rn.max[true], scores, home: sub(true), away: sub(false) };
  }

  /* ---------- Исходы, форма, таблица ---------- */
  /** Буква исхода. В хоккее отдельно победы/поражения в ОТ и по буллитам. */
  function outcome(g, sport) {
    if (g.ff == null) return null;
    if (sport === 'hockey' && g.ot) return g.ff > g.fa ? (g.ot === 'SO' ? 'ВБ' : 'ВО') : (g.ot === 'SO' ? 'ПБ' : 'ПО');
    return g.ff > g.fa ? 'В' : g.ff < g.fa ? 'П' : 'Н';
  }
  /** Таблица по сыгранным матчам. ms: [{home, away, hs, as, ot, date}] в ключах команд. venue: 'all'|'home'|'away'. */
  function standings(ms, sport, venue = 'all') {
    const T = new Map(), row = k => { if (!T.has(k)) T.set(k, { team: k, gp: 0, w: 0, otw: 0, otl: 0, l: 0, d: 0, gf: 0, ga: 0, pts: 0, form: [] }); return T.get(k); };
    const sorted = ms.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    for (const m of sorted) {
      if (m.hs == null || m.as == null) continue;
      for (const side of ['home', 'away']) {
        if (venue !== 'all' && venue !== side) { row(side === 'home' ? m.home : m.away); continue; }
        const r = row(side === 'home' ? m.home : m.away), f = side === 'home' ? m.hs : m.as, a = side === 'home' ? m.as : m.hs;
        r.gp++; r.gf += f; r.ga += a;
        let o;
        if (sport === 'hockey' && m.ot) { if (f > a) { r.otw++; r.pts += 2; o = 'ВО'; } else { r.otl++; r.pts += 1; o = 'ПО'; } }
        else if (f > a) { r.w++; r.pts += sport === 'football' ? 3 : 2; o = 'В'; }
        else if (f < a) { r.l++; o = 'П'; }
        else { r.d++; r.pts += 1; o = 'Н'; }
        r.form.push(o);
      }
    }
    const out = [...T.values()];
    for (const r of out) r.form = r.form.slice(-5).reverse();
    out.sort((a, b) => b.pts - a.pts || (b.pts / (b.gp || 1)) - (a.pts / (a.gp || 1)) || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || String(a.team).localeCompare(String(b.team)));
    out.forEach((r, i) => { r.pos = i + 1; });
    return out;
  }

  /* ---------- Вероятностная модель ---------- */
  function poisPmf(k, l) { if (l <= 0) return k === 0 ? 1 : 0; let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; }
  /** Поправка Диксона — Коулза для низких счетов (футбол). */
  function dcTau(i, j, lh, la, rho) {
    if (i === 0 && j === 0) return 1 - lh * la * rho;
    if (i === 0 && j === 1) return 1 + lh * rho;
    if (i === 1 && j === 0) return 1 + la * rho;
    if (i === 1 && j === 1) return 1 - rho;
    return 1;
  }
  /** Совместное распределение счёта основного времени. */
  function scoreMatrix(lh, la, rho = 0, max = 12) {
    const M = []; let s = 0;
    for (let i = 0; i <= max; i++) { M[i] = []; for (let j = 0; j <= max; j++) { const p = Math.max(0, poisPmf(i, lh) * poisPmf(j, la) * (rho ? dcTau(i, j, lh, la, rho) : 1)); M[i][j] = p; s += p; } }
    for (let i = 0; i <= max; i++) for (let j = 0; j <= max; j++) M[i][j] /= s;
    return M;
  }
  /** Из матрицы: исходы основного времени и распределения тоталов.
   *  addOtGoal: хоккей регулярного чемпионата — при ничьей в основное время итоговый счёт получает +1 (гол в ОТ или «гол» за буллиты). */
  function derive(M, addOtGoal) {
    const n = M.length, reg = [], fin = [], home = [], away = [], homeFin = [], awayFin = [];
    let w = 0, d = 0, l = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const p = M[i][j], t = i + j;
      reg[t] = (reg[t] || 0) + p; home[i] = (home[i] || 0) + p; away[j] = (away[j] || 0) + p;
      if (i > j) w += p; else if (i === j) d += p; else l += p;
      const extra = addOtGoal && i === j ? 1 : 0;
      fin[t + extra] = (fin[t + extra] || 0) + p;
      // в ОТ шайбу забивает одна из команд; без отдельной модели делим 50/50 — это допущение, оно указано в интерфейсе
      if (extra) { homeFin[i + 1] = (homeFin[i + 1] || 0) + p / 2; homeFin[i] = (homeFin[i] || 0) + p / 2; awayFin[j + 1] = (awayFin[j + 1] || 0) + p / 2; awayFin[j] = (awayFin[j] || 0) + p / 2; }
      else { homeFin[i] = (homeFin[i] || 0) + p; awayFin[j] = (awayFin[j] || 0) + p; }
    }
    const fill = a => { for (let i = 0; i < a.length; i++) a[i] = a[i] || 0; return a; };
    return { w, d, l, reg: fill(reg), fin: fill(fin), home: fill(home), away: fill(away), homeFin: fill(homeFin), awayFin: fill(awayFin) };
  }
  /** Вероятности исходов ставки «больше L» по распределению dist. */
  function overProb(dist, L) {
    const r = { over: 0, under: 0, push: 0, 'half-over': 0, 'half-under': 0 };
    dist.forEach((p, v) => { r[settle(v, L)] += p; });
    return { over: r.over + r['half-over'] / 2, under: r.under + r['half-under'] / 2, push: r.push + (r['half-over'] + r['half-under']) / 2 };
  }
  const expect = dist => dist.reduce((s, p, v) => s + p * v, 0);

  /** Оценка сил атаки и обороны (итеративный метод отношений с поправкой на соперника,
   *  экспоненциальным весом свежих матчей и сжатием к среднему лиги).
   *  ms: [{date, home, away, rh, ra}] — счёт основного времени; используются только матчи строго ДО before. */
  function fitStrengths(ms, opts = {}) {
    const before = opts.before || '9999-99-99', half = opts.halfLifeDays || 150, k = opts.prior ?? 4, iters = opts.iters || 12;
    const ref = Date.parse((before === '9999-99-99' ? new Date().toISOString().slice(0, 10) : before) + 'T00:00:00Z');
    const data = [];
    for (const m of ms) {
      if (!(m.date < before) || m.rh == null || m.ra == null) continue;
      const age = Math.max(0, (ref - Date.parse(m.date + 'T00:00:00Z')) / 864e5);
      data.push({ h: m.home, a: m.away, gh: m.rh, ga: m.ra, w: Math.pow(0.5, age / half) });
    }
    let sw = 0, sh = 0, sa = 0;
    for (const x of data) { sw += x.w; sh += x.w * x.gh; sa += x.w * x.ga; }
    const H = sw ? sh / sw : null, A = sw ? sa / sw : null;
    const att = new Map(), def = new Map(), games = new Map(), wsum = new Map(), w2 = new Map();
    for (const x of data) for (const t of [x.h, x.a]) { att.set(t, 1); def.set(t, 1); games.set(t, (games.get(t) || 0) + 1); wsum.set(t, (wsum.get(t) || 0) + x.w); w2.set(t, (w2.get(t) || 0) + x.w * x.w); }
    if (!data.length) return { n: 0, H: null, A: null, att, def, games, neff: new Map() };
    const mean = (H + A) / 2;
    for (let it = 0; it < iters; it++) {
      const nf = new Map(), ef = new Map(), na = new Map(), ea = new Map(), add = (m, t, v) => m.set(t, (m.get(t) || 0) + v);
      for (const x of data) {
        add(nf, x.h, x.w * x.gh); add(ef, x.h, x.w * H * def.get(x.a));
        add(nf, x.a, x.w * x.ga); add(ef, x.a, x.w * A * def.get(x.h));
        add(na, x.h, x.w * x.ga); add(ea, x.h, x.w * A * att.get(x.a));
        add(na, x.a, x.w * x.gh); add(ea, x.a, x.w * H * att.get(x.h));
      }
      for (const t of att.keys()) {
        att.set(t, (nf.get(t) + k * mean) / (ef.get(t) + k * mean));
        def.set(t, (na.get(t) + k * mean) / (ea.get(t) + k * mean));
      }
      // нормировка: средняя сила = 1, иначе H/A и силы неидентифицируемы
      const avg = m => { let s = 0; for (const v of m.values()) s += v; return s / m.size; };
      const ma = avg(att), md = avg(def);
      for (const t of att.keys()) { att.set(t, att.get(t) / ma); def.set(t, def.get(t) / md); }
    }
    const neff = new Map(); for (const t of wsum.keys()) neff.set(t, wsum.get(t) ** 2 / w2.get(t));
    return { n: data.length, H, A, att, def, games, neff };
  }
  /** Подбор rho Диксона — Коулза по максимуму правдоподобия на тех же прошлых матчах. */
  function fitRho(ms, fit, before = '9999-99-99') {
    if (!fit.n) return 0;
    let best = 0, bestLL = -Infinity;
    for (let r = -0.2; r <= 0.2001; r += 0.01) {
      let ll = 0;
      for (const m of ms) {
        if (!(m.date < before) || m.rh == null) continue;
        const lh = fit.H * (fit.att.get(m.home) || 1) * (fit.def.get(m.away) || 1), la = fit.A * (fit.att.get(m.away) || 1) * (fit.def.get(m.home) || 1);
        const tau = dcTau(m.rh, m.ra, lh, la, r); if (tau <= 0) { ll = -Infinity; break; }
        ll += Math.log(tau);
      }
      if (ll > bestLL) { bestLL = ll; best = Math.round(r * 100) / 100; }
    }
    return best;
  }
  /** Прогноз матча. sport: 'hockey' | 'football'. */
  function predict(fit, home, away, sport, opts = {}) {
    if (!fit || !fit.n) return null;
    const ah = fit.att.get(home) ?? 1, dh = fit.def.get(home) ?? 1, aa = fit.att.get(away) ?? 1, da = fit.def.get(away) ?? 1;
    const lh = fit.H * ah * da, la = fit.A * aa * dh;
    const rho = sport === 'football' ? (opts.rho || 0) : 0;
    const M = scoreMatrix(lh, la, rho, sport === 'football' ? 10 : 14);
    const D = derive(M, sport === 'hockey' && opts.otGoal !== false);
    const nh = fit.neff.get(home) || 0, na = fit.neff.get(away) || 0;
    // относительная погрешность ожидаемого тотала: оценки атаки и обороны каждой команды опираются на ≈ n·λ голов
    const lt = lh + la, rse = (nh && na) ? Math.sqrt(1 / (nh * lt / 2) + 1 / (na * lt / 2)) : null;
    return { lh, la, lt, rho, M, ...D, gamesH: fit.games.get(home) || 0, gamesA: fit.games.get(away) || 0, neffH: nh, neffA: na, rse, nTrain: fit.n };
  }
  /** Вероятность «больше L» с диапазоном, отражающим неточность оценки λ (не всю неопределённость). */
  function overWithRange(pred, L, which = 'fin', sport = 'hockey') {
    const base = overProb(pred[which], L);
    if (!pred.rse) return { ...base, lo: null, hi: null };
    const at = s => { const M = scoreMatrix(pred.lh * s, pred.la * s, pred.rho, pred.M.length - 1); return overProb(derive(M, sport === 'hockey')[which], L).over; };
    const z = 1.96 * pred.rse, a = at(Math.max(0.05, 1 - z)), b = at(1 + z);
    return { ...base, lo: Math.min(a, b), hi: Math.max(a, b) };
  }

  /* ---------- Проверка модели на истории ---------- */
  /** Хронологическая проверка: для каждого матча модель обучается только на матчах до его даты.
   *  ms: [{date, home, away, rh, ra, fh, fa}] (fh/fa — итог). Возвращает метрики модели и наивной базы. */
  function backtest(ms, sport, opts = {}) {
    const L = opts.line, minTrain = opts.minTrain ?? 30, minTeam = opts.minTeam ?? 3, which = opts.which || (sport === 'hockey' ? 'fin' : 'reg');
    const sorted = ms.filter(m => m.rh != null && m.fh != null).sort((a, b) => a.date.localeCompare(b.date));
    const rows = [];
    for (const m of sorted) {
      const prior = sorted.filter(x => x.date < m.date);
      if (prior.length < minTrain) continue;
      const fit = fitStrengths(prior, { before: m.date, halfLifeDays: opts.halfLifeDays });
      if ((fit.games.get(m.home) || 0) < minTeam || (fit.games.get(m.away) || 0) < minTeam) continue;
      const rho = sport === 'football' ? fitRho(prior, fit, m.date) : 0;
      const p = predict(fit, m.home, m.away, sport, { rho });
      const tot = which === 'fin' ? m.fh + m.fa : m.rh + m.ra;
      const res = settle(tot, L); if (res === 'push') continue;
      const yOver = res === 'over' || res === 'half-over' ? 1 : 0;
      const pOver = overProb(p[which], L).over;
      const baseOver = (prior.filter(x => settle(which === 'fin' ? x.fh + x.fa : x.rh + x.ra, L) === 'over').length + 1) / (prior.length + 2);
      const r1x2 = m.rh > m.ra ? 0 : m.rh === m.ra ? 1 : 2, pr = [p.w, p.d, p.l];
      const cnt = [0, 0, 0]; for (const x of prior) cnt[x.rh > x.ra ? 0 : x.rh === x.ra ? 1 : 2]++;
      const pb = cnt.map(c => (c + 1) / (prior.length + 3));
      rows.push({ date: m.date, pOver, baseOver, yOver, exp: expect(p[which]), tot, p1x2: pr, b1x2: pb, r1x2 });
    }
    const n = rows.length; if (!n) return { n: 0, line: L };
    const clip = p => Math.min(1 - 1e-6, Math.max(1e-6, p));
    const brier = k => rows.reduce((s, r) => s + (r[k] - r.yOver) ** 2, 0) / n;
    const ll = k => -rows.reduce((s, r) => s + Math.log(clip(r.yOver ? r[k] : 1 - r[k])), 0) / n;
    const ll3 = k => -rows.reduce((s, r) => s + Math.log(clip(r[k][r.r1x2])), 0) / n;
    const bins = [[0, 0.4], [0.4, 0.5], [0.5, 0.6], [0.6, 1.01]].map(([a, b]) => {
      const s = rows.filter(r => r.pOver >= a && r.pOver < b);
      return { from: a, to: Math.min(b, 1), n: s.length, pred: s.length ? s.reduce((x, r) => x + r.pOver, 0) / s.length : null, obs: s.length ? s.reduce((x, r) => x + r.yOver, 0) / s.length : null };
    });
    return { n, line: L, from: rows[0].date, to: rows[n - 1].date, brier: brier('pOver'), brierBase: brier('baseOver'), logloss: ll('pOver'), loglossBase: ll('baseOver'),
      ll1x2: ll3('p1x2'), ll1x2Base: ll3('b1x2'), maeTotal: rows.reduce((s, r) => s + Math.abs(r.exp - r.tot), 0) / n, overRate: rows.reduce((s, r) => s + r.yOver, 0) / n, bins };
  }

  /* ---------- Коэффициенты ---------- */
  const implied = k => k > 1 ? 1 / k : null;
  /** Две или более взаимоисключающих ставки: маржа и вероятности без маржи (пропорциональная нормировка). */
  function devig(odds) {
    const inv = odds.map(implied); if (inv.some(x => x == null)) return null;
    const s = inv.reduce((a, b) => a + b, 0);
    return { margin: s - 1, raw: inv, fair: inv.map(x => x / s) };
  }

  /** Подпись надёжности выборки. */
  const sampleLevel = n => n >= 20 ? 'ok' : n >= 10 ? 'small' : n > 0 ? 'tiny' : 'none';

  return { settle, isQuarter, validLine, lineStats, runs, summary, median, windowOf, firstFromPeriods, firstGoal, isDraw, draws, outcome, standings,
    poisPmf, dcTau, scoreMatrix, derive, overProb, expect, fitStrengths, fitRho, predict, overWithRange, backtest, implied, devig, sampleLevel };
});
