// Text files in localStorage; no binary cache (the census is simply recomputed).
// Storage can be blocked or full: failures are ignored, the app then just does not remember.
import type { DataStorage } from '../types';

const PREFIX = 'winrate:';

export class BrowserStorage implements DataStorage {
  async readText(path: string): Promise<string | null> {
    try { return localStorage.getItem(PREFIX + path); } catch { return null; }
  }

  async writeText(path: string, text: string): Promise<void> {
    try { localStorage.setItem(PREFIX + path, text); } catch { /* full or blocked */ }
  }

  async readBytes(): Promise<Uint8Array | null> {
    return null;
  }

  async writeBytes(): Promise<void> { /* not cached in the browser */ }
}
