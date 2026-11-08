// "Your numbers": a ticket picked or typed by the player, checked against the active filters and
// rated by how often a win would be shared.
import { useState } from 'react';
import { useDraft, useServices } from '../../../app/hooks';
import { useI18n } from '../../../shared/i18n';
import { errorText } from '../../../shared/lib/text';
import { BusyButton, Card, Hint, Picker, toggleNumber } from '../../../shared/ui';
import type { TicketCheck } from '../../analysis';
import type { GameInfo } from '../../game';
import { parseTyped } from '../coupons';
import { MineResult } from './MineResult';

interface Draft { pools: number[][]; result: TicketCheck | null }

export function MineCard({ game }: { game: GameInfo }) {
  const { t } = useI18n();
  const { analysis, toaster } = useServices();
  const [st, setSt] = useDraft<Draft>(`mine:${game.id}`, () => ({ pools: game.pools.map(() => []), result: null }));
  const [typed, setTyped] = useState('');
  const change = (pools: number[][]) => setSt({ pools, result: null });
  const full = st.pools.every((nums, i) => nums.length === game.pools[i].pick);
  const useTyped = () => change(parseTyped(typed, game.pools.map((p) => p.pick)));
  const toggle = (i: number, n: number) => change(st.pools.map((nums, j) => (j === i ? toggleNumber(nums, n, game.pools[i].pick) : nums)));
  const check = async () => {
    try { setSt({ ...st, result: await analysis.checkTicket(game.id, st.pools) }); } catch (e) { toaster.show(errorText(e), 'bad'); }
  };
  return (
    <Card title={t('mine.title')}>
      <div className="form-row">
        <label>{t('mine.typeLabel')}
          <input type="text" style={{ width: '240px' }} placeholder={t(game.pools.length > 1 ? 'mine.typeEuro' : 'mine.type')} value={typed}
            onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') useTyped(); }} />
        </label>
        <button className="btn" onClick={useTyped}>{t('mine.use')}</button>
        <BusyButton className="btn primary" disabled={!full} onClick={check}>{t('mine.check')}</BusyButton>
        <button className="btn ghost" onClick={() => change(game.pools.map(() => []))}>{t('wheel.clear')}</button>
      </div>
      {game.pools.map((p, i) => <Picker key={i} size={p.size} chosen={st.pools[i]} extra={i > 0} onToggle={(n) => toggle(i, n)} />)}
      {st.result ? <MineResult game={game} pools={st.pools} result={st.result} /> : null}
      <Hint text={t('mine.hint')} />
    </Card>
  );
}
