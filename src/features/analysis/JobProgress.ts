// Progress of the running jobs per lane, in its own store: it ticks several times a second and
// should only re-render the progress bars, not the screens.
import { Store } from '../../shared/lib/Store';
import type { JobState } from './types';

export class JobProgress extends Store<Record<string, JobState | undefined>> {
  constructor() { super({}); }

  start(lane: string): void { this.set({ [lane]: { progress: 0 } }); }

  update(lane: string, state: JobState): void { this.set({ [lane]: state }); }

  finish(lane: string): void { this.set({ [lane]: undefined }); }

  running(lane: string): boolean { return !!this.get()[lane]; }
}
