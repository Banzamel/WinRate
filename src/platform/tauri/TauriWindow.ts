// The frameless window: our own title bar buttons, and showing it once the UI has rendered.
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { WindowAction, WindowControls } from '../types';

export class TauriWindow implements WindowControls {
  async run(action: WindowAction): Promise<void> {
    const win = getCurrentWindow();
    if (action === 'minimize') await win.minimize();
    else if (action === 'maximize') await win.toggleMaximize();
    else await win.close();
  }

  show(): Promise<void> {
    return getCurrentWindow().show();
  }
}
