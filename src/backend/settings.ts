// User settings persisted as JSON in the data folder (settings.json).
import { platform } from './platform';
import type { Settings, GameSettings } from '../types';

const FILE = 'settings.json';
const DEFAULTS: Settings = {
  language: 'pl',
  // Per game: active filters (null = defaults of the game), generator and simulation options, coupons.
  games: {},
};

let data: Settings = { ...DEFAULTS };

export async function loadSettings(): Promise<Settings> {
  try {
    const text = await platform.readText(FILE);
    if (text) data = { ...DEFAULTS, ...JSON.parse(text) };
  } catch { /* first run or unreadable: defaults */ }
  return data;
}

export const getSettings = () => data;

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  data = { ...data, ...patch };
  await platform.writeText(FILE, JSON.stringify(data, null, 2));
  return data;
}

export const gameSettingsOf = (id: string): GameSettings => data.games[id] || {};

export const setGameSettings = (id: string, patch: Partial<GameSettings>) =>
  setSettings({ games: { ...data.games, [id]: { ...gameSettingsOf(id), ...patch } } });
