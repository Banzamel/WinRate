// Physics of the balls: how much can manufacturing tolerances move the chance of a number, and how
// many draws would it take to notice? In an air-mix machine a ball is lifted when the air drag beats
// its weight; its terminal velocity v = sqrt(2mg / (ρ·Cd·A)) grows with the square root of its mass,
// so a ball 1 % lighter is lifted ~0.5 % more easily. `sensitivity` (β) says how strongly the chance
// of being drawn follows the mass: chance ∝ (m / m̄)^(−β); β = 0.5 follows the terminal velocity,
// β = 1 is a pessimistic upper bound.
const G = 9.81;
const AIR = 1.2; // kg/m³ at 20 °C
const CD_SPHERE = 0.47;

export function terminalVelocity(massG, diameterMm) {
  const m = massG / 1000; const r = diameterMm / 2000;
  return Math.sqrt((2 * m * G) / (AIR * CD_SPHERE * Math.PI * r * r));
}

// Inverse normal CDF (Acklam) for the power calculation.
function zOf(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = p < 0.5 ? p : 1 - p;
  let x;
  if (q < 0.02425) { const u = Math.sqrt(-2 * Math.log(q)); x = (((((c[0] * u + c[1]) * u + c[2]) * u + c[3]) * u + c[4]) * u + c[5]) / ((((d[0] * u + d[1]) * u + d[2]) * u + d[3]) * u + 1); }
  else { const u = q - 0.5; const r = u * u; x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * u) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  return p < 0.5 ? -x : x;
}

// massG: average ball mass; spreadG: heaviest − lightest in the set; size/pick: the pool.
export function ballEffect({ massG, spreadG, diameterMm, sensitivity, size, pick, drawsPerYear }) {
  const p0 = pick / size;
  const light = massG - spreadG / 2;
  const edge = (massG / light) ** sensitivity - 1; // the lightest ball against the average one
  const vAvg = terminalVelocity(massG, diameterMm);
  const vLight = terminalVelocity(light, diameterMm);
  // Draws needed to tell this edge from chance for one ball (two-sided α = 1 %, power 90 %).
  const delta = p0 * edge;
  const n = delta > 0 ? (((zOf(0.995) + zOf(0.9)) * Math.sqrt(p0 * (1 - p0))) / delta) ** 2 : Infinity;
  return {
    edge, // relative extra chance of the lightest ball
    ticketEdge: (1 + edge) ** pick, // a ticket of the `pick` lightest balls (best case)
    vAvg, vLight,
    drawsToDetect: n,
    yearsToDetect: n / drawsPerYear,
  };
}
