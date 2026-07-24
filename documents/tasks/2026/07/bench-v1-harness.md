---
date: "2026-07-22"
status: superseded
superseded_by: documents/tasks/2026/07/bench-swe-fix-problems.md
tags: [benchmark, harness, workhorse, direction-i]
related_tasks:
  - documents/tasks/2026/07/benchmark-system-requirements.md
---
# FR-BENCH-V1 workhorse harness — paired A/B on a fresh pool

> **Superseded (user decision 2026-07-22):** the replace-the-benchmark track is
> closed; FR-BENCH-V1 was removed from the SRS without being built. Strategy
> now: evolve the existing FR-BENCH-SWE harness in place (P2P decomposition +
> cost counters landed first; pool power, contamination, arm symmetry, freeze
> follow). The v1 design contract in the related task remains the idea source.
> Historical `implements:` target was FR-BENCH-V1 (no longer in SRS).

## Goal

Implement the Direction-I workhorse benchmark contracted in FR-BENCH-V1: paired
2-arm A/B (bare vs flowai) over a fresh large pool, conjunction endpoint
`solved ∧ no-regression`, two-stage pre-registration freeze, smoke subset. The
design contract passed 0-FATAL at critique round 5 (see related task) — this
task builds the instrument; it does NOT reopen design questions.

## Overview

### Context

- Design contract: [benchmark-system-requirements](benchmark-system-requirements.md)
  §Final design v1 (frozen non-informative human reply, disjoint endpoint
  components, k≥3 flaky baseline, harness manifest in stage-1 freeze, corpus
  checksum before any candidate run, vintage rule, paired McNemar/bootstrap,
  MDE declared, smoke N≈20 as FR acceptance).
- Substrate inventory (Explore, 2026-07-22): `scripts/benchmark/` reusable —
  `prepare_sandbox.ts` (clone-cache, locking), `sandbox_root.ts` (out-of-$HOME),
  `predictions.ts` (diff capture, JSONL), `patch.ts` (test-hunk strip; heuristic
  is Python-tuned), `verify.ts` (swebench wrapper; DATASET hardwired at :16,
  parseReport reads only resolvedIds), `run.ts` `runArm` (ACP + framework
  overlay + 20-min timeout), `setup.ts`. Remove: `gate.ts` (judge), plan/review
  turns in `operator.ts` (keep `baselineTask`), `pool.json` + headroom
  machinery, `sonnet_baseline.json` path. Add: paired full-pool aggregation with
  PASS_TO_PASS regression, concurrency (run loop is sequential today), freeze
  manifests.
- Data reality (web research, verified via HF API, 2026-07-22):
  - SWE-bench-Live Python: STALE — newest task 2025-09-02, no updates since
    2025-09-18, 0 tasks post-2026-01. Not viable alone.
  - SWE-bench-Live/MultiLang: 743 tasks, newest 2026-04-20; 330 post-2026-01,
    726 post-2025-06. OWN harness (`evaluation.evaluation`, NOT
    swebench-compatible); amd64-only images; ~25% gold-flaky (java, issue #47 —
    authors officially bless k=3 gold pre-runs with denominator restriction);
    up to 50 GB RAM (C++).
  - SWE-rebench (Nebius) leaderboard: monthly splits `2025_01`..`2026_03`;
    215 post-2026-01, ~533 post-2025-06; Python-homogeneous; per-instance
    `created_at`, FAIL_TO_PASS/PASS_TO_PASS, `image_name`, `install_config`;
    amd64-only images (`swerebench/sweb.eval.x86_64.*`).
  - SWE-bench Verified: newest 2023-08 — fails the vintage rule entirely.
    SWE-bench Pro / Multi-SWE-bench: no `created_at` field — vintage rule
    inapplicable without manual join.
  - Official swebench harness on arm64: "experimental", macOS M-series =
    `--namespace ''` local builds (proven working for Verified in FR-BENCH-SWE).
- Vintage rule consequence: the pool boundary is the PINNED MODEL's training
  cutoff, not a calendar date. Exact cutoff of the pinned Claude snapshot must
  be verified from vendor docs at stage-1 freeze; a mid-2025 cutoff makes
  SWE-rebench alone sufficient (~500 tasks), a 2026 cutoff leaves only
  215 (rebench) / 330 (MultiLang).

