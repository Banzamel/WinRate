// Backtest: for each of the last N draws only the earlier ones are known; the filtered player plays
// K tickets, scored against the real result next to a plain random player.
import { useAppState } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { Card, Hint, NumberInput } from '../../../shared/ui';
import type { GameInfo } from '../../game';
import type { useSimulation } from '../hooks/useSimulation';
import { BacktestResult } from './BacktestResult';

export function BacktestCard({ game, sim }: { game: GameInfo; sim: ReturnType<typeof useSimulation> }) {
  const { t } = useI18n();
  const result = useAppState((s) => s.results.backtest[game.id]);
  return (
    <Card title={t('sim.backtest')}>
      <div className="form-row">
        <label>{t('sim.tickets')}<NumberInput value={sim.opts.tickets} min={1} max={10000} onChange={(v) => sim.set({ tickets: v || 1 })} /></label>
        <label>{t('sim.tests')}<NumberInput value={sim.opts.tests} min={1} max={20000} onChange={(v) => sim.set({ tests: v || 1 })} /></label>
        <button className="btn primary" disabled={sim.running} onClick={() => sim.runBacktest(t('sim.cancelled'))}>{t('sim.run')}</button>
      </div>
      <Hint text={t('sim.backtestHint')} />
      {result ? <BacktestResult r={result} game={game} /> : null}
    </Card>
  );
}
