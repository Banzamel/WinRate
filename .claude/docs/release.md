# Releasing

The installer is built only by GitHub Actions (`windows-latest`), never uploaded by hand.

## Workflows (`.github/workflows`)

- `release.yml` — tests on every push/PR to `main`; on a pushed `v*` tag or a published release it calls `build.yml`.
- `build.yml` (reusable) — checks out the tag, `npm ci`, `npm test`, aligns `package.json` version with the tag,
  `fetch-history`, writes release notes from `CHANGELOG.md`, `electron-builder --win nsis`, uploads
  `WinRate-Setup-X.Y.Z.exe`, `.blockmap` and `latest.yml` to the GitHub release.
- `publish.yml` — manual "Publish new version": bumps patch/minor/major on `main`, commits, tags, pushes,
  then builds via `build.yml`.

## Option A — one click (preferred)

```
gh workflow run publish.yml -f bump=minor     # or patch / major
gh run watch
```

## Option B — locally

```
npm version minor        # runs scripts/version.js stamp: Unreleased → ## [X.Y.Z] - date, commits, tags
git push origin main --follow-tags
```

## After the run

- `gh release view vX.Y.Z` — must list the `.exe`, `.blockmap` and `latest.yml`.
- Installed apps pick the update up from `latest.yml` (banner → Download → Restart and install).
- The installer is unsigned: SmartScreen shows "More info → Run anyway".

## Silent install for testing

```
WinRate-Setup-X.Y.Z.exe /S /D=C:\path\to\WinRate     # /D must be last, no quotes
```
Uninstall: `"<install dir>\Uninstall WinRate.exe" /S`.
