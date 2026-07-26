---
date: 2026-07-26
status: done
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

- [x] FR-BENCH-SWE.CELLS: a cell id is the full key and nothing else collides
  - Test: `scripts/benchmark/cells_test.ts::cellId is the (ide, arm+fw, model, effort) key`
  - Evidence: `deno test -A scripts/benchmark/cells_test.ts`
- [x] FR-BENCH-SWE.CELLS: every task carries an explicit measurement status
      (`measured | pending | excluded`), so an un-run task can never be counted
      as a miss
  - Test: `scripts/benchmark/cells_test.ts::pass rate refuses to count un-measured tasks`
  - Evidence: `deno test -A scripts/benchmark/cells_test.ts`
- [x] FR-BENCH-SWE.CELLS: a measured task records verdict (F2P/P2P
      decomposition), exit code, turns, wall-clock, patch size, and — when the
      patch is empty — WHY (`agent-gave-up | timeout | health-abort |
      auth-fail | setup-fail`)
  - Test: `scripts/benchmark/cells_test.ts::a task record explains an empty patch`
  - Evidence: `deno test -A scripts/benchmark/cells_test.ts`
- [x] FR-BENCH-SWE.CELLS: the cell header pins task set + agent + judge +
      harness + environment, incl. the harness commit that produced it
  - Test: `scripts/benchmark/cells_test.ts::cell header pins everything needed to re-interpret it`
  - Evidence: `deno test -A scripts/benchmark/cells_test.ts`
- [x] FR-BENCH-SWE.CELLS: `pool2-run` writes the cell as it goes (resume-safe)
  - Evidence: live smoke 2026-07-26 — `pool2-run --rep 9 --ide codex --model gpt-5.6-terra
    --effort medium --instance agronholm__anyio-1121 --cells <tmp>` exit 0; the cell holds a
    header (`bridgeVersion 1.1.7`, `promptHash 946da8d8dd51fcad`, `commit ca432e92`,
    env `Mac-mini/aarch64/10cpu/docker 29.4.0/rosetta`, rep 9 start+finish, 0 aborts) and two
    rows for the instance — first the measured run (exit 0, 4125-byte patch, 1 turn,
    240082 ms), then the same row folded with swebench's verdict (resolved, F2P 1/1, P2P 32/0)
- [x] FR-BENCH-SWE.CELLS: the completed campaigns are imported into cells with
      honest gaps (unavailable fields null, not invented)
  - Evidence: `deno run -A scripts/benchmark.ts cells-show` →
    `claude-baseline-none-sonnet-high: rep1 31/67, rep2 30/67, rep3 31/67`,
    `codex-baseline-none-gpt-5-6-terra-medium: rep1 40/66, rep2 40/66, rep3 42/66`,
    `codex-baseline-none-gpt-5-6-sol-high: rep1 5/17, rep2 2/12 (+5 pending)`
- [x] Docs match the code
  - Evidence: `deno task check` — exit 0, 638 + 173 tests, 0 failed (2026-07-26)

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
