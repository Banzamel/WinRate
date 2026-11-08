// Tauri updater: latest.json on GitHub Releases, installer signature checked against the public key
// in tauri.conf.json. On Windows the installer runs in passive mode and the app is restarted.
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';
import type { AvailableUpdate, DownloadEvent, UpdateSource } from '../types';

function wrap(update: Update): AvailableUpdate {
  return {
    version: update.version,
    download: (onEvent: (e: DownloadEvent) => void) => update.download((ev) => {
      if (ev.event === 'Started') onEvent({ kind: 'started', total: ev.data.contentLength || 0 });
      else if (ev.event === 'Progress') onEvent({ kind: 'progress', bytes: ev.data.chunkLength });
    }),
    install: async () => { await update.install(); await relaunch(); },
  };
}

export class TauriUpdates implements UpdateSource {
  async check(): Promise<AvailableUpdate | null> {
    const update = await check();
    return update ? wrap(update) : null;
  }
}
