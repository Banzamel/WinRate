// Simulation (science mode): replays the past as if the future were unknown.
//  - Backtest: for each of the last N draws only the earlier ones are known; the strategy plays
//    K tickets and they are scored against the real result, next to a plain random player.
//  - Until it hits: for a past draw (result known to the referee only) tickets are drawn until one
//    matches, counting the attempts — and what they would have cost.
import { t, num, pct, money, date } from '../js/i18n.js';
import { state, gameSettings, saveGameSettings, subscribe } from '../js/store.js';
import { el, card, hint, table, balls, numberInput, select, progressBar, toast } from '../js/ui.js';
import { runJob } from './game.js';

export function renderSimulation(body, id) {
  const game = state.games[id];
  const opts = { strategy: 'filtered', tickets: 10, tests: 200, targets: 3, maxAttempts: id === 'lotto' ? 1e8 : 1e9, recent: 50, halfLife: 0, ...(gameSettings(id).simulation || {}) };
  const set = (patch) => { Object.assign(opts, patch); saveGameSettings(id, { simulation: { ...opts } }); };
  const running = !!state.jobs.sim;
  const progress = el('div', { class: 'sim-progress' }, running ? progressBar(state.jobs.sim.progress || 0) : null);
  const off = subscribe((e) => {
    if (!progress.isConnected) { off(); return; }
    if (e.type === 'progress' && e.lane === 'sim') {
      const info = e.info && e.info.attempts ? t('sim.attemptsSoFar', { n: num(e.info.attempts) }) : null;
      progress.replaceChildren(progressBar(e.progress, info), el('button', { class: 'btn ghost', onClick: () => window.api.cancel('sim') }, t('common.cancel')));
    }
  });
  const start = (kind) => () => {
    progress.replaceChildren(progressBar(0), el('button', { class: 'btn ghost', onClick: () => window.api.cancel('sim') }, t('common.cancel')));
    const draws = state.history[id].length;
    const job = kind === 'backtest'
      ? () => window.api.backtest(id, { strategy: opts.strategy, tickets: opts.tickets, tests: Math.min(opts.tests, draws - 1), recent: opts.recent, halfLife: opts.halfLife })
      : () => window.api.untilHit(id, { strategy: opts.strategy, targets: Array.from({ length: Math.min(opts.targets, draws) }, (_, i) => -1 - i), maxAttempts: opts.maxAttempts, recent: opts.recent, halfLife: opts.halfLife });
    runJob('sim', body, id, async () => { state[kind][id] = { ...(await job()), opts: { ...opts } }; }, renderSimulation)
      .catch((e) => { if (e.message.includes('cancelled')) toast(t('sim.cancelled')); else toast(e.message, 'bad'); });
  };

  body.append(
    card(t('sim.title'),
      el('p', {}, t('sim.intro')),
      el('div', { class: 'form-row' },
        el('label', {}, t('generator.strategy'), select(opts.strategy, state.strategies.map((s) => [s, t(`strategy.${s}`)]), (v) => set({ strategy: v }))),
        el('label', {}, t('sim.recent'), numberInput(opts.recent, { min: 5, max: 1000, onChange: (v) => set({ recent: v || 50 }) })),
        el('label', {}, t('generator.halfLife'), numberInput(opts.halfLife, { min: 0, max: 10000, onChange: (v) => set({ halfLife: v || 0 }) }))),
      progress),
    el('div', { class: 'sim-cards' },
      card(t('sim.backtest'),
        el('div', { class: 'form-row' },
          el('label', {}, t('sim.tickets'), numberInput(opts.tickets, { min: 1, max: 10000, onChange: (v) => set({ tickets: v || 1 }) })),
          el('label', {}, t('sim.tests'), numberInput(opts.tests, { min: 1, max: 20000, onChange: (v) => set({ tests: v || 1 }) })),
          el('button', { class: 'btn primary', disabled: running || null, onClick: start('backtest') }, t('sim.run'))),
        hint(t('sim.backtestHint')),
        state.backtest[id] ? backtestResult(state.backtest[id], game) : null),
      card(t('sim.untilHit'),
        el('div', { class: 'form-row' },
          el('label', {}, t('sim.targets'), numberInput(opts.targets, { min: 1, max: 50, onChange: (v) => set({ targets: v || 1 }) })),
          el('label', {}, t('sim.maxAttempts'), numberInput(opts.maxAttempts, { min: 1e5, step: 1e6, onChange: (v) => set({ maxAttempts: v || 1e8 }) })),
          el('button', { class: 'btn primary', disabled: running || null, onClick: start('untilHit') }, t('sim.run'))),
        hint(t('sim.untilHitHint')),
        state.untilHit[id] ? untilHitResult(state.untilHit[id], game) : null)),
  );
}

