// Shared components: balls, cards, stats, tabs, tables, charts, progress, inputs.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t, num, pct } from '../i18n';
import { useStore, state } from '../store';

const cls = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

// Lottery balls: main numbers gold, extra-pool (Euro) numbers blue.
export function Ball({ n, extra = false, small = false, hit = false }: { n: number; extra?: boolean; small?: boolean; hit?: boolean }) {
  return <span className={cls('ball', extra && 'extra', small && 'small', hit && 'hit')}>{n}</span>;
}

export function Balls({ pools, small, hits }: { pools: number[][]; small?: boolean; hits?: number[][] }) {
  return (
    <span className="balls">
      {pools.map((nums, i) => nums.map((n, j) => <Ball key={`${i}-${j}`} n={n} small={small} extra={i > 0} hit={!!hits?.[i]?.includes(n)} />))}
    </span>
  );
}

export function Card({ title, children }: { title?: ReactNode; children?: ReactNode }) {
  return <section className="card">{title ? <h2>{title}</h2> : null}{children}</section>;
}

// Explanations stay folded under "more" so the screens show results, not paragraphs.
export function Hint({ text }: { text: string }) {
  return <details className="info"><summary>{t('common.more')}</summary><p>{text}</p></details>;
}

export function Stat({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      {sub ? <span className="stat-sub">{sub}</span> : null}
    </div>
  );
}

export function Tabs({ items, active, onSelect }: { items: string[]; active: string; onSelect: (id: string) => void }) {
  return (
    <div className="tabs">
      {items.map((id) => <button key={id} className={cls('tab', id === active && 'active')} onClick={() => onSelect(id)}>{t(`tab.${id}`)}</button>)}
    </div>
  );
}

