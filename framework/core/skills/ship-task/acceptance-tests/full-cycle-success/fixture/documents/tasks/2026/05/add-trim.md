---
date: "2026-05-17"
status: to do
implements: []
tags: [test-fixture]
related_tasks: []
---

# Add trim helper

## Goal

A `trim(s: string): string` helper in `strings.ts` that removes leading and trailing whitespace, returning the original string when there is none. Wanted because the codebase has 3 ad-hoc inlinings of the same logic.

## Overview

### Context

Trimming is the most common string normalisation in this codebase. A shared helper removes duplication and gives one place to update behaviour (e.g. handling unicode whitespace later).

### Current State

`strings.ts` exists but only exports `capitalize`. No `trim` helper.

### Constraints

- Deno + TypeScript strict.
- No external dependencies — use the built-in `String.prototype.trim()`.
- One test file: `strings_test.ts`.

## Definition of Done

- [ ] Exported `trim` function in `strings.ts` returns the input string with leading/trailing whitespace removed.
  - Test: `strings_test.ts::trim removes leading and trailing whitespace`
  - Evidence: `deno test -A strings_test.ts`
- [ ] `trim("")` returns `""` (no crash).
  - Test: `strings_test.ts::trim handles empty string`
  - Evidence: `deno test -A strings_test.ts`
- [ ] `deno task check` exits 0.
  - Evidence: `deno task check`

## Solution

1. **RED**: write a failing test in `strings_test.ts` calling `trim("  hello  ")` and expecting `"hello"`. Run `deno test` — it MUST fail (no `trim` exported yet).
2. **GREEN**: export `trim(s: string): string { return s.trim(); }` from `strings.ts`. Re-run the test — it MUST pass.
3. **RED again**: add a test for `trim("")` expecting `""`. Run — passes immediately (because the built-in handles it), but the test documents the boundary.
4. **REFACTOR**: no opportunity in 1 line; skip.
5. **CHECK**: run `deno task check`. It MUST exit 0.
