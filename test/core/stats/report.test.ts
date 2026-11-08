import { expect, test } from 'vitest';
import { distributions } from '../../../src/core/filters';
import { report } from '../../../src/core/stats';
import { fakeHistory, smallGame } from '../../helpers/fakeHistory';

test('a report covers every pool, the patterns and the bias tests', () => {
  const game = smallGame(20, 4);
  const draws = fakeHistory(game, 300, 8);
  const r = report(game, draws, distributions(game.pools[0], game.slipColumns), { recent: 30 });
  expect(r.draws).toBe(300);
  expect(r.pools[0].numbers).toHaveLength(20);
  expect(r.pools[0].recent).toBe(30);
  expect(Object.keys(r.patterns || {})).toContain('sum');
  expect(r.bias[0]?.posterior.shrink).toBe(0);
  expect(r.combinations).toBe(4845);
});
