// Until it hits: for a past draw (result known to the referee only) tickets are drawn until one
// matches, counting the attempts — and what they would have cost.
import { useAppState } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { Card, Hint, NumberInput, Select } from '../../../shared/ui';
import type { GameInfo } from '../../game';
import type { useSimulation } from '../hooks/useSimulation';
import { UntilHitResult } from './UntilHitResult';

export function UntilHitCard({ game, sim }: { game: GameInfo; sim: ReturnType<typeof useSimulation> }) {
  const { t } = useI18n();
  const result = useAppState((s) => s.results.untilHit[game.id]);
  const sys = game.system;
  const betTypes: [number, string][] = sys
    ? [[0, t('sim.single')], ...Array.from({ length: sys.max - sys.min + 1 }, (_, i): [number, string] => [sys.min + i, t('sim.systemN', { m: sys.min + i })])]
    : [];
  return (
    <Card title={t('sim.untilHit')}>
      <div className="form-row">
        <label>{t('sim.targets')}<NumberInput value={sim.opts.targets} min={1} max={50} onChange={(v) => sim.set({ targets: v || 1 })} /></label>
        {sys ? <label>{t('sim.betType')}<Select value={sim.opts.system || 0} options={betTypes} onChange={(v) => sim.set({ system: Number(v) })} /></label> : null}
        <label>{t('sim.maxAttempts')}<NumberInput value={sim.opts.maxAttempts} min={1e5} step={1e6} onChange={(v) => sim.set({ maxAttempts: v || 1e8 })} /></label>
        <button className="btn primary" disabled={sim.running} onClick={() => sim.runUntilHit(t('sim.cancelled'))}>{t('sim.run')}</button>
      </div>
      <Hint text={t('sim.untilHitHint')} />
      {result ? <UntilHitResult r={result} game={game} /> : null}
    </Card>
  );
}
