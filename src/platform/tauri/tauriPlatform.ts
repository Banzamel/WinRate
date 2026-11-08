import { invoke } from '@tauri-apps/api/core';
import { fetch as httpFetch } from '@tauri-apps/plugin-http';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { Platform } from '../types';
import { TauriDialogs } from './TauriDialogs';
import { TauriStorage } from './TauriStorage';
import { TauriUpdates } from './TauriUpdates';
import { TauriWindow } from './TauriWindow';

// withUpdates: false in development builds (there is no signed release to update to).
export function createTauriPlatform(withUpdates: boolean): Platform {
  return {
    storage: new TauriStorage(),
    dialogs: new TauriDialogs(),
    window: new TauriWindow(),
    updates: withUpdates ? new TauriUpdates() : null,
    // HTTP goes through Rust: the results sites send no CORS headers (scope: capabilities/default.json).
    fetch: (url, init) => httpFetch(url, init),
    openExternal: (url) => openUrl(url),
    bundledHistory: (game) => invoke<string | null>('bundled_history', { game }),
  };
}
