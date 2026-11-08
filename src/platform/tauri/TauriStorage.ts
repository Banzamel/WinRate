// Data folder access through the Rust commands (src-tauri/src/commands/storage.rs).
import { invoke } from '@tauri-apps/api/core';
import type { DataStorage } from '../types';

export class TauriStorage implements DataStorage {
  readText(path: string): Promise<string | null> {
    return invoke<string | null>('read_text', { path });
  }

  writeText(path: string, content: string): Promise<void> {
    return invoke('write_text', { path, content });
  }

  // Binary files travel as raw IPC bodies; a missing file comes back empty.
  async readBytes(path: string): Promise<Uint8Array | null> {
    const buf = await invoke<ArrayBuffer>('read_bytes', { path });
    return buf.byteLength ? new Uint8Array(buf) : null;
  }

  writeBytes(path: string, bytes: Uint8Array): Promise<void> {
    return invoke('write_bytes', bytes, { headers: { 'x-path': path } });
  }
}
