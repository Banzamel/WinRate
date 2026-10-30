// DOM helpers and shared components: balls, bars, cards, tabs, progress, toast.
import { t, num, pct } from './i18n.js';

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') node.value = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) if (c !== null && c !== undefined && c !== false) node.append(c.nodeType ? c : document.createTextNode(c));
  return node;
}

// Lottery balls: main numbers gold, extra-pool (Euro) numbers blue.
export const ball = (n, { extra = false, small = false, hit = false } = {}) => el('span', { class: `ball ${extra ? 'extra' : ''} ${small ? 'small' : ''} ${hit ? 'hit' : ''}` }, String(n));
export const balls = (pools, opts = {}) => el('span', { class: 'balls' }, pools.map((nums, i) => nums.map((n) => ball(n, { ...opts, extra: i > 0, hit: opts.hits && opts.hits[i] && opts.hits[i].includes(n) }))));

export const card = (title, ...children) => el('section', { class: 'card' }, title ? el('h2', {}, title) : null, ...children);
export const hint = (text) => el('p', { class: 'hint' }, text);
export const stat = (label, value, sub) => el('div', { class: 'stat' }, el('span', { class: 'stat-label' }, label), el('strong', {}, value), sub ? el('span', { class: 'stat-sub' }, sub) : null);

export function tabs(items, active, onSelect) {
  return el('div', { class: 'tabs' }, items.map((id) => el('button', { class: `tab ${id === active ? 'active' : ''}`, onClick: () => onSelect(id) }, t(`tab.${id}`))));
}

// A table from rows of cells; header: array of labels.
export function table(header, rows, { cls = '' } = {}) {
  return el('table', { class: `table ${cls}` }, el('thead', {}, el('tr', {}, header.map((h) => el('th', {}, h)))), el('tbody', {}, rows.map((r) => el('tr', {}, r.map((c) => el('td', {}, c))))));
}

// Observed vs expected as paired horizontal bars. rows: [{ label, observed, expected, tone }]
export function compareBars(rows, { format = (v) => num(v, Number.isInteger(v) ? 0 : 1) } = {}) {
  const max = Math.max(1e-9, ...rows.flatMap((r) => [r.observed, r.expected]));
  return el('div', { class: 'cmp' }, rows.map((r) => el('div', { class: 'cmp-row' },
    el('span', { class: 'cmp-label' }, r.label),
    el('div', { class: 'cmp-bars' },
      el('div', { class: `cmp-bar obs ${r.tone || ''}`, style: { width: `${(r.observed / max) * 100}%` }, title: `${t('stats.observed')}: ${format(r.observed)}` }),
      el('div', { class: 'cmp-bar exp', style: { width: `${(r.expected / max) * 100}%` }, title: `${t('stats.expected')}: ${format(r.expected)}` })),
    el('span', { class: 'cmp-val' }, `${format(r.observed)} / ${format(r.expected)}`))));
}

// Vertical bar chart of a per-number value with an expected line. values: [{ n, value, z }]
// The axis starts below the smallest value, so the (small) differences between numbers show.
export function numberChart(values, expected, { extra = false } = {}) {
  const lo = Math.max(0, Math.min(expected, ...values.map((v) => v.value)) * 0.85);
  const hi = Math.max(expected, ...values.map((v) => v.value)) * 1.02;
  const y = (v) => `${((v - lo) / (hi - lo)) * 100}%`;
  return el('div', { class: 'nchart' },
    el('div', { class: 'nchart-plot' },
      el('div', { class: 'nchart-line', style: { bottom: y(expected) }, title: t('stats.expected') }),
      values.map((v) => el('div', { class: 'nchart-col', title: `${v.n}: ${num(v.value)} (z = ${num(v.z, 2)})` },
        el('div', { class: `nchart-bar ${extra ? 'extra' : ''} ${v.z > 2 ? 'hot' : v.z < -2 ? 'cold' : ''}`, style: { height: y(v.value) } })))),
    el('div', { class: 'nchart-axis' }, values.map((v) => el('span', {}, String(v.n)))),
    el('div', { class: 'nchart-scale muted' }, `${num(lo)} – ${num(hi)}`));
}

// The verdict of a chi-square test in words.
export function fitBadge(fit) {
  if (!fit) return null;
  const tone = fit.p < 0.01 ? 'bad' : fit.p < 0.05 ? 'warn' : 'good';
  return el('span', { class: `fit ${tone}`, title: t('stats.fitTitle', { chi2: num(fit.chi2, 1), df: fit.df }) },
    `p ${fit.p < 0.0001 ? `< ${num(0.0001, 4)}` : `= ${num(fit.p, 4)}`} · ${t(`stats.fit.${tone}`)}`);
}

export function progressBar(value, label) {
  return el('div', { class: 'progress' }, el('div', { class: 'progress-fill', style: { width: `${Math.round(value * 100)}%` } }), el('span', {}, label || pct(value, 0)));
}

export function spinner(text) { return el('div', { class: 'loading' }, el('span', { class: 'spin' }), text || t('common.working')); }

let toastTimer = null;
export function toast(text, tone = '') {
  const node = document.getElementById('toast');
  node.textContent = text;
  node.className = `toast ${tone}`;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 4000);
}

export function numberInput(value, { min, max, step = 1, onChange, cls = '' } = {}) {
  return el('input', { type: 'number', class: `num ${cls}`, value: value ?? '', min, max, step, onChange: (e) => onChange(e.target.value === '' ? null : Number(e.target.value)) });
}

export function select(value, options, onChange) {
  return el('select', { onChange: (e) => onChange(e.target.value) }, options.map(([v, label]) => el('option', { value: v, selected: String(v) === String(value) || null }, label)));
}
