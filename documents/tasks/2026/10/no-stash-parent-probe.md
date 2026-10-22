---
date: "2026-10-22"
status: done
implements:
  - FR-JIT-REVIEW
  - FR-ATOM-IMPLEMENT
tags: [review, implement, git-stash, benchmark, claude-arm]
related_tasks: []
---
# Never stash the work to look at the parent revision [ANC:task:2026-10-no-stash-parent-probe]

## Goal

A session that is cut off must never lose a finished change. The `review` and `implement` skills look at the parent revision often (is this failure pre-existing, does the new test fail on the original code, lint before vs after); doing it with `git stash` puts the whole change at the mercy of the session budget.

## Overview

### Context

SWE-rebench Sonnet campaign 2026-10-21 (Claude Code `claude-sonnet-5-5`, 3 reps × 15 instances, flowai arm). Raw transcripts under `/var/folders/.../flowai-bench/rep*/flowai/*/bench-home/.claude/projects/*sandbox/*.jsonl` (temp dir, may be purged):

- 50 Bash calls ran `git stash`: 39 in the `/implement` turn, 11 in `/review`, 0 in `/plan`.
- 19 ran `git worktree add`: 18 in `/review`, 1 in `/implement`. No review session used both.
- `schemathesis__schemathesis-3933` rep3: the review skipped step 2b, reused a baseline log from the implement turn, found one new failure, and probed it with `git stash -q; <25 pytest runs>; git stash pop -q`. The 40-min budget ran out inside that span; the fix (checks.py +127/-31, tests +126) stayed in `stash@{0}` and the harness captured an empty patch.
- Implement-turn stash purposes: "verify unrelated failures exist at baseline", "confirm new tests fail on original source", mypy/ruff before vs after.

### Current State

- `framework/atoms/review.md` step 2b said "Prefer `git worktree add` … `git show` fallback ONLY if worktree-add fails" and never mentioned stash or ad-hoc probes.
- `framework/atoms/implement.md` had no guidance on how to look at the parent at all.

### Constraints

- Acceptance Test TDD (AGENTS.md): scenario RED on the old text, GREEN on the new one.
- User decisions 2026-10-22: the ban goes into both `review` and `implement`; for the review scenario, which could not be made red, keep it as a regression guard and measure the effect on the benchmark.

## Definition of Done

- [x] FR-ATOM-IMPLEMENT: implement probes the parent in a separate tree and never stashes the uncommitted work.
  - Benchmark: `implement-parent-probe-keeps-working-tree`
  - Evidence: RED on the old text — 1 of 3 passed, both failures ran `git stash push src/invoice.ts` (run `acceptance-tests/runs/2026-10-21T22-45-57`, gitignored, claude-sonnet-5-5); GREEN on the new text — `deno task acceptance-tests -f implement-parent-probe-keeps-working-tree -n 3 --no-cache` ≥ 2/3; measured 3/3, 0 `git stash` and 1-2 `git worktree add` per raw transcript (run `2026-10-21T22-50-23`)
- [x] FR-JIT-REVIEW: review never moves the diff out of the working tree for any parent probe.
  - Benchmark: `review-parent-probe-keeps-working-tree` (regression guard: 3/3 on the old text as well)
  - Evidence: `deno task acceptance-tests -f review-parent-probe-keeps-working-tree -n 3 --no-cache` ≥ 2/3; measured 3/3, 0 `git stash` per raw transcript (run `2026-10-21T22-52-56`)
- [x] The ban reaches every generated skill that inlines the two atoms.
  - Evidence: `grep -c "Never take" framework/core/skills/{review,implement,ship,ship-task,review-and-commit,review-commit-push}/SKILL.md` prints a non-zero count for each file
- [x] `deno task check` passes.
  - Evidence: `env -u AUTO_INSTALL_PLUGINS deno task check`

## Solution

1. Scenario `framework/core/skills/review/acceptance-tests/parent-probe-keeps-working-tree/`: a Deno billing project where `tests/receipt_test.ts` already fails on the parent; the user asks whether that single test fails without the change. Two query wordings both passed 3/3 on HEAD — kept as a regression guard.
2. Scenario `framework/core/skills/implement/acceptance-tests/parent-probe-keeps-working-tree/`: same project, plan step 1 already uncommitted in the working tree, the check fails on the pre-existing receipt test. Old text: 1/3 (RED).
3. `review.md` step 2b: build the parent as a separate tree; forbid `git stash` / checkout / restore / reset of the diff's files for every parent probe of the review; reuse the 2b worktree and remove it at the end.
4. `implement.md` step 3: new bullet "Looking at the code without your change" — separate worktree or `git show HEAD:<path>`, never stash.
5. SRS FR-JIT-REVIEW / FR-ATOM-IMPLEMENT and SDS JiT pipeline step 1 updated; Rationale added to both FRs.
6. Hand-off: full sweeps `deno task acceptance-tests -f review` and `-f implement`; re-run the flowai arm of the benchmark on the instances that stashed and count `git stash` calls.
