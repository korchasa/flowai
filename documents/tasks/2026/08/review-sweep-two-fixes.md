---
date: 2026-08-10
status: done
implements:
  - FR-JIT-REVIEW
  - FR-REVIEW-COMMIT
---

# Two primitive fixes surfaced by the full `review` acceptance sweep

## Goal

Close the two real defects the 26-scenario `review` sweep exposed, and record
that neither came from the `review` atom rewrite on this branch.

## Overview

### Context

The branch rewrote `framework/atoms/review.md` (two thirds of the body) and
touched `plan`, `commit`, and the `review-and-commit` wrapper. The full sweep
(`deno task acceptance-tests -f review`, 26 scenarios, 55 min) ran on
2026-08-09: 23 passed, 3 failed, 1 warning.

A first sweep attempt the same evening produced 26 identical failures with 0
agent steps and $0 cost — the CLI in this process tree was unauthenticated
(`-32000 Authentication required` for the agent, `exit 1` with
`duration_api_ms: 0` for the judge). That run measured nothing and is not
evidence of anything.

### Current State

Failures, and what the traces showed:

- `review-catches-regression-via-jittests` / `parent_baseline_in_worktree` —
  the declared check command ran only on the working tree, not on the parent
  worktree. **Passed on repeat → run-to-run variance, no defect.**
- `review-trigger-adj-1` / `skill_invoked` — "synthesize JIT tests against my
  staged diff" did not route to `review`. **Failed twice.**
- `review-and-commit-post-reflect-cleanup-commit` — failed twice on DIFFERENT
  checks: first `reflect_executed` (reflect never ran), then
  `cleanup_commit_correct` (reflect ran, the separate commit was made, but the
  message read `docs(agents): …` instead of the required `agent:` type).

Neither surviving defect is a regression from the rewrite: the `review`
description is byte-identical to `main`, and this branch does not touch step 7
of `framework/atoms/commit.md`. Both are older gaps the sweep exposed.

### Constraints

- Catalog metadata (name + description) is capped at 100 tokens
  (`FR-UNIVERSAL.DISCLOSURE`, chars/4). The first fix draft hit 154 and failed
  `check-skills.ts`.
- A description is YAML scalar — `: ` inside it breaks the frontmatter parse.
- Widening a routing surface must not start over-triggering.

## Definition of Done

- [x] FR-JIT-REVIEW: diff-regression wording ("synthesize JiT tests against my
      diff") routes to `review`. The capability was always in the atom; the
      description named it only as "ephemeral regression probes", which is not
      how a user says it. Shipped description measures 97 tokens against the
      original's 94, inside the 100 cap. (The first draft spelled the idea out
      and hit 154, failing `check-skills.ts`.) Measure with the same formula the
      checker uses — `(len(name) + len(description)) / 4` — before editing a
      description that is already near the cap.
  - Test: `Benchmark: review-trigger-adj-1`
  - Evidence: `deno task acceptance-tests -f review-trigger-adj-1` — PASSED
    2026-08-10T07:17Z (failed twice before the fix)
- [x] FR-JIT-REVIEW: the widened description does not over-trigger.
  - Test: `Benchmark: review-trigger-false-1`, `Benchmark: review-no-spurious-invocation`
  - Evidence: both PASSED 2026-08-10T07:24Z after the description change
- [x] FR-REVIEW-COMMIT: the post-reflect cleanup commit uses the `agent:` type.
      Step 7 named the message but not the rule behind it, so the agent
      classified by the file it touched (Markdown → `docs:`). The step now
      states that the type marks a change to the agent's own instructions and
      that the touched file does not decide it.
  - Test: `Benchmark: review-and-commit-post-reflect-cleanup-commit`
  - Evidence: `deno task acceptance-tests -f review-and-commit-post-reflect-cleanup-commit`
    — PASSED 2026-08-10T07:23Z (failed twice before the fix)
- [x] `deno task check` green.
  - Evidence: `deno task check` (665 + 173, 0 failed)

## Solution

1. `framework/atoms/review.md` — description names the JiT-synthesis entry
   point in user words, compressed to stay under the catalog cap.
2. `framework/atoms/commit.md` step 7 — the `agent` type is stated as
   mandatory, with the reason and the wrong-classification trap named.
3. SDS §"Streamlined commit flow" records the mandatory type and the live
   failure that motivated it.

Not done on purpose: nothing was changed for
`review-catches-regression-via-jittests`. One failure followed by a pass is
noise, and editing the atom to chase it would fit the text to a coin flip.
