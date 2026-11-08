import type { PatternStat } from '../../../core/stats';
import { useI18n } from '../../../shared/i18n';
import { Card, CompareBars, FitBadge, Hint, type CompareRow } from '../../../shared/ui';
import { bucketize } from '../bucketize';

// Wide metrics are grouped into buckets of this width.
const WIDE: Record<string, number> = { sum: 15, spread: 5, maxGap: 3 };

function Pattern({ metric, p }: { metric: string; p: PatternStat }) {
  const { t } = useI18n();
  const rows: CompareRow[] = WIDE[metric]
    ? bucketize(p, WIDE[metric])
    : p.values.map((v, i) => ({ label: String(v), observed: p.observed[i], expected: p.expected[i] })).filter((r) => r.expected >= 0.05 || r.observed);
  return (
    <div className="pattern">
      <h3>{t(`metric.${metric}`)}{' '}<FitBadge fit={p.fit} /></h3>
      <CompareBars rows={rows} />
    </div>
  );
}

// Shapes of the real draws (odd/even, runs, decades…) next to all combinations.
export function PatternsCard({ patterns }: { patterns: Record<string, PatternStat> }) {
  const { t } = useI18n();
  const entries = Object.entries(patterns);
  return (
    <Card title={t('stats.patterns')}>
      <div className="patterns">{entries.filter(([m]) => !WIDE[m]).map(([m, p]) => <Pattern key={m} metric={m} p={p} />)}</div>
      <div className="patterns">{entries.filter(([m]) => WIDE[m]).map(([m, p]) => <Pattern key={m} metric={m} p={p} />)}</div>
      <Hint text={t('stats.patternsHint')} />
    </Card>
  );
}
