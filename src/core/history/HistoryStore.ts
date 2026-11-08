// The draws of one game, persisted as one JSON file through an injected IO, so the store works the
// same over Tauri commands in the app and over plain files in tests and scripts.
// A date can hold several draws (Lotto drew twice a day on many days of 1965–1991): draws of one
// date are told apart by their order, as in the source.
import type { Draw, Game } from '../games';
import { sortDraws, validateDraw } from './validate';

export interface HistoryIo {
  read(name: string): Promise<string | null> | string | null;
  write(name: string, text: string): Promise<void> | void;
}

export interface MergeCounts { added: number; changed: number; total: number }

// 2: several draws per date. Stores of format 1 kept one draw per date and need a full download.
const STORE_FORMAT = 2;

export class HistoryStore {
  private draws: Draw[] = [];
  private format = 0;
  readonly file: string;

  private constructor(readonly game: Game, private readonly io: HistoryIo) {
    this.file = `${game.id}.json`;
  }

  static async open(game: Game, io: HistoryIo): Promise<HistoryStore> {
    const store = new HistoryStore(game, io);
    try {
      const text = await io.read(store.file);
      if (text) {
        const saved = JSON.parse(text) as { draws?: Draw[]; format?: number };
        store.draws = sortDraws(saved.draws || []);
        store.format = saved.format || 1;
      }
    } catch { /* unreadable: start empty */ }
    return store;
  }

  get outdated(): boolean { return this.draws.length > 0 && this.format < STORE_FORMAT; }

  list(): Draw[] { return this.draws; }

  async save(): Promise<void> {
    await this.io.write(this.file, JSON.stringify({ game: this.game.id, format: STORE_FORMAT, updated: new Date().toISOString(), draws: this.draws }));
    this.format = STORE_FORMAT;
  }

  // Adds new draws. The n-th draw of a date is matched with the n-th stored draw of that date; a
  // stored one is replaced only when `replace` is set.
  async merge(draws: Draw[], { replace = false } = {}): Promise<MergeCounts> {
    const byDate = new Map<string, Draw[]>();
    for (const d of this.draws) byDate.set(d.date, [...(byDate.get(d.date) || []), d]);
    const seen = new Map<string, number>();
    let added = 0; let changed = 0;
    for (const d of draws) {
      if (validateDraw(this.game, d)) continue;
      const n = seen.get(d.date) || 0;
      seen.set(d.date, n + 1);
      const day = byDate.get(d.date) || [];
      byDate.set(d.date, day);
      if (n >= day.length) { day.push(d); added++; } else if (replace && JSON.stringify(day[n].pools) !== JSON.stringify(d.pools)) { day[n] = d; changed++; }
    }
    this.draws = sortDraws([...byDate.values()].flat());
    if (added || changed) await this.save();
    return { added, changed, total: this.draws.length };
  }

  // Removes the draw of a date with these numbers (all draws of the date when pools are not given).
  async remove(date: string, pools?: number[][]): Promise<boolean> {
    const before = this.draws.length;
    const key = pools && JSON.stringify(pools);
    const i = key ? this.draws.findIndex((d) => d.date === date && JSON.stringify(d.pools) === key) : -1;
    this.draws = key ? this.draws.filter((_, j) => j !== i) : this.draws.filter((d) => d.date !== date);
    if (this.draws.length !== before) await this.save();
    return this.draws.length !== before;
  }
}
