import { expect, test } from 'vitest';
import { drawsPerYear, GAMES, lastDraw, localDate, nextDraws } from '../../../src/core/games';

test('next Lotto draws fall on Tue/Thu/Sat at 22:00 Warsaw time', () => {
  const draws = nextDraws(GAMES.lotto, new Date('2026-10-30T12:00:00Z'), 3);
  expect(draws.map((d) => d.toISOString())).toEqual(['2026-10-31T21:00:00.000Z', '2026-11-03T21:00:00.000Z', '2026-11-05T21:00:00.000Z']);
  // Summer time: 22:00 CEST = 20:00 UTC
  expect(nextDraws(GAMES.lotto, new Date('2026-07-01T00:00:00Z'), 1)[0].toISOString()).toBe('2026-07-02T20:00:00.000Z');
});

test('latest past draw', () => {
  // Friday noon: the latest Lotto draw was Thursday 22:00 Warsaw time
  expect(lastDraw(GAMES.lotto, new Date('2026-10-30T12:00:00Z'))?.toISOString()).toBe('2026-10-29T21:00:00.000Z');
});

test('local date and draws per year', () => {
  expect(localDate(GAMES.lotto, new Date('2026-10-29T23:30:00Z'))).toBe('2026-10-30');
  expect(drawsPerYear(GAMES.lotto)).toBe(156);
});
