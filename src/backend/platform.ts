// Everything that touches the system goes through here: the Tauri commands and plugins in the
// app, or browser stand-ins when the UI runs in a plain browser (`npm run dev` without Rust).
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ask } from '@tauri-apps/plugin-dialog';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { openUrl } from '@tauri-apps/plugin-opener';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export type WindowAction = 'minimize' | 'maximize' | 'close';
export interface Picked { file: string; text: string }

export interface Platform {
  // Files inside the app's data folder (relative paths).
  readText(path: string): Promise<string | null>;
  writeText(path: string, text: string): Promise<void>;
  readBytes(path: string): Promise<Uint8Array | null>;
  writeBytes(path: string, bytes: Uint8Array): Promise<void>;
  // History shipped with the installer.
  bundledHistory(game: string): Promise<string | null>;
  importFile(): Promise<Picked | null>;
  exportFile(name: string, content: string): Promise<string | null>;
  fetch(url: string, init?: RequestInit): Promise<Response>;
  openExternal(url: string): Promise<void>;
  confirm(text: string): Promise<boolean>;
  window(action: WindowAction): Promise<void>;
  show(): Promise<void>;
}

const tauri: Platform = {
  readText: (path) => invoke<string | null>('read_text', { path }),
  writeText: (path, content) => invoke('write_text', { path, content }),
  async readBytes(path) {
    const buf = await invoke<ArrayBuffer>('read_bytes', { path });
    return buf.byteLength ? new Uint8Array(buf) : null;
  },
  writeBytes: (path, bytes) => invoke('write_bytes', bytes, { headers: { 'x-path': path } }),
  bundledHistory: (game) => invoke<string | null>('bundled_history', { game }),
  importFile: () => invoke<Picked | null>('import_file'),
  exportFile: (name, content) => invoke<string | null>('export_file', { name, content }),
  fetch: (url, init) => tauriFetch(url, init),
  openExternal: (url) => openUrl(url),
  confirm: (text) => ask(text, { title: 'WinRate', kind: 'warning' }),
  async window(action) {
    const win = getCurrentWindow();
    if (action === 'minimize') await win.minimize();
    if (action === 'maximize') await win.toggleMaximize();
    if (action === 'close') await win.close();
  },
  show: () => getCurrentWindow().show(),
};

// Browser stand-in: text files in localStorage, no binary cache, history from the dev server.
const KEY = 'winrate:';
const browser: Platform = {
  async readText(path) { try { return localStorage.getItem(KEY + path); } catch { return null; } },
  async writeText(path, text) { try { localStorage.setItem(KEY + path, text); } catch { /* full or blocked */ } },
  async readBytes() { return null; },
  async writeBytes() { /* not cached in the browser */ },
  async bundledHistory(game) {
    try { const res = await fetch(`/resources/history/${game}.txt`); return res.ok ? await res.text() : null; } catch { return null; }
  },
  importFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.csv,.tsv';
      input.onchange = async () => { const f = input.files?.[0]; resolve(f ? { file: f.name, text: await f.text() } : null); };
      input.click();
    });
  },
  async exportFile(name, content) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    return name;
  },
  fetch: (url, init) => fetch(url, init),
  async openExternal(url) { window.open(url, '_blank', 'noopener'); },
  async confirm(text) { return window.confirm(text); },
  async window() { /* no window controls in a browser tab */ },
  async show() { /* always visible */ },
};

export const platform: Platform = isTauri ? tauri : browser;
