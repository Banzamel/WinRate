// Generator: tickets for the next draw; every ticket passes all active filters and is the least
// popular of several such tickets. Saved coupons are checked against the results automatically.
import { t, num, money, pct, date } from '../js/i18n.js';
import { state, gameSettings, saveGameSettings, advanced } from '../js/store.js';
import { el, card, hint, balls, numberInput, select, spinner, toast, table, mount, withBusy } from '../js/ui.js';
import { runJob } from './game.js';

// Tickets: of 12 random tickets that pass the active filters the least popular one is kept — the
// same chance to win, but a win is shared with fewer players. System numbers: within the filters.
const STRATEGY = 'unpopular';
const SYSTEM_STRATEGY = 'filtered';

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
        saveButton(body, id, game, () => ({ tickets: out.tickets })),
        el('span', { class: 'muted' }, t('generator.cost', { cost: money(out.tickets.length * game.price.amount, game.price.currency) }))),
      hint(t('generator.honest', { odds: num(game.combinations / out.tickets.length) }))) : null,
    mineCard(body, id, game),
    game.system ? systemCard(id, game, body) : null,
    couponsCard(body, id, game),
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
    const go = el('button', { class: 'btn primary', disabled: st.numbers.length < pool.pick || null }, t('wheel.go'));
    go.addEventListener('click', withBusy(go, async () => {
      try { st.result = await window.api.wheel(id, { numbers: st.numbers, guarantee: st.guarantee }); } catch (e) { toast(e.message.replace(/^.*Error: /, ''), 'bad'); }
      draw();
    }));
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
function systemCard(id, game, view) {
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
        st.result = await window.api.system(id, { m: st.m, numbers: auto ? null : st.numbers, strategy: SYSTEM_STRATEGY });
        st.numbers = st.result.numbers;
      } catch (e) { toast(e.message.replace(/^.*Error: /, ''), 'bad'); }
      draw();
    };
    const autoBtn = el('button', { class: 'btn primary' }, t('system.auto'));
    autoBtn.addEventListener('click', withBusy(autoBtn, run(true)));
    const mineBtn = el('button', { class: 'btn', disabled: st.numbers.length !== st.m || null }, t('system.mine', { n: st.numbers.length, m: st.m }));
    mineBtn.addEventListener('click', withBusy(mineBtn, run(false)));
    const r = st.result;
    const cost = r ? r.table.bets * game.price.amount : 0;
    body.replaceChildren(
      hint(t('system.intro', { min: game.system.min, max: game.system.max })),
      el('div', { class: 'form-row' },
        el('label', {}, t('system.size'), select(st.m, Array.from({ length: game.system.max - game.system.min + 1 }, (_, i) => game.system.min + i).map((m) => [m, t('system.sizeN', { m, bets: comb(m, pool.pick), cost: money(comb(m, pool.pick) * game.price.amount, game.price.currency) })]), (v) => { st.m = Number(v); st.numbers = st.numbers.slice(0, st.m); st.result = null; draw(); })),
        autoBtn,
        mineBtn,
        el('button', { class: 'btn ghost', onClick: () => { st.numbers = []; st.result = null; draw(); } }, t('wheel.clear'))),
      picker,
      r ? el('div', { class: 'result' },
        el('div', { class: 'ticket' }, balls([r.numbers]), saveButton(view, id, game, () => ({ tickets: r.bets.map((b) => [b.numbers]), system: r.numbers }))),
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

// Saved coupons: the tickets of one draw (the next one when saved), kept in the game settings.
const couponsOf = (id) => gameSettings(id).coupons || [];

// Local date (YYYY-MM-DD) of the next draw of a game.
function nextDrawDate(game) {
  const next = game.nextDraws.find((d) => new Date(d) > Date.now()) || game.nextDraws[0];
  return new Intl.DateTimeFormat('sv-SE', { timeZone: game.schedule.timeZone }).format(new Date(next));
}

function saveButton(view, id, game, coupon) {
  return el('button', { class: 'btn', onClick: async () => {
    const drawDate = nextDrawDate(game);
    await saveGameSettings(id, { coupons: [...couponsOf(id), { id: Date.now(), drawDate, price: game.price.amount, ...coupon() }] });
    toast(t('coupons.saved', { date: date(drawDate) }), 'good');
    view.replaceChildren(); renderGenerator(view, id);
  } }, t('coupons.save'));
}

// Hits of every ticket against the draw of the coupon's date and its prize tier.
function checkCoupon(coupon, draws, game) {
  const draw = draws.find((d) => d.date === coupon.drawDate);
  if (!draw) return null;
  const rows = coupon.tickets.map((tk) => {
    const hits = tk.map((nums, i) => nums.filter((x) => draw.pools[i].includes(x)).length);
    return { tk, hits, tier: game.tiers.find((tier) => tier.hits.every((h, i) => h === hits[i])) || null };
  });
  const fixed = rows.reduce((s, r) => s + (r.tier && r.tier.fixed ? r.tier.fixed : 0), 0);
  return { draw, rows, fixed, pool: rows.filter((r) => r.tier && !r.tier.fixed).length };
}

const hitSum = (r) => r.hits.reduce((s, h) => s + h, 0);

function couponsCard(view, id, game) {
  const coupons = couponsOf(id);
  if (!coupons.length) return null;
  const draws = state.history[id] || [];
  const last = draws.length ? draws[draws.length - 1].date : '';
  const cur = game.price.currency;
  const remove = async (c) => {
    await saveGameSettings(id, { coupons: couponsOf(id).filter((x) => x.id !== c.id) });
    view.replaceChildren(); renderGenerator(view, id);
  };
  let spent = 0; let won = 0;
  const items = coupons.slice().reverse().map((c) => {
    const res = checkCoupon(c, draws, game);
    const cost = c.tickets.length * (c.price || game.price.amount);
    if (res) { spent += cost; won += res.fixed; }
    const status = res
      ? el('span', { class: res.fixed || res.pool ? 'good' : 'muted' }, res.fixed || res.pool ? t('coupons.won', { fixed: money(res.fixed, cur), pool: res.pool }) : t('coupons.nothing'))
      : el('span', { class: 'warn' }, c.drawDate > last ? t('coupons.waiting') : t('coupons.noDraw'));
    const head = el('div', { class: 'coupon-head' },
      el('strong', {}, date(c.drawDate)),
      el('span', { class: 'muted' }, c.system ? t('coupons.system', { m: c.system.length, n: num(c.tickets.length) }) : t('coupons.tickets', { n: num(c.tickets.length) })),
      el('span', { class: 'muted' }, money(cost, cur)),
      status,
      el('button', { class: 'icon-btn', title: t('coupons.remove'), onClick: () => remove(c) }, '✕'));
    const yours = c.system ? el('div', { class: 'ticket' }, el('span', { class: 'muted' }, t('coupons.yourNumbers')), balls([c.system])) : null;
    if (!res) return el('div', { class: 'coupon' }, head, yours, c.system ? null : el('div', { class: 'tickets' }, c.tickets.map((tk) => el('div', { class: 'ticket' }, balls(tk)))));
    const shown = c.system ? res.rows.slice().sort((a, b) => hitSum(b) - hitSum(a)).slice(0, 10) : res.rows;
    return el('div', { class: 'coupon' }, head,
      el('div', { class: 'ticket' }, el('span', { class: 'muted' }, t('coupons.result')), balls(res.draw.pools)),
      yours,
      el('div', { class: 'tickets' }, shown.map((r) => el('div', { class: 'ticket' + (r.tier ? '' : ' dim') }, balls(r.tk),
        el('span', { class: 'pop' + (r.tier ? ' good' : '') }, t('coupons.hits', { hits: r.hits.join('+') }) + (r.tier ? ' → ' + (r.tier.fixed ? money(r.tier.fixed, cur) : t('coupons.poolPrize', { tier: r.tier.id })) : ''))))));
  });
  return card(t('coupons.title', { n: num(coupons.length) }),
    spent ? el('p', {}, t('coupons.balance', { spent: money(spent, cur), won: money(won, cur) })) : null,
    ...items,
    hint(t('coupons.hint')));
}

// "Your numbers": a ticket picked or typed by the player, checked against the active filters and
// rated by how often a win would be shared. Every ticket keeps the same chance to win.
const mine = {};

function verdict(r) {
  if (r.failed.length) return ['bad', 'mine.verdict.filters'];
  if (r.popularity > 2) return ['warn', 'mine.verdict.popular'];
  if (r.popularity < 0.7) return ['good', 'mine.verdict.good'];
  return ['', 'mine.verdict.ok'];
}

function mineCard(view, id, game) {
  const st = mine[id] || (mine[id] = { pools: game.pools.map(() => []), result: null });
  const body = el('div');
  const full = () => st.pools.every((nums, i) => nums.length === game.pools[i].pick);
  const draw = () => {
    const pickers = game.pools.map((p, i) => el('div', { class: 'picker' }, Array.from({ length: p.size }, (_, j) => j + 1).map((n) => el('button', {
      class: `ball pick ${i ? 'extra-pick' : ''} ${st.pools[i].includes(n) ? 'on' : ''}`,
      onClick: () => {
        const nums = st.pools[i];
        if (nums.includes(n)) st.pools[i] = nums.filter((x) => x !== n);
        else if (nums.length < p.pick) st.pools[i] = [...nums, n].sort((a, b) => a - b);
        st.result = null; draw();
      },
    }, String(n)))));
    const typed = el('input', { type: 'text', style: { width: '240px' }, placeholder: t(game.pools.length > 1 ? 'mine.typeEuro' : 'mine.type') });
    const useTyped = () => {
      const nums = (typed.value.match(/\d+/g) || []).map(Number);
      let at = 0;
      st.pools = game.pools.map((p) => { const part = [...new Set(nums.slice(at, at + p.pick))].sort((a, b) => a - b); at += p.pick; return part; });
      st.result = null; draw();
    };
    typed.addEventListener('keydown', (e) => { if (e.key === 'Enter') useTyped(); });
    const check = el('button', { class: 'btn primary', disabled: !full() || null }, t('mine.check'));
    check.addEventListener('click', withBusy(check, async () => {
      try { st.result = await window.api.checkTicket(id, st.pools); } catch (e) { toast(e.message.replace(/^.*Error: /, ''), 'bad'); }
      draw();
    }));
    const r = st.result;
    let result = null;
    if (r && r.error) result = el('p', { class: 'bad' }, t(`history.invalid.${r.error}`));
    else if (r) {
      const [tone, key] = verdict(r);
      const pick = game.pools[0].pick;
      result = el('div', { class: 'result' },
        el('div', { class: 'ticket' }, balls(st.pools), saveButton(view, id, game, () => ({ tickets: [st.pools.map((nums) => nums.slice())] }))),
        el('p', { class: tone }, el('strong', {}, t(key))),
        r.failed.length
          ? el('div', {}, el('p', {}, t('mine.failed')), el('ul', {}, r.failed.map((fid) => el('li', {}, el('strong', {}, t(`filter.${fid}`)), ' — ', t(`filter.${fid}.hint`)))))
          : el('p', { class: 'good' }, t('mine.passes')),
        el('p', {}, el('span', { class: `pop ${r.popularity > 3 ? 'bad' : r.popularity < 0.7 ? 'good' : ''}` }, t('generator.popularity', { x: num(r.popularity, r.popularity < 10 ? 2 : 0) })), ' ', t('mine.popularity')),
        el('p', {}, r.best === pick ? t('mine.alreadyDrawn') : t('mine.closest', { n: r.best })),
        el('div', { class: 'tickets' }, r.closest.map((d) => el('div', { class: 'ticket' }, el('span', { class: 'muted' }, date(d.date)), balls(d.pools, { hits: st.pools })))));
    }
    body.replaceChildren(
      el('div', { class: 'form-row' },
        el('label', {}, t('mine.typeLabel'), typed),
        el('button', { class: 'btn', onClick: useTyped }, t('mine.use')),
        check,
        el('button', { class: 'btn ghost', onClick: () => { st.pools = game.pools.map(() => []); st.result = null; draw(); } }, t('wheel.clear'))),
      ...pickers,
      result,
      hint(t('mine.hint')));
  };
  draw();
  return card(t('mine.title'), body);
}
