import { useServices } from '../../../app/hooks';
import { useStore } from '../../../shared/hooks/useStore';
import type { JobState } from '../types';

// The running job of a lane (undefined when idle); re-renders only on progress of the jobs.
export function useJob(lane: string): JobState | undefined {
  return useStore(useServices().jobProgress, (jobs) => jobs[lane]);
}

// All running jobs (the title bar pills).
export function useJobs(): Record<string, JobState | undefined> {
  return useStore(useServices().jobProgress, (jobs) => jobs);
}
