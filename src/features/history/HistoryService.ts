// Draw history of every game: one HistoryStore per game in data/history, mirrored into the app store.
import type { AppStore } from '../../app/state/AppStore';
import { GAMES, getGame, lastDraw, localDate, type Draw } from '../../core/games';
import { download, formatLine, HistoryStore, parseText, validateDraw } from '../../core/history';
import type { Platform } from '../../platform';
import { errorText } from '../../shared/lib/text';
import type { AutoRefreshEvent, HistoryChange, ManualResult } from './types';

export class HistoryService {
  private stores = new Map<string, HistoryStore>();

  constructor(private readonly platform: Platform, private readonly store: AppStore) {}

  private get io() {
    const { storage } = this.platform;
    return { read: (name: string) => storage.readText(`history/${name}`), write: (name: string, text: string) => storage.writeText(`history/${name}`, text) };
  }

  private storeOf(id: string): HistoryStore {
    const store = this.stores.get(id);
    if (!store) throw new Error(`history of ${id} is not open`);
    return store;
  }

  private publish(id: string): void { this.store.setHistory(id, [...this.storeOf(id).list()]); }

  // Opens every game's store; an empty one is seeded from the history shipped with the installer.
  async open(): Promise<void> {
    for (const game of Object.values(GAMES)) {
      const store = await HistoryStore.open(game, this.io);
      if (!store.list().length) {
        const bundled = await this.platform.bundledHistory(game.id);
        if (bundled) await store.merge(parseText(game, bundled).draws);
      }
      this.stores.set(game.id, store);
      this.publish(game.id);
    }
  }

  list(id: string): Draw[] { return this.storeOf(id).list(); }

  // Games whose newest stored draw is older than their latest draw get the new results.
  // Results are published a while after the draw; until then the next start tries again.
  // A store written by an older version (one draw per date) is downloaded again once.
  async refreshAll(onEvent: (e: AutoRefreshEvent) => void): Promise<void> {
    for (const game of Object.values(GAMES)) {
      const store = this.storeOf(game.id);
      const draws = store.list();
      const last = lastDraw(game);
      if (!store.outdated && draws.length && last && draws[draws.length - 1].date >= localDate(game, last)) continue;
      onEvent({ game: game.id, state: 'downloading' });
      try {
        const { draws: fresh } = await download(game, this.platform.fetch);
        const res = await store.merge(fresh, { replace: true });
        if (store.outdated) await store.save(); // nothing was missing: still mark the store as up to date
        if (res.added || res.changed) this.publish(game.id);
        onEvent({ game: game.id, state: 'done', ...res });
      } catch (e) {
        onEvent({ game: game.id, state: 'error', error: errorText(e) });
      }
    }
  }

  async download(id: string): Promise<HistoryChange> {
    try {
      const { url, draws, skipped } = await download(getGame(id), this.platform.fetch);
      return { url, skipped, ...(await this.merge(id, draws)) };
    } catch (e) {
      return { added: 0, changed: 0, total: this.list(id).length, error: errorText(e) };
    }
  }

  async importFile(id: string): Promise<HistoryChange | null> {
    const picked = await this.platform.dialogs.importText();
    if (!picked) return null;
    const { draws, skipped } = parseText(getGame(id), picked.text);
    return { file: picked.file, skipped, ...(await this.merge(id, draws)) };
  }

  async exportFile(id: string): Promise<{ file: string; count: number } | null> {
    const lines = this.list(id).map(formatLine);
    const file = await this.platform.dialogs.exportText(`${id}-history.csv`, `${lines.join('\n')}\n`);
    return file ? { file, count: lines.length } : null;
  }

  async add(id: string, draw: Draw): Promise<ManualResult> {
    const error = validateDraw(getGame(id), draw);
    return error ? { error } : { change: await this.merge(id, [draw]) };
  }

  async remove(id: string, date: string, pools: number[][]): Promise<boolean> {
    const removed = await this.storeOf(id).remove(date, pools);
    if (removed) this.publish(id);
    return removed;
  }

  private async merge(id: string, draws: Draw[]): Promise<HistoryChange> {
    const res = await this.storeOf(id).merge(draws, { replace: true });
    this.publish(id);
    return res;
  }
}
