# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). New entries go under **Unreleased**; `npm version`
moves them into a numbered section automatically (see README → Releasing).

## [Unreleased]

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

### Changed
- All data (history, settings, caches) is kept in the `data` folder inside the install folder; uninstalling
  removes everything, updates keep it.
- Shorter README.
- New app icon: a lottery draw machine.

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

[Unreleased]: https://github.com/Banzamel/WinRate/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Banzamel/WinRate/releases/tag/v0.1.0
