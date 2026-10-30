// Filters: which combinations are thrown away, the exact share each removes, and how many of
// the real draws would have survived them (the honest test of a filter).
import { t, num, pct } from '../js/i18n.js';
import { state, filtersOf, saveGameSettings } from '../js/store.js';
import { el, card, hint, table, numberInput, spinner, toast } from '../js/ui.js';
import { runJob } from './game.js';

// Presets: none, the default (~30 % of Lotto) and a strict one.
function presets(game) {
  const def = game.defaultFilters;
  const none = Object.fromEntries(Object.keys(def).map((k) => [k, null]));
  const k = game.pools[0].pick;
  return {
    none,
    default: def,
    strict: { ...def, odd: [2, k - 2], low: [2, k - 2], maxRun: 1, maxDecade: 2, history: k - 1, lastOverlap: 1, numberWeight: -0.5 },
  };
}

export function renderFilters(body, id) {
  const game = state.games[id];
  const config = { ...filtersOf(id) };
  const result = state.filterResult[id];
  const save = async (patch) => {
    Object.assign(config, patch);
    await saveGameSettings(id, { filters: { ...config } });
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

  body.append(
    card(t('filters.title'),
      el('p', {}, t('filters.intro')),
      el('div', { class: 'btn-row' },
        Object.entries(presets(game)).map(([name, preset]) => el('button', { class: 'btn', onClick: () => save({ ...preset }) }, t(`filters.preset.${name}`))),
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
  const v = config[f.id];
  const def = game.defaultFilters[f.id];
  const k = game.pools[0].pick;
  const toggle = el('input', { type: 'checkbox', checked: isOn(v) || null, onChange: (e) => save({ [f.id]: e.target.checked ? (def ?? fallback(f, k)) : null }) });
  let inputs = null;
  if (isOn(v)) {
    if (f.kind === 'range') {
      inputs = el('span', { class: 'range' }, numberInput(v[0], { onChange: (x) => save({ [f.id]: [x ?? 0, v[1]] }) }), '–', numberInput(v[1], { onChange: (x) => save({ [f.id]: [v[0], x ?? 0] }) }));
    } else if (f.kind === 'flag') {
      inputs = el('span', { class: 'muted' }, t('filters.on'));
    } else if (f.kind === 'history') {
      inputs = el('select', { onChange: (e) => save({ history: Number(e.target.value) }) },
        [k, k - 1].map((n) => el('option', { value: n, selected: n === v || null }, t('filters.historyN', { n }))));
    } else {
      const step = f.kind === 'weight' || f.kind === 'pairs' ? 0.1 : 1;
      inputs = numberInput(v, { step, onChange: (x) => save({ [f.id]: x }) });
    }
  }
  return { f, control: el('span', { class: 'filter-control' }, toggle, inputs) };
}

const fallback = (f, k) => ({ history: k, last: 2, weight: -0.5, pairs: -0.5, max: 3, min: 10, range: [1, k - 1], flag: true }[f.kind]);

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
