# Architecture

```
renderer (src/renderer)  ──window.api──▶  preload.js  ──ipcRenderer.invoke──▶  main.js
                                                                                 │
                                       jobs.js (progress, cancel) ◀──────────────┤
                                                                                 ▼
                                                                    worker.js (worker_threads)
                                                                                 │
                                                                    engine/* (pure functions)
```

## Main process (`src/main`)

- `main.js` — creates the window, serves the renderer over the privileged `app://` scheme, opens one
  `HistoryStore` per game (seeded from the bundled history in `resources/history` on first start),
  registers IPC handlers (`app:init`, `history:*`, `engine:*`, `settings:*`, `job:cancel`).
- `settings.js` — app and per-game settings persisted in the data folder.
- `jobs.js` — runs worker tasks, forwards `job:progress` to the renderer, supports cancel.
- `worker.js` — long computations; caches filter exclusion maps (1 bit per combination) in
  `data/combinations/<game>-<hash>.bin` + `.json` meta.
- `app-updater.js` — electron-updater against GitHub Releases (`latest.yml`); disabled when unpackaged.

## Engine (`src/main/engine`)

| file | responsibility |
| --- | --- |
| `games.js` | game definitions, rule eras, draw schedule, prize tiers, odds |
| `combinatorics.js` | binomials, ranking/unranking of combinations |
| `history.js` | parsing/import/download/validation, `HistoryStore` |
| `filters.js` | exclusion filters, presets, fixed vs history-dependent split |
| `stats.js` | frequencies, gaps, pairs, shapes, chi-square tests |
| `bias.js` | ball/machine physics, empirical-Bayes estimates |
| `simulate.js` | strategies, generator, walk-forward backtest, "until it hits" |
| `popularity.js` | how many other players likely pick a ticket |
| `wheel.js` / `system.js` | abbreviated wheels, Lotto system bets (7–12 numbers) |

## Data

Packaged app: `<install dir>/data` (history, settings, caches, Chromium profile). Dev: `WINRATE_USERDATA`.
The NSIS script (`build/installer.nsh`) preserves `data/` across updates and deletes it on uninstall.
