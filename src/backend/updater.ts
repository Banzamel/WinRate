// App self-update from GitHub Releases (Tauri updater: latest.json + a signed installer).
// The app checks a few seconds after start, asks before downloading, and installs on request
// (the installer runs in passive mode and starts the updated app). Disabled in development.
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { isTauri } from './platform';
import type { AppUpdate } from '../types';

export function createUpdater(version: string, notify: (u: AppUpdate) => void) {
  const enabled = isTauri && !import.meta.env.DEV;
  let state: AppUpdate = { state: enabled ? 'idle' : 'dev', current: version };
  let pending: Update | null = null;
  const set = (patch: Partial<AppUpdate>) => { state = { ...state, ...patch }; notify(state); };

  const checkNow = async () => {
    if (!enabled) return state;
    set({ state: 'checking' });
    try {
      pending = await check();
      if (pending) set({ state: 'available', version: pending.version }); else set({ state: 'latest' });
    } catch (e) {
      set({ state: 'error', error: e instanceof Error ? e.message : String(e) });
    }
    return state;
  };

  const download = async () => {
    if (!pending) return;
    let total = 0; let got = 0;
    try {
      set({ state: 'downloading', pct: 0 });
      await pending.download((ev) => {
        if (ev.event === 'Started') total = ev.data.contentLength || 0;
        if (ev.event === 'Progress') { got += ev.data.chunkLength; set({ state: 'downloading', pct: total ? Math.round((got / total) * 100) : 0 }); }
      });
      set({ state: 'downloaded' });
    } catch (e) {
      set({ state: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  };

  const install = async () => {
    if (!pending) return;
    try {
      await pending.install(); // on Windows the installer takes over and the app exits
      await relaunch();
    } catch (e) {
      set({ state: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  };

  if (enabled) setTimeout(checkNow, 5000);
  return { status: () => state, check: checkNow, download, install };
}
