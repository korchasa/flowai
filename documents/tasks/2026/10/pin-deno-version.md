---
date: 2026-10-18
status: done
implements:
  - FR-CICD.DENO-PIN
tags: [ci, deno]
---
# Pin the Deno version in one file that CI and `deno task check` both read

## Goal

A `deno.lock` written on the developer machine must be byte-identical to the one CI produces. Otherwise every dependency bump turns CI red and has to be repaired by copying CI's lock diff back by hand.

## Overview

### Context

- `deno.lock` content depends on the Deno version that resolves it. On 2026-10-18 a dependency bump rewritten by local Deno 2.9.7 pruned bare-version entries (`jsr:@std/assert@*`, `@std/fs@*`, `@std/yaml@*`, ...); CI's Deno 2.9.1 re-added them during `deno task check`, and the "Verify file integrity after checks" step failed (run 39120935785). Commit `cf65de4d` patched the lock by hand.
- Local Deno is installed by Homebrew (`/opt/homebrew/bin/deno -> ../Cellar/deno/2.9.7`), which upgrades it without asking and does not read any version file.
- `denoland/setup-deno` v2.0.4 (the pinned SHA) accepts `deno-version-file`; for a `.dvmrc` it reads `contents.trim()` as the version (`src/version.ts::getDenoVersionFromFile`).

### Current State

- `.github/workflows/ci.yml` hardcodes `deno-version: v2.9.1` in both the `check` and `release` jobs.
- README §Development Setup names no Deno version.
- `scripts/task-check.ts` does not look at the running Deno version.

### Constraints

- One source of truth for the version; nothing else may restate the number.
- Exact match down to the patch version: the lock diverged between 2.9.1 and 2.9.7, both 2.9.x.
- Fail fast with a message that names both versions and the two ways out; no fallback, no warning-only mode.
- FR-CICD.PIN stays satisfied: `setup-deno` keeps its SHA pin.

## Definition of Done

- [x] FR-CICD.DENO-PIN: `.dvmrc` holds the single pinned Deno version, and both CI `setup-deno` steps read it.
  - Test: manual — korchasa (CI YAML is not unit-tested)
  - Evidence: `grep -c 'deno-version-file: .dvmrc' .github/workflows/ci.yml` returns `2` and `grep -c 'deno-version:' .github/workflows/ci.yml` returns `0` — verified: 2 and 0
- [x] FR-CICD.DENO-PIN: `deno task check` fails before any other step when the running Deno differs from `.dvmrc`, naming both versions.
  - Test: `scripts/task-check_test.ts::denoVersionMismatch: *`
  - Evidence: `deno test -A scripts/task-check_test.ts` passes — verified: 10 passed (RED first: missing export). Probe with `.dvmrc` set to 2.9.6: check exits 1 before any prerequisite with "Running Deno 2.9.7, but .dvmrc pins 2.9.6. ..."
- [x] FR-CICD.DENO-PIN: `env -u AUTO_INSTALL_PLUGINS deno task check` is green locally and leaves `deno.lock` unchanged.
  - Test: manual — korchasa
  - Evidence: `env -u AUTO_INSTALL_PLUGINS deno task check` exits 0, then `git diff --exit-code deno.lock` exits 0 — verified: EXIT 0, 913 + 213 passed, deno.lock untouched
- [x] FR-CICD.DENO-PIN: CI is green on the pushed commit.
  - Test: manual — korchasa
  - Evidence: CI Status command from AGENTS.md §CI/CD exits 0 for the pushed SHA — verified: run 39121486893 on 3116dced, `check` and `release` both success; the `check` log shows `deno-version-file: .dvmrc` and "Going to install stable version 2.9.7"

## Solution

Variant chosen by the user: `.dvmrc` plus an early version gate in `deno task check`.

1. Add `.dvmrc` with `2.9.7` (the version that wrote the current lock).
2. `scripts/task-check.ts`: export a pure `denoVersionMismatch(running, pinnedFileText)` returning an error message or `null`; `main()` reads `.dvmrc` (a missing file is an error) and throws on mismatch before the prerequisites run. RED test first in `scripts/task-check_test.ts`.
3. `.github/workflows/ci.yml`: replace `deno-version: v2.9.1` with `deno-version-file: .dvmrc` in both jobs.
4. Docs: SRS FR-CICD gains FR-CICD.DENO-PIN; SDS notes the gate next to the other `task-check.ts` integration notes; README §Development Setup points at `.dvmrc` and says how to upgrade (bump `.dvmrc`, re-resolve `deno.lock`, commit both).
5. Verify locally, commit by explicit paths, push, await CI.
