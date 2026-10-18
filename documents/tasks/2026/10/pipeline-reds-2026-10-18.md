---
date: 2026-10-18
status: done
implements:
  - FR-REVIEW-SPLIT
tags: [acceptance-tests, commit, review-commit-push, ship-task, claude-arm]
related_tasks: []
---
# Three red pipeline scenarios of the 2026-10-18 claude sweep [ANC:task:2026-10-pipeline-reds-2026-10-18]

## Goal

Return the commit/ship pipeline group to green on the claude arm, fixing the layer that is actually broken in each case: primitive, scenario or judge.

## Overview

### Context

The full sweep of 2026-10-18 on claude (`acceptance-tests/runs/2026-10-18T14-45-21/`, agent and judge `claude-sonnet-5-5`, 1 run per scenario) left three reds in this group:

- `review-commit-push-full-cycle-success` — item `review_produced_verdict`. The report opened with `## Review: Approve` in a message of its own; a phase-transition sentence ("Starting the Review Phase...") had been sent as an earlier message. The judge read "whose FIRST line" as the first line of the agent's whole output and failed it, writing that on a strict reading "this should pass". The same judge reason failed it in run `2026-10-18T14-12-56`; run `2026-10-18T13-01-44` passed.
- `ship-task-full-cycle-success` — item `review_produced_verdict`. The raw session (`80410e8d-….jsonl`) has no assistant text between "Now the Review phase" and "Entering the Push phase": the verdict lived only in the agent's reasoning. Interviewed, the agent claimed it had sent the report; the session file contradicts it, and follow-up questions were refused by the model's safeguards.
- `commit-flips-task-status` — item `clean_status`. The agent ran the tests, `deno test` downloaded `@std/assert` and wrote an untracked `deno.lock`, and the agent left it and asked the user.

### Current State

- `framework/atoms/commit.md` banned project checks only in the `REUSE_PRIOR_PHASE` branch. The standalone (`FRESH_READ`) commit said nothing, although FR-REVIEW-SPLIT says "Commit MUST NOT run project checks".
- The three `*-full-cycle-success` checklists (`ship`, `ship-task`, `review-commit-push`) shared the "whose FIRST line contains `Approve`" wording.

### Constraints

- Do not change what the standalone review does after its verdict (commit 6edb83c1).
- Do not touch `framework/core/assets/AGENTS.template.md`, `scripts/acceptance-tests/lib/` or `framework/atoms/plan.md` — other sessions own them.

## Definition of Done

- [x] `review-commit-push-full-cycle-success`: the judge item names the report's own heading line, and the scenario is green on HEAD.
  - Benchmark: `review-commit-push-full-cycle-success`
  - Evidence: `deno task acceptance-tests -f review-commit-push-full-cycle-success -n 3 --lock <name>.lock` → 3/3 PASSED (run of 2026-10-18 after the checklist edit).
- [x] `ship-task-full-cycle-success`: resampled on HEAD before any change.
  - Benchmark: `ship-task-full-cycle-success`
  - Evidence: `deno task acceptance-tests -f ship-task-full-cycle-success -n 3 --lock <name>.lock` → 3/3 PASSED on HEAD f14ce6df; with the sweep run that is 3 of 4. No primitive change: a defect seen once in 4 runs cannot go red for a TDD cycle.
- [x] FR-REVIEW-SPLIT: the standalone commit runs no project check and leaves a clean tree.
  - Benchmark: `commit-flips-task-status`, `commit-no-checks`
  - Evidence: `deno task acceptance-tests -f commit-flips-task-status -n 4 --lock <name>.lock` → 4/4 PASSED, 0 check commands in the 4 traces (run `2026-10-18T17-54-02`; before: 2/3 on HEAD f14ce6df plus 0/1 in the sweep, every run ran the tests); `deno task acceptance-tests -f commit-no-checks -n 2 --lock <name>.lock` → 2/2 PASSED.

## Solution

1. Reword `review_produced_verdict` in the three `*-full-cycle-success` scenarios: the report must be a visible message of its own whose heading line carries the verdict; earlier transition messages and tool calls do not count against it; a verdict only in the reasoning or only inside the final summary fails.
2. Add rule 9 "No project checks" to `framework/atoms/commit.md`. It sits outside `<step_by_step>`, so only the standalone commit skill carries it; the composites already ban checks in their Commit Phase.
3. Record the ban and its rationale under FR-REVIEW-SPLIT.
