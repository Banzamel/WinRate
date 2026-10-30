// Filters: which combinations are thrown away and the exact share each removes, computed as soon
// as the tab opens and after every change. Filters can only be switched on and off; their values
// are fixed (game.filterValues).
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

  if (!result && !state.jobs.filters) {
    runJob('filters', body, id, async () => { state.filterResult[id] = await window.api.filters(id, config); }, renderFilters)
      .catch((e) => toast(e.message, 'bad'));
  }

  mount(body, 
    card(t('filters.title'),
      hint(t('filters.intro')),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn', onClick: () => save(null) }, t('filters.reset'))),
      el('table', { class: 'table filters' },
        el('thead', {}, el('tr', {}, [t('filters.filter'), t('filters.setting'), t('filters.removes')].map((h) => el('th', {}, h)))),
        el('tbody', {}, rows.map(({ f, control }) => el('tr', { class: isOn(config[f.id]) ? '' : 'off' },
          el('td', {}, el('strong', {}, t(`filter.${f.id}`)), el('div', { class: 'muted small' }, t(`filter.${f.id}.hint`))),
          el('td', {}, control),
          el('td', {}, share && isOn(config[f.id]) ? pct(share[f.id], 2) : '–')))))),
    result ? summary(result, game) : card(null, spinner(t('filters.computing'))),
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
  const extra = game.pools.slice(1).reduce((n, p) => n * comb(p.size, p.pick), 1);
  return card(t('filters.summary'),
    el('div', { class: 'stats-row' },
      el('div', { class: 'stat' }, el('span', { class: 'stat-label' }, t('filters.removed')), el('strong', {}, pct(1 - kept, 2)), el('span', { class: 'stat-sub' }, t('filters.ofCombos', { n: num(result.total - result.allowedCount) }))),
      el('div', { class: 'stat' }, el('span', { class: 'stat-label' }, t('filters.left')), el('strong', {}, num(result.allowedCount * extra)), el('span', { class: 'stat-sub' }, t('filters.jackpotNow', { n: num(result.allowedCount * extra) }))),
),
    hint(t('filters.honest')));
}

function comb(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); }

export { table };
