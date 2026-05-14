---
date: "2026-05-10"
status: done
implements:
  - FR-DO-WITH-PLAN
tags: [framework, commands, composite, workflow]
related_tasks:
  - 2026/05/replace-adr-with-tasks.md
---
# Add `flowai-do-with-plan` command — full plan → implement → review-commit cycle

## Goal

Provide a single user-invoked command that drives the canonical end-to-end task lifecycle: plan a task (writes the GODS file via the `flowai-plan-exp-permanent-tasks` flow), implement it under TDD, then review and commit the result (`flowai-review-and-commit-beta` flow). Eliminates the friction of typing three commands in sequence and guarantees the gates between phases are enforced (variant-selection gate after plan, green-tests gate before review, verdict gate before commit). Reduces the chance of skipping any phase — most regressions on this project trace back to a missed verify or a missed commit-after-review.

## Overview

### Context

Today the canonical workflow is three separate user invocations:

1. `/flowai-plan-exp-permanent-tasks <prompt>` — writes `documents/tasks/<YYYY>/<MM>/<slug>.md` with frontmatter, GODS body, DoD tuples, and surgical SRS back-pointers. Pauses for variant selection.
2. Free-form implementation by the agent following the Solution section + AGENTS.md TDD flow.
3. `/flowai-review-and-commit-beta` — review with verdict gate; on Approve, commit + doc-sync + reflect + cleanup commit.

Each phase is itself stable and benchmarked. The friction is hand-off: the user has to remember to invoke phase 3 after phase 2, and the agent occasionally drifts (commits without review, implements without writing the plan, or skips the green-tests check). A composite command makes the cycle a single contract.

The project already has a precedent for composite commands: `flowai-review-and-commit` and `flowai-review-and-commit-beta`. Both follow the canonical "no delegation — fully inline" rule (see `framework/CLAUDE.md` § Composite Skill Authoring), and `scripts/check-skill-sync.ts` keeps the inlined `<step_by_step>` blocks byte-aligned with the source skills (with `allowedDivergentSteps` for known-divergent steps).

### Current State

- **Source primitives:**
  - `framework/core/commands/flowai-plan-exp-permanent-tasks/SKILL.md` — 137 lines, 8-step `<step_by_step>` (incl. variant gate at step 4, surgical SRS edit at 5c, index update at 5b, critique→triage at 6–7).
  - `framework/core/commands/flowai-review-and-commit-beta/SKILL.md` — 315 lines, two phases (Review + Commit), explicit Verdict Gate between them, post-reflect cleanup commit.
- **Composite-skill canon** (from `framework/CLAUDE.md`):
  1. `**No delegation**` rule in `<rules>`: each phase is fully inlined; do NOT call source skills via the Skill tool.
  2. Description MUST NOT name source skills.
  3. Description MUST contain the literal phrase "Self-contained — execute the inlined steps directly".
  4. Verdict gates MUST tell the agent what to do for EACH verdict (including success).
- **Sync infrastructure:** `scripts/check-skill-sync.ts` is wired into `deno task check`. Add a third entry mapping `flowai-do-with-plan` → its three (or two) source skills, with `allowedDivergentSteps` for any phase-boundary steps that need composite-specific wording.
- **FR placement:** No existing FR covers this. Closest neighbours are `FR-CMD-EXEC` (general) and `FR-REVIEW-COMMIT` (sibling composite). New FR section needed. SRS already has a precedent for naming an FR after a composite (`FR-REVIEW-COMMIT`).
- **Naming:** `framework/core/commands/flowai-do-with-plan/` — directory placement confirms user-only. CLI writer auto-injects `disable-model-invocation: true` at sync time. `check-naming-prefix.ts` enforces shared `flowai-*` naming plus command/skill uniqueness.

### Constraints

- **Inlining is mandatory** (project canon). No delegation via Skill tool — composite gate logic is lost on re-entry. Total line count will land near ~500 lines. That cost is accepted.
- **Sync drift risk**: every future edit to `flowai-plan-exp-permanent-tasks` or `flowai-review-and-commit-beta` will require a parallel edit to `flowai-do-with-plan`. `check-skill-sync.ts` catches drift; without it, the composite silently rots. The check MUST be extended in lock-step.
- **Phase 2 (implement) is open-ended TDD work.** It cannot be fully scripted — the work depends on the task. The composite documents the *contract* (RED → GREEN → REFACTOR → CHECK per AGENTS.md "TDD Flow"), not the steps. No sync target for Phase 2.
- **Variant gate inside Phase 1** is honoured: the composite stops Phase 1 at "ask user which variant" and only proceeds to Phase 2 after the user selects (this is the existing behaviour of the source skill — preserved by inlining).
- **Verdict gate inside Phase 3** is honoured: Request Changes / Needs Discussion stops the composite without committing.
- **No new agent-invocable surface** — `disable-model-invocation: true` is auto-injected; agent cannot self-trigger this command.
- **Bench TDD applies** (per AGENTS.md "Acceptance Test TDD"): RED scenario(s) must fail before SKILL.md is written, GREEN once SKILL.md is final, ALL benchmarks for the command run on CHECK.
- **Composite-skill description rules**: the description string MUST NOT contain `flowai-plan-exp-permanent-tasks` or `flowai-review-and-commit-beta` literally; MUST contain the "Self-contained" phrase.

