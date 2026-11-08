// Draw times in the game's time zone, computed without a time-zone library.
import type { Game } from './types';

// Offset of a time zone from UTC (ms) at the given instant.
function zoneOffset(timeZone: string, date: Date): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// The next `count` draw times at or after `from`.
export function nextDraws(game: Game, from = new Date(), count = 3): Date[] {
  const { timeZone, weekdays, time } = game.schedule;
  const [hh, mm] = time.split(':').map(Number);
  const out: Date[] = [];
  for (let day = 0; out.length < count && day < 60; day++) {
    const probe = new Date(from.getTime() + day * 86400000);
    const local = new Date(probe.getTime() + zoneOffset(timeZone, probe));
    if (!weekdays.includes(local.getUTCDay())) continue;
    const guess = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hh, mm);
    const at = new Date(guess - zoneOffset(timeZone, new Date(guess)));
    if (at >= from) out.push(at);
  }
  return out;
}

export const drawsPerYear = (game: Game): number => game.schedule.weekdays.length * 52;

// The most recent draw time before `now`.
export function lastDraw(game: Game, now = new Date()): Date | null {
  const draws = nextDraws(game, new Date(now.getTime() - 8 * 86400000), 6).filter((d) => d < now);
  return draws[draws.length - 1] || null;
}

// Local date (YYYY-MM-DD) of an instant in the game's time zone.
export const localDate = (game: Game, at: Date): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: game.schedule.timeZone }).format(at);
