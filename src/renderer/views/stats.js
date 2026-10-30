// Statistics: is the draw fair? Frequencies, hot/cold, gaps, pairs, patterns, repeats —
// each against the exact expectation of a fair draw, with a chi-square test.
import { t, num, pct, date } from '../js/i18n.js';
import { state } from '../js/store.js';
import { el, card, hint, table, ball, balls, compareBars, numberChart, fitBadge, spinner, numberInput } from '../js/ui.js';
import { runJob } from './game.js';

export function renderStats(body, id) {
  const report = state.report[id];
  const draws = state.history[id];
  if (!draws.length) { body.append(card(null, el('p', { class: 'muted' }, t('history.emptyGo')))); return; }
  if (!report) {
    body.append(card(null, spinner(t('stats.computing')), hint(t('stats.firstTime'))));
    runJob('stats', body, id, async () => { state.report[id] = await window.api.report(id, { recent: state.recent || 50 }); }, renderStats)
      .catch((e) => { body.replaceChildren(card(null, el('p', { class: 'bad' }, e.message))); });
    return;
  }
  const game = state.games[id];
  const main = report.pools[0];
  body.append(
    card(t('stats.verdict'),
      el('p', {}, t('stats.verdictText', { draws: num(report.draws), from: date(report.from), to: date(report.to) })),
      el('div', { class: 'verdicts' },
        verdictRow(t('stats.v.numbers'), main.fit),
        report.pools[1] ? verdictRow(t('stats.v.extra'), report.pools[1].fit) : null,
        verdictRow(t('stats.v.pairs'), report.pairs.fit),
        verdictRow(t('stats.v.repeats'), report.repeats.fit),
        report.patterns ? Object.entries(report.patterns).map(([metric, p]) => verdictRow(t(`metric.${metric}`), p.fit)) : null),
      hint(t('stats.verdictHint'))),
    ...report.pools.map((pool, i) => card(t(i ? 'stats.freqExtra' : 'stats.freq'),
      numberChart(pool.numbers.map((x) => ({ n: x.n, value: x.count, z: x.z })), pool.expected, { extra: i > 0 }),
      hint(t('stats.freqHint', { expected: num(pool.expected, 1) })))),
    el('div', { class: 'grid-2' },
      card(t('stats.hotCold', { n: num(main.recent) }),
        el('div', { class: 'recent-input' }, t('stats.window'), numberInput(state.recent || 50, { min: 5, max: 1000, onChange: (v) => { state.recent = v || 50; delete state.report[id]; body.replaceChildren(); renderStats(body, id); } })),
        numberList(t('stats.hot'), [...main.numbers].sort((a, b) => b.recent - a.recent).slice(0, 8), (x) => num(x.recent)),
        numberList(t('stats.cold'), [...main.numbers].sort((a, b) => a.recent - b.recent).slice(0, 8), (x) => num(x.recent)),
        hint(t('stats.hotColdHint'))),
      card(t('stats.gaps'),
        table([t('stats.number'), t('stats.gap'), t('stats.avgGap'), t('stats.maxGap'), t('stats.gapChance')],
          [...main.numbers].sort((a, b) => b.gap - a.gap).slice(0, 10).map((x) => [ball(x.n, { small: true }), num(x.gap), x.avgGap ? num(x.avgGap, 1) : '–', num(x.maxGap), pct(x.gapChance, 2)])),
        hint(t('stats.gapsHint')))),
    pairsCard(report, game),
    report.patterns ? patternsCard(report.patterns) : null,
    el('div', { class: 'grid-2' },
      card(t('stats.repeats'),
        compareBars(report.repeats.observed.map((o, h) => ({ label: t('stats.repeatN', { n: h }), observed: o, expected: report.repeats.expected[h] }))),
        fitBadge(report.repeats.fit), hint(t('stats.repeatsHint'))),
      card(t('stats.sameDraws'),
        report.repeatedDraws.length ? el('div', { class: 'draw-list' }, report.repeatedDraws.map((r) => el('div', { class: 'draw-row' }, balls([r.numbers]), el('span', { class: 'muted' }, r.at.map((i) => date(draws.filter((d) => d.date >= game.eras[game.eras.length - 1].from)[i].date)).join(', ')))))
          : el('p', {}, t('stats.noSameDraws')),
        hint(t('stats.sameDrawsHint', { combos: num(report.combinations), draws: num(report.draws), chance: pct(1 - Math.exp(-(report.draws * (report.draws - 1)) / 2 / report.combinations), 2) })))),
  );
}

