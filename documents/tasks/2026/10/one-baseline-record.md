---
date: "2026-10-23"
status: done
implements:
  - FR-ATOM-IMPLEMENT
  - FR-AI-CODE-REVIEW.SEVERITY
tags: [implement, review, benchmark, claude-arm, cost]
related_tasks:
  - targeted-test-runs
  - bench-claude-default
---
# One record of the failing tests per session, shared by implement and review

## Goal

Let a flowai session on a repository whose suite is already red learn that state once and reuse it, the way a programmer handed a change for a project without CI runs the tests first and then compares against that run. Today the session pays for the same knowledge several times, and the waiting eats the time it needs to finish the fix.

## Overview

### Context

- The SWE-rebench Sonnet campaign of 2026-10-21 (task `bench-claude-default`): flowai 17/45 against 17/45 for the bare Claude Code, 23.2 vs 2.2 minutes per session, 10 of 45 flowai sessions cut at the 40-minute limit.
- Whole-suite runs (counter below): flowai 169 over 45 sessions, bare Claude 23. On the four instances with the most repeats — `zarr-developers__virtualizarr-979`, `meltano__meltano-9929`, `zauberzeug__nicegui-5914`, `geopython__pygeoapi-2338` — flowai ran the whole suite 42 times in 12 sessions (0 to 8 per session), waited 98.7 minutes in `sleep` loops (90.0 of them on nicegui), solved 4 of 12, and all three nicegui sessions hit the 40-minute limit.
- A side session classified the 76 implement-turn repeats: 40 followed a run that gave no usable list of failing tests (17 collection or import errors, 13 runs stopped by `-x` at the first failure, 10 after an environment repair); 25 were baseline or parent classification; 11 re-verified a fix.
- The first run before any change is right, and the bare IDE skipping it is a defect of the bare IDE, not a saving (user, 2026-10-23): "if I get changes for a project without CI/CD, it is better to run the tests first to understand the state". The benchmark grader plays the part of CI, so the campaign cannot show the value of that run; it can only show its cost. The retro count of tests the change broke: baseline 4/45, flowai 3/43.
- The agreed workflow, as a programmer would do it:
  1. Run the whole suite once before the change, after any environment repair, without fail-fast flags, in the background with the output in a file; keep the list of failing tests.
  2. Run only the covering tests while working.
  3. Run the whole suite once at the end and compare its failures with the list.
  4. Look at the parent revision only for a failure the list does not explain, and only for that test.
  5. The review reuses the list.

Counter: `scratchpad/whole_suite.py` of the session that wrote this task — a Bash command counts when one of its segments LAUNCHES pytest (only env assignments or a launcher such as `timeout`, `uv run`, `nohup` before it, or `<python> -m pytest`) and its arguments, cut at the first redirect, name no `.py` file, no node id (`::`), no shell variable and no `-k` filter; a directory counts as the whole suite; commands holding a heredoc are skipped; only the agent's transcripts (the `*-sandbox` project directory, subagents included) are read. Waiting is the duration of Bash calls holding `sleep` (`scratchpad/sleeps.py`). The definitions are repeated here because the scratch files do not outlive the session. The 169 differs from the 162 in task `targeted-test-runs`, whose counter missed `pytest tests/` and counted `which pytest`.

### Current State

