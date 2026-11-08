import { expect, test } from 'vitest';
import { GAMES } from '../../../src/core/games';
import { download, type Fetcher } from '../../../src/core/history';

const respond = (status: number, body: string): Promise<Response> => Promise.resolve(new Response(body, { status }));

test('the first source that answers wins', async () => {
  const urls: string[] = [];
  const fetcher: Fetcher = (url) => { urls.push(url); return url.endsWith('.csv') ? respond(404, '') : respond(200, '1. 27.01.1957 8,12,31,39,43,45\n'); };
  const res = await download(GAMES.lotto, fetcher);
  expect(res.draws).toHaveLength(1);
  expect(res.url).toBe(GAMES.lotto.sources[1]);
  expect(urls).toEqual(GAMES.lotto.sources);
});

test('all sources failing gives one error naming each', async () => {
  await expect(download(GAMES.lotto, () => respond(200, 'nothing here'))).rejects.toThrow(/no draws in the response.*no draws in the response/);
});
