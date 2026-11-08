import type { FilterDef, FilterValue } from '../../core/filters';
import type { Translator } from '../../shared/i18n';

// The fixed value of a filter, as text.
export function describeFilter(f: FilterDef, v: FilterValue, { t, num }: Translator): string {
  switch (f.kind) {
    case 'range': { const [lo, hi] = v as [number, number]; return `${lo}–${hi}`; }
    case 'max': case 'last': return `≤ ${v}`;
    case 'min': return `≥ ${v}`;
    case 'history': return t('filters.historyN', { n: v as number });
    case 'weight': case 'pairs': return `< ${num(v as number, 1)}`;
    default: return t('filters.on');
  }
}
