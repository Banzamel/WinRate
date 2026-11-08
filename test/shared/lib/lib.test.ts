import { createHash } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { sha1 } from '../../../src/shared/lib/sha1';
import { Store } from '../../../src/shared/lib/Store';
import { cls, errorText } from '../../../src/shared/lib/text';

test('sha1 matches node crypto', () => {
  for (const s of ['', 'abc', 'lotto:{"odd":[1,5],"x":null}', 'x'.repeat(55), 'y'.repeat(56), 'ż'.repeat(100)]) {
    expect(sha1(s)).toBe(createHash('sha1').update(s).digest('hex'));
  }
});

test('store patches and notifies', () => {
  const store = new Store({ a: 1, b: { c: 2 } });
  const fn = vi.fn();
  const off = store.subscribe(fn);
  const before = store.get();
  store.set({ a: 2 });
  store.set((s) => ({ a: s.a + 1 }));
  expect(store.get()).toEqual({ a: 3, b: { c: 2 } });
  expect(store.get()).not.toBe(before);
  expect(fn).toHaveBeenCalledTimes(2);
  off();
  store.set({ a: 4 });
  expect(fn).toHaveBeenCalledTimes(2);
});

test('text helpers', () => {
  expect(cls('a', false, null, 'b', undefined)).toBe('a b');
  expect(errorText(new Error('Error: boom'))).toBe('boom');
  expect(errorText('plain')).toBe('plain');
});
