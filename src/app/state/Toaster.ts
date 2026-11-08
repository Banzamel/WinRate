import type { AppStore } from './AppStore';
import type { Toast } from './AppState';

// Short messages in the corner; one at a time, gone after a few seconds.
export class Toaster {
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly store: AppStore, private readonly ms = 4000) {}

  show = (text: string, tone: Toast['tone'] = ''): void => {
    this.store.set({ toast: { text, tone, id: Date.now() } });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.store.set({ toast: null }), this.ms);
  };
}
