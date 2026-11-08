// Runs worker tasks one at a time per lane. Cancelling terminates the worker (the computation
// cannot be interrupted any other way) and a fresh one is started for the next task.
// Tasks in different lanes run in parallel (statistics need not wait for a simulation).
export interface Progress { lane: string; task: string; progress: number; info?: Record<string, unknown> }

interface Pending { resolve: (v: unknown) => void; reject: (e: Error) => void; task: string }
interface Lane { worker: Worker; pending: Map<number, Pending> }
export interface WorkerReply { id: number; progress?: number; info?: Record<string, unknown>; result?: unknown; error?: string; fixed?: unknown }

export class Jobs {
  private lanes = new Map<string, Lane>();
  private seq = 0;

  // onFixed: a filter census the worker computed and the main thread should save.
  constructor(private onProgress: (p: Progress) => void, private onFixed: (fixed: unknown) => void) {}

  private lane(name: string): Lane {
    const existing = this.lanes.get(name);
    if (existing) return existing;
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const entry: Lane = { worker, pending: new Map() };
    worker.onmessage = ({ data: msg }: MessageEvent<WorkerReply>) => {
      const job = entry.pending.get(msg.id);
      if (!job) return;
      if (msg.progress !== undefined) { this.onProgress({ lane: name, task: job.task, progress: msg.progress, info: msg.info }); return; }
      entry.pending.delete(msg.id);
      if (msg.fixed) this.onFixed(msg.fixed);
      if (msg.error) job.reject(new Error(msg.error)); else job.resolve(msg.result);
    };
    worker.onerror = (e) => {
      for (const job of entry.pending.values()) job.reject(new Error(e.message || 'worker error'));
      entry.pending.clear();
      this.lanes.delete(name);
      worker.terminate();
    };
    this.lanes.set(name, entry);
    return entry;
  }

  run<T = any>(lane: string, task: string, params: Record<string, unknown>): Promise<T> {
    const entry = this.lane(lane);
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      entry.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, task });
      entry.worker.postMessage({ id, task, params });
    });
  }

  cancel(lane: string) {
    const entry = this.lanes.get(lane);
    if (!entry) return;
    this.lanes.delete(lane);
    for (const job of entry.pending.values()) job.reject(new Error('cancelled'));
    entry.worker.terminate();
  }
}
