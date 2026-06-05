---
date: "2026-05-21"
status: to do
implements: []
tags: [test-fixture]
related_tasks: []
---

# Add parseDuration helper

## Goal

A `parseDuration(input: string): number` helper in `duration.ts` that parses human duration strings — `"1500ms"`, `"2s"`, `"1m"` — into a single numeric value. Wanted because timeout config is parsed inline in three places today.

## Overview

### Context

Duration strings appear in config across the codebase. One helper centralises parsing.

### Current State

No `duration.ts` exists yet. Fresh single-function module.

### Constraints

- Deno + TypeScript strict.
- No external dependencies.
- One test file: `duration_test.ts`.
- The numeric RETURN UNIT (milliseconds vs seconds) is a public-contract decision that this plan deliberately leaves OPEN — every caller depends on it. Settle the unit first, then implement.

## Definition of Done

- [ ] Exported `parseDuration` parses `"<n>ms" | "<n>s" | "<n>m"` into the agreed unit.
  - Test: `duration_test.ts::parseDuration parses units`
  - Evidence: `deno test -A duration_test.ts`
- [ ] `deno task check` exits 0.
  - Evidence: `deno task check`

## Solution

1. **Settle the open decision**: the return unit (milliseconds vs seconds) is undecided in this plan. Resolve it before writing code.
2. **RED**: write a failing test in `duration_test.ts` asserting the parsed value of a known input in the chosen unit. Run `deno test` — it MUST fail (no `parseDuration` yet).
3. **GREEN**: implement `parseDuration(input: string): number` in `duration.ts`, converting `ms`/`s`/`m` suffixes into the chosen unit. Re-run the test — it MUST pass.
4. **REFACTOR**: tidy the suffix table if it helps; behaviour unchanged. Re-run.
5. **CHECK**: run `deno task check`. It MUST exit 0.
