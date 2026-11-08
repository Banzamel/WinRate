// Everything the screens show, in one immutable state. Results are cached per game and dropped
// when the game's history changes; drafts keep half-done input (pickers) across tab switches.
import type { Draw } from '../../core/games';
import type { AnalysisResults } from '../../features/analysis';
import type { GameInfo } from '../../features/game';
import type { Settings } from '../../features/settings';
import type { AppUpdate } from '../../features/update';

export interface Toast { text: string; tone: '' | 'good' | 'bad'; id: number }

export interface AppState {
  settings: Settings;
  version: string;
  games: Record<string, GameInfo>;
  view: string;
  tabs: Record<string, string>;
  history: Record<string, Draw[]>;
  results: AnalysisResults;
  recent: number; // window of the hot/cold numbers
  drafts: Record<string, unknown>;
  appUpdate: AppUpdate;
  toast: Toast | null;
}

export const emptyResults = (): AnalysisResults => ({ report: {}, filters: {}, tickets: {}, backtest: {}, untilHit: {} });
