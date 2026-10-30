// Filters: which combinations are thrown away, the exact share each removes, and how many of
// the real draws would have survived them (the honest test of a filter). Filters can only be
// switched on and off; their values are fixed (game.filterValues).
import { t, num, pct } from '../js/i18n.js';
import { state, filtersOf, saveGameSettings } from '../js/store.js';
import { el, card, hint, table, spinner, toast, mount } from '../js/ui.js';
import { runJob } from './game.js';

export function renderFilters(body, id) {
  const game = state.games[id];
  // On/off of every filter (older saves hold values: any value = on).
  const config = Object.fromEntries(state.filters.map((f) => [f.id, isOn(filtersOf(id)[f.id])]));
  const result = state.filterResult[id];
  const save = async (patch) => {
    Object.assign(config, patch);
    await saveGameSettings(id, { filters: patch ? { ...config } : null });
    delete state.filterResult[id];
    body.replaceChildren(); renderFilters(body, id);
  };
  const rows = state.filters.map((f) => filterRow(f, config, game, save));
  const share = result && Object.fromEntries(result.filters.map((r) => [r.id, r.share]));
  const surv = result && Object.fromEntries(result.survival.removed.map((r) => [r.id, r]));
  const calc = el('button', { class: 'btn primary', onClick: () => {
    calc.replaceWith(spinner(t('filters.computing')));
    runJob('filters', body, id, async () => { state.filterResult[id] = await window.api.filters(id, config); }, renderFilters)
      .catch((e) => toast(e.message, 'bad'));
  } }, t('filters.calculate'));

  mount(body, 
    card(t('filters.title'),
      hint(t('filters.intro')),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn', onClick: () => save(null) }, t('filters.reset')),
        calc),
      el('table', { class: 'table filters' },
        el('thead', {}, el('tr', {}, [t('filters.filter'), t('filters.setting'), t('filters.removes'), t('filters.realDraws')].map((h) => el('th', {}, h)))),
        el('tbody', {}, rows.map(({ f, control }) => el('tr', { class: isOn(config[f.id]) ? '' : 'off' },
          el('td', {}, el('strong', {}, t(`filter.${f.id}`)), el('div', { class: 'muted small' }, t(`filter.${f.id}.hint`))),
          el('td', {}, control),
          el('td', {}, share && isOn(config[f.id]) ? pct(share[f.id], 2) : '–'),
          el('td', {}, surv && isOn(config[f.id]) ? `${pct(surv[f.id].share, 2)} (${num(surv[f.id].count)})` : '–')))))),
    result ? summary(result, game) : card(null, hint(t('filters.pressCalc'))),
  );
}

const isOn = (v) => v !== null && v !== undefined && v !== false;

function filterRow(f, config, game, save) {
  const on = config[f.id];
  const toggle = el('input', { type: 'checkbox', checked: on || null, onChange: (e) => save({ [f.id]: e.target.checked }) });
  return { f, control: el('span', { class: 'filter-control' }, toggle, el('span', { class: on ? '' : 'muted' }, describe(f, game.filterValues[f.id]))) };
}

// The fixed value of a filter, as text.
function describe(f, v) {
  switch (f.kind) {
    case 'range': return `${v[0]}–${v[1]}`;
    case 'max': case 'last': return `≤ ${v}`;
    case 'min': return `≥ ${v}`;
    case 'history': return t('filters.historyN', { n: v });
    case 'weight': case 'pairs': return `< ${num(v, 1)}`;
    default: return t('filters.on');
  }
}

function summary(result, game) {
  const kept = result.allowedCount / result.total;
  const survived = result.survival.draws ? result.survival.survived / result.survival.draws : 0;
  // Efficiency 1.0 = the filter keeps real draws exactly as often as random tickets: no edge.
  const efficiency = kept ? survived / kept : 0;
  const tone = efficiency > 1.05 ? 'good' : efficiency < 0.95 ? 'bad' : '';
  const extra = game.pools.slice(1).reduce((n, p) => n * comb(p.size, p.pick), 1);
  return card(t('filters.summary'),
    el('div', { class: 'stats-row' },
      el('div', { class: 'stat' }, el('span', { class: 'stat-label' }, t('filters.removed')), el('strong', {}, pct(1 - kept, 2)), el('span', { class: 'stat-sub' }, t('filters.ofCombos', { n: num(result.total - result.allowedCount) }))),
      el('div', { class: 'stat' }, el('span', { class: 'stat-label' }, t('filters.left')), el('strong', {}, num(result.allowedCount * extra)), el('span', { class: 'stat-sub' }, t('filters.jackpotNow', { n: num(result.allowedCount * extra) }))),
      el('div', { class: 'stat' }, el('span', { class: 'stat-label' }, t('filters.survived')), el('strong', {}, pct(survived, 2)), el('span', { class: 'stat-sub' }, t('filters.ofDraws', { n: num(result.survival.survived), total: num(result.survival.draws) }))),
      el('div', { class: `stat ${tone}` }, el('span', { class: 'stat-label' }, t('filters.efficiency')), el('strong', {}, num(efficiency, 3)), el('span', { class: 'stat-sub' }, t('filters.efficiencySub')))),
    el('p', {}, t('filters.summaryText', { kept: pct(kept, 1), survived: pct(survived, 1) })),
    hint(t('filters.efficiencyHint')));
}

function comb(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); }

export { table };
