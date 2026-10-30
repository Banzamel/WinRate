// Overview: rules, schedule, exact odds of every prize tier and the latest draws.
import { t, num, pct, money, date } from '../js/i18n.js';
import { state } from '../js/store.js';
import { el, card, stat, table, balls, hint } from '../js/ui.js';

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
    card(t('overview.truth'), el('p', {}, t('overview.truthText', { n: num(game.combinations), years: num(game.combinations / game.drawsPerYear, 0) }))),
  );
}
