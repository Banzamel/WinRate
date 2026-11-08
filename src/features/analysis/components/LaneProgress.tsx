import { ProgressBar } from '../../../shared/ui';
import { useJob } from '../hooks/useJob';
import type { JobState } from '../types';

// Progress bar of a lane's running job; nothing when the lane is idle.
export function LaneProgress({ lane, label }: { lane: string; label?: (info: JobState['info']) => string | null }) {
  const job = useJob(lane);
  if (!job) return null;
  return <ProgressBar value={job.progress} label={label ? label(job.info) : null} />;
}
