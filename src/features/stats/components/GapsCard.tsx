import type { PoolReport } from '../../../core/stats';
import { useI18n } from '../../../shared/i18n';
import { Ball, Card, Hint, Table } from '../../../shared/ui';

// The numbers that have stayed out longest, and how likely that is by chance alone.
export function GapsCard({ main }: { main: PoolReport }) {
  const { t, num, pct } = useI18n();
  const rows = [...main.numbers].sort((a, b) => b.gap - a.gap).slice(0, 10)
    .map((x) => [<Ball n={x.n} small />, num(x.gap), x.avgGap ? num(x.avgGap, 1) : '–', num(x.maxGap), pct(x.gapChance, 2)]);
  return (
    <Card title={t('stats.gaps')}>
      <Table header={[t('stats.number'), t('stats.gap'), t('stats.avgGap'), t('stats.maxGap'), t('stats.gapChance')]} rows={rows} />
      <Hint text={t('stats.gapsHint')} />
    </Card>
  );
}
