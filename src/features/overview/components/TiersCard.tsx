import { useI18n } from '../../../shared/i18n';
import { Card, Hint, Table } from '../../../shared/ui';
import type { GameInfo } from '../../game';

// Exact odds of every prize tier.
export function TiersCard({ game }: { game: GameInfo }) {
  const { t, num, pct, money } = useI18n();
  return (
    <Card title={t('rules.tiers')}>
      <Table
        header={[t('rules.tier'), t('rules.odds'), t('rules.probability'), t('rules.prize')]}
        rows={game.tiers.map((tier) => [
          <strong>{tier.id}</strong>,
          `1 : ${num(tier.oneIn, tier.oneIn < 100 ? 1 : 0)}`,
          pct(tier.probability, tier.probability < 0.001 ? 6 : 3),
          tier.fixed ? money(tier.fixed, game.price.currency) : t('rules.parimutuel'),
        ])}
      />
      <Hint text={t(`rules.${game.id}.notes`)} />
    </Card>
  );
}
