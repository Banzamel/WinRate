// A browser tab has no window to control: the buttons do nothing, the tab's sizes stand in.
import type { WindowControls, WindowSize } from '../types';

export class BrowserWindow implements WindowControls {
  async show(): Promise<void> { /* always visible */ }
  async minimize(): Promise<void> { /* no window controls in a tab */ }
  async toggleMaximize(): Promise<void> { /* no window controls in a tab */ }
  async close(): Promise<void> { /* no window controls in a tab */ }

  async measure(): Promise<WindowSize> {
    return { maximized: false, outerWidth: window.outerWidth, innerWidth: window.innerWidth };
  }

  async onResized(handler: () => void): Promise<() => void> {
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }
}
