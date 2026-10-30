// Overview: rules, schedule, exact odds of every prize tier and the latest draws.
import { t, num, pct, money, date } from '../js/i18n.js';
import { state } from '../js/store.js';
import { el, card, stat, table, balls, hint, numberInput } from '../js/ui.js';

export function renderOverview(body, id) {
  const game = state.games[id];
  const draws = state.history[id];
  const weekdays = game.schedule.weekdays.map((d) => new Intl.DateTimeFormat(document.documentElement.lang, { weekday: 'long' }).format(new Date(Date.UTC(2024, 0, 7 + d)))).join(', ');
  const rules = game.pools.map((p, i) => t(i === 0 ? 'rules.main' : 'rules.extra', { pick: p.pick, size: p.size })).join(' + ');
  body.append(
    el('div', { class: 'stats-row' },
      stat(t('rules.game'), rules),
      stat(t('rules.price'), money(game.price.amount, game.price.currency)),
      stat(t('rules.combinations'), num(game.combinations), t('rules.jackpotOdds', { n: num(game.combinations) })),
      stat(t('rules.anyPrize'), `1 : ${num(1 / game.anyPrize, 1)}`),
      stat(t('rules.days'), weekdays, t('rules.time', { time: game.schedule.time, zone: game.schedule.timeZone }))),
    el('div', { class: 'grid-2' },
      card(t('rules.tiers'),
        table([t('rules.tier'), t('rules.odds'), t('rules.probability'), t('rules.prize')], game.tiers.map((tier) => [
          el('strong', {}, tier.id), `1 : ${num(tier.oneIn, tier.oneIn < 100 ? 1 : 0)}`, pct(tier.probability, tier.probability < 0.001 ? 6 : 3),
          tier.fixed ? money(tier.fixed, game.price.currency) : t('rules.parimutuel'),
        ])),
        hint(t(`rules.${id}.notes`))),
      card(t('overview.latest'),
        draws.length ? el('div', { class: 'draw-list' }, draws.slice(-8).reverse().map((d) => el('div', { class: 'draw-row' }, el('span', { class: 'muted' }, date(d.date)), balls(d.pools)))) : el('p', { class: 'muted' }, t('history.empty')),
        el('div', { class: 'stats-row compact' },
          stat(t('overview.stored'), num(draws.length)),
          draws.length ? stat(t('overview.range'), `${date(draws[0].date)} – ${date(draws[draws.length - 1].date)}`) : null),
        el('h3', {}, t('overview.eras')),
        el('ul', { class: 'plain' }, game.eras.map((e) => el('li', {}, `${date(e.from)}: ${e.pools.map((p) => `${p.pick}/${p.size}`).join(' + ')}`))))),
    evCard(id, game),
    card(t('overview.truth'), el('p', {}, t('overview.truthText', { n: num(game.combinations), years: num(game.combinations / game.drawsPerYear, 0) }))),
  );
}

// Expected value of a ticket at a given jackpot: how much of the price comes back on average,
// and how much an unpopular ticket gains by not sharing the jackpot.
function evCard(id, game) {
  const opts = { jackpot: game.typicalJackpot, sold: game.typicalSales, prizes: { ...game.typicalPrizes } };
  const out = el('div', { class: 'result' });
  const cur = game.price.currency;
  const update = async () => {
    const r = await window.api.expectedValue(id, opts);
    const row = (label, e) => [label, money(e.total, cur), pct(e.returnRate, 1), pct(e.share, 1)];
    out.replaceChildren(
      table([t('ev.ticket'), t('ev.value'), t('ev.return'), t('ev.share')], [row(t('ev.average'), r.average), row(t('ev.unpopular'), r.unpopular)]),
      el('p', {}, t('ev.summary', { price: money(game.price.amount, cur), back: money(r.average.total, cur), lose: money(-r.average.net, cur) })),
      r.average.breakEven ? el('p', {}, t('ev.breakEven', { jackpot: money(r.average.breakEven, cur), sold: num(opts.sold) })) : el('p', { class: 'good' }, t('ev.positive')),
    );
  };
  const prizeInputs = game.tiers.slice(1).filter((tier) => !tier.fixed).map((tier) => el('label', {}, tier.id,
    numberInput(opts.prizes[tier.id], { min: 0, onChange: (v) => { opts.prizes[tier.id] = v || 0; update(); } })));
  update();
  return card(t('ev.title'),
    el('div', { class: 'form-row' },
      el('label', {}, t('ev.jackpot', { cur }), numberInput(opts.jackpot, { min: 0, step: 1000000, cls: 'wide', onChange: (v) => { opts.jackpot = v || 0; update(); } })),
      el('label', {}, t('ev.sold'), numberInput(opts.sold, { min: 0, step: 1000000, cls: 'wide', onChange: (v) => { opts.sold = v || 0; update(); } }))),
    el('details', {}, el('summary', {}, t('ev.prizes')), el('div', { class: 'form-row' }, prizeInputs)),
    out,
    hint(t('ev.hint')));
}
