import { useI18n } from '../i18n';
import { cls } from '../lib/text';

export interface CompareRow { label: string; observed: number; expected: number; tone?: string }

// Observed vs expected as paired horizontal bars.
export function CompareBars({ rows }: { rows: CompareRow[] }) {
  const { t, num } = useI18n();
  const format = (v: number) => num(v, Number.isInteger(v) ? 0 : 1);
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
