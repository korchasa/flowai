---
date: 2026-05-10
status: done
implements:
  - FR-BENCH.TRIGGER
tags:
  - benchmarks
  - skills
  - quality-gate
related_tasks:
  - skill-trigger-benchmarks
---

# Reduce trigger benchmarks from 9 to 3 per skill (N=1 per class)

## Goal

Cut FR-BENCH.TRIGGER cohort from 351 to 117 scenarios by replacing 3+3+3 with 1+1+1. Removes structural redundancy that the 2026-05-03 task admitted was a convention without empirical basis (no power analysis; symmetric N=3 chosen for aesthetics). Saves ~3× wall-clock and LLM cost on full sweep, ~3× drift maintenance on description rewrites.

## Overview

### Context

Current contract (FR-BENCH.TRIGGER, 2026-05-03): every skill has 9 trigger scenarios (3 pos / 3 adj / 3 false). Empirical findings (this task's prior analysis):

- **351 scenarios on disk** (39 skills × 9). 70% of all framework benchmarks.
- **108/351 cached**; 243 never run. **24/39 skills** have zero cached trigger verdicts. The triple-redundancy is theoretical — in practice cohort runs sparsely.
- 11/242 cached scenarios scored <100; the rest 100. N=3 does not produce statistically meaningful regression signal at this scale; judge variance, where present, is already absorbed by judge-level retry (`scripts/benchmarks/lib/judge.ts:103`).
- The originating task (`documents/tasks/2026/05/skill-trigger-benchmarks.md`) does not justify N=3 vs N=1 or N=5 — only justifies the *shape* (regular `BenchmarkSkillScenario` vs custom runner). Symmetric 3+3+3 is convention.

### Current State

- `documents/requirements.md:183` — FR-BENCH.TRIGGER mandates 9 scenarios, 3 per class.
- `documents/design.md:205` — SDS §3.4.3 documents 3+3+3 layout.
- `scripts/check-trigger-coverage.ts:20` — `TRIGGER_INDEXES = [1, 2, 3]`.
- `scripts/check-trigger-coverage_test.ts` — assertions hardcode 9.
- `framework/CLAUDE.md:11` — mentions "exactly 9 per skill".
- `framework/devtools/skills/flowai-skill-write-agent-benchmarks/SKILL.md:212` — authoring guide says 9.
- 39 skills × 9 = 351 directories, named `trigger-{pos,adj,false}-{1,2,3}/`.

### Constraints

- Must not break `deno task check`. Coverage script + test must pass on new contract.
- Must not break `deno task bench` for retained scenarios. Trigger-1 directories already exist; deletion scope is `-2` and `-3` only.
- Cache (`benchmarks/cache/<pack>/<scenario-id>/claude.json`) for deleted scenarios becomes orphaned — cleanup is mechanical and reversible (cache regenerates on demand).
- No new retry infrastructure in this task. Existing judge-level retry (judge.ts:103) covers transient infra failures. Agent-level variance, if it surfaces empirically, is a follow-up: scenario-level `retryOnFail` field with re-run-on-fail semantics. Adding it now risks hiding real regressions under retry-masking and adds a new failure mode (retry-runner divergence from single-run) without measured need.

## Definition of Done

- [x] FR-BENCH.TRIGGER: SRS section declares 3 scenarios per skill (1 pos + 1 adj + 1 false), retry note explicit.
  - Test: `grep -c "1 positive (skill should activate), 1 adjacent-negative" documents/requirements.md` ≥ 1
  - Evidence: SRS edit landed.
- [x] FR-BENCH.TRIGGER: SDS §3.4.3 reflects new layout, no references to `-2`/`-3` outside historical notes.
  - Test: SDS layout block shows only `-1` directories; historical incident note (line 195/201) annotated with consolidation date.
  - Evidence: SDS edit landed.
- [x] FR-BENCH.TRIGGER: `scripts/check-trigger-coverage.ts` enforces 3 dirs per skill.
  - Test: `deno test scripts/check-trigger-coverage_test.ts` passes (9 tests pass)
  - Evidence: `TRIGGER_INDEXES = [1]` in source.
- [x] FR-BENCH.TRIGGER: 39 skills carry exactly 3 trigger dirs each.
  - Test: `find framework -type d -path '*/skills/*/benchmarks/trigger-*' | wc -l` = 117
  - Evidence: 234 directories deleted; coverage script reports clean.
- [x] FR-BENCH.TRIGGER: authoring guide (SKILL.md) updated.
  - Test: `grep -c "exactly 3 scenarios" framework/devtools/skills/flowai-skill-write-agent-benchmarks/SKILL.md` ≥ 1
  - Evidence: edit landed.
- [x] FR-BENCH.TRIGGER: framework/CLAUDE.md (and AGENTS.md target) updated.
  - Test: `grep -c "exactly 9 per skill" framework/CLAUDE.md framework/AGENTS.md` = 0
  - Evidence: edit landed in framework/AGENTS.md (CLAUDE.md is a symlink → AGENTS.md).
- [x] FR-BENCH.TRIGGER trigger-related gates green.
  - Test: `deno run -A scripts/check-trigger-coverage.ts` exits 0; `deno test scripts/check-trigger-coverage_test.ts` passes; `deno fmt --check`, `deno lint` clean for changed files.
  - Note: pre-existing `SpawnedAgent` test failures in `scripts/benchmarks/lib/spawned_agent_test.ts` are unrelated to this task (verified on clean main: `git stash && deno test -A scripts/benchmarks/lib/spawned_agent_test.ts` reproduces the 6 failures). Out of scope.
  - Evidence: gate commands exit 0 in this worktree.

## Solution

1. **Write SRS** — replace FR-BENCH.TRIGGER body (`documents/requirements.md:183-200`):
   - "9 trigger scenarios (3 positive + 3 adjacent-negative + 3 false-use-negative)" → "3 trigger scenarios (1 positive + 1 adjacent-negative + 1 false-use-negative)"
   - Layout subsection: drop `{1,2,3}`, write singular `trigger-{pos,adj,false}-1/mod.ts`
   - Naming: `<skill-id>-trigger-<pos|adj|false>-1`
   - Cost note: "N×3 scenarios at full sweep" (was N×9)
   - Add: "Retry: judge-level retry (`judge.ts:103`) absorbs transient judge errors. Agent-level retry on result is intentionally NOT performed — masks real regressions. Re-run individually on suspected variance."
   - Acceptance: `find framework ... | wc -l` equals (skill count) × 3.
2. **Write SDS §3.4.3** — `documents/design.md:205-236`:
   - Layout block: 3 directories on one line.
   - Naming: `<n>` is fixed `1`.
   - Coverage enforcement: "3 expected scenarios" (was 9).
   - Selection guidance: drop "Prefer 3 distinct phrasings" — N=1 means the single query carries the full description-match weight.
3. **Update `scripts/check-trigger-coverage.ts`**:
   - `TRIGGER_INDEXES = [1] as const`
   - Header doc: "3 trigger scenarios (1 pos + 1 adj + 1 false)"
   - CLI message strings.
4. **Update `scripts/check-trigger-coverage_test.ts`**:
   - First test: `expectedTriggerDirs()` returns 3 entries.
   - Counts in error-count assertions: 3, not 9.
5. **Delete redundant directories** — for each of the 39 skills:
   ```
   rm -rf framework/<pack>/skills/<skill>/benchmarks/trigger-{pos,adj,false}-{2,3}
   ```
   Mechanical. 234 directories total.
6. **Update authoring SKILL.md** (`framework/devtools/skills/flowai-skill-write-agent-benchmarks/SKILL.md:212-272`):
   - "exactly 9" → "exactly 3"
   - Drop "3 different phrasings" guidance; add "the single query must carry the full description-match weight — pick the most likely failure phrasing".
7. **Update framework/CLAUDE.md** (line 11): "exactly 9 per skill" → "exactly 3 per skill".
8. **Verify** — run:
   - `deno run -A scripts/check-trigger-coverage.ts` (exit 0)
   - `deno test scripts/check-trigger-coverage_test.ts` (pass)
   - `deno task check` (full gate)
   - `find framework -type d -path '*/skills/*/benchmarks/trigger-*' | wc -l` = 117
9. **Cache cleanup** — orphaned cache entries for `-2`/`-3` scenarios remain in `benchmarks/cache/` until next run prunes them. Optional: `find benchmarks/cache -path '*-trigger-*-2/*' -o -path '*-trigger-*-3/*' -delete` to reclaim disk; not required for correctness.
10. **Commit** — single commit per project rules: SRS+SDS+code+docs+deletions atomic.

## Follow-ups

- Empirical flake-rate measurement on the new N=1 cohort over ~3 sweeps. If sustained noise > 5% per scenario, add `BenchmarkSkillScenario.retryOnFail?: number` (default 0) and update FR-BENCH.TRIGGER to set it on trigger scenarios.
- Revisit asymmetric weighting (e.g., 2 pos + 1 adj + 1 false) once N=1 baseline has empirical support — positive failures (false-negative routing) are user-visible, asymmetry may be defensible.
- Cache invalidation tightening (per FR-BENCH-CACHE follow-up): trigger sweep should re-run on description edits only, not on description-adjacent edits.

## Adjacent work landed alongside (2026-05-10)

- SDS §3.1.1: added `-beta` lifecycle policy (60-day promote-or-retire deadline; coverage parity rule: each beta delta MUST have ≥1 dedicated scenario).
- `flowai-review-and-commit-beta`: closed coverage gap (was 1/3 deltas, now 3/3). Added scenarios `phase-2-diff-eliminated` (Phase 2 must reuse Phase 1 diff, no `git diff` re-read) and `post-reflect-cleanup-commit` (reflect-driven edits commit as separate `agent: ...` commit, never amend).
- `flowai-commit-beta`: kept (3/3 deltas covered, last functional commit 2026-04-27 → 13d idle, well under 60d threshold).
