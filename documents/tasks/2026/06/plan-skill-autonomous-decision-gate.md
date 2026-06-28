---
date: 2026-06-28
implements: [FR-BENCH-SWE]
status: done
tags: [benchmark, plan-skill, autonomy, decision-gate, finding]
related_tasks: []
---
# Autonomous prompt nullifies the plan skill's decision gate

## Goal

In the operator-driven flowai SWE-bench arm the `plan` skill does not behave as
designed: it skips the task file, skips variant analysis, and edits source code
during planning. Restore faithful plan→implement→review so the benchmark
measures flowai's workflow rather than ad-hoc coding — and so the plan skill is
robust when no human is on the gate.

## Overview

### Context

Investigation of `django__django-14792` (flowai-v2 run, skills verified active)
found the failure root is in the `/plan` phase, not the slash mechanism:

- The agent CORRECTLY diagnosed the cause in chat: `_get_timezone_name()` now
  returns the full tz name instead of an offset. (transcript, /plan final msg)
- It then fixed a DOWNSTREAM symptom — `_prepare_tzname_delta` in
  `django/db/backends/postgresql/operations.py` — not the helper it named. The
  hidden `FAIL_TO_PASS` checks `_get_timezone_name` (+ `test_is_aware` in
  `utils_tests.test_timezone`), which the patch never touches → `resolved:false`
  (all 23 `PASS_TO_PASS` green; nothing broken).
- It wrote NEW tests in `backends/postgresql/test_operations.py` asserting its
  own (wrong) expectation and ran only narrow suites
  (`backends.postgresql.test_operations`, `db_functions.datetime.test_extract_trunc`),
  never the canonical `utils_tests.test_timezone`. False green.
- `/review` rubber-stamped: "исправление корректно, тесты написаны, проверки прошли".

Why /plan misbehaved (evidence, transcript tool log):

- NO task file created (no `documents/tasks/` in sandbox).
- 30 /plan tool calls included `Edit → operations.py` MID-PLAN, then test runs —
  i.e. it implemented during planning.
- No variant analysis, no decision gate.

Root cause: the operator prompt says "Work fully autonomously… make every
decision yourself and never stop to ask." This DIRECTLY conflicts with the plan
skill's rule 1 ("NO IMPLEMENTATION… STOP") and step 4 ("Ask user which variant…
Wait for response"). Told never to stop, the agent dropped the task file +
variants + gate and coded immediately. The skill's gate is a no-op under a
"never stop" prompt, so `plan` degenerates to ad-hoc coding. This also strikes
the project Vision: flowai's value is the human decision gate, which the
autonomous benchmark removes.

### Current State

- `framework/atoms/plan.md` (→ `framework/core/skills/plan/SKILL.md`): rule 1
  forbids source edits; step 4 presents variants in chat and WAITS for a human
  selection. No "autonomous / no-human" branch.
- `scripts/benchmark/operator.ts`: `baseTask` injects "never stop to ask, make
  every decision yourself"; `ScriptedOperator` replays fixed `/implement`,
  `/review` turns and ignores conversation content (cannot answer a variant
  question).

### Constraints

- Changing `plan` (or `review`/`implement`) is a workflow-primitive change →
  Acceptance-Test TDD (RED scenario first). Surface ≥2 variants before editing.
- Must not regress the human-in-the-loop behavior of `plan` for normal use.
- Benchmark must stay deterministic/reproducible (no LLM in the operator).

## Definition of Done

- [x] FR-BENCH-SWE: flowai turns encode the human gate — `/plan` is planner-only
      (variants + recommendation, forbids source/test edits, stops for a human
      decision) and carries NO "never stop" autonomy line; baseline keeps it.
  - Test: `scripts/benchmark/operator_test.ts` (planTurn gate; baseTask/baselineTask split)
  - Evidence: `deno test -A scripts/benchmark/operator_test.ts` → 7 passed
- [x] FR-BENCH-SWE: the flowai arm gets a coherent AGENTS.md rendered from the
      framework template (no blanks) + a seeded `documents/tasks/` doc-system, so
      `/plan` writes the task file and surfaces variants without editing source.
  - Test: `scripts/benchmark/agents_md_test.ts`
  - Evidence: `deno test -A scripts/benchmark/agents_md_test.ts` → 2 passed;
    smoke `django__django-14792` (runs/2026-06-29-docsys-smoke): `/plan` created
    `documents/tasks/2026/06/fix-reverse-tz-conversion.md`, ZERO source edits in
    `/plan`, presented 3 variants in chat; `/implement` fixed
    `django/utils/timezone.py` (root cause) → resolved; patch carries no
    `documents/` (DIFF_EXCLUDES).

## Follow-ups (separate task — skill change, Acceptance-Test TDD)

- Review/implement should run the repo's EXISTING tests for the changed area,
  not only self-authored ones (guards the false-green pattern seen on
  django-14792). This is a `review`/`implement` SKILL change (Variant B
  territory), out of scope for this benchmark-only fix.

## Solution (Variant A — operator plays the human gate; no skill changes)

1. `operator.ts`:
   - `baseTask` → neutral (repo + issue + no-commit); autonomy wording removed.
   - new `baselineTask` = baseTask + "never stop / decide yourself" (single-shot
     baseline only).
   - `planTurn` → planner-only gate: "act as planner only, present variants +
     recommendation, do NOT modify source/test files, stop and wait".
   - `implementTurn` → operator plays the human authorizing the recommended
     variant; `reviewTurn` reworded to drop the autonomy line.
2. `run.ts`: baseline `buildPrompt` uses `baselineTask` (was `baseTask`).
3. `operator_test.ts`: gate assertions on `planTurn`; base vs baseline split.
4. `agents_md.ts` (new): `renderAgentsMd` fills the REAL framework template
   (`AGENTS.template.md`) with benchmark values (no blanks; stack via the init
   `analyzeProject`); `installAgentsMd` writes it. `run.ts` flowai arm seeds
   `documents/tasks/` so the agent stops reasoning "no flowai task structure
   here". `predictions.ts` DIFF_EXCLUDES `documents/tasks` → `documents` (whole
   doc-system kept out of the patch).
5. Smoke `django__django-14792` → `/plan` writes the task file + variants, zero
   source edits; resolves. CONFIRMED (runs/2026-06-29-docsys-smoke).

## Result

The full plan→implement→review now runs faithfully in the benchmark and
`django__django-14792` (a prior failure / regression) RESOLVES under the gate.
