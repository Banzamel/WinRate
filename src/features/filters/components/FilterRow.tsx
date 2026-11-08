import type { FilterDef, FilterValue } from '../../../core/filters';
import { useI18n } from '../../../shared/i18n';
import { describeFilter } from '../describeFilter';

interface Props { filter: FilterDef; value: FilterValue; on: boolean; share: number | null; onToggle: (on: boolean) => void }

// One filter: what it does, its fixed value with the switch, and the share it removes.
export function FilterRow({ filter, value, on, share, onToggle }: Props) {
  const i18n = useI18n();
  const { t, pct } = i18n;
  return (
    <tr className={on ? '' : 'off'}>
      <td><strong>{t(`filter.${filter.id}`)}</strong><div className="muted small">{t(`filter.${filter.id}.hint`)}</div></td>
      <td>
        <span className="filter-control">
          <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} />
          <span className={on ? '' : 'muted'}>{describeFilter(filter, value, i18n)}</span>
        </span>
      </td>
      <td>{share !== null && on ? pct(share, 2) : '–'}</td>
    </tr>
  );
}
