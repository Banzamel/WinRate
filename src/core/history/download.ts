import type { Draw, Game } from '../games';
import { parseText } from './parse';

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

// Downloads the full history from the game's sources (the first one that answers wins).
export async function download(game: Game, fetcher: Fetcher): Promise<{ url: string; draws: Draw[]; skipped: number }> {
  const errors: string[] = [];
  for (const url of game.sources) {
    try {
      const res = await fetcher(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { draws, skipped } = parseText(game, await res.text());
      if (!draws.length) throw new Error('no draws in the response');
      return { url, draws, skipped };
    } catch (e) {
      errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(errors.join('; '));
}
