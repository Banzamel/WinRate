// Abbreviated wheel: the fewest tickets that guarantee t hits when t drawn numbers are among yours.
import { useDraft, useServices } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { errorText } from '../../../shared/lib/text';
import { Balls, BusyButton, Card, Hint, Picker, Select, toggleNumber } from '../../../shared/ui';
import type { Wheel } from '../../analysis';
import type { GameInfo } from '../../game';

interface Draft { numbers: number[]; guarantee: number; result: Wheel | null }

export function WheelCard({ game }: { game: GameInfo }) {
  const { t, num, money } = useI18n();
  const { analysis, toaster } = useServices();
  const pool = game.pools[0];
  const [st, setSt] = useDraft<Draft>(`wheel:${game.id}`, () => ({ numbers: [], guarantee: Math.min(3, pool.pick), result: null }));
  const change = (patch: Partial<Draft>) => setSt({ ...st, result: null, ...patch });
  const go = async () => {
    try { setSt({ ...st, result: await analysis.wheel(game.id, st.numbers, st.guarantee) }); } catch (e) { toaster.show(errorText(e), 'bad'); }
  };
  const copy = (tickets: number[][]) => { navigator.clipboard.writeText(tickets.map((tk) => tk.join(' ')).join('\n')); toaster.show(t('generator.copied'), 'good'); };
  const r = st.result;
  const guarantees = Array.from({ length: pool.pick - 1 }, (_, i) => i + 2);
  return (
    <Card title={t('wheel.title')}>
      <Hint text={t('wheel.intro', { k: pool.pick })} />
      <Picker size={pool.size} chosen={st.numbers} onToggle={(n) => change({ numbers: toggleNumber(st.numbers, n) })} />
      <div className="form-row">
        <span className="muted">{t('wheel.chosen', { n: st.numbers.length })}</span>
        <label>{t('wheel.guarantee')}<Select value={st.guarantee} options={guarantees.map((g): [number, string] => [g, t('wheel.guaranteeN', { t: g })])} onChange={(v) => change({ guarantee: Number(v) })} /></label>
        <button className="btn ghost" onClick={() => change({ numbers: [] })}>{t('wheel.clear')}</button>
        <BusyButton className="btn primary" disabled={st.numbers.length < pool.pick} onClick={go}>{t('wheel.go')}</BusyButton>
      </div>
      {r ? (
        <div className="result">
          <p>{t('wheel.summary', { n: num(r.tickets.length), full: num(r.full), m: r.numbers.length, t: r.t, cost: money(r.tickets.length * game.price.amount, game.price.currency) })}</p>
          <div className="tickets">{r.tickets.map((tk, i) => <div className="ticket" key={i}><span className="muted">{`${i + 1}.`}</span><Balls pools={[tk]} /></div>)}</div>
          <button className="btn" onClick={() => copy(r.tickets)}>{t('generator.copy')}</button>
        </div>
      ) : null}
      <Hint text={t(game.pools.length > 1 ? 'wheel.hintEuro' : 'wheel.hint')} />
    </Card>
  );
}