function backtestResult(r, game) {
  const total = r.draws * r.tickets;
  const rows = game.tiers.map((tier) => [el('strong', {}, tier.id), num(r.strategy.tiers[tier.id]), num(r.random.tiers[tier.id]), num(total * tier.probability, 2)]);
  rows.push([el('strong', {}, t('sim.anyPrize')), num(r.strategy.any), num(r.random.any), num(total * game.anyPrize, 1)]);
  const fixed = r.strategy.prize || r.random.prize;
  const diff = r.strategy.any - r.random.any;
  const sd = Math.sqrt(2 * total * game.anyPrize * (1 - game.anyPrize)) || 1;
  return el('div', { class: 'result' },
    el('p', {}, t('sim.backtestSummary', { draws: num(r.draws), from: date(r.from), to: date(r.to), tickets: num(r.tickets), total: num(total), strategy: t(`strategy.${r.opts.strategy}`) })),
    table([t('rules.tier'), t(`strategy.${r.opts.strategy}`), t('strategy.random'), t('sim.expected')], rows),
    fixed ? el('p', {}, t('sim.fixedPrizes', { a: money(r.strategy.prize, game.price.currency), b: money(r.random.prize, game.price.currency), spent: money(total * game.price.amount, game.price.currency) })) : null,
    el('p', {}, t('sim.survived', { n: num(r.survived), total: num(r.draws), share: pct(r.draws ? r.survived / r.draws : 0) })),
    el('p', { class: Math.abs(diff) > 2 * sd ? 'warn' : 'muted' }, t('sim.zDiff', { diff: num(diff), z: num(diff / sd, 2) })));
}

function untilHitResult(r, game) {
  const rows = r.results.map((x) => {
    const status = x.excluded ? el('span', { class: 'bad' }, t('sim.excluded', { filters: x.failed.map((f) => t(`filter.${f}`)).join(', ') }))
      : x.hit ? el('span', { class: 'good' }, t('sim.hit')) : el('span', { class: 'warn' }, x.stopped ? t('sim.stopped') : t('sim.notYet'));
    return [date(x.date), balls(x.numbers, { small: true }), status, num(x.attempts), x.expectedUniform ? num(x.expectedUniform) : '–',
      x.attempts ? money(x.attempts * game.price.amount, game.price.currency) : '–', x.attempts ? num(x.attempts / game.drawsPerYear, 0) : '–'];
  });
  const hits = r.results.filter((x) => x.hit);
  const avg = hits.length ? hits.reduce((s, x) => s + x.attempts, 0) / hits.length : 0;
  return el('div', { class: 'result' },
    table([t('sim.draw'), t('sim.numbers'), t('sim.status'), t('sim.attempts'), t('sim.expectedAttempts'), t('sim.cost'), t('sim.years')], rows, { cls: 'small' }),
    hits.length ? el('p', {}, t('sim.avgAttempts', { avg: num(avg), combos: num(game.combinations), n: num(hits.length) })) : null,
    hint(t('sim.untilHitExplain')));
}
