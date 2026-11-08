// File input and download link instead of native dialogs.
import type { Dialogs, Picked } from '../types';

export class BrowserDialogs implements Dialogs {
  importText(): Promise<Picked | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.csv,.tsv';
      input.onchange = async () => {
        const file = input.files?.[0];
        resolve(file ? { file: file.name, text: await file.text() } : null);
      };
      input.click();
    });
  }

  async exportText(name: string, content: string): Promise<string | null> {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    return name;
  }

  async confirm(text: string): Promise<boolean> {
    return window.confirm(text);
  }
}
