import { eraOf, type Draw, type Game } from '../games';

export type DrawError = 'date' | 'pools' | 'count' | 'duplicate' | 'range';

// Checks a draw against the rules of its date; returns an error code or null.
export function validateDraw(game: Game, draw: Draw): DrawError | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draw.date || '')) return 'date';
  const era = eraOf(game, draw.date);
  if (!Array.isArray(draw.pools) || draw.pools.length !== era.pools.length) return 'pools';
  for (let i = 0; i < era.pools.length; i++) {
    const nums = draw.pools[i];
    const { size, pick } = era.pools[i];
    if (nums.length !== pick) return 'count';
    if (new Set(nums).size !== pick) return 'duplicate';
    if (nums.some((x) => !Number.isInteger(x) || x < 1 || x > size)) return 'range';
  }
  return null;
}

export const sortDraws = (draws: Draw[]): Draw[] => draws.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
