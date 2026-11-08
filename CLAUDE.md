# WinRate — guide for Claude

Windows desktop app (Tauri 2 + React 19 + strict TypeScript) for **Lotto** and **Eurojackpot**: draw
history, exact odds, statistics with significance tests, combination filters, ticket generator, simulations.
UI in Polish and English. Repo: https://github.com/Banzamel/WinRate

More detail: `.claude/docs/architecture.md` (the real tree), `.claude/docs/release.md`. Release procedure: skill `release`.

## Commands

- `npm ci` — install (Node 22 in CI, works on newer)
- `npm run dev` — UI in a browser at http://localhost:1420 (no Rust needed; data in localStorage, no file cache)
- `npm run tauri dev` — the real app (needs Rust + MSVC on the host; `WINRATE_USERDATA=<dir>` keeps dev data apart)
- `npm test` — vitest (`test/` mirrors `src/`); `npm run typecheck`; `npm run build` (typecheck + frontend into `dist/`)
- Rust tests: `cargo test --manifest-path src-tauri/Cargo.toml` (CI, Windows); without Rust on the host they are
  cross-compiled in Docker (`cargo xwin test --no-run`) and the test exe is run on Windows
- `npm run fetch-history` — draw history into `resources/history/` (bundled; required before any Tauri build)
- `npm run docker:image` once, then `npm run dist` — Windows installer built in Docker (cargo-xwin + NSIS) into `release/`

## Code structure

Readable, easy-to-extend code: short files, subfolders, classes. Apply to everything you write and restructure
code you touch that breaks these rules.

1. **File size**: aim ≤ 150 lines, hard limit 200 (lang/JSON/data files excepted). Split before reaching it.
2. **One responsibility per file.** One React component per file (tiny private helpers < 30 lines are fine).
   File named after its main export: `PascalCase.tsx` for components/classes, `camelCase.ts` for modules.
3. **Folders**:
   - `src/app/` — App.tsx, navigation, providers, boot (`main.tsx`, `services.ts`), the app store (`state/`)
   - `src/features/<feature>/` — `components/`, `hooks/`, `<Feature>Service.ts` or other classes, `types.ts`,
     `index.ts` (the public API)
   - `src/shared/ui/` (generic components), `src/shared/hooks/`, `src/shared/i18n/`, `src/shared/lib/`
   - `src/core/<domain>/` — pure logic, no React/Tauri imports (the statistics engine, split by domain)
   - `src/platform/` — the **only** place importing `@tauri-apps/*` (storage, dialogs, window, updater adapters,
     with browser stand-ins)
   - `src/lang/`, `src/styles/` (CSS split per area, class names kept)
4. **Classes for stateful services/stores** (HistoryStore, SettingsService, JobRunner, UpdateService, CensusCache…),
   dependencies injected through the constructor; plain pure functions for calculations.
5. **TypeScript strict**; no `any` except at JSON/worker/IPC boundaries, wrapped by typed functions
   (`worker/protocol.ts`); types in each feature's `types.ts`.
6. **React**: function components + hooks; components mostly render, logic lives in hooks/services; global
   state in the small store (`AppStore`, `JobProgress`), no mutable module globals.
7. **Features import each other only through `index.ts`** (no deep imports across features).
8. **Rust**: `main.rs` only wiring (≤ 60 lines); one module folder per area (`commands/`, `storage/`, `window/`),
   small files, one error type implementing `serde::Serialize` (`error.rs`), no `unwrap`/`expect` in command paths.
9. **Tests mirror the src tree** (`test/core/...`, `test/features/...`); every pure module has tests.
10. English code and comments; comments explain why, not what.

## Rules

- **Mathematical honesty**: every combination has the same chance. Never add features or copy that promise
  higher win probability; present filters/strategies as measured trade-offs (coverage, popularity, sharing).
  Keep the responsible-gambling note.
- **Keep the UI simple** (owner's decision): filters are only switched on/off with fixed values
  (`filterValues`/`defaultFilters` in `core/filters/definitions.ts`); the Generator and Simulation have no strategy
  choice — every ticket passes all active filters (Generator: the least popular of 12 such tickets). Don't add
  knobs/options without being asked.
- **Translations**: every user-visible string goes into both `src/lang/pl.json` and `src/lang/en.json` (same keys;
  a test checks it).
- **Heavy work** goes to the analysis worker (`features/analysis/worker/`, one task module per area) with progress
  and cancel support. Workers cannot call Tauri: the main thread reads/writes caches for them.
- **Data location**: all app data lives in `<install dir>/data` (WebView2 profile included) — never write under the user
  profile (%APPDATA%, %LOCALAPPDATA%; only %TEMP% during install/update). Check every new plugin/feature for files it
  writes (tauri-plugin-http "cookies" is off for that reason). Install folders: architecture.md → Data.
  File access only through `src-tauri/src/commands` (relative paths inside the data folder).
- **Security**: keep the capabilities minimal (`src-tauri/capabilities/default.json`); HTTP only to mbnet.com.pl.
- **Changelog**: every user-facing change gets a line under `## [Unreleased]` in `CHANGELOG.md`
  (Keep a Changelog). Don't edit numbered sections by hand — `npm version` stamps them.
- **Versioning**: `package.json` `version` is the source of truth (`tauri.conf.json` reads it); tags are `vX.Y.Z`.
  Never create tags by hand without bumping via `npm version` (see `.claude/docs/release.md`).
- **Updater key**: the private signing key is never committed (CI secret `TAURI_SIGNING_PRIVATE_KEY`); the public
  key is in `tauri.conf.json` and must stay the one of that key.
- Code style: ES modules, 2-space indent, single quotes, semicolons.
- Commit messages: short imperative English summary line (match existing history).
- Don't commit `dist/`, `release/`, `node_modules/`, `resources/history/`, `src-tauri/target/`, `release-notes.md`.
