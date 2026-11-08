// The UI in a plain browser tab: good enough to work on the screens without Rust.
import type { Platform } from '../types';
import { BrowserDialogs } from './BrowserDialogs';
import { BrowserStorage } from './BrowserStorage';

export function createBrowserPlatform(): Platform {
  return {
    storage: new BrowserStorage(),
    dialogs: new BrowserDialogs(),
    window: { run: async () => { /* no window controls in a tab */ }, show: async () => { /* always visible */ } },
    updates: null,
    fetch: (url, init) => fetch(url, init),
    openExternal: async (url) => { window.open(url, '_blank', 'noopener'); },
    // The Vite dev server serves the repository root, including the fetched history.
    async bundledHistory(game) {
      try {
        const res = await fetch(`/resources/history/${game}.txt`);
        return res.ok ? await res.text() : null;
      } catch {
        return null;
      }
    },
  };
}
