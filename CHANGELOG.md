# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). New entries go under **Unreleased**; `npm version`
moves them into a numbered section automatically (see README → Releasing).

## [Unreleased]

### Changed
- Simpler Simulation: no strategy, window or memory to choose — the backtest and "until it hits" play the
  Generator's tickets (all active filters) next to a plain random player.

## [0.2.2] - 2026-10-30

### Changed
- Simpler Generator: no strategy to choose — every ticket passes all active filters (also "Choose numbers
  for me" of the system bets).
- Simpler Filters: each filter is only switched on or off, its value is fixed and shown next to it; the presets
  are replaced by "Restore defaults". Settings saved by older versions keep which filters were on.
- New default set (about a quarter of Lotto, ~25 % of Eurojackpot): the popular shapes stay on; primes, decades
  used, neighbour pairs, remainder of 3, largest gap and the history weights are off by default. On the full
  history every filter removes real draws as often as random tickets, so these only cut tickets without
  making a win less shared (neighbour pairs even remove the unpopular ones).

## [0.2.1] - 2026-10-30

### Fixed
- Eurojackpot history downloads again: mbnet.com.pl moved its results to `bazy/eurojackpot.csv` (the old
  `ej.txt` returns 404); Lotto uses `bazy/lotto.csv` with the old `dl.txt` as a fallback.
- The app shows its own draw-machine icon on the taskbar, the window and `WinRate.exe` (it showed the Electron logo).

## [0.2.0] - 2026-10-30

### Added
- **Ball and machine physics**: empirical-Bayes estimate of every ball's chance (equal on a fair machine, so it
  never invents a bias), change-over-time test (new ball set or machine), memory between draws, runs test, and a
  calculator of what ball mass tolerances can do at most (terminal velocity, edge, draws needed to detect it).
- **Expected value** of a ticket with jackpot sharing (Poisson), tax and the jackpot at which a ticket pays back.
- **Popularity** of every ticket (how many others play it) and the strategies *Ball physics (Bayes)* and
  *Unpopular tickets*.
- **Abbreviated wheels** (systems): fewest tickets that guarantee a win of the chosen size.
- **Automatic updates** from GitHub Releases.
- One-click release: Actions → *Publish new version* raises the version, tags it and builds the installer.
- New draw results are downloaded automatically at start (switch in Settings).
- The exclusion map of the filters (one bit per combination, 1.7 MB for Lotto) is saved in `data/combinations` and reused after a restart.

- Five more filters: prime numbers, decades used, pairs of neighbours, remainder of division by 3 and the
  largest gap; the recommended preset now removes ~47 % of Lotto combinations (the previous one is "Light").
- **Which number comes next to which**: neighbour pairs in the sorted results against their exact expectation.
- **Lotto system bets** (7–12 numbers): prize table for every outcome, numbers chosen to pass the filters.
- Generator: at most N numbers shared by any two tickets of a coupon.
- "Choose numbers for me" finds system numbers whose bets all pass the filters (7–9 numbers; for 10–12 the
  closest possible).
- "Until it hits" with Lotto system bets (7–12 numbers): systems tried and bets played until the six is hit.
- Light theme in navy, yellow and white; explanations folded under "How does it work?"; a simple view by
  default with the scientific tools in Advanced mode (Settings); the Generator tab comes second.

### Changed
- Same last digit: up to 3 numbers allowed (the 8 Oct 2026 result 3-27-29-33-42-43 has three 3s).
- Lotto costs 5 zł per bet and pays 35 zł for three hits since 18 August 2026.
- All data (history, settings, caches) is kept in the `data` folder inside the install folder; uninstalling
  removes everything, updates keep it.
- Shorter README.
- New app icon: a lottery draw machine.
- The app is now called **WinRate** (installer `WinRate-Setup-<version>.exe`).

### Fixed
- The pair test no longer reports a fair history as unusual.

## [0.1.0] - 2026-10-30

### Added
- **Lotto** and **Eurojackpot** as two separate tabs, each with Overview, History, Statistics, Filters,
  Generator and Simulation.
- Game rules: number pools with their rule eras (Eurojackpot 2/8 → 2/10 → 2/12), draw days and times with
  a countdown, ticket prices and the exact odds of every prize tier.
- Draw history: download of the full history, import of text/CSV exports, manual entry, CSV export;
  stored locally and checked against the rules of each draw's date. The installer ships with the history
  downloaded at build time.
- Statistics: number frequencies, hot and cold numbers, gaps, pairs ("which numbers like each other") with
  a heat map, the shapes of the draws (odd/even, low/high, sum, runs, arithmetic progressions, decades,
  last digits, coupon rows and columns, spread) against their exact distribution over all combinations,
  repeats from the previous draw and identical draws — each with a chi-square test.
- Exclusion filters with the exact share of combinations each one removes (every combination is checked)
  and how many real draws it would have removed; the recommended preset removes ~32 % of Lotto and ~28 %
  of Eurojackpot combinations.
- Ticket generator with seven strategies (pure random, random within the filters, hot, cold, overdue,
  most frequent, pair affinity).
- Simulation: walk-forward backtest against a random player, and "until it hits", which replays past draws
  and counts the tickets needed to hit them.
- Polish and English user interface.

[Unreleased]: https://github.com/Banzamel/WinRate/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/Banzamel/WinRate/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/Banzamel/WinRate/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Banzamel/WinRate/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Banzamel/WinRate/releases/tag/v0.1.0
