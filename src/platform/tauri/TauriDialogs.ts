// File dialogs run in Rust (the picked file is read and written there); confirm uses the dialog plugin.
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import type { Dialogs, Picked } from '../types';

export class TauriDialogs implements Dialogs {
  importText(): Promise<Picked | null> {
    return invoke<Picked | null>('import_file');
  }

  exportText(name: string, content: string): Promise<string | null> {
    return invoke<string | null>('export_file', { name, content });
  }

  confirm(text: string): Promise<boolean> {
    return ask(text, { title: 'WinRate', kind: 'warning' });
  }
}
