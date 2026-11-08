// Overview: rules, schedule, exact odds of every prize tier and the latest draws.
import { useAdvanced, useAppState } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { Card, Hint } from '../../../shared/ui';
import { EvCard } from './EvCard';
import { LatestDrawsCard } from './LatestDrawsCard';
import { RulesRow } from './RulesRow';
import { TiersCard } from './TiersCard';

export function OverviewView({ id }: { id: string }) {
  const { t, num } = useI18n();
  const game = useAppState((s) => s.games[id]);
  const advanced = useAdvanced();
  return (
    <>
      <RulesRow game={game} />
      <div className="grid-2">
        <TiersCard game={game} />
        <LatestDrawsCard game={game} />
      </div>
      {advanced ? <EvCard game={game} /> : null}
      <Card title={t('overview.truth')}>
        <Hint text={t('overview.truthText', { n: num(game.combinations), years: num(game.combinations / game.drawsPerYear, 0) })} />
      </Card>
    </>
  );
}
