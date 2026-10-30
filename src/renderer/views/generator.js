// Generator: tickets for the next draw with a strategy and the active filters.
import { t, num, money } from '../js/i18n.js';
import { state, gameSettings, saveGameSettings } from '../js/store.js';
import { el, card, hint, balls, numberInput, select, spinner, toast } from '../js/ui.js';
import { runJob } from './game.js';

export function renderGenerator(body, id) {
  const game = state.games[id];
  const opts = { strategy: 'filtered', count: 5, recent: 50, halfLife: 0, ...(gameSettings(id).generator || {}) };
  const set = async (patch) => { Object.assign(opts, patch); await saveGameSettings(id, { generator: { ...opts } }); };
  const out = state.tickets[id];
  const go = el('button', { class: 'btn primary', onClick: () => {
    go.replaceWith(spinner(t('generator.working')));
    runJob('generate', body, id, async () => { state.tickets[id] = { ...(await window.api.generate(id, opts)), strategy: opts.strategy }; }, renderGenerator)
      .catch((e) => toast(e.message, 'bad'));
  } }, t('generator.go'));
  body.append(
    card(t('generator.title'),
      el('div', { class: 'form-row' },
        el('label', {}, t('generator.strategy'), select(opts.strategy, state.strategies.map((s) => [s, t(`strategy.${s}`)]), (v) => { set({ strategy: v }); body.replaceChildren(); renderGenerator(body, id); })),
        el('label', {}, t('generator.count'), numberInput(opts.count, { min: 1, max: 200, onChange: (v) => set({ count: Math.max(1, Math.min(200, v || 1)) }) })),
        ['hot', 'cold'].includes(opts.strategy) ? el('label', {}, t('generator.recent'), numberInput(opts.recent, { min: 5, max: 1000, onChange: (v) => set({ recent: v || 50 }) })) : null,
        opts.strategy === 'bayes' ? el('label', {}, t('generator.halfLife'), numberInput(opts.halfLife, { min: 0, max: 10000, onChange: (v) => set({ halfLife: v || 0 }) })) : null,
        go),
      hint(t(`strategy.${opts.strategy}.hint`)),
      opts.strategy === 'random' ? null : hint(t('generator.filtersNote'))),
    out ? card(t('generator.tickets', { n: num(out.tickets.length) }),
      el('div', { class: 'tickets' }, out.tickets.map((tk, i) => el('div', { class: 'ticket' }, el('span', { class: 'muted' }, `${i + 1}.`), balls(tk),
        out.popularity ? el('span', { class: `pop ${out.popularity[i] > 3 ? 'bad' : out.popularity[i] < 0.7 ? 'good' : ''}`, title: t('generator.popularityTitle') }, t('generator.popularity', { x: num(out.popularity[i], out.popularity[i] < 10 ? 2 : 0) })) : null))),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn', onClick: () => { navigator.clipboard.writeText(out.tickets.map((tk) => tk.map((p) => p.join(' ')).join(' | ')).join('\n')); toast(t('generator.copied'), 'good'); } }, t('generator.copy')),
        el('span', { class: 'muted' }, t('generator.cost', { cost: money(out.tickets.length * game.price.amount, game.price.currency) }))),
      hint(t('generator.honest', { odds: num(game.combinations / out.tickets.length) }))) : null,
    wheelCard(id, game),
  );
}

// Abbreviated wheel: the fewest tickets that guarantee t hits when t drawn numbers are among yours.
function wheelCard(id, game) {
  const pool = game.pools[0];
  const st = (state.wheel = state.wheel || {})[id] || (state.wheel[id] = { numbers: [], guarantee: Math.min(3, pool.pick), result: null });
  const body = el('div');
  const draw = () => {
    const picker = el('div', { class: 'picker' }, Array.from({ length: pool.size }, (_, i) => i + 1).map((n) => el('button', {
      class: `ball pick ${st.numbers.includes(n) ? 'on' : ''}`,
      onClick: () => { st.numbers = st.numbers.includes(n) ? st.numbers.filter((x) => x !== n) : [...st.numbers, n].sort((a, b) => a - b); st.result = null; draw(); },
    }, String(n))));
    const go = el('button', { class: 'btn primary', disabled: st.numbers.length < pool.pick || null, onClick: async () => {
      go.disabled = true;
      try { st.result = await window.api.wheel(id, { numbers: st.numbers, guarantee: st.guarantee }); } catch (e) { toast(e.message.replace(/^.*Error: /, ''), 'bad'); }
      draw();
    } }, t('wheel.go'));
    const r = st.result;
    body.replaceChildren(
      el('p', {}, t('wheel.intro', { k: pool.pick })),
      picker,
      el('div', { class: 'form-row' },
        el('span', { class: 'muted' }, t('wheel.chosen', { n: st.numbers.length })),
        el('label', {}, t('wheel.guarantee'), select(st.guarantee, Array.from({ length: pool.pick - 1 }, (_, i) => i + 2).map((g) => [g, t('wheel.guaranteeN', { t: g })]), (v) => { st.guarantee = Number(v); st.result = null; draw(); })),
        el('button', { class: 'btn ghost', onClick: () => { st.numbers = []; st.result = null; draw(); } }, t('wheel.clear')),
        go),
      r ? el('div', { class: 'result' },
        el('p', {}, t('wheel.summary', { n: num(r.tickets.length), full: num(r.full), m: r.numbers.length, t: r.t, cost: money(r.tickets.length * game.price.amount, game.price.currency) })),
        el('div', { class: 'tickets' }, r.tickets.map((tk, i) => el('div', { class: 'ticket' }, el('span', { class: 'muted' }, `${i + 1}.`), balls([tk])))),
        el('button', { class: 'btn', onClick: () => { navigator.clipboard.writeText(r.tickets.map((tk) => tk.join(' ')).join('\n')); toast(t('generator.copied'), 'good'); } }, t('generator.copy'))) : null,
      hint(t(game.pools.length > 1 ? 'wheel.hintEuro' : 'wheel.hint')));
  };
  draw();
  return card(t('wheel.title'), body);
}
