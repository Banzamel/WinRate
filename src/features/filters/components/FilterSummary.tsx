import { binom } from '../../../core/combinatorics';
import { useI18n } from '../../../shared/i18n';
import { Card, Hint, Stat } from '../../../shared/ui';
import type { FilterResult } from '../../analysis';
import type { GameInfo } from '../../game';

// How much the whole set removes and how many tickets are left (extra pools multiply them).
export function FilterSummary({ result, game }: { result: FilterResult; game: GameInfo }) {
  const { t, num, pct } = useI18n();
  const kept = result.allowedCount / result.total;
  const extra = game.pools.slice(1).reduce((n, p) => n * binom(p.size, p.pick), 1);
  const left = num(result.allowedCount * extra);
  return (
    <Card title={t('filters.summary')}>
      <div className="stats-row">
        <Stat label={t('filters.removed')} value={pct(1 - kept, 2)} sub={t('filters.ofCombos', { n: num(result.total - result.allowedCount) })} />
        <Stat label={t('filters.left')} value={left} sub={t('filters.jackpotNow', { n: left })} />
      </div>
      <Hint text={t('filters.honest')} />
    </Card>
  );
}
