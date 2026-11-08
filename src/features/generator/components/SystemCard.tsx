// Lotto system bet: m numbers = every 6-number combination of them, with the prizes it guarantees.
// The app can pick the numbers so that the bets pass the filters ("within the filters").
import { useDraft, useServices } from '../../../app/hooks';
import { binom } from '../../../core/combinatorics';
import { useI18n } from '../../../shared/i18n';
import { errorText } from '../../../shared/lib/text';
import { BusyButton, Card, Hint, Picker, Select, toggleNumber } from '../../../shared/ui';
import type { SystemResult as Result } from '../../analysis';
import type { GameInfo } from '../../game';
import { SystemResult } from './SystemResult';

interface Draft { m: number; numbers: number[]; result: Result | null }

export function SystemCard({ game, system }: { game: GameInfo; system: { min: number; max: number } }) {
  const { t, money } = useI18n();
  const { analysis, toaster } = useServices();
  const pool = game.pools[0];
  const [st, setSt] = useDraft<Draft>(`system:${game.id}`, () => ({ m: system.min, numbers: [], result: null }));
  const change = (patch: Partial<Draft>) => setSt({ ...st, result: null, ...patch });
  const run = (auto: boolean) => async () => {
    try {
      const result = await analysis.system(game.id, st.m, auto ? null : st.numbers, 'filtered');
      setSt({ ...st, numbers: result.numbers, result });
    } catch (e) { toaster.show(errorText(e), 'bad'); }
  };
  const sizes = Array.from({ length: system.max - system.min + 1 }, (_, i) => system.min + i);
  const sizeLabel = (m: number) => t('system.sizeN', { m, bets: binom(m, pool.pick), cost: money(binom(m, pool.pick) * game.price.amount, game.price.currency) });
  return (
    <Card title={t('system.title')}>
      <Hint text={t('system.intro', { min: system.min, max: system.max })} />
      <div className="form-row">
        <label>{t('system.size')}<Select value={st.m} options={sizes.map((m): [number, string] => [m, sizeLabel(m)])} onChange={(v) => change({ m: Number(v), numbers: st.numbers.slice(0, Number(v)) })} /></label>
        <BusyButton className="btn primary" onClick={run(true)}>{t('system.auto')}</BusyButton>
        <BusyButton disabled={st.numbers.length !== st.m} onClick={run(false)}>{t('system.mine', { n: st.numbers.length, m: st.m })}</BusyButton>
        <button className="btn ghost" onClick={() => change({ numbers: [] })}>{t('wheel.clear')}</button>
      </div>
      <Picker size={pool.size} chosen={st.numbers} onToggle={(n) => change({ numbers: toggleNumber(st.numbers, n, st.m) })} />
      {st.result ? <SystemResult game={game} r={st.result} /> : null}
      <Hint text={t('system.hint')} />
    </Card>
  );
}