- `framework/atoms/implement.md`: step 2 picks the project check command; step 3 CHECK runs it after every Solution step and requires exit 0; step 5 runs it once more and requires exit 0. Nothing tells the agent to keep a record of what was red before the change, so on a red suite exit 0 never comes and every classification is a new run.
- `framework/atoms/review.md`: step 2a runs the project check on the diff and reports any failure as `[critical]`; step 2b (after task `targeted-test-runs`) runs only the covering modules on the parent. A whole-suite failure that predates the diff has no route to "pre-existing" except another run.
- `implement-red-suite-classified-once` passes 2 of 3 on the current text: a small fixture does not reproduce the repeats, which follow broken environments and suites that take minutes. No sandbox scenario reproduces them (9 runs over 3 fixtures, task `targeted-test-runs`).
- **Measurement after Solution steps 1–2 (2026-10-23, `scripts/benchmark/runs/pool2-claude-sonnet-flowai-record`, rep1–3):** 39 whole-suite runs in 12 sessions against 42 before; 125.5 minutes of waiting against 98.7; mean session 26.3 minutes against 26.1; solved 6 of 12 against 4 of 12 (pygeoapi 3 of 3 against 1 of 3, which 12 sessions cannot separate from noise). Every session read the new text (`Baseline record` appears in each transcript), and the runs now have the intended shape — one run before the first edit, one at the end — but the target below was wrong twice over:
  - the agreed workflow has a floor of 2 whole-suite runs per session, 24 for 12 sessions, so "half of the 55" was never reachable and 42 → 24 is the most the design can give;
  - the remaining repeats are a first run that failed to collect (`-n auto` or collection errors, rerun with `--continue-on-collection-errors` or without xdist), a second final run after a fix, and a cheap `--collect-only` the counter also counts;
  - the cost that matters is the wait, not the count: in nicegui rep3 the agent started the baseline, said it could not run its own browser tests beside it because both use one fixed port, and waited 33 minutes in `until grep ... sleep` loops before the first edit. "Before the first source edit" was read as "do not start until the record is in".
- **Measurement of the second variant (2026-10-23, `scripts/benchmark/runs/pool2-claude-sonnet-flowai-record2`, rep1–3), record in a separate worktree in the background:**
  - minutes to the first `.py` edit in nicegui: 4.9, 8.1, 3.4 (before the change 6.4, 5.4, 4.9; first variant: no edit in two sessions, 38.6 in the third); `scratchpad/first_edit.py` counts Edit/Write calls on `.py` files only, so a session that edits through the shell reads `none`;
  - waiting: 91.4 minutes against 98.7 before and 125.5 in the first variant; mean session 24.1 minutes against 26.1; solved 6 of 12 against 4 of 12, with nicegui solved once for the first time in either campaign;
  - whole-suite runs: 46 against 42 before — the count clause of the DoD fails. The extra runs come from making the separate tree run (virtualizarr rep3: four baseline attempts while installing missing packages into scratch dirs and setting `PYTHONPATH`, then two final runs with and without that path) and from a planning-phase subagent (pygeoapi rep1: four runs over `tests/other tests/api`, which the counter treats as whole because they name directories; virtualizarr rep3: a planning subagent ran the suite around `git stash` / `git stash pop`, outside the stash ban of implement and review);
  - every benchmark install uses `pip install -e .`, so a separate tree that borrows the working tree's virtualenv imports the CHANGED package unless its own directory comes first on the import path. The pygeoapi agent set `PYTHONPATH` to the separate tree and printed `pygeoapi.__file__` to check; the atom now asks for that check.

### Constraints

- Acceptance deviation, recorded in the SRS: the RED for this change is the benchmark measurement above, not a sandbox scenario, because no fixture reproduces the defect. The existing implement and review scenarios are the regression guard.
- A project whose check is fast keeps today's per-step CHECK; the change is about suites that take minutes.
- Cross-IDE wording: no tool names of one IDE.
- Out of scope: waiting for a background run by notification instead of `sleep` loops; re-selecting the pool for Sonnet.

## Definition of Done

- [x] FR-ATOM-IMPLEMENT: the implement atom takes one record of the failing tests on the unchanged code, in a separate worktree in the background while the work goes on (after a quick start check and any environment repair, without fail-fast flags), runs covering tests between steps when the suite is slow, runs the whole suite once at the end, and classifies a failure from the record — the parent revision only for a failure the record does not explain, and only that test.
  - Test: `Benchmark: pool2-run --arm flowai --instance` on the four instances above, 3 reps.
  - Evidence: on `scripts/benchmark/runs/pool2-claude-sonnet-flowai-record2` (the background variant), `scratchpad/sleeps.py` reports less waiting than the 98.7 minutes before the change, the time from session start to the first source edit in each nicegui session is under 10 minutes (`scratchpad/first_edit.py`; 38.6 minutes or no edit at all in the first variant), and the mean session is shorter than the 26.1 minutes before. The whole-suite count (`scratchpad/whole_suite.py`) and the solved count are reported, not gated: the agreed workflow has a floor of 2 whole runs per session, and the goal is the time the runs cost (user decision, 2026-10-24, after the count came out at 46 against 42).
  - Result: waiting 91.4 minutes; first edit in nicegui after 4.9, 8.1 and 3.4 minutes; mean session 24.1 minutes. Reported: 46 whole-suite runs against 42; solved 6 of 12 against 4 of 12. The editable-install check in the record bullet was added after this run and is not measured yet; the next run of the flowai arm on the whole pool (re-selection for Sonnet) covers it.
