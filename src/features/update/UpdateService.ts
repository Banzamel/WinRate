// App self-update: checks a few seconds after start, asks before downloading, installs on request.
// Without an update source (development, browser) it stays in the 'dev' state.
import type { AppStore } from '../../app/state/AppStore';
import type { AvailableUpdate, UpdateSource } from '../../platform';
import { errorText } from '../../shared/lib/text';
import type { AppUpdate } from './types';

export class UpdateService {
  private pending: AvailableUpdate | null = null;

  constructor(private readonly source: UpdateSource | null, private readonly store: AppStore) {
    this.store.set({ appUpdate: { state: source ? 'idle' : 'dev' } });
  }

  private update(patch: Partial<AppUpdate>): void {
    this.store.set((s) => ({ appUpdate: { ...s.appUpdate, ...patch } }));
  }

  scheduleCheck(delayMs = 5000): void {
    if (this.source) setTimeout(() => { this.check(); }, delayMs);
  }

  async check(): Promise<void> {
    if (!this.source) return;
    this.update({ state: 'checking' });
    try {
      this.pending = await this.source.check();
      this.update(this.pending ? { state: 'available', version: this.pending.version } : { state: 'latest' });
    } catch (e) {
      this.update({ state: 'error', error: errorText(e) });
    }
  }

  async download(): Promise<void> {
    if (!this.pending) return;
    let total = 0; let got = 0;
    try {
      this.update({ state: 'downloading', pct: 0 });
      await this.pending.download((e) => {
        if (e.kind === 'started') total = e.total;
        else { got += e.bytes; this.update({ pct: total ? Math.round((got / total) * 100) : 0 }); }
      });
      this.update({ state: 'downloaded' });
    } catch (e) {
      this.update({ state: 'error', error: errorText(e) });
    }
  }

  async install(): Promise<void> {
    if (!this.pending) return;
    try { await this.pending.install(); } catch (e) { this.update({ state: 'error', error: errorText(e) }); }
  }
}
