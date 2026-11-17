---
date: "2026-05-17"
status: to do
implements: []
tags: [test-fixture]
related_tasks: []
---

# Add arithmetic helpers

## Goal

Three shared arithmetic helpers — `sum`, `multiply`, `divide` — so that callers stop inlining them.

## Overview

### Context

The same three operations are written inline in several places. A shared module gives one place to fix behaviour such as division by zero.

### Current State

No helper module exists.

### Constraints

- Deno + TypeScript strict.
- No external dependencies.

## Definition of Done

- [ ] `utils.ts` exports `sum`, `multiply` and `divide`; `divide` throws on a zero divisor.
  - Test: `utils_test.ts`
  - Evidence: `deno test -A utils_test.ts`
- [ ] `deno task check` exits 0.
  - Evidence: `deno task check`

## Solution

1. Write `utils.ts` with the three helpers.
2. Cover them in `utils_test.ts`.
3. Run `deno task check`.
