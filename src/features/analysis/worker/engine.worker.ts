// Background worker: everything that walks millions of combinations runs here, so the window never
// freezes. In: { id, task, params }; out: { id, progress } while working, then { id, result | error }.
import type { Progress, Reply, Request, TaskName } from './protocol';
import { backtestTask, untilHitTask } from './tasks/simulationTasks';
import { distributionsTask, filtersTask, reportTask } from './tasks/statsTasks';
import { checkTicketTask, evTask, generateTask, systemTask, wheelTask } from './tasks/ticketTasks';
import { WorkerCensus } from './WorkerCensus';

// Params arrive untyped over postMessage; each entry casts to its task's own params.
type Runner = (params: never, progress: Progress, census: WorkerCensus) => unknown;
const TASKS: Record<TaskName, Runner> = {
  distributions: distributionsTask,
  report: reportTask,
  filters: filtersTask,
  ev: evTask,
  system: systemTask,
  checkTicket: checkTicketTask,
  wheel: wheelTask,
  generate: generateTask,
  backtest: backtestTask,
  untilHit: untilHitTask,
};

const census = new WorkerCensus();
const reply = (msg: Reply) => self.postMessage(msg);

self.onmessage = ({ data: { id, task, params } }: MessageEvent<Request>) => {
  let last = 0;
  // Progress is throttled (the census reports every million combinations, the replays more often).
  const progress: Progress = (value, info) => {
    const now = Date.now();
    if (now - last < 150 && !info) return;
    last = now;
    reply({ id, progress: value, info });
  };
  census.fresh = null;
  try {
    const result = TASKS[task](params as never, progress, census);
    reply({ id, result, fixed: census.fresh });
  } catch (e) {
    reply({ id, error: e instanceof Error ? e.message : String(e) });
  }
};
