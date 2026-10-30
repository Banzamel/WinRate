# PrimeWinRate

[![Build & release](https://github.com/Banzamel/PrimeWinRate/actions/workflows/release.yml/badge.svg)](https://github.com/Banzamel/PrimeWinRate/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/Banzamel/PrimeWinRate)](https://github.com/Banzamel/PrimeWinRate/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A Windows desktop **lottery lab** for **Lotto** (Totalizator Sportowy, 6 of 49) and **Eurojackpot**
(5 of 50 + 2 of 12). It keeps the full draw history, computes the exact odds, tests the history for patterns,
filters combinations with exactly measured effects, generates tickets and replays the past in walk-forward
simulations.

UI languages: **Polish** (default) and **English** — more can be added as language files.

> **Honest by design.** Every draw is independent and every combination is equally likely, so no software can
> raise the chance of a ticket. PrimeWinRate measures everything it does against that fact: each filter shows
> the exact share of combinations it removes *and* how many real winning draws it would have removed, and
> every strategy is compared with a random player on the same draws. What filtering legitimately buys is
> covering fewer combinations per shape you care about and avoiding the tickets thousands of people play
> (so a win is not shared).

## Download

Get the installer from **[Releases](https://github.com/Banzamel/PrimeWinRate/releases/latest)**
(`PrimeWinRate-Setup-<version>.exe`). The app is not code-signed, so Windows SmartScreen may warn on first
launch — choose *More info → Run anyway*.

## Features

Each game has its own tab with six sections:

### Overview
- Rules, ticket price, draw days and time with a countdown to the next draw.
- Exact odds of every prize tier (hypergeometric), odds of any prize, number of combinations.
- Rule eras: Eurojackpot drew 2 Euro numbers of 8 (2012), of 10 (from October 2014) and of 12
  (from 25 March 2022, together with the Tuesday draw). History is validated against the rules of each date.

### History
- **Download** the full history (from 1957 for Lotto), **import** text/CSV exports, **add a draw by hand**,
  **export** to CSV. Stored locally; the installer ships with the history downloaded at build time.

### Statistics — "is the draw fair?"
Everything is compared with the exact expectation of a fair draw and tested with a chi-square test:
- frequency of every number (and Euro number), hot and cold numbers in a chosen window, gaps ("overdue"),
- **pairs**: which numbers came out together most and least often, pairs never drawn together,
  neighbours (x, x+1), a heat map of all pairs,
- **shapes** of the draws against the distribution over *all* combinations: odd/even, low/high, sum,
  runs of consecutive numbers, arithmetic progressions, decades, last digits, coupon rows and columns, spread,
- numbers repeated from the previous draw, identical draws in the history.

### Filters (exclusions)
Fifteen filters: odd/even, low/high, sum range, consecutive runs, arithmetic progressions, one decade,
same last digit, coupon row, coupon column, minimum spread, dates only (1–31), past results (exact repeats
and optionally tickets one number away), overlap with the previous draw, number weight and pair weight.

The app walks through **every** combination (13 983 816 for Lotto, 2 118 760 main combinations for
Eurojackpot), so the share each filter removes is exact. It also replays the history to count how many
real draws each filter would have removed — checking every draw with only the draws known before it —
and shows the **efficiency** (kept draws ÷ kept combinations; 1.00 = no edge, which is what a fair draw gives).
The recommended preset removes about **32 %** of Lotto and **28 %** of Eurojackpot combinations.

### Generator
Tickets for the next draw with one of seven strategies — pure random, random within the filters, hot,
cold, overdue, most frequent, pair affinity — always within the active filters.

### Simulation
- **Backtest (walk-forward):** for each of the last N draws only the earlier ones are known; the strategy
  plays K tickets, scored against the real result next to a random player with the same tickets.
- **Until it hits:** for each of the latest draws the app (knowing only the earlier draws) keeps drawing
  tickets until one matches the real result, and reports the attempts, their cost and how many years of
  play they represent — or that the filters had removed the winning numbers.

## Development

Requirements: Node.js 22, Windows for building the installer (the app itself also runs on Linux/macOS).

```bash
npm install
npm start          # run the app
npm test           # unit tests (node --test)
npm run dist       # download the history and build dist/PrimeWinRate-Setup-<version>.exe
```

`PRIMEWINRATE_USERDATA=<dir>` keeps settings and history of a development run apart from the real ones.

### Project layout

```
src/main/            Electron main process
  engine/            pure, tested logic (no Electron)
    combinatorics.js   binomials, ranking/unranking and enumeration of combinations
    games.js           rules, eras, schedule, prize tiers, exact odds
    history.js         parsing, validation and the JSON store of draws
    filters.js         pattern metrics, filters, exact census of all combinations
    stats.js           frequencies, pairs, patterns, chi-square tests
    simulate.js        seeded RNG, strategies, generator, backtest, until-hit
  worker.js          heavy computations in a worker thread
src/renderer/        UI (plain ES modules, no framework)
  lang/              translations (pl.json, en.json)
scripts/             build helpers (history download, icon, versioning)
test/                unit tests
```

### Adding a language
Copy `src/renderer/lang/en.json` to `src/renderer/lang/<code>.json`, translate the values and add the code
to `LANGUAGES` in `src/renderer/js/i18n.js`.

## Releasing

Versions follow SemVer; `package.json` is the source of truth and `CHANGELOG.md` holds the notes.

1. Add the changes under `## [Unreleased]` in `CHANGELOG.md`.
2. Run `npm run release:patch` (or `release:minor` / `release:major`), then
   `git push --follow-tags`.

The tag starts the GitHub Actions workflow, which runs the tests, builds the Windows installer and publishes
it as a GitHub release. Publishing a release on GitHub with a new `v*` tag works too: the workflow builds the
installer with the tag's version and attaches it to that release.

## Data sources

The history is downloaded from the public result files at mbnet.com.pl (Lotto since 1957, Eurojackpot
since 2012). If a source changes, use *Import file* with any text or CSV export (`date;numbers…`).

## Responsible play

This is a statistics and education tool; it does not predict draws. Play only with money you can afford to
lose. In Poland, help with gambling problems: 801 889 880.

## License

[MIT](LICENSE) © Rafał Polak (Banzamel)
