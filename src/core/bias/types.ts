export interface PosteriorNumber { n: number; observed: number; p: number; sd: number; edge: number; above: number }

export interface Posterior {
  p0: number;
  effectiveDraws: number;
  signal: number;
  noise: number;
  shrink: number;
  pValue: number;
  numbers: PosteriorNumber[];
}

export interface DriftNumber { n: number; k: number; p: number; at: number; before: number; after: number | null }
export interface Drift { numbers: DriftNumber[]; overall: number }

export interface MemoryLag { lag: number; shared: number; expected: number; z: number; p: number }
export interface RunsTest { runs: number; expected: number; z: number; p: number }

export interface BiasAnalysis {
  posterior: Posterior;
  best: { numbers: number[]; edge: number };
  drift: Drift;
  memory: MemoryLag[];
  runs: RunsTest | null;
}
