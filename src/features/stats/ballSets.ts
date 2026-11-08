// What ball tolerances could do at most, from published regulations (mass spread of a set).
export interface BallSet { id: string; massG: number; spreadG: number; diameterMm: number }

export const BALL_SETS: BallSet[] = [
  { id: 'nz', massG: 12, spreadG: 0.45, diameterMm: 50 }, // Lotto NZ: 11–13 g, set spread ≤ 0.45 g
  { id: 'texas', massG: 2.7, spreadG: 0.19, diameterMm: 40 }, // Texas: ping-pong style, ±0.095 g of the set average
];
