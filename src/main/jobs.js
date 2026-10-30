// Runs worker tasks one at a time per kind. Cancelling terminates the worker (the computation
// cannot be interrupted any other way) and a fresh one is started for the next task.
const path = require('path');
const { Worker } = require('worker_threads');

class Jobs {
  constructor(onProgress) {
    this.onProgress = onProgress;
    this.workers = new Map(); // lane -> { worker, pending: Map(id -> {resolve,reject}) }
    this.seq = 0;
  }

  lane(name) {
    if (this.workers.has(name)) return this.workers.get(name);
    const worker = new Worker(path.join(__dirname, 'worker.js'));
    const entry = { worker, pending: new Map() };
    worker.on('message', (msg) => {
      const job = entry.pending.get(msg.id);
      if (!job) return;
      if ('progress' in msg) { this.onProgress({ lane: name, task: job.task, progress: msg.progress, info: msg.info }); return; }
      entry.pending.delete(msg.id);
      if (msg.error) job.reject(new Error(msg.error)); else job.resolve(msg.result);
    });
    worker.on('error', (e) => { for (const job of entry.pending.values()) job.reject(e); entry.pending.clear(); this.workers.delete(name); });
    this.workers.set(name, entry);
    return entry;
  }

  // lane: tasks in different lanes run in parallel (statistics need not wait for a simulation).
  run(lane, task, params) {
    const entry = this.lane(lane);
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      entry.pending.set(id, { resolve, reject, task });
      entry.worker.postMessage({ id, task, params });
    });
  }

  cancel(lane) {
    const entry = this.workers.get(lane);
    if (!entry) return;
    this.workers.delete(lane);
    for (const job of entry.pending.values()) job.reject(new Error('cancelled'));
    entry.worker.terminate();
  }

  stopAll() { for (const lane of [...this.workers.keys()]) this.cancel(lane); }
}

module.exports = { Jobs };
