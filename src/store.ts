// UI state shared by the views, cached results per game, and the hooks that re-render on changes.
// Two channels: 'state' (anything the screens show) and 'jobs' (progress, which ticks often and
// should only re-render the progress bars and the title bar).
import { useSyncExternalStore } from 'react';
import { api } from './backend/api';
import type { AppUpdate, Draw, FilterDef, GameInfo, GameSettings, HistoryAuto, Settings } from './types';

export interface JobState { progress: number; info?: Record<string, unknown> }
export interface Toast { text: string; tone: string; id: number }

export const state = {
  settings: null as unknown as Settings,
  version: '',
  games: {} as Record<string, GameInfo>,
  filters: [] as FilterDef[],
  strategies: [] as string[],
  view: 'lotto',
  tab: { lotto: 'overview', eurojackpot: 'overview' } as Record<string, string>,
  history: {} as Record<string, Draw[]>,
  report: {} as Record<string, any>, // id -> statistics report
  recent: 50, // window of the hot/cold numbers
  filterResult: {} as Record<string, any>, // id -> census of the active filters
  tickets: {} as Record<string, any>, // id -> last generated tickets
  backtest: {} as Record<string, any>, // id -> last backtest
  untilHit: {} as Record<string, any>, // id -> last until-hit run
  wheel: {} as Record<string, { numbers: number[]; guarantee: number; result: any }>,
  system: {} as Record<string, { m: number; numbers: number[]; result: any }>,
  mine: {} as Record<string, { pools: number[][]; result: any }>,
  jobs: {} as Record<string, JobState | undefined>, // lane -> progress
  appUpdate: { state: 'dev' } as AppUpdate,
  historyAuto: {} as Record<string, HistoryAuto>,
  toast: null as Toast | null,
};

type Channel = 'state' | 'jobs';
const versions: Record<Channel, number> = { state: 0, jobs: 0 };
const listeners: Record<Channel, Set<() => void>> = { state: new Set(), jobs: new Set() };

export function notify(channel: Channel = 'state') {
  versions[channel]++;
  listeners[channel].forEach((fn) => fn());
}

// Re-renders the component whenever the channel changes; read the data from `state`.
export function useStore(channel: Channel = 'state') {
  return useSyncExternalStore(
    (fn) => { listeners[channel].add(fn); return () => { listeners[channel].delete(fn); }; },
    () => versions[channel],
  );
}

// Advanced mode shows the scientific extras (physics, patterns, backtests…); off by default.
export const advanced = () => !!(state.settings && state.settings.advanced);

export const gameSettings = (id: string): GameSettings => (state.settings.games && state.settings.games[id]) || {};
export const filtersOf = (id: string) => gameSettings(id).filters || state.games[id].defaultFilters;

export async function saveGameSettings(id: string, patch: Partial<GameSettings>) {
  state.settings = await api.setGameSettings(id, patch as Record<string, unknown>);
  notify();
}

export async function setSetting(patch: Partial<Settings>) {
  state.settings = await api.setSettings(patch);
  notify();
}

export async function loadHistory(id: string, { force = false } = {}) {
  if (!state.history[id] || force) state.history[id] = [...(await api.listHistory(id))];
  return state.history[id];
}

// Results depending on the history are dropped when it changes.
export function historyChanged(id: string) {
  delete state.report[id];
  delete state.filterResult[id];
  notify();
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string, tone = '') {
  state.toast = { text, tone, id: Date.now() };
  notify();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = null; notify(); }, 4000);
}

// Runs a background job of a lane; the job's progress shows in the title bar, and the views are
// re-rendered when it finishes.
export async function runJob<T>(lane: string, fn: () => Promise<T>): Promise<T> {
  state.jobs[lane] = { progress: 0 };
  notify('jobs');
  notify();
  try {
    return await fn();
  } finally {
    delete state.jobs[lane];
    notify('jobs');
    notify();
  }
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^.*Error: /, '');
