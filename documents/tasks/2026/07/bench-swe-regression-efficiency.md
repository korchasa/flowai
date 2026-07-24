---
date: "2026-07-22"
status: in progress
implements:
  - FR-BENCH-SWE
tags: [benchmark, regression, efficiency, harness, retro]
related_tasks:
  - documents/tasks/2026/07/benchmark-system-requirements.md
  - documents/tasks/2026/07/bench-v1-harness.md
---
# FR-BENCH-SWE: P2P regression decomposition + session cost counters

## Goal

Keep the existing FR-BENCH-SWE harness useful as the acting workhorse (user
decision 2026-07-22, revising the 2026-07-21 "park it" call): teach it the two
measurements it structurally lacks — (1) the regression component of the v1
endpoint (`no-regression` := PASS_TO_PASS passes) and (2) efficiency/cost
counters ("always measured, never a quality criterion" — v1 principle). Both
move the old instrument TOWARD the v1 design contract (recorded in
benchmark-system-requirements.md, superseded 2026-07-22 — the replacement
track is closed; its clauses are adopted piecemeal into FR-BENCH-SWE).

## Overview

### Context

- swebench's `resolved` verdict is ALREADY the conjunction "all FAIL_TO_PASS
  pass ∧ all PASS_TO_PASS pass" — the harness reports only the headline, so
  "solved-but-broke-existing" is indistinguishable from "not solved".
- Per-instance `logs/run_evaluation/<runId>/<arm>/<instance>/report.json`
  files survive on disk for every graded campaign (140 run dirs locally +
  51 reports in `../swe-bench-artifacts/`), each carrying full
  `tests_status.{FAIL_TO_PASS,PASS_TO_PASS}.{success,failure}` lists →
  past campaigns are recomputable with ZERO LLM calls.
- Efficiency of PAST campaigns is unrecoverable: token usage lived only in
  bench-home Claude Code transcripts under the OS temp root; macOS purged all
  files (only empty dirs remain, observed 2026-07-22). Console/instance logs
  carry no usage. → cost capture is forward-only and must harvest the
  transcript IMMEDIATELY after each session, persisting outside tmp.
- Transcript format (verified on live session files): one assistant API
  response spans multiple jsonl lines sharing `message.id`, each carrying a
  (cumulative) `usage`; `tool_use` content blocks have their own `toolu_*` ids.
  → dedupe usage by `message.id` (last wins), tool calls by block id.
- The flowai arm's judge gate (`makeCliGateJudge`) shares bench-home → its
  tokens land in the same transcripts and are correctly attributed to the
  flowai arm's overhead.

### Current State

- `verify.ts` `parseReport` reads only summary counters + `resolved_ids`.
- `report.ts` `aggregateAB` defines "regression" as the instance flip
  baseline-pass→flowai-fail — a DIFFERENT object than P2P breakage.
- `run.ts` `runArm` writes `<instance>.log` + prediction; no wall-clock, no
  usage, nothing read from bench-home before tmp purge.
- Pool drift: SRS/SDS said "13 instances"; `pool.json` holds 12
  (`requests-2317` dropped 2026-07-11 as infra noise).

### Constraints

- Cost counters are informative only — never a quality criterion (v1
  principle, C5). Render in a separate report section.
- Metrics collection failure must NOT fail the instance: the prediction (the
  primary measurement of a 20-minute LLM session) is never sacrificed to a
  counter. Failure is logged loudly (`[metrics] FAILED`) — a deliberate,
  documented exception to fail-fast, not a silent fallback.
- Grading stays in Python swebench; TS never re-derives test outcomes — the
  retro module only re-reads swebench's own per-instance verdict files.
- Derived `clean` class must equal swebench `resolved`; mismatch is flagged
  loudly in retro output (sanity cross-check, not silent trust).

## Definition of Done

- [x] FR-BENCH-SWE.P2P: per-instance grade classification
      (`clean | solved-broke | unsolved | no-patch | apply-failed | ungraded`)
      with F2P/P2P counts + named broken P2P tests, from report.json shapes.
  - Test: `scripts/benchmark/retro_test.ts`
  - Evidence: `deno test -A scripts/benchmark/retro_test.ts`
- [x] FR-BENCH-SWE.P2P: `deno task benchmark retro` CLI recomputes past
      campaigns from `logs/run_evaluation/` (`--run`, `--glob`, `--pool-only`,
      `--out`), markdown output with per-arm class counts.
  - Evidence: `deno task benchmark retro --glob 'flowai3-r?' --pool-only`
    reproduces flowai3 committed resolved counts (16/39 raw flowai reps).
- [x] FR-BENCH-SWE.COST: transcript usage aggregation (dedupe by message id
      last-wins; tool calls by `toolu_*` block id; input/output/cache tokens).
  - Test: `scripts/benchmark/metrics_test.ts`
  - Evidence: `deno test -A scripts/benchmark/metrics_test.ts`
- [x] FR-BENCH-SWE.COST: `runArm` measures wall-clock, harvests bench-home
      transcripts post-session, writes durable
      `<runDir>/<arm>/<instance>/<instance>.metrics.json`; `report` renders a
      "Cost (informative)" section when metrics files are present.
  - Test: `scripts/benchmark/metrics_test.ts` (loader) +
    `scripts/benchmark/report_test.ts` (render)
  - Evidence: `deno test -A scripts/benchmark/`
- [ ] FR-BENCH-SWE.COST live smoke: one real `run --arm baseline --limit 1`
      writes a non-empty metrics.json (needs an LLM session).
  - Evidence: `deno task benchmark run --arm baseline --limit 1` then
    `cat <out>/baseline/*/*.metrics.json` — manual, deferred to user.
- [x] SRS sub-FRs `FR-BENCH-SWE.P2P` / `FR-BENCH-SWE.COST` added; SDS §3.22
      components/subcommands updated; pool count fixed 13→12 in SRS+SDS.
  - Evidence: `grep -n "FR-BENCH-SWE.P2P" documents/requirements.md documents/design.md`
- [x] `deno task check` green.
  - Evidence: summary line `N passed | 0 failed` in check log.

## Solution

1. `scripts/benchmark/retro.ts` — pure classification (`classifyReport`) +
   filesystem scan (`scanRun`) + `renderRetroMarkdown`. TDD RED first on real
   report.json shapes (solved-broke, unsolved, no-patch, apply-failed,
   resolved-mismatch flag).
2. `scripts/benchmark/metrics.ts` — pure `usageFromTranscript(text)` +
   `collectBenchHomeMetrics(dir, wallClockMs)` + `loadRunMetrics(outDir)`.
   TDD RED on a fixture transcript (dup message ids, cumulative usage,
   tool_use blocks, multiple jsonl files incl. subagents).
3. Wire: `run.ts` (wall-clock + harvest + metrics.json, loud-fail), 
   `benchmark.ts` (`retro` subcommand; `report` loads metrics),
   `report.ts` (optional cost section).
4. Retro-recompute flowai3 (flowai reps `flowai3-r{1,2,3}` vs frozen baseline
   reps `expand-<id>-s{1,2,3}`, pool-only) → decomposition report for the
   latest campaign.
