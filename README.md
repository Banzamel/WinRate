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
- **Filters** — switch off over-played shapes (all-even, 1-2-3-4-5-6, progressions, birthdays, extreme sums…);
  each filter is just on/off with a fixed value, and the exact share of removed combinations is computed at once
- **Generator** — tickets for the next draw: every one passes the active filters and is the least popular of 12
  such tickets (same chance, a win shared less often); Lotto system bets (7–12 numbers) with numbers chosen so
  their bets pass the filters; abbreviated wheels in Advanced mode
- **Your numbers** — pick or type your own ticket: which filters it breaks, how popular it is, its closest past
  results and a rating
- **Saved coupons** — save the generated tickets, a system bet or your own numbers for the next draw; when the
  result is downloaded every ticket shows its hits and prize, with the balance of all checked coupons
- **Simulation** — "until it hits" replays a past draw: numbers are drawn one by one, only tickets that pass
  the filters are played and none is ever played twice, until one is the real result

## Notes

- Every combination has the same chance in every draw — the app measures that honestly instead of promising wins.
  Filters reject real past results exactly as often as all combinations (checked on the whole history), and no
  rule based on hot, cold, overdue numbers or pairs finds past results faster than chance. The real gains:
  fewer tickets per covered shape, and tickets few others play (a win is shared less).
- New results are downloaded at start; your saved coupons are checked against them automatically.
- All data is stored in the `data` folder inside the install folder; uninstalling removes everything.
- Play responsibly — help with gambling problems in Poland: 801 889 880.
- Changes in each version: [Releases](https://github.com/Banzamel/WinRate/releases) ·
  new version: Actions → **Publish new version** → Run workflow.