## Definition of Done

- [x] FR-DO-WITH-PLAN: `framework/core/commands/flowai-do-with-plan/SKILL.md` exists with three inlined phases (Plan / Implement / Review-and-Commit), `**No delegation**` rule, "Self-contained" phrase in description, no source-skill names in description, explicit verdict-gate text for each Phase-3 verdict.
  - Test: `framework/core/commands/flowai-do-with-plan/benchmarks/full-cycle/mod.ts` (scenario id `flowai-do-with-plan-full-cycle`) — interactive scenario where the agent plans, implements a one-line behaviour change, then reviews-and-commits. Judge checklist verifies: (a) task file written under `documents/tasks/<YYYY>/<MM>/`, (b) plan body has DoD tuples + Solution, (c) implementation diff exists, (d) at least one commit landed on the test branch, (e) review verdict surfaces in conversation.
  - Evidence: `deno task bench -f flowai-do-with-plan-full-cycle` exits 0 with passing checklist.
- [x] FR-DO-WITH-PLAN: Reject path — Phase 3 verdict `Request Changes` halts the workflow without committing.
  - Test: scenario id `flowai-do-with-plan-rejects-on-changes-requested` (fixture seeds an obvious bug; mocked Phase-3 review returns Request Changes).
  - Evidence: `deno task bench -f flowai-do-with-plan-rejects-on-changes-requested` exits 0; checklist confirms `git log` has no new commit on the test branch.
- [x] FR-DO-WITH-PLAN: Variant gate — Phase 1 pauses for user variant selection before drafting `## Solution`.
  - Test: scenario id `flowai-do-with-plan-pauses-for-variant-selection` (interactive, `UserEmulator` answers variant choice on demand).
  - Evidence: `deno task bench -f flowai-do-with-plan-pauses-for-variant-selection` passes; checklist verifies the agent emitted variant analysis with ≥1 variant before requesting input.
- [x] FR-DO-WITH-PLAN: Implement → Review-and-Commit gate — failing project check halts workflow.
  - Test: scenario id `flowai-do-with-plan-check-fails-stops` (fixture seeds pre-existing failing test; project check returns non-zero).
  - Evidence: `deno task bench -f flowai-do-with-plan-check-fails-stops` passes; checklist verifies no review report and no commit.
- [x] FR-DO-WITH-PLAN: Implement → Review-and-Commit gate — empty diff halts workflow.
  - Test: scenario id `flowai-do-with-plan-empty-implement-stops` (fixture pre-seeds the requested feature so Implement Phase produces no diff).
  - Evidence: `deno task bench -f flowai-do-with-plan-empty-implement-stops` passes; checklist verifies no review report and no commit.
- [x] FR-UNIVERSAL.DISCLOSURE: Composite-skill exemption — `validateProgressiveDisclosure` skips token cap for skills in `COMPOSITE_SKILLS`.
  - Test: `scripts/check-skills_test.ts::FR-UNIVERSAL.DISCLOSURE: composite skills are exempt from 5000-token cap` and four sibling tests (line cap, catalog cap, regular-skill regression).
  - Evidence: `deno test -A scripts/check-skills_test.ts`.
- [x] FR-UNIVERSAL.DISCLOSURE: `COMPOSITE_SKILLS` list stays in sync with `SYNC_CHECKS`.
  - Test: `scripts/composite-skills_test.ts::COMPOSITE_SKILLS list matches SYNC_CHECKS in check-skill-sync.ts`.
  - Evidence: `deno test -A scripts/composite-skills_test.ts`.
