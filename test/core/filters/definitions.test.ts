import { expect, test } from 'vitest';
import { GAMES } from '../../../src/core/games';
import { defaultFilters, filterValues, resolveFilters, splitConfig } from '../../../src/core/filters';

test('filters are only switched on and off; their values are fixed', () => {
  const pool = GAMES.lotto.pools[0];
  const values = filterValues(pool);
  expect(resolveFilters(pool, null)).toEqual(defaultFilters(pool));
  expect(defaultFilters(pool).maxConsPairs).toBeNull();
  // An edited value from an older save means "on" and is replaced by the fixed value.
  const r = resolveFilters(pool, { odd: [0, 6], maxRun: true, birthdays: false, maxConsPairs: 3 });
  expect(r.odd).toEqual(values.odd);
  expect(r.maxRun).toBe(values.maxRun);
  expect(r.maxConsPairs).toBe(values.maxConsPairs);
  expect(r.birthdays).toBeNull();
  expect(r.sum).toBeNull();
});

test('history filters are split from the fixed ones', () => {
  const { fixed, dynamic } = splitConfig(filterValues(GAMES.lotto.pools[0]));
  expect(fixed.history).toBeNull();
  expect(dynamic.history).toBe(6);
  expect(fixed.odd).toEqual([1, 5]);
  expect(dynamic.odd).toBeNull();
});
