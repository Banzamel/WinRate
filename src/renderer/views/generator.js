// Generator: tickets for the next draw; every ticket passes all active filters.
import { t, num, money, pct } from '../js/i18n.js';
import { state, gameSettings, saveGameSettings, advanced } from '../js/store.js';
import { el, card, hint, balls, numberInput, select, spinner, toast, table, mount } from '../js/ui.js';
import { runJob } from './game.js';

// The only generator mode: uniform among the combinations that pass the active filters.
const STRATEGY = 'filtered';

export function renderGenerator(body, id) {
  const game = state.games[id];
  // Tickets may share any numbers (only identical tickets are skipped).
  const { count = 5 } = gameSettings(id).generator || {};
  const opts = { count, strategy: STRATEGY };
  const set = async (patch) => { Object.assign(opts, patch); await saveGameSettings(id, { generator: { count: opts.count } }); };
  const out = state.tickets[id];
  const go = el('button', { class: 'btn primary', onClick: () => {
    go.replaceWith(spinner(t('generator.working')));
    runJob('generate', body, id, async () => { state.tickets[id] = await window.api.generate(id, opts); }, renderGenerator)
      .catch((e) => toast(e.message, 'bad'));
  } }, t('generator.go'));
  mount(body,
    card(t('generator.title'),
      el('div', { class: 'form-row' },
        el('label', {}, t('generator.count'), numberInput(opts.count, { min: 1, max: 200, onChange: (v) => set({ count: Math.max(1, Math.min(200, v || 1)) }) })),
        go),
      hint(t('generator.filtersNote'))),
    out ? card(t('generator.tickets', { n: num(out.tickets.length) }),
      el('div', { class: 'tickets' }, out.tickets.map((tk, i) => el('div', { class: 'ticket' }, el('span', { class: 'muted' }, `${i + 1}.`), balls(tk),
        out.popularity ? el('span', { class: `pop ${out.popularity[i] > 3 ? 'bad' : out.popularity[i] < 0.7 ? 'good' : ''}`, title: t('generator.popularityTitle') }, t('generator.popularity', { x: num(out.popularity[i], out.popularity[i] < 10 ? 2 : 0) })) : null))),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn', onClick: () => { navigator.clipboard.writeText(out.tickets.map((tk) => tk.map((p) => p.join(' ')).join(' | ')).join('\n')); toast(t('generator.copied'), 'good'); } }, t('generator.copy')),
        el('span', { class: 'muted' }, t('generator.cost', { cost: money(out.tickets.length * game.price.amount, game.price.currency) }))),
      hint(t('generator.honest', { odds: num(game.combinations / out.tickets.length) }))) : null,
    game.system ? systemCard(id, game) : null,
    advanced() ? wheelCard(id, game) : null,
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
      hint(t('wheel.intro', { k: pool.pick })),
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

// Lotto system bet: m numbers = every 6-number combination of them, with the prizes it guarantees.
function systemCard(id, game) {
  const pool = game.pools[0];
  const st = (state.system = state.system || {})[id] || (state.system[id] = { m: game.system.min, numbers: [], result: null });
  const body = el('div');
  const tiers = game.tiers;
  const draw = () => {
    const picker = el('div', { class: 'picker' }, Array.from({ length: pool.size }, (_, i) => i + 1).map((n) => el('button', {
      class: `ball pick ${st.numbers.includes(n) ? 'on' : ''}`,
      onClick: () => {
        if (st.numbers.includes(n)) st.numbers = st.numbers.filter((x) => x !== n);
        else if (st.numbers.length < st.m) st.numbers = [...st.numbers, n].sort((a, b) => a - b);
        st.result = null; draw();
      },
    }, String(n))));
    const run = (auto) => async () => {
      try {
        st.result = await window.api.system(id, { m: st.m, numbers: auto ? null : st.numbers, strategy: STRATEGY });
        st.numbers = st.result.numbers;
      } catch (e) { toast(e.message.replace(/^.*Error: /, ''), 'bad'); }
      draw();
    };
    const r = st.result;
    const cost = r ? r.table.bets * game.price.amount : 0;
    body.replaceChildren(
      hint(t('system.intro', { min: game.system.min, max: game.system.max })),
      el('div', { class: 'form-row' },
        el('label', {}, t('system.size'), select(st.m, Array.from({ length: game.system.max - game.system.min + 1 }, (_, i) => game.system.min + i).map((m) => [m, t('system.sizeN', { m, bets: comb(m, pool.pick), cost: money(comb(m, pool.pick) * game.price.amount, game.price.currency) })]), (v) => { st.m = Number(v); st.numbers = st.numbers.slice(0, st.m); st.result = null; draw(); })),
        el('button', { class: 'btn primary', onClick: run(true) }, t('system.auto')),
        el('button', { class: 'btn', disabled: st.numbers.length !== st.m || null, onClick: run(false) }, t('system.mine', { n: st.numbers.length, m: st.m })),
        el('button', { class: 'btn ghost', onClick: () => { st.numbers = []; st.result = null; draw(); } }, t('wheel.clear'))),
      picker,
      r ? el('div', { class: 'result' },
        el('div', { class: 'ticket' }, balls([r.numbers])),
        el('p', {}, t('system.summary', { bets: num(r.table.bets), cost: money(cost, game.price.currency), pass: num(r.bets.filter((b) => b.passes).length), odds: num(1 / r.table.jackpot), any: pct(r.table.any, 2) })),
        table([t('system.drawn'), t('system.chance'), ...tiers.map((tier) => t('system.tier', { tier: tier.id })), t('system.payout')],
          r.table.rows.slice().reverse().filter((row) => Object.keys(row.wins).length).map((row) => [
            t('system.drawnN', { j: row.drawnAmongYours, m: r.table.m }), `1 : ${num(row.oneIn, row.oneIn < 100 ? 1 : 0)}`,
            ...tiers.map((tier) => (row.wins[tier.id] ? num(row.wins[tier.id]) : '–')),
            fixedPayout(row, tiers, game)])),
        el('details', {}, el('summary', {}, t('system.bets', { n: num(r.bets.length) })),
          el('div', { class: 'tickets' }, r.bets.map((b, i) => el('div', { class: `ticket ${b.passes ? '' : 'dim'}` }, el('span', { class: 'muted' }, `${i + 1}.`), balls([b.numbers]), b.passes ? null : el('span', { class: 'pop bad' }, t('system.filtered'))))))) : null,
      hint(t('system.hint')));
  };
  draw();
  return card(t('system.title'), body);
}

const comb = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };

// Guaranteed fixed prizes of a row plus the count of pool prizes (amounts depend on the draw).
function fixedPayout(row, tiers, game) {
  const fixed = tiers.reduce((s, tier) => s + (tier.fixed && row.wins[tier.id] ? tier.fixed * row.wins[tier.id] : 0), 0);
  const pools = tiers.filter((tier) => !tier.fixed && row.wins[tier.id]).length;
  return fixed ? `${money(fixed, game.price.currency)}${pools ? ' + …' : ''}` : (pools ? '…' : '–');
}
