// Generator: tickets for the next draw with a strategy and the active filters.
import { t, num, money } from '../js/i18n.js';
import { state, gameSettings, saveGameSettings } from '../js/store.js';
import { el, card, hint, balls, numberInput, select, spinner, toast } from '../js/ui.js';
import { runJob } from './game.js';

export function renderGenerator(body, id) {
  const game = state.games[id];
  const opts = { strategy: 'filtered', count: 5, recent: 50, ...(gameSettings(id).generator || {}) };
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
        go),
      hint(t(`strategy.${opts.strategy}.hint`)),
      opts.strategy === 'random' ? null : hint(t('generator.filtersNote'))),
    out ? card(t('generator.tickets', { n: num(out.tickets.length) }),
      el('div', { class: 'tickets' }, out.tickets.map((tk, i) => el('div', { class: 'ticket' }, el('span', { class: 'muted' }, `${i + 1}.`), balls(tk)))),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn', onClick: () => { navigator.clipboard.writeText(out.tickets.map((tk) => tk.map((p) => p.join(' ')).join(' | ')).join('\n')); toast(t('generator.copied'), 'good'); } }, t('generator.copy')),
        el('span', { class: 'muted' }, t('generator.cost', { cost: money(out.tickets.length * game.price.amount, game.price.currency) }))),
      hint(t('generator.honest', { odds: num(game.combinations / out.tickets.length) }))) : null,
  );
}