- [x] FR-AI-CODE-REVIEW.SEVERITY: review step 2a compares its failures with the session's record when one exists and reports a failure on the record as pre-existing, not `[critical]`; without a record it reruns only the failing tests in the parent worktree of step 2b to classify them.
  - Test: the same benchmark run (review turns are part of the count).
  - Evidence: the same counter; `grep -n "baseline record" framework/atoms/review.md` hits step 2a.
  - Result: `grep` hits review.md lines 54 and 181. Waiting in the review turn on the four instances fell from 19.8 minutes (5 `sleep` calls) to 1.7 (1 call); waiting in the implement turn rose from 78.9 to 89.7, nearly all of it nicegui waiting for the background record before its own browser tests.
- [x] The existing implement and review scenarios still pass on the new text.
  - Test: `implement-tdd-cycle-completes`, `implement-returns-to-red-on-check-failure`, `implement-parent-probe-keeps-working-tree`, `implement-red-suite-classified-once`, `review-runs-existing-suite`, `review-parent-baseline-targeted`, `review-catches-regression-via-jittests`, `review-no-change-no-alarm`
  - Evidence: each `deno task acceptance-tests -f <id> -n 1` passes; the full sweep is handed to the user.
  - Result: all eight passed once on 2026-10-23 on the first variant (runs `2026-10-23T10-47-56` through `2026-10-23T11-01-41`). On the background variant the four implement scenarios ran again: three passed; `implement-red-suite-classified-once` failed its classification item, which forbade any whole-suite run on the parent — the record itself in this variant — and passed after the item was narrowed to a second whole run made to classify (runs `2026-10-23T13-02-19`, `13-03-26`, `13-04-15`, `13-07-28`). The review text did not change between the variants.
- [x] SRS FR-ATOM-IMPLEMENT and FR-AI-CODE-REVIEW.SEVERITY, and the SDS §3.20, describe the record and the acceptance deviation.
  - Evidence: `grep -ni "baseline record" documents/requirements.md documents/design.md` hits both FR sections and the SDS; `deno task check` passes.

## Solution

1. Implement atom (`framework/atoms/implement.md`):
   - step 2: add the baseline record — whole suite once on the unchanged code in a separate worktree of `HEAD`, in the background, after a quick start check and any environment repair, no fail-fast flags, failing test ids written to a scratch file; the work starts at once and waits for the record only on a resource clash or at step 5 (second variant, chosen by the user on 2026-10-23 after the first measurement; the first variant took the record on the working tree before the first edit);
   - step 3 CHECK: on a suite slower than about a minute, run format/lint plus the covering tests between steps; a failure on the record is an out-of-scope finding; a failure off the record is yours — fix it and rerun that test; the parent worktree only when the record cannot tell, and only that test;
   - step 5: the last whole-suite run passes when its failures are all on the record; after a fix, rerun the failed tests, not the suite;
   - verification list: match.
2. Review atom (`framework/atoms/review.md`) step 2a: reuse the record — failures on it are pre-existing; without a record, rerun only the failing tests in the step 2b parent worktree; skip 2a when the session already ran the whole suite after the last code change.
3. Regenerate the skills (`deno run -A scripts/generate-skill-composites.ts --write`), run the 8 regression scenarios once each.
4. Run the benchmark subset in the background: `deno task benchmark pool2-run --arm flowai --pool scripts/benchmark/pools/codex-terra-medium.json --instance <id> ×4 --rep N --out scripts/benchmark/runs/pool2-claude-sonnet-flowai-record2` for N = 1..3 (the first variant ran into `...-record`); count runs, waiting and time to the first edit.
5. Update SRS and SDS; run `deno task check`.
