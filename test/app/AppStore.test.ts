import { expect, test } from 'vitest';
import { emptyResults, type AppState } from '../../src/app/state/AppState';
import { AppStore } from '../../src/app/state/AppStore';

const initial = (): AppState => ({
  settings: { language: 'pl', games: {} }, version: '0', games: {}, view: 'lotto', tabs: {}, history: {},
  results: emptyResults(), recent: 50, drafts: {}, appUpdate: { state: 'dev' }, toast: null,
});

test('new history drops the results computed from the old one', () => {
  const store = new AppStore(initial());
  const report = {} as never;
  store.setResult('report', 'lotto', report);
  store.setResult('report', 'eurojackpot', report);
  store.setResult('tickets', 'lotto', { tickets: [], popularity: [] });
  store.setHistory('lotto', []);
  const r = store.get().results;
  expect(r.report.lotto).toBeUndefined();
  expect(r.report.eurojackpot).toBe(report);
  expect(r.tickets.lotto).toBeDefined();
  expect(store.get().history.lotto).toEqual([]);
});

test('tabs, drafts and clearing a result', () => {
  const store = new AppStore(initial());
  store.setTab('lotto', 'stats');
  store.setDraft('wheel:lotto', { numbers: [1] });
  store.setResult('tickets', 'lotto', { tickets: [], popularity: [] });
  store.setResult('tickets', 'lotto', undefined);
  expect(store.get().tabs.lotto).toBe('stats');
  expect(store.get().drafts['wheel:lotto']).toEqual({ numbers: [1] });
  expect('lotto' in store.get().results.tickets).toBe(false);
});
