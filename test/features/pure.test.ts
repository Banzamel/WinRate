// The small pure helpers of the features.
import { expect, test } from 'vitest';
import { FILTERS } from '../../src/core/filters';
import { censusKey } from '../../src/features/analysis';
import { describeFilter } from '../../src/features/filters';
import { gameInfo, nextDrawOf } from '../../src/features/game';
import { bucketize } from '../../src/features/stats';
import { updateText } from '../../src/features/update';
import { Translator } from '../../src/shared/i18n';

const en = new Translator('en');

test('game info of Lotto', () => {
  const g = gameInfo('lotto', new Date('2026-10-30T12:00:00Z'));
  expect(g.combinations).toBe(13983816);
  expect(g.nextDraws[0]).toBe('2026-10-31T21:00:00.000Z');
  expect(nextDrawOf(g, Date.parse('2026-11-01T00:00:00Z'))).toBe('2026-11-03T21:00:00.000Z');
  expect(g.system).toEqual({ min: 7, max: 12 });
});

test('filter values as text', () => {
  const byId = (id: string) => FILTERS.find((f) => f.id === id)!;
  expect(describeFilter(byId('odd'), [1, 5], en)).toBe('1–5');
  expect(describeFilter(byId('maxRun'), 2, en)).toBe('≤ 2');
  expect(describeFilter(byId('minSpread'), 16, en)).toBe('≥ 16');
  expect(describeFilter(byId('numberWeight'), -0.5, en)).toBe('< -0.5');
});

test('wide distributions are bucketed', () => {
  const p = { values: [10, 11, 25, 26], observed: [1, 2, 3, 4], expected: [1, 1, 1, 0], probability: [], fit: { chi2: 0, df: 1, p: 1 } };
  expect(bucketize(p, 15).map((r) => [r.label, r.observed, r.expected])).toEqual([['0–14', 3, 2], ['15–29', 7, 1]]);
});

test('census keys ignore the history filters', () => {
  expect(censusKey('lotto', { odd: [1, 5], history: 6 })).toBe(censusKey('lotto', { odd: [1, 5], history: null }));
  expect(censusKey('lotto', { odd: [1, 5] })).not.toBe(censusKey('lotto', { odd: null }));
});

test('update states in words', () => {
  expect(updateText({ state: 'available', version: '0.6.0' }, '0.5.1', en)).toContain('0.6.0');
  expect(updateText({ state: 'latest' }, '0.5.1', en)).toContain('0.5.1');
});
