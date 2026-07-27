---
date: 2026-07-27
status: done
implements:
  - FR-BENCH-SWE
tags: [benchmark, flowai-arm, codex, pool2, cells]
related_tasks:
  - documents/tasks/2026/07/bench-swe-fix-problems.md
  - documents/tasks/2026/07/bench-result-cells.md
---
# First flowai arm: codex terra@medium over the frozen codex pool

## Goal

Produce the measurement the whole harness exists for. Everything measured so
far is a BARE IDE — claude/sonnet and codex/terra+sol baselines. No flowai run
has ever been graded on pool2, so the project has an instrument and no answer.
User decision 2026-07-27: park the Sonnet track, measure codex only.

## Overview

### Context

- The frozen pool for codex is `scripts/benchmark/pools/codex-terra-medium.json`
  — 15 keepers (8 unstable, 7 ceiling-only) selected under the keep-rule from
  the terra@medium subject cell against the sol@high ceiling cell.
- Selection used baseline behaviour ONLY and was frozen before any flowai run
  (honesty rule, FR-BENCH-SWE.POOL2) — this run is what the freeze was for.
- `pool2-run` drove the baseline arm exclusively: `runBaselineBatch` hard-coded
  `arm: "baseline"`, wrote `baseline.jsonl`, and keyed the cell with
  `arm: "baseline", framework: null`.
- `run --arm flowai` exists but targets the OLD pool (SWE-bench Verified via the
  princeton harness) — it cannot grade SWE-rebench instances and writes no cell.
- `runArm` itself already implements both arms for both IDEs: the flowai arm
  installs the core pack via `copyFrameworkToIdeDir`, seeds `AGENTS.md` + doc
  stubs, and is operator-driven through `JudgeGateOperator` with the codex `$`
  command prefix.

### Current State

Missing link between the two: an arm-aware batch driver over pool2 instances,
plus a grading id that carries the arm. Without the latter the flowai rep would
find the baseline's cached `report.json` files and REPLAY them — the same class
of bug as the rep-scoped run id fixed in `4e27bebc`.

### Constraints

- Deno + TS, Code TDD, no new runtime deps.
- Baseline grading ids must stay byte-identical — their logs exist on disk and
  the pool2 freeze was derived from them.
- Never re-derive verdicts in TS; the fork's `report.json` is the only source.
- A cell key must state WHICH framework ran — a commit sha would misname a run
  off an uncommitted tree.

## Definition of Done

- [x] FR-BENCH-SWE: `pool2-run --arm flowai` drives the flowai arm over pool2
      instances and writes `<repDir>/flowai.jsonl`
  - Test: `scripts/benchmark/pool2_measure_test.ts::campaignRunId: the arm moves the id, and baseline ids never move`
  - Evidence: `deno test -A scripts/benchmark/pool2_measure_test.ts`
- [x] FR-BENCH-SWE: the arm scopes the grading run id and the swebench model
      name, so a flowai rep can never inherit the baseline's cached verdicts
  - Test: `scripts/benchmark/pool2_measure_test.ts::campaignRunId: the arm moves the id, and baseline ids never move`
  - Evidence: `deno test -A scripts/benchmark/pool2_measure_test.ts`
- [x] FR-BENCH-SWE.POOL2: `--pool <frozen.json>` runs the frozen pool and aborts
      on any instance with no gate evidence
  - Test: `scripts/benchmark/cell_select_test.ts::loadFrozenPool: returns the frozen ids, and refuses an empty pool`
  - Evidence: `deno test -A scripts/benchmark/cell_select_test.ts`
- [x] FR-BENCH-SWE.CELLS: the flowai cell key carries the framework tree
      fingerprint, and a dirty worktree says so
  - Test: `scripts/benchmark/cells_test.ts::frameworkFingerprint names the framework tree, and admits when it is dirty`
  - Evidence: `deno test -A scripts/benchmark/cells_test.ts`
- [x] `deno task check` green
  - Evidence: `deno task check` — exit 0, 645 + 173 tests, 0 failed (2026-07-27)
