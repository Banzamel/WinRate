// The statistics report of a game: computed when the tab opens (the first time per pool also the
// exact pattern distributions), again when the hot/cold window changes.
import { useEffect, useRef, useState } from 'react';
import { useAppState, useServices } from '../../../app/hooks';
import { errorText } from '../../../shared/lib/text';
import { useJob } from '../../analysis';

export function useStatsReport(id: string) {
  const { analysis, store } = useServices();
  const report = useAppState((s) => s.results.report[id]);
  const recent = useAppState((s) => s.recent);
  const hasDraws = useAppState((s) => s.history[id].length > 0);
  const running = !!useJob('stats');
  const [error, setError] = useState<string | null>(null);
  const current = useRef(recent);
  current.current = recent;

  useEffect(() => {
    if (!hasDraws || report || running || error) return;
    const asked = recent;
    analysis.report(id, asked)
      .then((r) => { if (current.current === asked) store.setResult('report', id, r); })
      .catch((e) => setError(errorText(e)));
  }, [analysis, error, hasDraws, id, recent, report, running, store]);

  const setRecent = (value: number) => {
    store.set({ recent: value });
    store.setResult('report', id, undefined);
  };
  return { report, hasDraws, error, recent, setRecent };
}
