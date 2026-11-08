// The services of the app, created once at boot with their dependencies, and the initial state.
import { GAMES } from '../core/games';
import { AnalysisService, CensusCache, DistributionCache, JobProgress, JobRunner } from '../features/analysis';
import { gameInfo } from '../features/game';
import { HistoryService } from '../features/history';
import { DEFAULT_SETTINGS, SettingsService } from '../features/settings';
import { UpdateService } from '../features/update';
import type { Platform } from '../platform';
import { emptyResults } from './state/AppState';
import { AppStore } from './state/AppStore';
import { Toaster } from './state/Toaster';

export interface Services {
  platform: Platform;
  store: AppStore;
  jobProgress: JobProgress;
  toaster: Toaster;
  settings: SettingsService;
  history: HistoryService;
  analysis: AnalysisService;
  updates: UpdateService;
}

const createWorker = () => new Worker(new URL('../features/analysis/worker/engine.worker.ts', import.meta.url), { type: 'module' });

export function createServices(platform: Platform, version: string): Services {
  const store = new AppStore({
    settings: DEFAULT_SETTINGS,
    version,
    games: Object.fromEntries(Object.keys(GAMES).map((id) => [id, gameInfo(id)])),
    view: 'lotto',
    tabs: {},
    history: {},
    results: emptyResults(),
    recent: 50,
    drafts: {},
    appUpdate: { state: 'dev' },
    toast: null,
  });
  const jobProgress = new JobProgress();
  const census = new CensusCache(platform.storage);
  const jobs = new JobRunner(createWorker, jobProgress, (c) => { census.save(c); });
  const settings = new SettingsService(platform.storage, store);
  const history = new HistoryService(platform, store);
  const analysis = new AnalysisService(jobs, history, settings, census, new DistributionCache(platform.storage, jobs));
  const updates = new UpdateService(platform.updates, store);
  return { platform, store, jobProgress, toaster: new Toaster(store), settings, history, analysis, updates };
}
