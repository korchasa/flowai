---
date: "2026-10-22"
status: done
implements:
  - FR-JIT-REVIEW
tags: [implement, review, benchmark, claude-arm, cost]
related_tasks:
  - bench-claude-default
  - no-stash-parent-probe
---
# Run only the covering tests on the parent revision during review

## Goal

Cut the wall-clock and token cost of a flowai session on a real repository, so flowai stops losing solved tasks to the session time limit and stops costing users ten times what the bare IDE costs. This comes before re-selecting the SWE-rebench pool for Sonnet: measured now, the benchmark would mostly measure flowai running out of time.

## Overview

### Context

The SWE-rebench Sonnet campaign of 2026-10-21 (task `bench-claude-default`) gave flowai 17/45 against 17/45 for the bare Claude Code, at 23.2 vs 2.2 minutes per session. 10 of the 45 flowai sessions hit the 40-minute limit. The transcripts of that campaign (`scripts/benchmark/runs/pool2-claude-sonnet-flowai/rep{1,2,3}/flowai/*/bench-home/.claude/projects/`) show where the time goes:

- Whole-suite runs (`pytest` with no path, file, node id or `-k`; heredoc commands that only mention pytest excluded): flowai 162 over 45 sessions, bare Claude 4. 39 of the 45 flowai sessions ran at least one, median 3 per session, max 12. By turn: implement 118, review 30, plan 14.
- On nicegui, pennylane and schemathesis a whole run takes 5–10 minutes, so the agent backgrounds it and polls: 99 waiting commands (`sleep`, `while pgrep ...; do sleep N; done`), 211 minutes in all, 4.7 minutes per session. Tests plus waiting take about 10 of the 23 minutes of a session.
- Position inside the implement turn: 30 whole-suite runs before the first source edit, 2 between source edits, 41 after the last one; 45 more ran in implement turns with no detected `.py` source edit. Many of the repeats follow an environment problem (missing optional dependencies, version pins) that the agent fixes and then reruns the suite. Per-session timelines show the shape: two to four baseline runs right at the start (`FF`, `PPP` — reruns with other flags after collection errors or timeouts), then several runs at the end, many of them on the parent revision (`git worktree`, `git stash`) to tell pre-existing failures from new ones. One virtualizarr session ran it 8 times on the parent.
- The suites of these repositories are red before any change, so a "must exit 0" check never goes green and invites reruns.
- The first hypothesis — the implement atom runs the project check after every Solution step — is refuted by the 2 between-edit runs and by one run of a dedicated scenario on the current text (the agent wrote all three steps at once and ran the whole suite before the first edit and at the end). That scenario was dropped.

### Current State

- `framework/atoms/implement.md` step 3 runs the project check at CHECK after every Solution step ("It MUST exit 0"); step 5 runs it once more on the full project. Nothing says how many times the whole suite may run, nor how to tell a pre-existing failure from a new one without rerunning it. The parent-probe clause (task `no-stash-parent-probe`) says where to run the parent, not what to run there.
- `framework/atoms/review.md` step 2a runs the project check on the diff; step 2b runs the SAME command in a parent worktree and disables the JiT subset when that baseline is red. Step 4b already locates the pre-existing test modules that cover the changed symbols.
- The shipped template `framework/core/assets/AGENTS.template.md` TDD Flow step 4 makes CHECK "a precondition on finishing" with the whole project's suite; it is not the source of the repetition.
- Existing scenarios that depend on these steps: `implement-returns-to-red-on-check-failure`, `implement-tdd-cycle-completes`, `implement-parent-probe-keeps-working-tree`, `review-runs-existing-suite`, `review-catches-regression-via-jittests`, `review-parent-probe-keeps-working-tree`.

- RED result on the text before the edit (2026-10-22): `implement-red-suite-classified-once` passed 2 of 3 (run `acceptance-tests/runs/2026-10-22T16-47-38`; the one failure was a third `deno task check` after a format fix). On a small fixture the agent already takes one baseline and one final run, so the scenario cannot gate an implement edit. The implement repeats in the campaign follow broken environments and suites that take minutes; reproducing them needs a heavier fixture, which is out of scope here. The scenario stays as a regression guard; the implement edit is dropped from this task. `review-parent-baseline-targeted` failed 3 of 3 on both critical items (run `acceptance-tests/runs/2026-10-22T16-52-34`).

### Constraints

- Every edit goes through Acceptance Test TDD: the new scenario must fail on the current text, on the default arm (claude `claude-sonnet-5-5`), before the text changes.
- The whole suite still runs once after the change; the edit removes repetitions, not the final gate.
- Cross-IDE wording: no tool names of one IDE.
- Scope cut: waiting for a background run by notification instead of `sleep` loops is NOT in this task. The wait lasts as long as the run either way, so it saves nothing once the runs are cut.

## Definition of Done

- [x] FR-JIT-REVIEW: the parent baseline (step 2b) runs the test modules that cover the changed symbols, not the whole suite, and gates the JiT subset on those modules.
  - Test: `Benchmark: review-parent-baseline-targeted` (fixture: a slow test unrelated to the diff that fails before any change)
  - Evidence: `deno task acceptance-tests -f review-parent-baseline-targeted -n 3` red before, 3 of 3 after.
  - Result: 0 of 3 before (run `acceptance-tests/runs/2026-10-22T16-52-34`, both critical items failed in every run). First edit: 2 of 3 (run `2026-10-22T17-00-18`; the third run removed the parent tree early and skipped the probes as "the diff is small"). After making rule 10's reasons exhaustive and keeping the parent tree until step 8b: 3 of 3 (run `2026-10-22T17-07-23`).
- [x] Existing scenarios still pass on the new text.
  - Test: `review-runs-existing-suite`, `review-catches-regression-via-jittests`, `review-parent-probe-keeps-working-tree`, `review-no-change-no-alarm`
  - Evidence: each `deno task acceptance-tests -f <id> -n 1` passes; the full sweep is handed to the user (`deno task acceptance-tests -f review`).
  - Result: all four passed once on 2026-10-22 (runs `2026-10-22T17-13-35`, `17-15-27`, `17-16-33`, `17-17-49`).
- [x] SRS FR-JIT-REVIEW and the SDS JiT section describe the rule with this task's numbers as rationale.
  - Evidence: `grep -n "covering" documents/requirements.md` hits the FR-JIT-REVIEW section; `deno task check` passes.

## Solution

1. RED: run `implement-red-suite-classified-once` and `review-parent-baseline-targeted` 3 times each on the current text. A scenario that passes on the current text is not acceptance for this task: record it and drop its DoD item instead of fitting the scenario.
2. (Dropped — see the RED result under Current State.) GREEN, implement: add a "whole suite at most twice" rule next to CHECK in `framework/atoms/implement.md` — between steps run the tests covering the change; the whole suite once after the last step; optionally once before the first edit, saving the list of failing tests to a scratch file; a failure on both lists is pre-existing; a failure only on the second list is either fixed (rerun that test, not the suite) or shown pre-existing by running only that test in a separate tree of the parent. Replace step 5's "It MUST exit 0" by "green, or red only on failures shown pre-existing".
3. GREEN, review: in `framework/atoms/review.md` step 2b run the step 4b covering modules in the parent tree instead of the project command, and gate JiT on those modules being green; update rule 10 (JiT graceful degradation) to match.
4. Re-run the four review scenarios named in the DoD once each; regenerate skills (`deno task check` does it); update SRS and SDS.
5. Hand off the full sweep to the user; the benchmark re-measure (pool re-selection for Sonnet, then both arms) is a separate task.
