---
name: release
description: Publish a new WinRate version — bump the version, let GitHub Actions build the Windows installer, verify the release assets and smoke-test the installed exe. Use when asked to release, publish, tag a version or "build the exe".
---

# Release WinRate

Follow `.claude/docs/release.md`. Steps:

1. Preconditions: on `main`, working tree clean, `git pull`, `npm test` passes, `CHANGELOG.md` has
   meaningful entries under `## [Unreleased]` (add them if the user's changes are missing).
2. Pick the bump: `patch` for fixes, `minor` for new features, `major` for breaking changes/data format changes.
   Ask the user if unclear.
3. Trigger: `gh workflow run publish.yml -f bump=<bump>` (or `npm version <bump>` + `git push origin main --follow-tags`).
   Never do both — that creates two versions.
4. Watch: `gh run list --workflow publish.yml -L 1`, then `gh run watch <id> --exit-status`.
   On failure: `gh run view <id> --log-failed`, fix, and release a new patch (do not move existing tags).
5. Verify: `gh release view vX.Y.Z --json assets` lists `WinRate-Setup-X.Y.Z.exe`, `.exe.blockmap`, `latest.yml`.
6. Smoke test on Windows: `gh release download vX.Y.Z -p "*.exe" -D <scratch dir>`, install silently
   (`/S /D=<dir>`), start `WinRate.exe`, confirm the process stays alive and `<dir>\data` gets created,
   then close it. Report the result to the user.
