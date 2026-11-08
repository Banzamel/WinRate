# Releasing

The installer is built only by GitHub Actions (`windows-latest`), never uploaded by hand.

## Secrets (once)

- `TAURI_SIGNING_PRIVATE_KEY` — contents of the updater private key (kept outside the repo, e.g.
  `%USERPROFILE%\.tauri\winrate.key`; its public key is `plugins.updater.pubkey` in `src-tauri/tauri.conf.json`).
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — empty if the key has no password.

Losing the private key means installed apps can no longer verify updates.

## Workflows (`.github/workflows`)

- `release.yml` — tests (`npm test`, `npm run build`) on every push/PR to `main`; on a pushed `v*` tag or a
  published release it calls `build.yml`.
- `build.yml` (reusable) — checks out the tag, Rust + Node, `npm ci`, `npm test`, aligns `package.json` with the
  tag, `fetch-history`, release notes from `CHANGELOG.md`, `tauri build` with signed updater artifacts, then
  `scripts/release-manifests.mjs`, and uploads `WinRate-Setup-X.Y.Z.exe`, `latest.json` (Tauri
  updater) and `latest.yml` (so Electron installs ≤ 0.5.x update into the Tauri version).
- `publish.yml` — manual "Publish new version": bumps patch/minor/major on `main`, commits, tags, pushes,
  then builds via `build.yml`.

## Option A — one click (preferred)

```
gh workflow run publish.yml -f bump=minor     # or patch / major
gh run watch
```

## Option B — locally

```
npm version minor        # runs scripts/version.cjs stamp: Unreleased → ## [X.Y.Z] - date, commits, tags
git push origin main --follow-tags
```

## After the run

- `gh release view vX.Y.Z` — must list exactly the `.exe`, `latest.json` and `latest.yml` (no `.sig`, no `.blockmap`).
- Installed apps pick the update up from `latest.json` (banner → Download → Restart and install); the installer
  runs in passive mode and keeps `data/`.
- The installer is not Authenticode-signed: SmartScreen shows "More info → Run anyway".

## Local installer (no Rust on the host)

```
npm run docker:image     # once: Linux image with Rust, cargo-xwin, NSIS, Node
npm run dist             # fetch-history + build in Docker → release/
```

## Silent install for testing

```
WinRate-Setup-X.Y.Z.exe /S /D=C:\path\to\WinRate     # /D must be last, no quotes
```
Without /D a fresh install goes to `<system drive>\Banzamel\WinRate`, an install over the Electron app into its folder.
Uninstall: `"<install dir>\uninstall.exe" /S` (silent keeps `data`; the wizard asks with "Delete the application data").
