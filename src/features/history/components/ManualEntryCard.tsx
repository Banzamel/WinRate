import { useState } from 'react';
import { useI18n } from '../../../shared/i18n';
import { BusyButton, Card, Hint } from '../../../shared/ui';
import type { GameInfo } from '../../game';
import { useHistoryActions } from '../hooks/useHistoryActions';

// Manual entry of one draw (e.g. tonight's result before the source updates).
export function ManualEntryCard({ game }: { game: GameInfo }) {
  const { t } = useI18n();
  const { add } = useHistoryActions(game.id);
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [numbers, setNumbers] = useState<string[][]>(() => game.pools.map((p) => Array.from({ length: p.pick }, () => '')));
  const edit = (pool: number, at: number, value: string) =>
    setNumbers((all) => all.map((row, i) => (i === pool ? row.map((x, j) => (j === at ? value : x)) : row)));
  const save = () => add({ date: day, pools: numbers.map((row) => row.map(Number).sort((a, b) => a - b)) });
  return (
    <Card title={t('history.manual')}>
      <div className="manual">
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        {game.pools.map((p, i) => (
          <span key={i} className={`ball-inputs ${i ? 'extra' : ''}`}>
            {numbers[i].map((v, j) => <input key={j} type="number" className="num ball-input" min={1} max={p.size} value={v} onChange={(e) => edit(i, j, e.target.value)} />)}
          </span>
        ))}
        <BusyButton className="btn primary" onClick={save}>{t('history.add')}</BusyButton>
      </div>
      <Hint text={t('history.manualHint')} />
    </Card>
  );
}
