import type { Pair, PairStats } from '../../../core/stats';
import { useI18n } from '../../../shared/i18n';
import { Ball, Card, FitBadge, Hint, Table } from '../../../shared/ui';
import { PairHeatMap } from './PairHeatMap';

// Which numbers came out together more and less often than chance, with the heat map of all pairs.
export function PairsCard({ pairs, size }: { pairs: PairStats; size: number }) {
  const { t, num } = useI18n();
  const row = (q: Pair) => [<span className="balls"><Ball n={q.a} small /><Ball n={q.b} small /></span>, num(q.count), num(q.z, 2)];
  const head = [t('stats.pair'), t('stats.together'), 'z'];
  return (
    <Card title={t('stats.pairs')}>
      <div className="pairs">
        <div><h3>{t('stats.likes')}</h3><Table header={head} rows={pairs.strongest.slice(0, 10).map(row)} /></div>
        <div><h3>{t('stats.dislikes')}</h3><Table header={head} rows={pairs.weakest.slice(0, 10).map(row)} /></div>
        <div><h3>{t('stats.heat')}</h3><PairHeatMap pairs={pairs} size={size} /><Hint text={t('stats.heatHint')} /></div>
      </div>
      <p>{t('stats.pairsSummary', { expected: num(pairs.expected, 1), never: num(pairs.never), nObs: num(pairs.neighbours.count), nExp: num(pairs.neighbours.expected, 1) })}</p>
      <FitBadge fit={pairs.fit} />
      <Hint text={t('stats.pairsHint')} />
    </Card>
  );
}
