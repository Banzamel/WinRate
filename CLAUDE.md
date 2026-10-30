# WinRate — guide for Claude

Windows desktop app (Electron 33, plain JS, no bundler/framework) for **Lotto** and **Eurojackpot**:
draw history, exact odds, statistics with significance tests, combination filters, ticket generator,
simulations. UI in Polish and English. Repo: https://github.com/Banzamel/WinRate

More detail: `.claude/docs/architecture.md`, `.claude/docs/release.md`. Release procedure: skill `release`.

## Commands

- `npm ci` — install (Node 22 in CI, works on newer)
- `npm start` — run the app in development (`WINRATE_USERDATA=<dir>` to keep dev data out of the default profile)
- `npm test` — unit tests (`node --test test/*.test.js`, engine only, no Electron needed)
- `npm run fetch-history` — download draw history into `resources/history/` (bundled into the installer)
- `npm run dist` — local Windows installer into `dist/` (`WinRate-Setup-<version>.exe`)

## Layout

- `src/main/main.js` — Electron main process: window, `app://` protocol, IPC handlers, history stores
- `src/main/worker.js` — worker thread for anything that walks millions of combinations (never block main)
- `src/main/engine/*` — pure, testable logic (games/rules, combinatorics, filters, stats, bias, simulate, wheel, system, popularity, history)
- `src/main/preload.js` — the only bridge: `window.api.*` via `contextBridge`; add a channel here and in `main.js` together
- `src/renderer/` — UI: `views/*.js` per tab, `js/*` helpers, `lang/pl.json` + `lang/en.json`
- `scripts/` — `version.js` (changelog stamping/notes), `fetch-history.js`, `make-icon.js`
- `build/` — icon and `installer.nsh` (NSIS: keeps `data/` on update, removes everything on uninstall)

## Rules

- **Mathematical honesty**: every combination has the same chance. Never add features or copy that promise
  higher win probability; present filters/strategies as measured trade-offs (coverage, popularity, sharing).
  Keep the responsible-gambling note.
- **Translations**: every user-visible string goes into both `lang/pl.json` and `lang/en.json` (same keys).
- **Engine stays pure**: no Electron imports in `src/main/engine/`; add/extend tests in `test/` for engine changes.
- **Heavy work** goes to `worker.js` with progress reporting and cancel support (see `jobs.js`).
- **Data location**: all app data lives in `<install dir>/data` (packaged) — never write elsewhere.
- **Security**: `contextIsolation` + preload bridge only; no `nodeIntegration` in the renderer.
- **Changelog**: every user-facing change gets a line under `## [Unreleased]` in `CHANGELOG.md`
  (Keep a Changelog). Don't edit numbered sections by hand — `npm version` stamps them.
- **Versioning**: `package.json` `version` is the source of truth; tags are `vX.Y.Z`. Never create tags by hand
  without bumping via `npm version` (see `.claude/docs/release.md`).
- Code style: CommonJS, 2-space indent, single quotes, semicolons, short comments explaining *why*.
- Commit messages: short imperative English summary line (match existing history).
- Don't commit `dist/`, `node_modules/`, `resources/history/`, `release-notes.md`.
