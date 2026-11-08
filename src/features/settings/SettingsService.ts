// User settings, persisted as settings.json in the data folder and mirrored into the app store.
import type { AppStore } from '../../app/state/AppStore';
import type { DataStorage } from '../../platform';
import type { GameSettings, Settings } from './types';

const FILE = 'settings.json';
export const DEFAULT_SETTINGS: Settings = { language: 'pl', games: {} };

export class SettingsService {
  constructor(private readonly storage: DataStorage, private readonly store: AppStore) {}

  async load(): Promise<Settings> {
    let settings = DEFAULT_SETTINGS;
    try {
      const text = await this.storage.readText(FILE);
      if (text) settings = { ...DEFAULT_SETTINGS, ...(JSON.parse(text) as Partial<Settings>) };
    } catch { /* first run or unreadable: defaults */ }
    this.store.set({ settings });
    return settings;
  }

  get(): Settings { return this.store.get().settings; }

  game(id: string): GameSettings { return this.get().games[id] || {}; }

  async set(patch: Partial<Settings>): Promise<void> {
    const settings = { ...this.get(), ...patch };
    this.store.set({ settings });
    await this.storage.writeText(FILE, JSON.stringify(settings, null, 2));
  }

  setGame(id: string, patch: Partial<GameSettings>): Promise<void> {
    return this.set({ games: { ...this.get().games, [id]: { ...this.game(id), ...patch } } });
  }
}