- [x] FR-DO-WITH-PLAN: `scripts/check-skill-sync.ts` extended with a third `SYNC_CHECKS` entry pairing `flowai-do-with-plan` with `flowai-plan-exp-permanent-tasks` (`phase: "Plan Phase"`) and `flowai-review-and-commit-beta` (`phase: "Review-and-Commit Phase"`). `allowedDivergentSteps` MUST be empirically verified by running the script — not pre-declared. Composite phase headings MUST match the `phase` strings literally (`### Plan Phase`, `### Implement Phase`, `### Review-and-Commit Phase`).
  - Test: `deno test -A scripts/check-skill-sync_test.ts` (existing tests cover the framework; if the file lacks targeted assertions for the new entry, add `Deno.test("sync check covers flowai-do-with-plan", …)`).
  - Evidence: `deno task check` passes (the check is wired into the aggregate `check` task).
- [x] FR-DO-WITH-PLAN: New FR section `### FR-DO-WITH-PLAN: Full-Cycle Workflow — flowai-do-with-plan` added to `documents/requirements.md` with `**Description:**`, `**Acceptance verified by benchmarks:**` listing the three scenario ids above, `**Status:**` `[x]` post-merge.
  - Test: `deno run -A scripts/check-fr-coverage.ts FR-DO-WITH-PLAN` (existing FR-coverage validator).
  - Evidence: command exits 0; FR section is grep-able as `^### FR-DO-WITH-PLAN:`.
- [x] FR-DO-WITH-PLAN: SDS section under `documents/design.md` § 3.5 / § 3 (component sections) describes the composite (purpose, inlining contract, sync entry, phase gates).
  - Test: `grep -q "flowai-do-with-plan" documents/design.md`.
  - Evidence: command exits 0.
- [x] FR-DO-WITH-PLAN: README.md "Packs" / "Commands" catalog includes the new command (one-line entry).
  - Test: `grep -q "flowai-do-with-plan" README.md`.
  - Evidence: command exits 0.
- [x] FR-DO-WITH-PLAN: Documentation index registered.
  - Test: `grep -E "FR-DO-WITH-PLAN.*requirements.md#" documents/index.md`.
  - Evidence: command finds exactly one row under `## FR`.
- [x] FR-DO-WITH-PLAN: Naming-prefix gate green for the new directory.
  - Test: `deno run -A scripts/check-naming-prefix.ts`.
  - Evidence: command exits 0.

## Solution

### Files to create

1. `framework/core/commands/flowai-do-with-plan/SKILL.md` — composite, ~500 lines.
2. `framework/core/commands/flowai-do-with-plan/benchmarks/full-cycle/mod.ts` (+ `fixture/`) — happy-path scenario.
3. `framework/core/commands/flowai-do-with-plan/benchmarks/rejects-on-changes-requested/mod.ts` (+ `fixture/`) — Phase-3 reject-path scenario; mocks the model's review verdict tool to return `Request Changes`.
4. `framework/core/commands/flowai-do-with-plan/benchmarks/pauses-for-variant-selection/mod.ts` (+ `fixture/`) — interactive scenario; `UserEmulator` answers variant choice on demand and verifies pause.

### Files to modify

1. `scripts/check-skill-sync.ts` — append a third entry to `SYNC_CHECKS`:
   ```ts
   {
     composite: "flowai-do-with-plan",
     sources: [
       { skill: "flowai-plan-exp-permanent-tasks", phase: "Plan Phase",
         allowedDivergentSteps: [1, 8] },
       { skill: "flowai-review-and-commit-beta",   phase: "Review-and-Commit Phase",
         allowedDivergentSteps: [1] },
     ],
   }
   ```
   `allowedDivergentSteps` rationale: step 1 of the plan phase is the composite's own "Initialize" with cycle-context; step 8 (TOTAL STOP) is replaced by a transition to Phase 2; step 1 of the review-and-commit phase is the composite's own "Empty Diff Guard" wording (Phase 2 may have produced no diff if implementation was a no-op — distinct fail message). Adjust the list once the SKILL.md is final and the check reports actual divergent step numbers.
2. `documents/requirements.md` — insert `### FR-DO-WITH-PLAN: Full-Cycle Workflow — flowai-do-with-plan` after `### FR-REVIEW-COMMIT` (line ~580). Body:
   - `**Description:**` one-line.
   - `**Tasks:** [flowai-do-with-plan-command](tasks/2026/05/flowai-do-with-plan-command.md)`
   - `**Acceptance verified by benchmarks:** flowai-do-with-plan-full-cycle, flowai-do-with-plan-rejects-on-changes-requested, flowai-do-with-plan-pauses-for-variant-selection`
   - `**Status:** [x]` only after all three benches pass on main.
