// Runs worker tasks, one worker per lane: tasks in different lanes run in parallel (statistics need
// not wait for a simulation). Cancelling terminates the worker — the computation cannot be
// interrupted any other way — and a fresh one is started for the next task.
import type { FixedCensus } from '../../core/simulate';
import type { JobProgress } from './JobProgress';
import type { Params, Reply, Result, TaskName } from './worker/protocol';

interface Pending { resolve: (v: unknown) => void; reject: (e: Error) => void }
interface Lane { worker: Worker; pending: Map<number, Pending> }

export class JobRunner {
  private lanes = new Map<string, Lane>();
  private seq = 0;

  // onCensus: a census the worker computed, for the main thread to cache on disk.
  constructor(private readonly createWorker: () => Worker, private readonly progress: JobProgress, private readonly onCensus: (c: FixedCensus) => void) {}

  run<K extends TaskName>(lane: string, task: K, params: Params<K>): Promise<Result<K>> {
    const entry = this.lane(lane);
    const id = ++this.seq;
    this.progress.start(lane);
    return new Promise<Result<K>>((resolve, reject) => {
      entry.pending.set(id, { resolve: (v) => resolve(v as Result<K>), reject });
      entry.worker.postMessage({ id, task, params });
    }).finally(() => { if (!entry.pending.size) this.progress.finish(lane); });
  }

  cancel(lane: string): void {
    const entry = this.lanes.get(lane);
    if (!entry) return;
    this.lanes.delete(lane);
    entry.worker.terminate();
    for (const job of entry.pending.values()) job.reject(new Error('cancelled'));
    entry.pending.clear();
    this.progress.finish(lane);
  }

  private lane(name: string): Lane {
    const existing = this.lanes.get(name);
    if (existing) return existing;
    const entry: Lane = { worker: this.createWorker(), pending: new Map() };
    entry.worker.onmessage = ({ data }: MessageEvent<Reply>) => this.receive(name, entry, data);
    entry.worker.onerror = (e) => {
      for (const job of entry.pending.values()) job.reject(new Error(e.message || 'worker error'));
      entry.pending.clear();
      this.lanes.delete(name);
      entry.worker.terminate();
      this.progress.finish(name);
    };
    this.lanes.set(name, entry);
    return entry;
  }

  private receive(lane: string, entry: Lane, msg: Reply): void {
    const job = entry.pending.get(msg.id);
    if (!job) return;
    if (msg.progress !== undefined) { this.progress.update(lane, { progress: msg.progress, info: msg.info }); return; }
    entry.pending.delete(msg.id);
    if (msg.fixed) this.onCensus(msg.fixed);
    if (msg.error) job.reject(new Error(msg.error)); else job.resolve(msg.result);
  }
}
