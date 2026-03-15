# flow-cli: Self-Update Check

## Goal

flow-cli should check for newer versions on JSR before sync and suggest update via `deno install`. Reduces risk of users running outdated versions with stale skills/agents.

## Overview

### Context

flow-cli is distributed via JSR (`@korchasa/flow-cli`). Users install with `deno install -g -A jsr:@korchasa/flow-cli`. Currently no mechanism to notify about newer versions.

**Known bug:** `src/cli.ts:14` hardcodes version `"0.1.0"`, while `deno.json` has `"0.1.5"`. Must fix as part of this task — single source of truth for version.

### Current State

- Version in `deno.json`: `"0.1.5"` (canonical, used by JSR publish)
- Version in `cli.ts:14`: `"0.1.0"` (hardcoded, out of sync)
- No update check mechanism exists
- JSR exposes package metadata at `https://jsr.io/@korchasa/flow-cli/meta.json` (includes `latest` field)

### Constraints

- Network failure during version check MUST NOT block CLI operation (fail-open)
- Check runs BEFORE sync (user sees update notice early)
- Works in both interactive and `--yes` modes (informational only, no prompt)
- `--skip-update-check` flag to disable
- TDD: tests first
- No stubs — injectable fetch for testability (adapter pattern, consistent with codebase)

## Definition of Done

- [x] `VERSION` constant reads from `deno.json` (single source of truth). Fix hardcoded `"0.1.0"` in cli.ts. Evidence: `flow-cli/src/version.ts:5`, `flow-cli/src/cli.ts:14`
- [x] `checkForUpdate(currentVersion, options?)` function in `src/version.ts`. Evidence: `flow-cli/src/version.ts:36-62`
- [x] Fetches `https://jsr.io/@korchasa/flow-cli/meta.json`, compares `latest` with current. Evidence: `flow-cli/src/version.ts:43-55`
- [x] Returns `{ currentVersion, latestVersion, updateAvailable, updateCommand }` or `null` on error. Evidence: `flow-cli/src/version.ts:14-19`
- [x] CLI calls check BEFORE sync, prints notice if update available. Evidence: `flow-cli/src/cli.ts:29-36`
- [x] `--skip-update-check` flag disables check. Evidence: `flow-cli/src/cli.ts:22-25`
- [x] Network errors silently ignored (null return, no output). Evidence: `flow-cli/src/version.ts:59-61`
- [x] Tests cover: update available, up-to-date, network error, malformed response, timeout. Evidence: `flow-cli/src/version_test.ts` (8 tests)
- [x] `deno task check` passes. Evidence: 149 passed, 0 failed, "All checks passed!"
- [x] SRS updated (new FR-6). Evidence: `flow-cli/documents/requirements.md:53-63`
- [x] SDS updated (new component §3.9). Evidence: `flow-cli/documents/design.md:86-95`

## Solution

### Step 1: Export VERSION from deno.json

**New file: `src/version.ts`**
```typescript
import denoConfig from "../deno.json" with { type: "json" };
export const VERSION: string = denoConfig.version;
```

**Fix `src/cli.ts:14`:** `.version("0.1.0")` → `.version(VERSION)`

### Step 2: `checkForUpdate()` function

**File: `src/version.ts`**

```
checkForUpdate(currentVersion: string, options?: { fetch?: typeof globalThis.fetch }): Promise<VersionCheckResult | null>
```

- Fetch `https://jsr.io/@korchasa/flow-cli/meta.json`
- Parse JSON, extract `latest` field
- Compare with semver (`@std/semver`)
- Return result or `null` on any error (network, parse, timeout)
- Timeout: 5s (don't hang on slow network)

### Step 3: CLI integration

**File: `src/cli.ts`**

- Add `--skip-update-check` flag (default: `false`)
- Before sync (after config load), call `checkForUpdate(VERSION)`
- If update available, print:
  ```
  Update available: 0.1.5 → 0.2.0
  Run: deno install -g -A -f jsr:@korchasa/flow-cli
  ```
- If null or up-to-date: silent

### Step 4: Tests (TDD — written FIRST)

**New file: `src/version_test.ts`**
- Test: update available (mock fetch returns higher version) → returns result with `updateAvailable: true`
- Test: up-to-date (mock fetch returns same version) → returns result with `updateAvailable: false`
- Test: network error (mock fetch throws) → returns `null`
- Test: malformed JSON (mock fetch returns invalid) → returns `null`
- Test: timeout (mock fetch hangs) → returns `null`
- Test: VERSION matches deno.json version

### Step 5: Update docs

- SRS: FR-6 (Self-Update Check)
- SDS: §3.10 (Version Checker)

### Execution Order

```
Step 4 (tests) → Step 1 (VERSION) → Step 2 (checkForUpdate) → Step 3 (CLI) → Step 5 (docs) → deno task check
```
