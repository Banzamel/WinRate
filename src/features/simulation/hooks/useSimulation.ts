// Options and runs of the simulations. Same tickets as the Generator: every one passes the active
// filters (no strategy to choose).
import { useAppState, useServices } from '../../../app/hooks';
import { errorText } from '../../../shared/lib/text';
import { useJob } from '../../analysis';
import type { SimulationSettings } from '../../settings';

export type SimOptions = Required<SimulationSettings>;

export function useSimulation(id: string) {
  const { analysis, settings, store, toaster } = useServices();
  const saved = useAppState((s) => s.settings.games[id]?.simulation);
  const drawCount = useAppState((s) => s.history[id].length);
  const running = !!useJob('sim');
  const opts: SimOptions = { tickets: 10, tests: 200, targets: 1, maxAttempts: id === 'lotto' ? 1e8 : 1e9, system: 0, ...saved };
  const set = (patch: Partial<SimOptions>) => settings.setGame(id, { simulation: { ...opts, ...patch } });
  const fail = (e: unknown, cancelled: string) => toaster.show(errorText(e) === 'cancelled' ? cancelled : errorText(e), errorText(e) === 'cancelled' ? '' : 'bad');

  const runBacktest = (cancelled: string) =>
    analysis.backtest(id, 'filtered', opts.tickets, Math.min(opts.tests, drawCount - 1))
      .then((r) => store.setResult('backtest', id, r)).catch((e) => fail(e, cancelled));

  const runUntilHit = (cancelled: string) => {
    const targets = Array.from({ length: Math.min(opts.targets, drawCount) }, (_, i) => -1 - i);
    return analysis.untilHit(id, 'filtered', { targets, maxAttempts: opts.maxAttempts, system: opts.system || 0 })
      .then((r) => store.setResult('untilHit', id, r)).catch((e) => fail(e, cancelled));
  };

  return { opts, set, running, runBacktest, runUntilHit, cancel: () => analysis.cancel('sim') };
}
