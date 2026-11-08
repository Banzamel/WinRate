// Which filters are on, switching them, and the exact census of the set — computed as soon as the
// tab opens and after every change.
import { useEffect, useMemo, useRef } from 'react';
import { useAppState, useServices } from '../../../app/hooks';
import { FILTERS, isOn } from '../../../core/filters';
import { errorText } from '../../../shared/lib/text';
import { useJob } from '../../analysis';

export function useFilterCensus(id: string) {
  const { analysis, settings, store, toaster } = useServices();
  const saved = useAppState((s) => s.settings.games[id]?.filters);
  const defaults = useAppState((s) => s.games[id].defaultFilters);
  const result = useAppState((s) => s.results.filters[id]);
  const running = !!useJob('filters');
  // On/off of every filter (older saves hold values: any value = on).
  const onOff = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, isOn((saved || defaults)[f.id])])), [saved, defaults]);
  // A census that finishes after the filters changed belongs to the old set and is dropped.
  const current = useRef(onOff);
  current.current = onOff;

  useEffect(() => {
    if (result || running) return;
    const asked = onOff;
    analysis.filters(id, asked)
      .then((r) => { if (current.current === asked) store.setResult('filters', id, r); })
      .catch((e) => { if (errorText(e) !== 'cancelled') toaster.show(errorText(e), 'bad'); });
  }, [analysis, id, onOff, result, running, store, toaster]);

  // patch null: back to the default set. The settings change first, so the census restarts with them.
  const save = async (patch: Record<string, boolean> | null) => {
    const saving = settings.setGame(id, { filters: patch ? { ...onOff, ...patch } : null });
    analysis.cancel('filters');
    store.setResult('filters', id, undefined);
    await saving;
  };
  return { onOff, result, save };
}
