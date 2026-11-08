#!/bin/sh
# Builds the Windows installer inside the tauri-build image (Linux + cargo-xwin + NSIS), so the host
# needs neither Rust nor MSVC. Run from the repo root: `npm run dist` (fetches the history first).
# Named volumes keep Linux node_modules, the cargo registry, the MSVC SDK and the build cache apart
# from the Windows checkout. The installer lands in release/.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd -W 2>/dev/null || pwd)"
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$ROOT:/app" \
  -v winrate-node-modules:/app/node_modules \
  -v winrate-target:/target \
  -v winrate-cargo:/usr/local/cargo/registry \
  -v winrate-xwin:/xwin \
  -e TAURI_SIGNING_PRIVATE_KEY -e TAURI_SIGNING_PRIVATE_KEY_PASSWORD \
  -w /app tauri-build sh -c '
    npm ci --no-audit --no-fund &&
    npx tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc "$@" &&
    mkdir -p release &&
    cp /target/x86_64-pc-windows-msvc/release/bundle/nsis/*-setup.exe* release/ &&
    cp /target/x86_64-pc-windows-msvc/release/winrate.exe release/ &&
    ls -la release' sh "$@"
