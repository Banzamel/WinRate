// Simulation: replays the past as if the future were unknown (backtest in advanced mode).
import { useAdvanced, useAppState } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { Card, Hint } from '../../../shared/ui';
import { LaneProgress } from '../../analysis';
import { useSimulation } from '../hooks/useSimulation';
import { BacktestCard } from './BacktestCard';
import { UntilHitCard } from './UntilHitCard';

export function SimulationView({ id }: { id: string }) {
  const { t, num } = useI18n();
  const game = useAppState((s) => s.games[id]);
  const advanced = useAdvanced();
  const sim = useSimulation(id);
  const label = (info?: { attempts?: number }) => (info?.attempts ? t('sim.attemptsSoFar', { n: num(info.attempts) }) : null);
  return (
    <>
      <Card title={t('sim.title')}>
        <Hint text={t('sim.intro')} />
        <div className="sim-progress">
          <LaneProgress lane="sim" label={label} />
          {sim.running ? <button className="btn ghost" onClick={sim.cancel}>{t('common.cancel')}</button> : null}
        </div>
      </Card>
      <div className="sim-cards">
        {advanced ? <BacktestCard game={game} sim={sim} /> : null}
        <UntilHitCard game={game} sim={sim} />
      </div>
    </>
  );
}
