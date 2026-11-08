import { expect, test } from 'vitest';
import { GAMES, tierOdds } from '../../../src/core/games';
import { checkCoupon, parseTyped, ticketsText } from '../../../src/features/generator';

const tiers = tierOdds(GAMES.eurojackpot);
const draws = [{ date: '2026-11-06', pools: [[1, 2, 3, 4, 5], [1, 2]] }];

test('a coupon is checked against the draw of its date', () => {
  const coupon = { id: 1, drawDate: '2026-11-06', price: 12.5, tickets: [[[1, 2, 3, 40, 41], [1, 9]], [[10, 11, 12, 13, 14], [3, 4]]] };
  const res = checkCoupon(coupon, draws, tiers);
  expect(res?.rows[0].hits).toEqual([3, 1]);
  expect(res?.rows[0].tier?.id).toBe('3+1');
  expect(res?.rows[1].tier).toBeNull();
  expect(res?.pool).toBe(1);
  expect(checkCoupon({ ...coupon, drawDate: '2026-11-10' }, draws, tiers)).toBeNull();
});

test('typed numbers and clipboard text', () => {
  // The first five numbers go to the main pool (a duplicate is dropped), the next two to the Euro pool.
  expect(parseTyped('5, 3 3 1 49 7; 2 1', [5, 2])).toEqual([[1, 3, 5, 49], [2, 7]]);
  expect(ticketsText([[[1, 2], [3]], [[4, 5], [6]]])).toBe('1 2 | 3\n4 5 | 6');
});
