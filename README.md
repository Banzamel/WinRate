<p align="center"><img src="build/icon.png" width="120" alt="WinRate"></p>

# WinRate

[![Build & release](https://github.com/Banzamel/WinRate/actions/workflows/release.yml/badge.svg)](https://github.com/Banzamel/WinRate/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/release/banzamel/winrate.svg)](https://github.com/Banzamel/WinRate/releases)

Windows app for **Lotto** and **Eurojackpot**: full draw history, exact odds, statistics, filters, ticket
generator and simulations on past draws. Polish and English.

## Install

1. Download `WinRate-Setup-<version>.exe` from [Releases](https://github.com/Banzamel/WinRate/releases/latest)
2. Run it and pick the install folder (SmartScreen warning: **More info → Run anyway** — the app is not signed)

The app updates itself: when a new version is out it shows a banner — **Download**, then **Restart and install**.

## Use

Each game has its own tab:

- **Overview** — rules, draw days with a countdown, exact odds of every prize, expected value of a ticket
- **History** — download all past draws, import a file, add a result by hand, export CSV
- **Statistics** — is the draw fair? Number frequencies, hot/cold, gaps, pairs that "like" each other,
  draw shapes vs. all combinations, ball/machine bias detection — each with a significance test
- **Filters** — throw away unlikely and over-played shapes (all-even, 1-2-3-4-5-6, progressions, birthdays…);
  shows exactly what share of combinations is removed and how many real draws would have survived
- **Generator** — tickets that pass all active filters, popularity of each ticket, abbreviated wheels (systems)
- **Simulation** — replay the past as if the future were unknown, or draw "until it hits" a past result

## Notes

- Every combination has the same chance in every draw — the app measures that honestly instead of promising wins.
  Its real gains: fewer tickets per covered shape, and tickets few others play (a win is shared less).
- All data is stored in the `data` folder inside the install folder; uninstalling removes everything.
- Play responsibly — help with gambling problems in Poland: 801 889 880.
- Changes in each version: [Releases](https://github.com/Banzamel/WinRate/releases) ·
  new version: Actions → **Publish new version** → Run workflow.
