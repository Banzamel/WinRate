# Architecture

```
React (src/app, src/features/*/components)
   │ hooks: useServices(), useAppState(selector), useJob(lane)
   ▼
Services (classes, created in src/app/services.ts)          AppStore / JobProgress (src/shared/lib/Store)
   SettingsService · HistoryService · AnalysisService · UpdateService · Toaster
   │                                   │
   ▼                                   ▼ JobRunner ── postMessage ──▶ engine.worker.ts ──▶ src/core/* (pure)
src/platform (Tauri | browser) ──invoke──▶ Rust (src-tauri): data folder, dialogs, bundled history, plugins
```

## Tree

```
src/
  app/          main.tsx (boot) · services.ts (wiring) · App.tsx · hooks.ts (context, useAppState, useDraft)
                useAutoRefresh.ts · components/ (TitleBar, Sidebar, NavIcon, Toast)
                state/ (AppState.ts, AppStore.ts, Toaster.ts)
  core/         pure logic, no React/Tauri
    combinatorics/  binomial · ranking (rank/unrank) · enumerate · hypergeometric
    games/          definitions (GAMES) · rules (eras, tiers, odds) · schedule (draw times) · types
    history/        validate · parse · download · HistoryStore (class, injected IO)
    filters/        metrics · definitions (FILTERS, fixed values) · HistoryContext · historyChecks · checker
                    census · distributions · survival · types
    stats/          chiSquare · numbers · pairs · neighbours · patterns · repeats · report · types
    bias/           distributions (phi, Kolmogorov) · posterior · drift · memory (+ runs test) · analyze
    popularity/     scorer · expectedValue
    bets/           wheel · systemTable
    simulate/       rng · weights · filtering · bag · player · generate · backtest · untilHit
                    untilHitSystem · systemNumbers · types
    physics/        ballEffect · normalQuantile
  features/     components/ · hooks/ · services · types.ts · index.ts (public API)
    analysis/   AnalysisService · JobRunner · JobProgress · CensusCache · DistributionCache · censusKey
                worker/ (engine.worker.ts, protocol.ts, WorkerCensus.ts, tasks/{stats,ticket,simulation}Tasks.ts)
                hooks/useJob · components/LaneProgress
    history/    HistoryService · hooks/useHistoryActions · components/(HistoryView, SourcesCard, ManualEntryCard, DrawListCard)
    settings/   SettingsService · components/SettingsView
    update/     UpdateService · updateText · components/(UpdateBanner, UpdateSection, UpdateActions)
    game/       gameInfo · components/(GameView, GameHeader, Countdown)
    overview/   components/(OverviewView, RulesRow, TiersCard, LatestDrawsCard, EvCard) · hooks/useExpectedValue
    filters/    describeFilter · hooks/useFilterCensus · components/(FiltersView, FilterRow, FilterSummary)
    stats/      bucketize · ballSets · hooks/useStatsReport · components/(StatsView + one card per file)
    generator/  coupons · hooks/useCoupons · components/(GeneratorView, TicketsCard, MineCard, SystemCard, WheelCard, CouponsCard…)
    simulation/ hooks/useSimulation · components/(SimulationView, BacktestCard, UntilHitCard, *Result)
    about/      sources · components/AboutView
  platform/     types.ts · index.ts (createPlatform) · tauri/ (TauriStorage, TauriDialogs, TauriWindow, TauriUpdates)
                browser/ (BrowserStorage, BrowserDialogs)
  shared/       ui/ (Ball, Balls, Card, Hint, Stat, Tabs, Table, CompareBars, NumberChart, FitBadge, PBadge,
                ProgressBar, Spinner, BusyButton, NumberInput, Select, Picker) · hooks/ (useStore, useNow)
                i18n/ (Translator, I18nContext) · lib/ (Store, sha1, text)
  lang/         pl.json · en.json
  styles/       index.css + base, titlebar, layout, tabs, cards, buttons, balls, tables, charts, feedback, hints, coupons
src-tauri/
  src/main.rs   wiring only
  src/error.rs  the command error type (serialized as its message)
  src/commands/ data.rs (read/write text and bytes) · history.rs (bundled history) · dialogs.rs (import/export)
  src/storage/  data_dir.rs (where the data folder is) · files.rs (path checks, atomic writes; unit tests)
  src/window/   the main window and the "folder not writable" message
  capabilities/default.json · tauri.conf.json · windows/hooks.nsh
test/           mirrors src/: core/<domain>/*.test.ts, features/…, shared/…, app/…, helpers/fakeHistory.ts
```

## State

- `AppStore` holds settings, game info, the history of every game, cached results per game (dropped when the history
  changes), drafts (half-done pickers), the update state and the toast. Updates are immutable patches.
- `JobProgress` holds the progress of running worker lanes separately, so progress ticks only re-render progress bars.

## Worker

One Web Worker per lane (`stats`, `filters`, `generate`, `sim`, `ev`); cancel terminates the worker. The census
of the fixed filters (1 bit per combination) is cached in `data/combinations/<game>-<sha1>.bin` + `.bin.json`
(names as in the Electron versions): `CensusCache` reads it, passes it to the worker, and a freshly computed one
comes back with the result to be saved.

## Data

Nothing is written under the user profile (%APPDATA%, %LOCALAPPDATA%) — only %TEMP% during install/update and the
Start Menu/Desktop shortcuts. Installed app: `<install dir>/data` (settings.json, history/, cache/, combinations/,
webview/ = the WebView2 profile). tauri-plugin-http is built without its "cookies" feature (it keeps a cookie jar in
%LOCALAPPDATA%); the updater downloads to %TEMP%.

Install folder (`src-tauri/windows/hooks.nsh`):
- over an Electron version (≤ 0.5.x): the old app's folder. Its settings/history/caches are parked in %TEMP%, the old
  app is uninstalled (its uninstaller takes the folder from HKCU\Software\<guid>\InstallLocation, which can be missing —
  the hook sets it first; a fallback removes the folder when `resources\app.asar` is still there), and only when the
  old files are verifiably gone is the data put back; otherwise the install stops and the old app stays;
- a fresh install: `<system drive>\Banzamel\WinRate` (instead of the template's %LOCALAPPDATA%\WinRate, whose empty
  folder the template's early SetOutPath creates and the hook removes again);
- Tauri updates: the current folder (the template restores it from HKCU\Software\<publisher>\WinRate).

`data/` survives updates; a real uninstall removes it only when "Delete the application data" is ticked, then the
folder if empty.