- [x] FR-BENCH-SWE: no IDE's config dir reaches the model patch — the flowai
      arm installs the pack into `.codex` / `.claude` / … and none of it is the fix
  - Test: `scripts/benchmark/predictions_test.ts::captureDiff: excludes EVERY IDE's config dir, not just Claude's`
  - Evidence: `deno test -A scripts/benchmark/predictions_test.ts`
- [x] Campaign: rep 1 of codex/terra@medium + flowai over the 15-instance frozen
      pool, graded, recorded as a cell
  - Evidence: `deno run -A scripts/benchmark.ts cells-show` →
    `codex-flowai-44d8965a5ce4-gpt-5-6-terra-medium: rep1 3/15`
- [x] Docs match the code (SRS FR-BENCH-SWE.POOL2 + SDS §3.22)
  - Evidence: `deno task check` — exit 0, 646 + 173 tests, 0 failed (2026-07-27)

## Result — rep 1, 2026-07-27

flowai 3/15 vs baseline 8 solves across 3 reps (2.7/15 per rep). ONE rep, so
this is noise-level, not an effect. Per-instance:

- `anyio-1134` — baseline 0/3, flowai SOLVED (the only baseline-fail → flowai-pass)
- `sqlglot-7457`, `nicegui-5914` — baseline 1/3, flowai solved (inside the unstable band)
- `pygraphistry-1277` — baseline 0/3, flowai `solved-broke`: F2P 2/2 but 6 P2P
  broken. A headline pass@1 would hide this entirely; the P2P decomposition is
  what makes it visible.
- `pygeoapi-2338`, `meltano-9929`, `virtualizarr-979` — three turns, NO patch at
  all (206–259 s sessions). The plan phase concluded there was nothing to do.
  This is the biggest process failure of the run, and it costs 3 of 15 outright.
- 4 sessions hit the 20-minute session cap (`pdm-3759`, `pennylane-9298`,
  `schemathesis-3778`, `nicegui-5914` — the last solved anyway).

Harness defects the run exposed (fixed / to fix):

1. FIXED: every IDE config dir now leaves the patch. The smoke run shipped a
   471 KB / 41-file patch that was entirely `.codex/skills/**`; regrading
   `anyio-1134` with the clean 3 KB patch flipped it from unsolved to SOLVED —
   the contamination was changing verdicts, not just size.
2. TO FIX: `uv.lock` (392 KB on `pdm-3759`) rides along with the fix — same
   class as `venv/`, absent from `DIFF_EXCLUDES`.
3. TO FIX: re-running a completed rep (e.g. to regrade) overwrites the rep's
   `startedAt`/`finishedAt`, so the header now claims rep 1 took 0.3 s. Resume
   must preserve the original timings and accumulated abort counters.
4. TO FIX: `harness.commit` records the HEAD sha even when the working tree is
   dirty — the same lie `frameworkFingerprint` refuses to tell.

## Solution

1. `pool2_measure.ts`: `runBaselineBatch` → `runArmBatch` with an `arm` option;
   predictions land at `<outDir>/<arm>.jsonl`; `RepCampaign` gains `arm` +
   `framework`; `campaignMismatch` treats the arm as part of dir ownership;
   `campaignRunId` inserts a segment for a non-baseline arm only;
   `gradePool2Predictions` takes the swebench model name.
2. `cells.ts`: `frameworkFingerprint()` = git tree hash of `framework/`,
   suffixed `-dirty` when the worktree differs.
3. `cell_select.ts`: `loadFrozenPool()` — reads a `cells-select` selection,
   refuses an empty pool, returns sorted ids.
4. `cells_import.ts`: `applyVerdicts` reads the verdict under the arm's model
   name instead of a hard-coded `baseline`.
5. `benchmark.ts`: `pool2-run` gains `--arm` and `--pool`; the default out dir
   becomes `runs/pool2-<arm>`; the cell key carries arm + fingerprint.
6. Campaign: smoke one instance, then rep 1 over the frozen 15.
