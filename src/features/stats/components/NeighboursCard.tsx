import type { NeighbourPair, NeighbourStats } from '../../../core/stats';
import { useI18n } from '../../../shared/i18n';
import { Ball, Card, CompareBars, FitBadge, Hint, Table } from '../../../shared/ui';

// Which number comes next to which in the sorted results, against the exact expectation.
export function NeighboursCard({ nb }: { nb: NeighbourStats }) {
  const { t, num } = useI18n();
  const row = (p: NeighbourPair) => [<span className="balls"><Ball n={p.a} small />→<Ball n={p.b} small /></span>, num(p.count), num(p.expected, 1), num(p.z, 2)];
  const head = [t('stats.pair'), t('stats.together'), t('stats.expected'), 'z'];
  return (
    <Card title={t('nb.title')}>
      <Hint text={t('nb.intro')} />
      <div className="grid-2">
        <div><h3>{t('nb.often')}</h3><Table header={head} rows={nb.strongest.slice(0, 10).map(row)} /></div>
        <div><h3>{t('nb.rarely')}</h3><Table header={head} rows={nb.weakest.slice(0, 10).map(row)} /></div>
      </div>
      <h3>{t('nb.gaps')}</h3>
      <CompareBars rows={nb.gaps.slice(0, 20).map((o, i) => ({ label: `+${i + 1}`, observed: o, expected: nb.gapsExpected[i] }))} />
      <FitBadge fit={nb.fit} />
      <Hint text={t('nb.hint')} />
    </Card>
  );
}
