// What the app needs from the system. Implemented over Tauri (the app) and over browser APIs
// (`npm run dev` without Rust); nothing outside src/platform imports @tauri-apps/*.
import type { Fetcher } from '../core/history';

// Files inside the app's data folder (relative paths only).
export interface DataStorage {
  readText(path: string): Promise<string | null>;
  writeText(path: string, text: string): Promise<void>;
  readBytes(path: string): Promise<Uint8Array | null>;
  writeBytes(path: string, bytes: Uint8Array): Promise<void>;
}

export interface Picked { file: string; text: string }

export interface Dialogs {
  importText(): Promise<Picked | null>;
  exportText(name: string, content: string): Promise<string | null>;
  confirm(text: string): Promise<boolean>;
}

// The frameless window: shown once the UI has rendered, and what the title bar needs
// (src/shared/ui/titlebar): its buttons and the sizes telling whether it is maximized and
// whether Windows draws its border.
export interface WindowSize { maximized: boolean; outerWidth: number; innerWidth: number }
export interface WindowControls {
  show(): Promise<void>;
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
  measure(): Promise<WindowSize>;
  onResized(handler: () => void): Promise<() => void>;
}

export type DownloadEvent = { kind: 'started'; total: number } | { kind: 'progress'; bytes: number };
export interface AvailableUpdate {
  version: string;
  download(onEvent: (e: DownloadEvent) => void): Promise<void>;
  install(): Promise<void>; // the installer takes over; the app restarts
}
export interface UpdateSource { check(): Promise<AvailableUpdate | null> }

export interface Platform {
  storage: DataStorage;
  dialogs: Dialogs;
  window: WindowControls;
  updates: UpdateSource | null; // null: updates are not available (development, browser)
  fetch: Fetcher;
  openExternal(url: string): Promise<void>;
  bundledHistory(game: string): Promise<string | null>;
}
