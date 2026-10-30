# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). New entries go under **Unreleased**; `npm version`
moves them into a numbered section automatically (see README → Releasing).

## [Unreleased]

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

[Unreleased]: https://github.com/Banzamel/PrimeWinRate/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Banzamel/PrimeWinRate/releases/tag/v0.1.0
