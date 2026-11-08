import { expect, test } from 'vitest';
import { ballEffect, normalQuantile, terminalVelocity } from '../../../src/core/physics';

test('normal quantiles', () => {
  expect(Math.abs(normalQuantile(0.975) - 1.959964)).toBeLessThan(1e-5);
  expect(Math.abs(normalQuantile(0.01) + 2.326348)).toBeLessThan(1e-5);
});

test('a lighter ball is lifted more easily, but the edge takes decades to detect', () => {
  expect(terminalVelocity(12, 50)).toBeGreaterThan(terminalVelocity(11, 50));
  const r = ballEffect({ massG: 12, spreadG: 0.45, diameterMm: 50, sensitivity: 0.5, size: 49, pick: 6, drawsPerYear: 156 });
  expect(r.edge).toBeGreaterThan(0);
  expect(r.edge).toBeLessThan(0.02);
  expect(r.yearsToDetect).toBeGreaterThan(10);
});