// A table from rows of cells; header: array of labels.
export function Table({ header, rows, className = '' }: { header: ReactNode[]; rows: ReactNode[][]; className?: string }) {
  return (
    <table className={cls('table', className)}>
      <thead><tr>{header.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

export interface CompareRow { label: string; observed: number; expected: number; tone?: string }

// Observed vs expected as paired horizontal bars.
export function CompareBars({ rows, format = (v: number) => num(v, Number.isInteger(v) ? 0 : 1) }: { rows: CompareRow[]; format?: (v: number) => string }) {
  const max = Math.max(1e-9, ...rows.flatMap((r) => [r.observed, r.expected]));
  return (
    <div className="cmp">
      {rows.map((r, i) => (
        <div className="cmp-row" key={i}>
          <span className="cmp-label">{r.label}</span>
          <div className="cmp-bars">
            <div className={cls('cmp-bar obs', r.tone)} style={{ width: `${(r.observed / max) * 100}%` }} title={`${t('stats.observed')}: ${format(r.observed)}`} />
            <div className="cmp-bar exp" style={{ width: `${(r.expected / max) * 100}%` }} title={`${t('stats.expected')}: ${format(r.expected)}`} />
          </div>
          <span className="cmp-val">{`${format(r.observed)} / ${format(r.expected)}`}</span>
        </div>
      ))}
    </div>
  );
}

// Vertical bar chart of a per-number value with an expected line.
// The axis starts below the smallest value, so the (small) differences between numbers show.
export function NumberChart({ values, expected, extra = false }: { values: { n: number; value: number; z: number }[]; expected: number; extra?: boolean }) {
  const lo = Math.max(0, Math.min(expected, ...values.map((v) => v.value)) * 0.85);
  const hi = Math.max(expected, ...values.map((v) => v.value)) * 1.02;
  const y = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="nchart">
      <div className="nchart-plot">
        <div className="nchart-line" style={{ bottom: y(expected) }} title={t('stats.expected')} />
        {values.map((v) => (
          <div className="nchart-col" key={v.n} title={`${v.n}: ${num(v.value)} (z = ${num(v.z, 2)})`}>
            <div className={cls('nchart-bar', extra && 'extra', v.z > 2 ? 'hot' : v.z < -2 ? 'cold' : '')} style={{ height: y(v.value) }} />
          </div>
        ))}
      </div>
      <div className="nchart-axis">{values.map((v) => <span key={v.n}>{v.n}</span>)}</div>
      <div className="nchart-scale muted">{`${num(lo)} – ${num(hi)}`}</div>
    </div>
  );
}

const pText = (p: number) => `p ${p < 0.0001 ? `< ${num(0.0001, 4)}` : `= ${num(p, 4)}`}`;
export const pTone = (p: number) => (p < 0.01 ? 'bad' : p < 0.05 ? 'warn' : 'good');

// The verdict of a chi-square test in words.
export function FitBadge({ fit }: { fit?: { p: number; chi2: number; df: number } | null }) {
  if (!fit) return null;
  const tone = pTone(fit.p);
  return <span className={`fit ${tone}`} title={t('stats.fitTitle', { chi2: num(fit.chi2, 1), df: fit.df })}>{`${pText(fit.p)} · ${t(`stats.fit.${tone}`)}`}</span>;
}

export function PBadge({ p }: { p: number }) {
  const tone = pTone(p);
  return <span className={`fit ${tone}`}>{`${pText(p)} · ${t(`stats.fit.${tone}`)}`}</span>;
}

export function ProgressBar({ value, label }: { value: number; label?: string | null }) {
  return (
    <div className="progress">
      <div className="progress-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      <span>{label || pct(value, 0)}</span>
    </div>
  );
}

// Progress of a lane's running job, re-rendered on the 'jobs' channel only.
export function LaneProgress({ lane, label }: { lane: string; label?: (info: Record<string, unknown> | undefined) => string | null }) {
  useStore('jobs');
  const job = state.jobs[lane];
  if (!job) return null;
  return <ProgressBar value={job.progress} label={label ? label(job.info) : null} />;
}

export function Spinner({ text }: { text?: string }) {
  return <div className="loading"><span className="spin" />{text || t('common.working')}</div>;
}

// A button that shows the app is working: disabled and spinning until the async handler finishes.
export function BusyButton({ className = 'btn', disabled, onClick, children, title }: { className?: string; disabled?: boolean; onClick: () => Promise<unknown> | void; children: ReactNode; title?: string }) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const click = async () => {
    if (busy) return;
    setBusy(true);
    try { await onClick(); } finally { if (mounted.current) setBusy(false); }
  };
  return (
    <button className={cls(className, busy && 'busy')} disabled={disabled || busy} onClick={click} title={title}>
      {busy ? <span className="spin" /> : null}{children}
    </button>
  );
}

// Number field that reports on commit (Enter, blur, spinner arrows), like the native change event.
export function NumberInput({ value, min, max, step = 1, className = '', onChange }: { value: number | null | undefined; min?: number; max?: number; step?: number; className?: string; onChange: (v: number | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const handler = useRef(onChange);
  handler.current = onChange;
  useEffect(() => {
    const input = ref.current!;
    const fire = () => handler.current(input.value === '' ? null : Number(input.value));
    input.addEventListener('change', fire);
    return () => input.removeEventListener('change', fire);
  }, []);
  useEffect(() => { if (ref.current && document.activeElement !== ref.current) ref.current.value = value == null ? '' : String(value); }, [value]);
  return <input ref={ref} type="number" className={cls('num', className)} defaultValue={value ?? ''} min={min} max={max} step={step} />;
}

export function Select<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: string) => void }) {
  return (
    <select value={String(value)} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, label]) => <option key={String(v)} value={String(v)}>{label}</option>)}
    </select>
  );
}

// Number picker of a pool (the coupon): toggles numbers, optionally limited to `limit`.
export function Picker({ size, chosen, extra = false, onToggle }: { size: number; chosen: number[]; extra?: boolean; onToggle: (n: number) => void }) {
  return (
    <div className="picker">
      {Array.from({ length: size }, (_, i) => i + 1).map((n) => (
        <button key={n} className={cls('ball pick', extra && 'extra-pick', chosen.includes(n) && 'on')} onClick={() => onToggle(n)}>{n}</button>
      ))}
    </div>
  );
}

export const comb = (n: number, k: number) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };
