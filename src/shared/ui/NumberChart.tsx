import { useI18n } from '../i18n';
import { cls } from '../lib/text';

export interface NumberValue { n: number; value: number; z: number }

// Vertical bars of a per-number value with an expected line. The axis starts below the smallest
// value, so the (small) differences between numbers show.
export function NumberChart({ values, expected, extra = false }: { values: NumberValue[]; expected: number; extra?: boolean }) {
  const { t, num } = useI18n();
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
