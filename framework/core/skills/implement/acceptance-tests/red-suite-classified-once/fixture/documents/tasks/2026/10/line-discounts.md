---
date: "2026-10-20"
status: to do
implements: []
tags: [test-fixture]
related_tasks: []
---

# Per-line discounts on invoices

## Goal

Let an invoice line carry an optional discount in percent, so sales can offer per-item promotions without manual credit notes.

## Overview

### Context

`lineTotal` in `src/invoice.ts` multiplies quantity by unit price. Every total in the app (invoices, receipts) goes through it.

### Current State

No discount support. The test suite also holds the ledger reconciliation test, which takes about 20 seconds.

### Constraints

- Deno + TypeScript strict, no new dependencies.
- Totals stay in whole cents.

## Definition of Done

- [ ] `Line` has an optional `discountPct`; `lineTotal` applies it and rounds to whole cents; a value outside 0-100 throws `RangeError`.
  - Evidence: `grep -n discountPct src/invoice.ts`
- [ ] Tests in `tests/invoice_test.ts` cover a discounted line, rounding to whole cents, and the out-of-range error.
  - Test: `tests/invoice_test.ts::lineTotal applies a percent discount`
  - Evidence: `deno test tests/invoice_test.ts`
- [ ] `deno task check` passes, or every remaining failure is shown to exist without this change.
  - Evidence: `deno task check`

## Solution

1. Add `discountPct?: number` to `Line`; apply it in `lineTotal` with `Math.round`; throw `RangeError` outside 0-100.
2. Add tests to `tests/invoice_test.ts`: a 25% discount on `{ qty: 2, unitCents: 1000 }` gives `1500`; a 33% discount on `{ qty: 1, unitCents: 1 }` rounds to `1`; `discountPct: 120` throws `RangeError`.
3. Run `deno task check`. Any failure must be either fixed (if this change caused it) or shown to fail without this change and reported as out of scope.
