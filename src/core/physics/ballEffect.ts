// Physics of the balls: how much can manufacturing tolerances move the chance of a number, and how
// many draws would it take to notice? In an air-mix machine a ball is lifted when the air drag beats
// its weight; its terminal velocity v = sqrt(2mg / (ρ·Cd·A)) grows with the square root of its mass,
// so a ball 1 % lighter is lifted ~0.5 % more easily. `sensitivity` (β) says how strongly the chance
// of being drawn follows the mass: chance ∝ (m / m̄)^(−β); β = 0.5 follows the terminal velocity,
// β = 1 is a pessimistic upper bound.
import { normalQuantile } from './normalQuantile';

const G = 9.81;
const AIR = 1.2; // kg/m³ at 20 °C
const CD_SPHERE = 0.47;

export function terminalVelocity(massG: number, diameterMm: number): number {
  const m = massG / 1000; const r = diameterMm / 2000;
  return Math.sqrt((2 * m * G) / (AIR * CD_SPHERE * Math.PI * r * r));
}

// massG: average ball mass; spreadG: heaviest − lightest in the set; size/pick: the pool.
export interface BallInput { massG: number; spreadG: number; diameterMm: number; sensitivity: number; size: number; pick: number; drawsPerYear: number }

export function ballEffect({ massG, spreadG, diameterMm, sensitivity, size, pick, drawsPerYear }: BallInput) {
  const p0 = pick / size;
  const light = massG - spreadG / 2;
  const edge = (massG / light) ** sensitivity - 1; // the lightest ball against the average one
  const vAvg = terminalVelocity(massG, diameterMm);
  const vLight = terminalVelocity(light, diameterMm);
  // Draws needed to tell this edge from chance for one ball (two-sided α = 1 %, power 90 %).
  const delta = p0 * edge;
  const n = delta > 0 ? (((normalQuantile(0.995) + normalQuantile(0.9)) * Math.sqrt(p0 * (1 - p0))) / delta) ** 2 : Infinity;
  return {
    edge, // relative extra chance of the lightest ball
    ticketEdge: (1 + edge) ** pick, // a ticket of the `pick` lightest balls (best case)
    vAvg, vLight,
    drawsToDetect: n,
    yearsToDetect: n / drawsPerYear,
  };
}
