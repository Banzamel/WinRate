// "Until it hits" with system bets of m numbers: the m numbers are drawn one by one; of their
// C(m, 6) bets only the ones that pass the filters and were not played before are played (and
// remembered). A system with no such bet is not played. Ends when a played bet is the result.
import { binom, forEachCombination, rank } from '../combinatorics';
import { HistoryContext, isAllowed, type Checker } from '../filters';
import { currentEra, type Game, type Draw } from '../games';
import { drawNumbers, newBag, setBit, testBit } from './bag';
import { dynamicChecker, failedFilters, fixedCensus } from './filtering';
import { createRng } from './rng';
import type { FixedCensus, UntilHitResult } from './types';
import { targetOf, type UntilHitOptions } from './untilHit';

export interface UntilHitSystemOptions extends UntilHitOptions { m: number }

// Plays the new, allowed bets of one system; returns how many were played and whether one hit.
function playSystem(nums: number[], pick: number, played: Uint8Array, targetRank: number, fixedSet: FixedCensus | null, check: Checker | null, sub: number[]) {
  let fresh = 0; let hit = false;
  forEachCombination(nums.length, pick, (idx) => {
    for (let i = 0; i < pick; i++) sub[i] = nums[idx[i] - 1];
    const r = rank(sub);
    if (testBit(played, r) || (fixedSet && !isAllowed(fixedSet.allowed, r)) || (check && check(sub))) return;
    setBit(played, r);
    fresh++;
    if (r === targetRank) hit = true;
  });
  return { fresh, hit };
}

export function untilHitSystem(game: Game, draws: Draw[], { index, m, strategy = 'filtered', config, maxAttempts = 2e7, seed, fixed, onProgress }: UntilHitSystemOptions): UntilHitResult {
  const { era, index: at, target } = targetOf(game, draws, index);
  const pool = currentEra(game).pools[0];
  const ctx = new HistoryContext(pool, era.slice(0, at).map((d) => d.pools[0]));
  const filters = strategy !== 'random' && config ? config : null;
  const base = { date: target.date, numbers: target.pools, strategy, system: m, combinations: binom(pool.size, pool.pick) };
  if (filters) {
    const failed = failedFilters(game, filters, ctx, target.pools[0]);
    if (failed.length) return { ...base, excluded: true, failed, attempts: 0, bets: 0 };
  }
  const fixedSet = filters ? fixed || fixedCensus(game, filters) : null;
  const checkDynamic = filters ? dynamicChecker(game, filters, ctx) : null;
  const played = new Uint8Array(Math.ceil(base.combinations / 8));
  const targetRank = rank(target.pools[0]);
  const allowed = fixedSet ? fixedSet.allowedCount : base.combinations;
  const rng = createRng(seed);
  const bag = newBag(pool.size);
  const nums = new Array<number>(m); const sub = new Array<number>(pool.pick);
  const started = Date.now();
  let attempts = 0; let bets = 0; let skipped = 0; let tries = 0;
  // Expected systems: half of the allowed bets, at the bets per system played so far.
  const result = (extra: Partial<UntilHitResult>): UntilHitResult => ({ ...base, attempts, bets, skipped, expectedAttempts: attempts ? ((allowed + 1) / 2) / (bets / attempts) : 0, ms: Date.now() - started, ...extra });
  for (;;) {
    tries++;
    if (onProgress && (tries & 0x3fff) === 0) onProgress(Math.min(1, attempts / maxAttempts), attempts);
    drawNumbers(rng, bag, m, nums);
    const { fresh, hit } = playSystem(nums, pool.pick, played, targetRank, fixedSet, checkDynamic, sub);
    if (!fresh) { skipped++; continue; }
    attempts++; bets += fresh;
    if (hit) return result({ hit: true });
    if (attempts >= maxAttempts) return result({ hit: false });
    if (bets >= allowed) return result({ hit: false, gaveUp: true });
  }
}
