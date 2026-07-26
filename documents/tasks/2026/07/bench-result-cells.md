---
date: 2026-07-26
status: to do
implements:
  - FR-BENCH-SWE.CELLS
---

# Result cells: one record per (ide, arm+flowai fingerprint, model, effort)

## Goal

Make every benchmark measurement self-describing, so a number can be
re-interpreted months later without re-running it. Today a campaign's results
are scattered: `solves.json` (resolved-or-not), `baseline.jsonl` (patch),
`run-meta.json` (three pins), swebench `report.json` (F2P/P2P), the driver log
(exit code, abort reason). Nothing ties them, and a task that was never
attempted is simply ABSENT — anyone computing a pass rate silently gets an
inflated one.

## Overview

### Context

Two harness bugs already shipped bad numbers, both invisible in the stored data:

- the grading run id was rep-scoped, so the codex campaign replayed Sonnet's
  cached verdicts — 31/67 published for an agent that graded 2 instances
  (fixed in `4e27bebc`, found only by reading `report.json` mtimes);
- a health-abort storm left 45 instances un-run; they vanished from the
  predictions file rather than being recorded as un-measured (`e7aff6fe`).

User decision 2026-07-26: store results per CELL, keyed by
`(ide, arm + flowai fingerprint, model, effort)`; record time, per-task
outcome, and an environment id. Chosen depth: full per-task record incl.
regression decomposition and empty-patch cause (variant 2A); the framework
fingerprint belongs IN the key, not inside the cell (variant 1A) — so
"bare codex" and "codex + flowai@<sha>" are different cells by construction.

### Current State

- `pool2_measure.ts` writes `baseline.jsonl` (append-only, resumable) and
  `pool2-run` writes `<repDir>/run-meta.json` {rep, ide, model, effort, split,
  stepTimeoutMs, concurrency} + `<baseOut>/campaign.json`.
- `campaignRunId` scopes the grading run id to the campaign.
- `retro.ts::classifyReport` already decomposes a swebench report into
  `clean | solved-broke | unsolved | no-patch | apply-failed | ungraded` with
  F2P/P2P counts and named broken P2P tests — the per-task verdict is a
  re-read away, not a new measurement.
- `runArm` returns `{prediction, code, logPath, authFailed}` and computes
  `wallClockMs` internally (not returned). `AcpAgent.getMessages()` exposes the
  turn transcript.
- `metrics.ts` / `webaudit.ts` harvest cost + web access — Claude only; codex
  counters (`CODEX_HOME/sessions/rollout-*.jsonl`) are a deferred port.

### Constraints

- Deno + TS, TDD (RED→GREEN→REFACTOR→CHECK), no new runtime deps.
- Never re-derive test outcomes in TS — read swebench's own verdict files.
- No silent fallbacks: a missing field is `null` with a reason, never a guess.
- Existing campaign dirs stay readable; the importer must not rewrite them.
- The cell record is APPEND-friendly — a resumed rep must not truncate it.

## Definition of Done

- [ ] FR-BENCH-SWE.CELLS: a cell id is the full key and nothing else collides
  - Test: `scripts/benchmark/cells_test.ts::cellId is the (ide, arm+fw, model, effort) key`
  - Evidence: `deno test -A scripts/benchmark/cells_test.ts`
- [ ] FR-BENCH-SWE.CELLS: every task carries an explicit measurement status
      (`measured | pending | excluded`), so an un-run task can never be counted
      as a miss
  - Test: `scripts/benchmark/cells_test.ts::pass rate refuses to count un-measured tasks`
  - Evidence: `deno test -A scripts/benchmark/cells_test.ts`
- [ ] FR-BENCH-SWE.CELLS: a measured task records verdict (F2P/P2P
      decomposition), exit code, turns, wall-clock, patch size, and — when the
      patch is empty — WHY (`agent-gave-up | timeout | health-abort |
      auth-fail | setup-fail`)
  - Test: `scripts/benchmark/cells_test.ts::a task record explains an empty patch`
  - Evidence: `deno test -A scripts/benchmark/cells_test.ts`
- [ ] FR-BENCH-SWE.CELLS: the cell header pins task set + agent + judge +
      harness + environment, incl. the harness commit that produced it
  - Test: `scripts/benchmark/cells_test.ts::cell header pins everything needed to re-interpret it`
  - Evidence: `deno test -A scripts/benchmark/cells_test.ts`
- [ ] FR-BENCH-SWE.CELLS: `pool2-run` writes the cell as it goes (resume-safe)
  - Evidence: `deno run -A scripts/benchmark.ts pool2-run --rep 1 ... --limit 1` leaves
    `runs/cells/<cellId>/{cell.json,tasks.jsonl}` with one measured row
- [ ] FR-BENCH-SWE.CELLS: the completed codex campaigns are imported into cells
      with honest gaps (unavailable fields null, not invented)
  - Evidence: `deno run -A scripts/benchmark.ts cells-import --from scripts/benchmark/runs/pool2-codex-terra`
    then `deno run -A scripts/benchmark.ts cells-show` lists 3 terra reps + 2 sol reps
- [ ] Docs match the code
  - Evidence: `deno task check` (traceability + SRS evidence gates)

## Solution

1. **SRS/SDS first.** Add `#### FR-BENCH-SWE.CELLS` under FR-BENCH-SWE with the
   key, the status trichotomy and the "never re-derive verdicts" rule; extend
   SDS §3.22 components with `cells.ts`.
2. **`scripts/benchmark/cells.ts` (TDD).**
   - `CellKey {ide, arm, framework, model, effort}`; `cellId(key)` →
     `<ide>-<arm>-<fw>-<model>-<effort>` slug (lowercase, `[a-z0-9-]`).
   - `CellHeader` = key + `taskSet {dataset, split, forkCommit, ids, checksum}`
     + `agent {modelSnapshot, ideVersion, bridgeVersion}` + `judge {model,
     effort}` + `harness {maxSteps, stepTimeoutMs, promptHash, commit}` +
     `env {hostname, arch, cpuCount, ramBytes, dockerVersion, rosetta}` +
     `reps [{rep, startedAt, finishedAt, concurrency, healthAborts,
     backoffWaits}]`.
   - `TaskRecord {rep, instanceId, status, verdict?, exitCode?, turns?,
     wallClockMs?, patchBytes?, emptyReason?, patchPath?, judgePath?, web?}`.
   - `appendTask` / `readCell` / `writeHeader` (append-only jsonl, last row per
     `(rep, instanceId)` wins — mirrors the predictions-file resume rule).
   - `passRate(cell, rep)` → `{measured, resolved, pending, excluded}` and
     THROWS on a caller that asks for a rate while tasks are pending, unless it
     passes `{allowPartial: true}`.
3. **Wire into `pool2-run`**: build the header from the pins already in scope,
   append a task row per instance right after `appendPrediction`, and fill the
   verdict from `classifyReport` after grading.
4. **Importer** `cells-import`: read an existing campaign dir (`run-meta.json`,
   `baseline.jsonl`, `solves.json`, swebench `report.json`) and emit a cell.
   Fields the old runs never captured (turns, wall-clock, judge transcripts)
   are `null` — the gap is recorded, not filled.
5. **CHECK**: `deno task check` green; then freeze the codex pool FROM the
   cells, not from the ad-hoc jsons.
