// Filters: which combinations are thrown away and the exact share each removes. Filters can only
// be switched on and off; their values are fixed (game.filterValues).
import { useAppState } from '../../../app/hooks';
import { FILTERS } from '../../../core/filters';
import { useI18n } from '../../../shared/i18n';
import { Card, Hint, Spinner } from '../../../shared/ui';
import { useFilterCensus } from '../hooks/useFilterCensus';
import { FilterRow } from './FilterRow';
import { FilterSummary } from './FilterSummary';

export function FiltersView({ id }: { id: string }) {
  const { t } = useI18n();
  const game = useAppState((s) => s.games[id]);
  const { onOff, result, save } = useFilterCensus(id);
  const shares = result ? Object.fromEntries(result.filters.map((r) => [r.id, r.share])) : null;
  return (
    <>
      <Card title={t('filters.title')}>
        <Hint text={t('filters.intro')} />
        <div className="btn-row"><button className="btn" onClick={() => save(null)}>{t('filters.reset')}</button></div>
        <table className="table filters">
          <thead><tr>{[t('filters.filter'), t('filters.setting'), t('filters.removes')].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {FILTERS.map((f) => (
              <FilterRow key={f.id} filter={f} value={game.filterValues[f.id]} on={onOff[f.id]} share={shares ? shares[f.id] : null} onToggle={(on) => save({ [f.id]: on })} />
            ))}
          </tbody>
        </table>
      </Card>
      {result ? <FilterSummary result={result} game={game} /> : <Card><Spinner text={t('filters.computing')} /></Card>}
    </>
  );
}
