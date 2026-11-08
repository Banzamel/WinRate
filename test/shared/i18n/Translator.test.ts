import { expect, test } from 'vitest';
import en from '../../../src/lang/en.json';
import pl from '../../../src/lang/pl.json';
import { Translator } from '../../../src/shared/i18n';

test('both languages have the same keys', () => {
  expect(Object.keys(pl).sort()).toEqual(Object.keys(en).sort());
});

test('translation with params, fallbacks and formatting', () => {
  const t = new Translator('en');
  expect(t.t('settings.version', { version: '1.2.3' })).toContain('1.2.3');
  expect(t.t('no.such.key')).toBe('no.such.key');
  expect(new Translator('xx').lang).toBe('pl');
  expect(t.pct(0.1234, 1)).toBe('12.3 %');
  expect(new Translator('pl').num(1234567)).toBe('1 234 567');
  expect(t.weekday(2)).toBe('Tuesday');
  expect(t.date('2026-11-08')).toBe('Nov 8, 2026');
});
