// The app's store with the updates the features need, so nested state is never edited in place.
import type { Draw } from '../../core/games';
import type { AnalysisResults } from '../../features/analysis';
import { Store } from '../../shared/lib/Store';
import type { AppState } from './AppState';

export type ResultKind = keyof AnalysisResults;

export class AppStore extends Store<AppState> {
  setResult<K extends ResultKind>(kind: K, game: string, value: AnalysisResults[K][string] | undefined): void {
    this.set((s) => {
      const bucket = { ...s.results[kind] };
      if (value === undefined) delete bucket[game]; else bucket[game] = value;
      return { results: { ...s.results, [kind]: bucket } };
    });
  }

  // New history for a game: everything computed from the old one is dropped.
  setHistory(game: string, draws: Draw[]): void {
    this.set((s) => {
      const report = { ...s.results.report }; delete report[game];
      const filters = { ...s.results.filters }; delete filters[game];
      return { history: { ...s.history, [game]: draws }, results: { ...s.results, report, filters } };
    });
  }

  setTab(game: string, tab: string): void {
    this.set((s) => ({ tabs: { ...s.tabs, [game]: tab } }));
  }

  setDraft(key: string, value: unknown): void {
    this.set((s) => ({ drafts: { ...s.drafts, [key]: value } }));
  }
}