3. `documents/design.md` § 3 — add a short component subsection (siblings of `FR-REVIEW-COMMIT` description). One paragraph: composite kind, inlining contract, phase gates, sync entry path.
4. `README.md` — add a one-line entry to the commands catalog (find the analogous `flowai-review-and-commit-beta` entry; mirror the format).
5. `documents/index.md` — register `## FR` row for `FR-DO-WITH-PLAN` (executed by this skill at step 5b; no manual edit needed).
6. `CLAUDE.md` (root) — extend `## Documentation Map` if needed: not required, since the existing `framework/<pack>/commands/<name>/SKILL.md` row covers it.

### Implementation approach (Acceptance Test TDD)

Order is mandatory — each step is a checkpoint.

1. **RED — happy-path bench first.** Author `benchmarks/full-cycle/mod.ts` skeleton (use `AcceptanceTestScenario`, `skill = "flowai-do-with-plan"`, `interactive = true`, `maxSteps = 60`, `stepTimeoutMs = 600_000`). Set checklist items per DoD. Run `deno task bench -f flowai-do-with-plan-full-cycle`. Expect failure (`Unknown skill` — SKILL.md does not exist yet). This proves the bench infra sees the new id.
2. **Smoke-check infra.** Run `deno task bench -f flowai-review-and-commit-beta-auto-invoke-reflect` to confirm the runner is healthy in this session before writing the new SKILL.md. (See AGENTS.md "Acceptance Test Infrastructure Smoke Test".)
3. **GREEN — author SKILL.md.** Frontmatter:
   ```yaml
   ---
   name: flowai-do-with-plan
   description: "Self-contained — execute the inlined steps directly. Three-phase workflow that drives the canonical task lifecycle: write a committed plan, implement under TDD, then review-and-commit with a verdict gate."
   argument-hint: task description or issue URL
   effort: high
   ---
   ```
   Body sections (in order): `# Task: Full-Cycle Plan → Implement → Review & Commit`, `## Overview`, `## Context`, `## Rules & Constraints` (rules 1–6 mirroring `flowai-review-and-commit-beta`, with rule 1 = `**No delegation**` listing all three source skills by name in the body of the rule), `## Instructions` containing three `<step_by_step>` blocks separated by `### Phase N` headers, `## Verification`. Inline plan-phase steps verbatim from `flowai-plan-exp-permanent-tasks/SKILL.md` (step 1 reworded for cycle context; step 8 "TOTAL STOP" replaced by "Hand off to Phase 2"). Inline review-and-commit-phase steps verbatim from `flowai-review-and-commit-beta/SKILL.md` (step 1 reworded for "diff produced by Phase 2"). Phase 2 (Implement) is a 3-step contract: (a) read Solution from the freshly-written task file; (b) execute under TDD per AGENTS.md (RED→GREEN→REFACTOR→CHECK); (c) confirm `git status` is non-empty before transitioning to Phase 3.
4. **GREEN — verify happy-path bench.** Re-run `deno task bench -f flowai-do-with-plan-full-cycle`. Iterate on SKILL.md text until the judge checklist passes. **Do not edit the bench to fit the skill.**
5. **RED then GREEN — reject-path bench.** Author `rejects-on-changes-requested/mod.ts`. Use the existing reject-path scenario (`flowai-review-and-commit-beta-reject-stops` if it exists, else `-reject` analogue) as a structural template. The scenario seeds an obvious bug; the judge verifies (a) review verdict surfaces as Request Changes, (b) `git log` shows zero new commits.
6. **RED then GREEN — variant-gate bench.** Author `pauses-for-variant-selection/mod.ts`. `interactive = true`, `UserEmulator` script answers "Variant 1" only when prompted. Judge verifies the agent emitted ≥1 variant analysis block before requesting input.
7. **Sync wiring.** Append the third entry to `scripts/check-skill-sync.ts` `SYNC_CHECKS`. Run `deno run -A scripts/check-skill-sync.ts`. Iterate on `allowedDivergentSteps` until the script reports zero diffs.
8. **Docs.** Add SRS section, SDS subsection, README catalog row, run `deno run -A scripts/check-fr-coverage.ts FR-DO-WITH-PLAN`. (Skill execution at step 5b/5c will write the index row + SRS back-pointer for this task itself; the new SRS section for `FR-DO-WITH-PLAN` itself is written manually as part of GREEN.)
9. **CHECK.** `deno task check` — must pass. Then `deno task bench -f flowai-do-with-plan` (substring matches all three new scenarios). All three must pass. Pre-flight hygiene: `ps aux | grep -E 'cli/src/main\.ts'` for stale child processes per AGENTS.md.

### Code structure of the composite SKILL.md

