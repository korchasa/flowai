---
date: 2026-10-07
status: done
implements:
  - FR-DOC-ANCHORS.HOOK
tags: [hooks, salp]
related_tasks: [no-dead-fr-ref]
---
# The doc-anchors hook strips source files the way the project check does

## Goal

The turn-end hook and `deno task check` must give the same verdict on the same tree. When they disagree, the agent is blocked on a "dead reference" that the project check calls clean, or the other way round.

## Overview

### Context

- While working on [no-dead-fr-ref](no-dead-fr-ref.md), the hook reported a SALP token inside a template literal in an acceptance scenario's `mod.ts` as a dead reference on every turn, while `scripts/check-salp.ts` stayed green.
- `scripts/check-salp.ts` moved to a character scan in `f352ac30`: in `.ts`/`.js` it keeps only comment text and blanks string and template-literal bytes, because scenarios write whole sandbox files out of template literals. The hook kept the older per-line test (a line starting with `//` counts as a comment), so it read the sandbox's tokens as this repo's.

### Current State

- `framework/beta/hooks/doc-anchors-validate/run.ts` `keepOnlyCommentLines` is the per-line version.
- No test compares the two strippers.

### Constraints

- The hook ships as a single file with no sibling imports, so the stripper stays duplicated; a test must catch drift instead.

## Definition of Done

- [x] FR-DOC-ANCHORS.HOOK: the hook ignores SALP tokens inside template literals.
  - Test: `framework/beta/hooks/doc-anchors-validate/run_test.ts::ignores-salp-tokens-inside-template-literals`
  - Evidence: `deno test -A framework/beta/hooks/doc-anchors-validate/run_test.ts` passes; the test FAILED on the per-line stripper (2026-10-07).
- [x] FR-DOC-ANCHORS.HOOK: the hook and `check-salp.ts` strip every `.md`/`.ts`/`.js`/other case identically.
  - Test: `scripts/check-salp_test.ts::hook-strips-non-reference-context-like-the-validator`
  - Evidence: `deno test -A scripts/check-salp_test.ts` passes; the test FAILED on the per-line stripper (first mismatch: `a.ts`, a trailing `//` comment after code).
- [x] SDS §3.18 and the FR-DOC-ANCHORS.HOOK acceptance list describe the character scan and the parity test.
  - Evidence: `grep -cF 'hook-strips-non-reference-context-like-the-validator' documents/design.md documents/requirements.md` prints 1 for each file.
- [x] The project check stays green.
  - Evidence: `deno task check` ends with 0 failed.

## Solution

1. Export `stripNonReferenceContext` from both files.
2. Write the hook's template-literal test and the parity test; run them RED.
3. Copy `keepOnlyCommentLines` from `scripts/check-salp.ts` into the hook verbatim; the hook's doc comment names the parity test.
4. Update SDS and SRS.
