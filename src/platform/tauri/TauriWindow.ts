// The frameless window: shown once the UI has rendered, and the title bar's buttons and sizes
// (src/shared/ui/titlebar).
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { WindowControls, WindowSize } from '../types';

export class TauriWindow implements WindowControls {
  show(): Promise<void> {
    return getCurrentWindow().show();
  }

  minimize(): Promise<void> {
    return getCurrentWindow().minimize();
  }

  toggleMaximize(): Promise<void> {
    return getCurrentWindow().toggleMaximize();
  }

  // A close request, as the system's close button would send.
  close(): Promise<void> {
    return getCurrentWindow().close();
  }

  async measure(): Promise<WindowSize> {
    const win = getCurrentWindow();
    const [maximized, outer, inner] = await Promise.all([win.isMaximized(), win.outerSize(), win.innerSize()]);
    return { maximized, outerWidth: outer.width, innerWidth: inner.width };
  }

  onResized(handler: () => void): Promise<() => void> {
    return getCurrentWindow().onResized(() => handler());
  }
}
