// History: download, import, export, manual entry and the list of all draws.
import { useState } from 'react';
import { api } from '../backend/api';
import { t, num, date } from '../i18n';
import { state, loadHistory, historyChanged, toast } from '../store';
import { Card, Balls, Hint, BusyButton } from '../ui';
import type { MergeResult } from '../types';

const PAGE = 100;

export function HistoryView({ id }: { id: string }) {
  const game = state.games[id];
  const draws = state.history[id];
  const [shown, setShown] = useState(PAGE);
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [numbers, setNumbers] = useState<string[][]>(() => game.pools.map((p) => Array.from({ length: p.pick }, () => '')));

  const refresh = async (res: Partial<MergeResult> | null, okKey: string) => {
    if (!res) return;
    if (res.error) { toast(t('history.error', { error: res.error }), 'bad'); return; }
    toast(t(okKey, { added: num(res.added || 0), changed: num(res.changed || 0), total: num(res.total || 0), skipped: num(res.skipped || 0) }), 'good');
    await loadHistory(id, { force: true });
    historyChanged(id);
  };

  // Manual entry of one draw (e.g. tonight's result before the source updates).
  const add = async () => {
    const pools = numbers.map((inputs) => inputs.map(Number).sort((a, b) => a - b));
    const res = await api.addDraw(id, { date: day, pools });
    if (res.error) toast(t(`history.invalid.${res.error}`), 'bad'); else await refresh(res, 'history.added');
  };

  const remove = async (d: { date: string; pools: number[][] }) => {
    if (!(await api.confirm(t('history.removeConfirm', { date: date(d.date) })))) return;
    await api.removeDraw(id, d.date, d.pools);
    await refresh({ total: draws.length - 1 }, 'history.removed');
  };

  return (
    <>
      <div className="grid-2">
        <Card title={t('history.sources')}>
          <div className="btn-row">
            <BusyButton className="btn primary" onClick={async () => refresh(await api.downloadHistory(id), 'history.downloaded')}>{t('history.download')}</BusyButton>
            <BusyButton onClick={async () => refresh(await api.importHistory(id), 'history.imported')}>{t('history.import')}</BusyButton>
            <BusyButton onClick={async () => { const r = await api.exportHistory(id); if (r) toast(t('history.exported', { count: num(r.count) }), 'good'); }}>{t('history.export')}</BusyButton>
          </div>
          <Hint text={t('history.sourcesHint', { urls: game.sources.join(', ') })} />
          <Hint text={t('history.formats')} />
        </Card>
        <Card title={t('history.manual')}>
          <div className="manual">
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            {game.pools.map((p, i) => (
              <span key={i} className={`ball-inputs ${i ? 'extra' : ''}`}>
                {numbers[i].map((v, j) => (
                  <input key={j} type="number" className="num ball-input" min={1} max={p.size} value={v}
                    onChange={(e) => setNumbers((all) => all.map((row, a) => (a === i ? row.map((x, b) => (b === j ? e.target.value : x)) : row)))} />
                ))}
              </span>
            ))}
            <BusyButton className="btn primary" onClick={add}>{t('history.add')}</BusyButton>
          </div>
          <Hint text={t('history.manualHint')} />
        </Card>
      </div>
      <Card title={t('history.all', { n: num(draws.length) })}>
        {draws.length ? (
          <div className="draw-list long">
            {draws.slice(-shown).reverse().map((d, i) => (
              <div className="draw-row" key={`${d.date}-${i}`}>
                <span className="muted">{date(d.date)}</span>
                <Balls pools={d.pools} />
                <button className="icon-btn" title={t('history.remove')} onClick={() => remove(d)}>✕</button>
              </div>
            ))}
            {shown < draws.length ? <button className="btn ghost" onClick={() => setShown(shown + PAGE * 5)}>{t('history.more', { n: num(draws.length - shown) })}</button> : null}
          </div>
        ) : <p className="muted">{t('history.empty')}</p>}
      </Card>
    </>
  );
}
