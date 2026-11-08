// Filters: which combinations are thrown away and the exact share each removes, computed as soon
// as the tab opens and after every change. Filters can only be switched on and off; their values
// are fixed (game.filterValues).
import { useEffect } from 'react';
import { api } from '../backend/api';
import { t, num, pct } from '../i18n';
import { state, filtersOf, saveGameSettings, runJob, toast, notify, errorText } from '../store';
import { Card, Hint, Spinner, comb } from '../ui';
import type { FilterDef, GameInfo } from '../types';

const isOn = (v: unknown) => v !== null && v !== undefined && v !== false;

// The fixed value of a filter, as text.
function describe(f: FilterDef, v: any) {
  switch (f.kind) {
    case 'range': return `${v[0]}–${v[1]}`;
    case 'max': case 'last': return `≤ ${v}`;
    case 'min': return `≥ ${v}`;
    case 'history': return t('filters.historyN', { n: v });
    case 'weight': case 'pairs': return `< ${num(v, 1)}`;
    default: return t('filters.on');
  }
}

export function FiltersView({ id }: { id: string }) {
  const game = state.games[id];
  // On/off of every filter (older saves hold values: any value = on).
  const config: Record<string, boolean> = Object.fromEntries(state.filters.map((f) => [f.id, isOn(filtersOf(id)[f.id])]));
  const result = state.filterResult[id];

  useEffect(() => {
    if (state.filterResult[id] || state.jobs.filters) return;
    const cfg = { ...config };
    runJob('filters', async () => { state.filterResult[id] = await api.filters(id, cfg); notify(); })
      .catch((e) => toast(errorText(e), 'bad'));
  });

  const save = async (patch: Record<string, boolean> | null) => {
    if (state.jobs.filters) api.cancel('filters');
    await saveGameSettings(id, { filters: patch ? { ...config, ...patch } : null });
    delete state.filterResult[id];
    notify();
  };
  const share = result && Object.fromEntries(result.filters.map((r: any) => [r.id, r.share]));

  return (
    <>
      <Card title={t('filters.title')}>
        <Hint text={t('filters.intro')} />
        <div className="btn-row"><button className="btn" onClick={() => save(null)}>{t('filters.reset')}</button></div>
        <table className="table filters">
          <thead><tr>{[t('filters.filter'), t('filters.setting'), t('filters.removes')].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {state.filters.map((f) => (
              <tr key={f.id} className={config[f.id] ? '' : 'off'}>
                <td><strong>{t(`filter.${f.id}`)}</strong><div className="muted small">{t(`filter.${f.id}.hint`)}</div></td>
                <td>
                  <span className="filter-control">
                    <input type="checkbox" checked={config[f.id]} onChange={(e) => save({ [f.id]: e.target.checked })} />
                    <span className={config[f.id] ? '' : 'muted'}>{describe(f, game.filterValues[f.id])}</span>
                  </span>
                </td>
                <td>{share && config[f.id] ? pct(share[f.id], 2) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {result ? <Summary result={result} game={game} /> : <Card><Spinner text={t('filters.computing')} /></Card>}
    </>
  );
}

function Summary({ result, game }: { result: any; game: GameInfo }) {
  const kept = result.allowedCount / result.total;
  const extra = game.pools.slice(1).reduce((n, p) => n * comb(p.size, p.pick), 1);
  return (
    <Card title={t('filters.summary')}>
      <div className="stats-row">
        <div className="stat"><span className="stat-label">{t('filters.removed')}</span><strong>{pct(1 - kept, 2)}</strong><span className="stat-sub">{t('filters.ofCombos', { n: num(result.total - result.allowedCount) })}</span></div>
        <div className="stat"><span className="stat-label">{t('filters.left')}</span><strong>{num(result.allowedCount * extra)}</strong><span className="stat-sub">{t('filters.jackpotNow', { n: num(result.allowedCount * extra) })}</span></div>
      </div>
      <Hint text={t('filters.honest')} />
    </Card>
  );
}
