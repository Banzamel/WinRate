import { createBrowserPlatform } from './browser/browserPlatform';
import { createTauriPlatform } from './tauri/tauriPlatform';
import type { Platform } from './types';

export type { AvailableUpdate, DataStorage, Dialogs, DownloadEvent, Picked, Platform, UpdateSource, WindowControls, WindowSize } from './types';

export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function createPlatform({ updates }: { updates: boolean }): Platform {
  return isTauri() ? createTauriPlatform(updates) : createBrowserPlatform();
}
