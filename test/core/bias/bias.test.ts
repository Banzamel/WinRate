import { expect, test } from 'vitest';
import { analyze, drift, kolmogorovP, memory, phi, posterior, runsTest } from '../../../src/core/bias';
import { fakeDraws } from '../../helpers/fakeHistory';

test('a fair machine gives exactly fair estimates (no winner\'s curse)', () => {
  for (const seed of [1, 2, 3]) {
    const a = analyze(49, 6, fakeDraws(3000, seed));
    expect(a.posterior.shrink).toBe(0);
    expect(Math.abs(a.best.edge - 1)).toBeLessThan(1e-9);
  }
});

test('a biased ball is found', () => {
  const post = posterior(49, 6, fakeDraws(3000, 5, 49, 6, 13, 0.06));
  const top = [...post.numbers].sort((a, b) => b.p - a.p)[0];
  expect(top.n).toBe(13);
  expect(top.edge).toBeGreaterThan(0.1);
});

test('memory, runs and the Kolmogorov law', () => {
  expect(memory(49, 6, fakeDraws(2000, 7)).every((l) => Math.abs(l.z) < 4)).toBe(true);
  expect(Math.abs(kolmogorovP(1.36) - 0.049)).toBeLessThan(0.002); // the 5 % critical value
  expect(Math.abs(phi(1.96) - 0.975)).toBeLessThan(1e-4);
  expect(runsTest([1, 1, 1])).toBeNull();
  expect(runsTest(fakeDraws(500, 2).map((d) => d[0]))?.p).toBeGreaterThan(0.001);
});

test('a fair history shows no drift', () => {
  expect(drift(49, fakeDraws(1500, 4)).overall).toBeGreaterThan(0.001);
});
