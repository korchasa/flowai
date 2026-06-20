---
implements:
  - FR-CICD.PIN
date: 2026-06-21
status: in progress
---
# CI: Bump Node 20 Actions to Node 24 Runtime

## Goal

Clear GitHub Actions Node.js 20 deprecation warnings. Node 20 is forced to run on Node 24 today and will be removed (github.blog/changelog/2025-09-19-deprecation-of-node-20). Keep CI on supported runtimes before the forced removal breaks the pipeline.

## Overview

### Context

Reported warning: `denoland/setup-deno@e95548e...# v2.0.3` targets Node.js 20. Investigation found a second offender: `softprops/action-gh-release@153bb8e...# v2.6.1` (release job) is also on node20. `actions/checkout@v6.0.2` is already node24. User authorized fixing both offenders.

### Current State

`.github/workflows/ci.yml`:
- `denoland/setup-deno` pinned `e95548e56dfa95d4e1a28d6f422fafe75c4c26fb # v2.0.3` (node20) — used in `check` + `release` jobs (2 occurrences).
- `softprops/action-gh-release` pinned `153bb8e04406b158c6c84fc1615b65b24149a1fe # v2.6.1` (node20) — used in `release` job (2 occurrences: GitHub Release + Framework Release).

Target node24 versions (verified via `action.yml` `runs.using: node24`):
- setup-deno v2.0.4 → SHA `667a34cdef165d8d2b2e98dde39547c9daac7282` (patch bump).
- action-gh-release v3.0.1 → SHA `2bb465e97f322d3cb2a965294d483e0d26a67aa9` (major v2→v3; release notes confirm v3.0.0 is a pure runtime bump node20→node24, no input/behavior changes).

### Constraints

- FR-CICD.PIN: every third-party action MUST stay pinned to a full commit SHA with a `# vX.Y.Z` version comment. Floating tags (`@v2`, `@v3`) are forbidden.
- Behavior of the release pipeline must not change — only the action runtime.

## Definition of Done

- [x] FR-CICD.PIN: `denoland/setup-deno` and `softprops/action-gh-release` references in `.github/workflows/ci.yml` point to node24-runtime SHAs with matching version comments; no node20 actions remain.
  - Test: manual — korchasa (CI YAML is not unit-tested; no action-pin validator exists)
  - Evidence: `grep -nE 'setup-deno@667a34cdef165d8d2b2e98dde39547c9daac7282 # v2.0.4|action-gh-release@2bb465e97f322d3cb2a965294d483e0d26a67aa9 # v3.0.1' .github/workflows/ci.yml | wc -l` returns `4` (2 setup-deno + 2 action-gh-release) — verified: 4
- [x] FR-CICD.PIN: project verification stays green after the edit.
  - Test: manual — korchasa
  - Evidence: `deno task check` exits 0 — verified: EXIT=0
- [ ] FR-CICD.PIN: live CI run on the pushed commit is green (release job exercises the bumped action-gh-release).
  - Test: manual — korchasa
  - Evidence: CI await in Push Phase reports green for the pushed SHA

## Solution

Single variant — obvious config bump. Alternatives (floating major tags `@v2`/`@v3`) are excluded by FR-CICD.PIN, which mandates full-SHA pins.

1. In `.github/workflows/ci.yml`, replace all 2 occurrences of
   `denoland/setup-deno@e95548e56dfa95d4e1a28d6f422fafe75c4c26fb # v2.0.3`
   with
   `denoland/setup-deno@667a34cdef165d8d2b2e98dde39547c9daac7282 # v2.0.4`.
2. Replace all 2 occurrences of
   `softprops/action-gh-release@153bb8e04406b158c6c84fc1615b65b24149a1fe # v2.6.1`
   with
   `softprops/action-gh-release@2bb465e97f322d3cb2a965294d483e0d26a67aa9 # v3.0.1`.
3. Verify: `deno task check` (exit 0) + grep evidence above returns 4.
4. Commit (infra-only → doc-sync skipped), push to main, await CI green.
