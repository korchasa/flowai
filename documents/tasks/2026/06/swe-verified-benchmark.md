---
date: "2026-06-21"
status: done
implements: [FR-BENCH-SWE]
tags: [benchmark, swe-bench, evaluation, dev-tooling]
related_tasks: []
---
# SWE-bench Verified same-harness A/B for flowai-core (vs pure Claude Code)

## Goal

Measure the *real, isolated* usefulness of flowai-core: does the SAME agent (Claude Code + Sonnet) resolve real engineering tasks WITH flowai that it cannot solve WITHOUT it? The comparison must hold the harness and model fixed, so the only variable is flowai — otherwise a "win" could be the scaffold or the model, not the framework.

## Overview

### Context & decision history

- flowai-core = skills/agents/commands installed into an IDE agent (`.claude/`). Value = multi-step workflows (plan → implement → review) over real repos.
- Benchmark: **SWE-bench Verified** (500 human-validated instances; real issue + hidden tests; annotator `difficulty`).
- **Pivot 1 (rejected):** fixed 9-instance A/B was statistically noisy.
- **Pivot 2 (rejected):** "flowai vs *published* Sonnet" used `20250522_tools_claude-4-sonnet` as baseline — but that is Anthropic's **minimal tools scaffold** (bash + string-edit), NOT Claude Code. A win conflated Claude Code's scaffold + flowai.
- **Current (locked by user):** baseline must be **pure Claude Code + Sonnet** (no flowai), measured by us. Same harness both arms; only flowai differs.
- **Web search for a ready-made set:** no published per-instance "Claude Code + Sonnet" results exist. Vexp benchmark has Claude Code per-instance data but with `claude-opus-4-5` + a `vexp` layer (stronger, not Sonnet). So we must run our own baseline — but seed it with a high-confidence pool to avoid wasted runs.

### Approach (same-harness A/B)

- **Pool** (`pool.json`, 14): instances failed by BOTH the stronger Claude Code (Opus 4.5 + vexp, from Vexp — `claude_code_opus_failures.json`) AND tools-Sonnet (`sonnet_baseline.json`), arm64-buildable, cheapest-first. An instance both failed is near-certain to defeat plain Claude Code + Sonnet.
- **Baseline arm:** Claude Code + Sonnet over ACP, nothing installed, neutral prompt. Run over the pool; grade.
- **flowai arm:** same harness + `core` pack + `AGENTS.md` + plan→implement→review prompt. Run over the baseline's **actual failures**; grade.
- **Signal:** baseline-fail ∩ flowai-pass — tasks pure Claude Code + Sonnet could not do but flowai could. Regressions (baseline-pass ∩ flowai-fail) reported for honesty (but flowai only runs on baseline-failures, so none expected by construction).

### Current State

- Harness reworked for two arms on the ACP transport (`AcpAgent` + `createAdapter`; `SpawnedAgent`/`ClaudeAdapter` retired by FR-ACCEPT.ACP). `select.ts` adds `selectPool`; `instances.ts` exposes `POOL`; `report.ts` is `aggregateAB`/`renderMarkdownAB`. CLI: `run --arm`, `select-pool`, two-arm `report`. `deno task check` green.
- Verification proven on arm64 (gold patch `psf__requests-1142` 52s). django/sympy/sphinx/pylint/xarray build + grade on arm64.

### Constraints

- Grading stays Python `swebench` via subprocess. Orchestration Deno/TS.
- Pool repos restricted by arm64 deny-list (matplotlib/astropy/scikit-learn/seaborn).
- Single-rep, autonomous — report states this.
- Dev tooling → `scripts/`, Code TDD.

## Definition of Done

- [x] FR-BENCH-SWE: pool = CC(Opus+vexp)-fail ∩ tools-Sonnet-unsolved ∩ arm64-buildable, cheapest-first.
  - Test: `scripts/benchmark/select_test.ts`, `scripts/benchmark/instances_test.ts`
  - Evidence: `deno test scripts/benchmark/select_test.ts scripts/benchmark/instances_test.ts` → all pass
- [x] FR-BENCH-SWE: two-arm driver (baseline = no flowai/neutral; flowai = install/workflow) on ACP; diff→prediction.
  - Test: `scripts/benchmark/predictions_test.ts`
  - Evidence: `deno test scripts/benchmark/predictions_test.ts` → pass
- [x] FR-BENCH-SWE: same-harness A/B aggregation (baseline/flowai per instance; wins = baseline-fail ∩ flowai-pass; regressions).
  - Test: `scripts/benchmark/report_test.ts`
  - Evidence: `deno test scripts/benchmark/report_test.ts` → pass
- [x] FR-BENCH-SWE: verification reproducible on arm64 via gold patch (no LLM).
  - Test: `Benchmark: gold-patch smoke on psf__requests-1142`
  - Evidence: `deno task benchmark verify --gold --instance psf__requests-1142` → EXIT=0, `resolvedInstances: 1`
- [x] FR-BENCH-SWE: A/B executed — baseline (pure CC+Sonnet) over pool, flowai over baseline-failures; committed report records wins.
  - Test: `manual — korchasa` (billable LLM, ~min–h/instance)
  - Evidence: `documents/benchmarks/swe-verified-2026-06-21.md` — baseline **1/14** (`django-13513`); flowai on 13 baseline-failures (12 attempted, `xarray-6992` >4h skipped): **+1** win `django__django-14792`; 0 regressions. swebench-graded, same harness.
- [x] Docs: SRS FR-BENCH-SWE + SDS §3.22 reframed to same-harness A/B; `pool.json` + `claude_code_opus_failures.json` committed; artifacts gitignored.
  - Evidence: `deno task check` green

## Solution

### Phase A — Pool data
1. Vexp Claude Code (Opus 4.5 + vexp) per-instance failures → `claude_code_opus_failures.json` (provenance).
2. `select-pool`: `dumpAllMeta` ∩ CC-failures ∩ not-tools-Sonnet-resolved, minus deny → `pool.json` (14, cheapest-first).

### Phase B — Two-arm harness
3. `select.ts`: `selectPool`. 4. `instances.ts`: `POOL`/`poolIds`/`CC_OPUS_FAILURES`. 5. `run.ts`: `--arm baseline|flowai`, ACP. 6. `report.ts`: `aggregateAB`/`renderMarkdownAB`. 7. CLI wired.

### Phase C — Execute
8. `run --arm baseline` over pool → grade → failures. 9. `run --arm flowai --instance <failures>` → grade. 10. `report` → commit A/B; flip final DoD with wins.

### Out of scope
- K-rep; running flowai on baseline-passes (regression sweep); multi-IDE arms.
