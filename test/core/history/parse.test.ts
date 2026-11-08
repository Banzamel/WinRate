import { expect, test } from 'vitest';
import { GAMES } from '../../../src/core/games';
import { formatLine, parseLine, parseText, validateDraw } from '../../../src/core/history';

test('parses the mbnet and CSV layouts', () => {
  expect(parseLine(GAMES.lotto, '1. 27.01.1957 8,12,31,39,43,45')).toEqual({ date: '1957-01-27', pools: [[8, 12, 31, 39, 43, 45]] });
  expect(parseLine(GAMES.lotto, '2024-01-02;44;3;11;19;27;41')).toEqual({ date: '2024-01-02', pools: [[3, 11, 19, 27, 41, 44]] });
  expect(parseLine(GAMES.eurojackpot, '900. 29.10.2024 2,14,27,33,48,9,1')).toEqual({ date: '2024-10-29', pools: [[2, 14, 27, 33, 48], [1, 9]] });
  // mbnet.com.pl/bazy/*.csv (the header line is skipped)
  expect(parseLine(GAMES.lotto, '7424;2026-10-29;;1,10,15,16,23,24;;;')).toEqual({ date: '2026-10-29', pools: [[1, 10, 15, 16, 23, 24]] });
  expect(parseLine(GAMES.eurojackpot, ';2026-10-27;;11,33,38,42,47;11,12;;')).toEqual({ date: '2026-10-27', pools: [[11, 33, 38, 42, 47], [11, 12]] });
  expect(parseText(GAMES.eurojackpot, 'numer;data;godzina;liczby;dodatkowe;mnoznik;premia\n;2012-03-23;;5,8,21,37,46;6,8;;\n').draws).toHaveLength(1);
});

test('rejects numbers outside the rules of the date', () => {
  expect(parseLine(GAMES.eurojackpot, '01.01.2013 1,2,3,4,5,1,10')).toBeNull(); // Euro numbers were 1..8 then
  expect(parseLine(GAMES.lotto, '01.01.2013 1,2,3,4,5,50')).toBeNull();
  expect(parseLine(GAMES.lotto, '01.01.2013 1,2,3,4,5,5')).toBeNull();
  expect(validateDraw(GAMES.lotto, { date: '2020-01-01', pools: [[1, 2, 3]] })).toBe('count');
  expect(parseText(GAMES.lotto, 'header\n1. 27.01.1957 8,12,31,39,43,45\n').skipped).toBe(1);
});

test('export lines read back', () => {
  const d = { date: '2024-10-29', pools: [[2, 14, 27, 33, 48], [1, 9]] };
  expect(parseLine(GAMES.eurojackpot, formatLine(d))).toEqual(d);
});