const verdictRow = (label, fit) => el('div', { class: 'verdict' }, el('span', {}, label), fitBadge(fit));

const numberList = (title, items, value) => el('div', { class: 'num-list' }, el('h3', {}, title),
  el('div', { class: 'num-items' }, items.map((x) => el('span', { class: 'num-item' }, ball(x.n, { small: true }), el('span', { class: 'muted' }, value(x))))));

function pairsCard(report, game) {
  const p = report.pairs;
  const size = game.pools[0].size;
  // Heat map of every pair's deviation from the expectation (z-score).
  const canvas = el('canvas', { width: size * 10, height: size * 10, class: 'heat' });
  const ctx = canvas.getContext('2d');
  const w = size + 1;
  const sd = Math.sqrt(p.expected) || 1;
  for (let x = 1; x <= size; x++) {
    for (let y = 1; y <= size; y++) {
      if (x === y) continue;
      const c = p.matrix[Math.min(x, y) * w + Math.max(x, y)];
      const z = Math.max(-3, Math.min(3, (c - p.expected) / sd));
      ctx.fillStyle = z >= 0 ? `rgba(240, 180, 60, ${z / 3})` : `rgba(80, 150, 255, ${-z / 3})`;
      ctx.fillRect((x - 1) * 10, (y - 1) * 10, 10, 10);
    }
  }
  canvas.title = t('stats.heatTitle');
  const pairRow = (q) => [el('span', { class: 'balls' }, ball(q.a, { small: true }), ball(q.b, { small: true })), num(q.count), num(q.z, 2)];
  return card(t('stats.pairs'),
    el('div', { class: 'pairs' },
      el('div', {}, el('h3', {}, t('stats.likes')), table([t('stats.pair'), t('stats.together'), 'z'], p.strongest.slice(0, 10).map(pairRow))),
      el('div', {}, el('h3', {}, t('stats.dislikes')), table([t('stats.pair'), t('stats.together'), 'z'], p.weakest.slice(0, 10).map(pairRow))),
      el('div', {}, el('h3', {}, t('stats.heat')), canvas, hint(t('stats.heatHint')))),
    el('p', {}, t('stats.pairsSummary', { expected: num(p.expected, 1), never: num(p.never), nObs: num(p.neighbours.count), nExp: num(p.neighbours.expected, 1) })),
    fitBadge(p.fit), hint(t('stats.pairsHint')));
}

function patternsCard(patterns) {
  return card(t('stats.patterns'),
    el('div', { class: 'patterns' }, Object.entries(patterns).filter(([m]) => m !== 'sum' && m !== 'spread').map(([metric, p]) => el('div', { class: 'pattern' },
      el('h3', {}, t(`metric.${metric}`), ' ', fitBadge(p.fit)),
      compareBars(p.values.map((v, i) => ({ label: String(v), observed: p.observed[i], expected: p.expected[i] })).filter((r) => r.expected >= 0.05 || r.observed))))),
    el('div', { class: 'grid-2' }, ['sum', 'spread'].map((metric) => el('div', { class: 'pattern' },
      el('h3', {}, t(`metric.${metric}`), ' ', fitBadge(patterns[metric].fit)),
      compareBars(bucketize(patterns[metric], metric === 'sum' ? 15 : 5))))),
    hint(t('stats.patternsHint')));
}

// Groups a wide distribution (sum, spread) into buckets of `width`.
function bucketize(p, width) {
  const rows = [];
  p.values.forEach((v, i) => {
    const key = Math.floor(v / width) * width;
    let row = rows[rows.length - 1];
    if (!row || row.key !== key) { row = { key, label: `${key}–${key + width - 1}`, observed: 0, expected: 0 }; rows.push(row); }
    row.observed += p.observed[i]; row.expected += p.expected[i];
  });
  return rows.filter((r) => r.expected >= 0.05 || r.observed);
}
