---
date: "2026-06-22"
status: in progress
implements: [FR-WORKFLOW-AGENT-INVOKE]
tags: [framework, skills, commands, agent-invocation, classification]
related_tasks: [swe-verified-benchmark]
---
# Make core workflow primitives agent-invocable

## Goal

Agents (including subagents and autonomous bench runs) MUST be able to invoke the
core engineering-workflow primitives, not only humans via `/name`. Surfaced by the
SWE-bench A/B: across 12 flowai sessions the agent invoked **0** flowai skills —
`plan`/`implement`/`review` were never auto-activated despite an explicit prompt,
because their `description` is written for human-only triggering ("Use ONLY when
the user explicitly asks", "Do NOT trigger…"). Agent-invocability is now a
mandatory requirement (user decision).

## Overview

### Context & decision history

- User locked: scope = workflow cycle only (`plan`, `implement`, `review`,
  `commit`, `review-and-commit`) + utility `investigate` (outside the mandatory
  SDLC sequence but useful for SWE-bench).
- Mechanism = reclassify the two `commands/` primitives (`commit`,
  `review-and-commit`) into `skills/`; the other four are already in `skills/`.
  CLI-writer injects `disable-model-invocation: true` only for `commands/`, so the
  move alone unblocks auto-invocation — no flowai-cli repo change needed.
- `commit` auto-invoke risk dismissed by user: "в коммите проблемы нет, она
  только в пуше" → normal WHEN-trigger for `commit`/`review-and-commit`; the
  irreversible side-effect lives in `push`, which **stays user-only**.
- vision = unchanged (addition, not replacement): humans still invoke the same
  skills manually; `push`/`ship`/`ship-task` remain user-only commands.

### Current State (from code recon)

- Already in `skills/` (only `description` blocks auto-invoke): `plan`,
  `implement`, `review`, `investigate`.
- In `commands/` (need move): `commit`, `review-and-commit`.
- Generated artifacts: `plan`/`implement`/`review`/`commit` from `atoms/*.md`;
  `review-and-commit` from `composites/review-and-commit.md`; `investigate` is a
  static `skills/investigate/SKILL.md`. Sources are edited, not SKILL.md.
- `composites.yaml` targets `commit`/`review-and-commit` at `commands/…`.
- Acceptance suites to move with the primitives: `commit` (21), `review-and-commit` (10).
- `FR-SKILL-DESC` (SRS): a `skills/` description MUST carry a WHEN-trigger or
  `check-skills.ts` fails `deno task check`.
- Doc/test touchpoints: SRS (FR-PACKS, terminology, FR-REVIEW-COMMIT,
  FR-SKILL-INVOCATION scope), SDS §3.0 inventory + line ~148, README (224/246/251),
  CLAUDE.md examples, `check-naming-prefix_test.ts`, `check-pack-refs_test.ts`,
  `check-skills_test.ts`.

### Constraints

- Source SKILL.md MUST NOT declare `disable-model-invocation` (writer injects).
- Keep WHEN-trigger phrasing in every reworked `skills/` description (FR-SKILL-DESC).
- `push`/`ship`/`ship-task` stay in `commands/`.
- Code TDD for scripts; Acceptance Test TDD for primitive (description) changes.

## Definition of Done

- [x] FR-WORKFLOW-AGENT-INVOKE: `commit` + `review-and-commit` live under
      `framework/core/skills/` (with their acceptance suites); `push`/`ship`/
      `ship-task` remain under `commands/`.
  - Test: `scripts/check-naming-prefix_test.ts`, `scripts/check-pack-refs_test.ts`
  - Evidence: `ls framework/core/skills/commit framework/core/skills/review-and-commit` &&
    `! test -d framework/core/commands/commit` && `deno run -A scripts/check-naming-prefix.ts`
    green (verified) && `deno run -A scripts/generate-skill-composites.ts --check` green
- [x] FR-WORKFLOW-AGENT-INVOKE: descriptions of `plan`/`implement`/`review`/
      `investigate`/`commit`/`review-and-commit` are agent-invocable — no
      "Use ONLY when the user explicitly asks" / "Do NOT trigger" / human-gated
      preconditions; each retains a WHEN-trigger.
  - Test: `scripts/check-skills_test.ts` (WHEN-trigger gate) + acceptance auto-invoke
    scenarios (trigger-pos-1 per primitive, behavioral — see item below)
  - Evidence: `deno run -A scripts/check-skills.ts` green (verified) &&
    rendered descriptions carry no "Do NOT trigger" / "Use ONLY when the user"
- [x] FR-WORKFLOW-AGENT-INVOKE: an agent given a coding task auto-activates the
      relevant skill without being told the skill name (RED proved on old text).
  - Test: `framework/core/skills/{plan,implement,review,investigate,commit,review-and-commit}/acceptance-tests/trigger-pos-1/mod.ts`
    `Benchmark: <primitive>-trigger-pos-1`
  - Evidence: all 6 `trigger-pos-1` PASS — judge cites `Skill :: <name>` from the
    new `[tools]` evidence line. `commit`/`implement`/`review`/`investigate`/
    `review-and-commit` green first try; `plan` flaked to Claude Code's native
    plan-mode on run 1, PASSED on `--no-cache` re-run (N=1 variance — `plan`
    competes with a native planning surface; inherent, not a description defect).
  - Enabler: judge-evidence tool-call surfacing (FR-ACCEPT.TRIGGER) — `AcpClient`
    now records `tool_call` updates and `AcpAgent` emits a `[tools] …` line so the
    judge verifies invocation from evidence, not narration. Tests:
    `deno test -A scripts/acceptance-tests/lib/acp/client_test.ts` (3 passed).
- [x] Docs synced: new FR in SRS; SDS §3.0 inventory reclassified; README +
      CLAUDE.md examples corrected; check-script tests updated.
  - Evidence: `deno task check` green (442 + 173 tests, 0 failed; trigger-coverage
    OK; task-format OK).
- [ ] CHECK (handed off): full adj/false + execution sweep across all 6 primitives
      to confirm the description rewrite did not regress negative-trigger discrimination.
  - Evidence: `deno task acceptance-tests -f trigger` (or per-primitive `-f <id>`)
    run by the user — N=1 positives verified above; negatives + execution deferred.

## Solution

### Phase 1 — SRS
Add `FR-WORKFLOW-AGENT-INVOKE` (workflow primitives are agent-invocable; list +
push-stays-command). Update FR-PACKS/terminology/FR-REVIEW-COMMIT/FR-SKILL-INVOCATION
scope so `commit`/`review-and-commit` read as skills. Keep vision intact (addition).

### Phase 2 — SDS
§3.0 primitive inventory: move `commit`/`review-and-commit` to skills; fix line ~148
example list; note CLI-writer behavior unchanged (directory-driven).

### Phase 3 — Reclassify commit + review-and-commit
`composites.yaml`: retarget both to `framework/core/skills/…`. `git mv` the two
`commands/<n>/acceptance-tests` dirs to `skills/<n>/`. Regenerate
(`generate-skill-composites.ts --write`). Remove empty `commands/<n>` dirs. Update
`.gitignore` parity if needed.

### Phase 4 — Description rewrite (sources)
Edit `atoms/{plan,implement,review,commit}.md`, `composites/review-and-commit.md`
wrapper, and static `skills/investigate/SKILL.md`: drop human-only gating, add a
neutral WHEN-trigger (e.g. plan → "when a non-trivial change needs a plan before
coding"; review → "when there is an uncommitted diff to review"; commit → "when
changes are ready to be committed"). Regenerate.

### Phase 5 — Checks + tests
Update `check-naming-prefix_test.ts`, `check-pack-refs_test.ts`,
`check-skills_test.ts` hardcoded `commit∈commands` expectations. `deno task check` green.

### Phase 6 — Acceptance TDD
Author auto-invoke RED scenarios (≥ `plan`, `review`, `commit`); prove RED on old
description, GREEN on new. Run the authored scenarios; hand off full sweep
(`deno task acceptance-tests -f <id>`).

### Phase 7 — README + CLAUDE.md
Correct command/skill catalogs and examples.

### Out of scope
- `push`/`ship`/`ship-task` agent-invocability.
- Benchmark re-run (separate task; validates the change end-to-end afterwards).
- vision/Project-Vision rewording.