### Current State

`scripts/benchmark/` implements FR-BENCH-SWE (13-instance measured-headroom
pool, operator-driven flowai arm with LLM judge gate, SWE-bench Verified
dataset, sequential loop, report = baseline-failure wins). All 11 test files
green under `deno task check`.

### Constraints

- Design contract is FROZEN (0-FATAL round 5) — implementation must not
  silently alter it; any forced deviation goes back to the task file as an
  explicit amendment.
- Vintage rule: corpus valid only for carriers whose training cutoff predates
  the oldest task; pinned model snapshot recorded in the stage-1 manifest.
- Grading images for all fresh pools are amd64-only; dev machine is Apple
  Silicon. Feasibility of local arm64 builds / emulation is UNPROVEN for
  rebench/MultiLang — must be probed before corpus commitment.
- C3: campaign ≈ 500+ agent sessions; smoke subset N≈20 is the per-change
  acceptance; full campaigns are explicit user-authorized runs.
- Code TDD (dev tooling, not framework product).
- Stage-2 rule: corpus checksum BEFORE any agent run on candidate tasks;
  harness rehearsal only on non-corpus tasks (e.g. retired Verified instances).

### Forks — RESOLVED (user, 2026-07-22)

1. **Corpus source = A: SWE-rebench** monthly splits (Python-homogeneous,
   `created_at`, swebench-style fields). Pool size follows the pinned-model
   cutoff (verify from vendor docs at stage-1): mid-2025 cutoff → ~500 tasks;
   2026 cutoff → 215 tasks, MDE≈13pp declared instead of 12.
2. **Grading = A: local arm64 only** (local image builds / emulation on Apple
   Silicon). NOT probe-with-fallback: if local grading proves infeasible for
   rebench images, that is a BLOCKER to report back to the user, not an
   automatic switch to remote x86.

## Definition of Done

- [ ] FR-BENCH-V1: corpus builder — loads the chosen source, applies the
      vintage filter from the pinned cutoff, k≥3 gold pre-runs exclude flaky
      instances, emits the frozen corpus manifest + checksum.
  - Test: `scripts/benchmark/corpus_test.ts` (to be authored)
  - Evidence: `deno test -A scripts/benchmark/corpus_test.ts`
- [ ] FR-BENCH-V1: frozen-reply operator replaces the judge gate; gate.ts
      removed; both arms runnable over a task list with concurrency.
  - Test: `scripts/benchmark/operator_test.ts` (updated)
  - Evidence: `deno task check`
- [ ] FR-BENCH-V1: endpoint grading — solved (FAIL_TO_PASS) and no-regression
      (PASS_TO_PASS minus flaky-baseline exclusions) extracted per instance;
      paired report (McNemar / paired bootstrap CI, components co-reported,
      per-arm cost + question counts + truncated-session share).
  - Test: `scripts/benchmark/report_test.ts` (updated)
  - Evidence: `deno task check`
- [ ] FR-BENCH-V1: stage-1 freeze manifest (endpoint defs, human policy,
      decision rule, MDE, model snapshot, caps, retry policy) + stage-2 corpus
      checksum, both hashed and committed before any corpus agent run.
  - Test: `scripts/benchmark/freeze_test.ts` (to be authored)
  - Evidence: `deno test -A scripts/benchmark/freeze_test.ts`
- [ ] FR-BENCH-V1: smoke run — pre-registered N≈20 subset executes end-to-end
      (both arms + grading + paired report); becomes the FR acceptance command.
  - Test: smoke invocation documented in FR-BENCH-V1 acceptance
  - Evidence: smoke run exits 0 and emits the paired report
- [ ] SRS/SDS sync: FR-BENCH-V1 acceptance updated with the real smoke command;
      SDS §3.22 (benchmark component) updated to v1 architecture.
  - Test: manual — user
  - Evidence: `deno task check` (traceability, salp)

## Solution

Pending user decision on the two forks above; detailed steps will be filled
after selection.
