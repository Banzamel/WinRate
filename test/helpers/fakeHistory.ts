// Seeded fake draw histories for tests: fair draws under the current rules of a game.
import { currentEra, GAMES, type Draw, type Game } from '../../src/core/games';
import { createRng } from '../../src/core/simulate';

export function fakeHistory(game: Game, n: number, seed = 1): Draw[] {
  const rng = createRng(seed);
  const era = currentEra(game);
  const from = Date.parse(era.from);
  return Array.from({ length: n }, (_, i) => ({
    date: new Date(from + i * 86400000 * 3).toISOString().slice(0, 10),
    pools: era.pools.map((p) => { const s = new Set<number>(); while (s.size < p.pick) s.add(1 + rng.int(p.size)); return [...s].sort((a, b) => a - b); }),
  }));
}

// Main-pool draws of `pick` of `size`; optionally a heavy ball comes out with extra probability.
export function fakeDraws(n: number, seed: number, size = 49, pick = 6, heavy: number | null = null, extra = 0): number[][] {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => {
    const s = new Set<number>();
    if (heavy && rng.next() < extra) s.add(heavy);
    while (s.size < pick) s.add(1 + rng.int(size));
    return [...s].sort((a, b) => a - b);
  });
}

// A small one-pool game (fast exhaustive checks).
export function smallGame(size: number, pick: number, extra: Partial<Game> = {}): Game {
  const pool = { size, pick };
  return { ...GAMES.lotto, pools: [{ key: 'main', ...pool }], eras: [{ from: '2000-01-01', pools: [pool] }], slipColumns: 5, ...extra };
}