```
---
name: flowai-do-with-plan
description: "Self-contained — execute the inlined steps directly. ..."
argument-hint: ...
effort: high
---
# Task: Full-Cycle Plan → Implement → Review & Commit
## Overview                      (3 phases summary)
## Context                        (rationale)
## Rules & Constraints            (no-delegation, no interleave, gate logic, session scope)
## Instructions
### Plan Phase
<step_by_step> ... 8 inlined steps from flowai-plan-exp-permanent-tasks ... </step_by_step>
### Plan → Implement Gate
  (verbatim: "if user did NOT select a variant or aborted, STOP. Otherwise hand off")
### Implement Phase
<step_by_step>
  1. Re-read the task file written by Plan Phase. Extract `## Solution` steps.
  2. Execute under TDD per AGENTS.md (RED → GREEN → REFACTOR → CHECK). Iterate per the Solution's verification commands.
  3. Run `deno task check` (or the project's check command). MUST exit 0 before transitioning.
</step_by_step>
### Implement → Review-and-Commit Gate
  (verbatim: "if `deno task check` did NOT pass, STOP. If `git status` is clean (no changes after implement), STOP — nothing to review/commit. Otherwise hand off.")
### Review-and-Commit Phase
<step_by_step> ... 10 inlined steps from flowai-review-and-commit-beta incl. internal Verdict Gate ... </step_by_step>
## Verification
<verification> ... composite-level checklist ... </verification>
```

### Dependencies

- No new runtime/library dependencies. Only modifies framework markdown + one Deno script + docs.
- Implicit dependency: `flowai-plan-exp-permanent-tasks` and `flowai-review-and-commit-beta` MUST exist and be in their current shape. They do (verified in this session).

### Error handling strategy

- **Phase 1 crash** (e.g. fails to write task file) → STOP, surface error, no Phase 2.
- **Phase 1 user declines variant** (no answer or "abort") → STOP, no Phase 2.
- **Phase 2 tests stay red after retry per AGENTS.md "Diagnosing Failures"** → STOP after second failed fix attempt; emit STOP-ANALYSIS REPORT; no Phase 3.
- **Phase 3 verdict ≠ Approve** → STOP, no commit (existing `flowai-review-and-commit-beta` semantics preserved by inlining).
- **Phase 3 commit fails** (e.g. pre-commit hook rejects) → fix and create NEW commit per AGENTS.md (NEVER `--amend`).

### Verification commands

- `deno task check` — full check (covers `check-skill-sync.ts`, `check-fr-coverage.ts`, `check-naming-prefix.ts`, all tests).
- `deno task bench -f flowai-do-with-plan-full-cycle`
- `deno task bench -f flowai-do-with-plan-rejects-on-changes-requested`
- `deno task bench -f flowai-do-with-plan-pauses-for-variant-selection`
- `grep -q "flowai-do-with-plan" README.md documents/design.md documents/requirements.md`
- `grep -E "FR-DO-WITH-PLAN.*requirements.md#" documents/index.md`

### Bench-design refinements (from critique triage)

- **Full-cycle scenario sizing**: `maxSteps = 90`, `stepTimeoutMs = 900_000` (15 min). The realistic cycle (plan + small impl + check + review + commit + reflect-cleanup) burns 40–70 steps in interactive mode.
- **Reject-path scenario must seed a real defect**, not mock the verdict. The composite has no hooks-based mock for Approve/Reject — the model decides from the diff. Fixture: pre-create a task whose Solution intentionally introduces a failing test (or breaks a known invariant — e.g. removes a `// FR-` marker that `check-traceability.ts` requires). Phase-3 review surfaces the issue → verdict = Request Changes → workflow stops without commit.
- **Empty Phase-2 diff handling**: SKILL.md MUST handle the case where Phase 2 produces no diff (the Implement→Review gate above). Bench `flowai-do-with-plan-empty-implement-stops` is a candidate follow-up scenario.
- **README catalog format discovery**: before editing README, run `grep -n "flowai-review-and-commit-beta" README.md` to find the exact catalog row format and mirror it.

## Follow-ups

- Once `flowai-plan-exp-permanent-tasks` is promoted (renamed to `flowai-plan` per the parent task `replace-adr-with-tasks.md`), update the sync-check entry's `skill` field for the Plan Phase source.
- Add a "Phase 2 short-circuit" / "Empty Phase-2 diff" benchmark: agent invokes `/flowai-do-with-plan` on a task that turns out to need no code (only doc updates) — composite should still reach Phase 3 and produce the doc commit, OR stop cleanly if the Solution genuinely had no work.
- Consider a `scripts/check-composite-description.ts` validator: ensures composite SKILL.md descriptions contain "Self-contained" and do NOT name source skills. Defers from this task — current canon enforced by code review only.
