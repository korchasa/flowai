---
date: "2026-05-24"
status: done
implements:
  - FR-JIT-REVIEW
tags: [framework, atoms, review, jit-tests, refactor]
related_tasks:
  - 2026/05/generate-skills-from-atoms.md
---

# Merge `jit-review` into `review` Atom

## Goal

Fold the Catching JiTTests methodology (Meta FSE 2026, currently isolated in `framework/engineering/skills/jit-review/`) into the canonical `review` atom (`framework/atoms/review.md`) by **organically interweaving** it with the existing review stages — not appending a separate phase. After the merge: every invocation of `review` (and every composite that uses it: `review-and-commit`, `do-with-plan`, `ship`) automatically gains regression probing via ephemeral pass-on-parent / fail-on-diff tests. The standalone `jit-review` skill is deleted; users no longer need to remember a second command.

## Overview

### Context

`jit-review` was added as a separate skill to keep the methodology optional. In practice it's skipped on most commits because users have to invoke it explicitly. The friction defeats the purpose — Catching JiTTests catch behavioural regressions that the current review (design / hygiene / FR-coverage) cannot.

The two pipelines have natural overlap: both consume the same diff, both want parent baseline via `git worktree`, both produce findings, both end with a verdict. The merge interleaves at those overlap points instead of running JiT as an isolated phase.

JiT methodology is graceful by design — if AGENTS.md declares no `test` command, or parent baseline is red, or diff is pure deletion, the JiT subset disables itself and review continues. Catching tests that fail-on-diff are treated as `[critical]` findings in the existing review verdict gate, not a new gate.

Composites (`review-and-commit`, `do-with-plan`, `ship`) consume the atom — they get the upgrade automatically when the atom is regenerated. No manifest changes, no wrapper edits.

Relevant sources:
- `framework/atoms/review.md` (target — 240 lines, 10 steps)
- `framework/engineering/skills/jit-review/SKILL.md` (source content — 236 lines, 10-stage pipeline)
- `framework/engineering/skills/jit-review/acceptance-tests/` (5 scenarios to migrate)
- SRS: FR-JIT-REVIEW (line 979 — rewritten), FR-REVIEW-COMMIT (line 656 — minor doc touch), FR-DO-WITH-PLAN (line 663 — minor), FR-SHIP (line 694 — minor)
- Composite canon: `scripts/generate-skill-composites.ts` (line cap 500, single `<step_by_step>` per atom)

### Current State

- `framework/atoms/review.md`: 10-step review pipeline; generated `framework/core/skills/review/SKILL.md`.
- `framework/engineering/skills/jit-review/SKILL.md`: 10-stage JiT pipeline; standalone, NOT in atoms manifest.
- `framework/engineering/skills/jit-review/acceptance-tests/`: `catch-regression`, `no-change-no-alarm`, `trigger-pos-1`, `trigger-adj-1`, `trigger-false-1`.
- `framework/composites.yaml`: 5 atoms, 3 composites; no `review-beta` and no separate `jit-tests` atom.
- SRS FR-JIT-REVIEW: scope `framework/engineering/skills/jit-review/`; standalone model-invocable.

### Constraints

- **Atom canon**: exactly one `<step_by_step>` block per atom (validator-enforced). Line cap 500. After merge atom is ≈300 lines — within budget.
- **Language-agnostic**: JiT-subset MUST use AGENTS.md-declared `test`/`check` command. No hardcoded stack-specific runners.
- **Graceful degradation**: no AGENTS.md `test` command, or red parent baseline, or pure-deletion diff → JiT subset disabled; review continues; flag in "Degradation notes".
- **Verdict gate unchanged**: catching tests that fail-on-diff become `[critical]` findings; verdict logic (Approve / Request Changes / Needs Discussion) untouched.
- **Composites unchanged**: `composites.yaml`, wrapper files (`review-and-commit.md`, `do-with-plan.md`, `ship.md`), and their generated SKILL.md outputs propagate the new behavior automatically via the regeneration step in `deno task check`.
- **Ephemeral tests**: written outside main test tree, under session-id'd scratch dir (`.flowai/review-jit/<sid>/` with `.gitignore` ensure, or `$(mktemp -d)/review-jit-<sid>/`); deleted on `discard`.
- **No production code modification**: JiT-subset NEVER touches production code; NEVER writes catching tests into main test tree without explicit `save`.
- **Mutant budget**: ≤5 intents × ≤3 risks × 1 mutant = ≤15 mutants. Report top-5 by `severity × uniqueness`.
- **Time-budget degradation**: if a single `test`-command invocation > 30s → skip mutant kill-rate probe (stage 8b sub-c); keep catching invariant.
- **No-test-fitting**: scenarios in `acceptance-tests/` must verify observable behavior (catching test produced, parent worktree created, save/discard prompted), not internal wording.
- **Existing review acceptance scenarios MUST KEEP PASSING**: the merge MUST NOT regress the current 5+ review scenarios. Pre-flight: run one existing review scenario before edits, capture pass; run after edits, must still pass.

## Definition of Done

- [x] FR-JIT-REVIEW: `framework/atoms/review.md` `<step_by_step>` interleaves JiT pipeline per the merge map (steps 2b, 3d-e, 6-8 side-channel risks, 8a synthesis, 8b dual-run/filter, 10 extended report, 11 ephemeral dispose). Generated `framework/core/skills/review/SKILL.md` passes canon.
  - Test: `deno run -A scripts/generate-skill-composites.ts --check`
  - Evidence: `deno run -A scripts/generate-skill-composites.ts --check` exits 0
- [x] FR-JIT-REVIEW: Behavioural — given a diff that introduces a comparator flip on a covered code path, `review` produces ≥1 catching test that passes on parent and fails on diff.
  - Benchmark: `review-catches-regression-via-jittests` (migrated from `jit-review/catch-regression`)
  - Evidence: `deno task acceptance-tests -f review-catches-regression-via-jittests`
- [x] FR-JIT-REVIEW: Behavioural — given an empty diff or pure-deletion diff, `review` does not synthesize catching tests and notes graceful degradation.
  - Benchmark: `review-no-change-no-alarm` (migrated from `jit-review/no-change-no-alarm`)
  - Evidence: `deno task acceptance-tests -f review-no-change-no-alarm`
- [x] FR-JIT-REVIEW: Existing review scenarios (`review-approve-on-clean-diff`, `review-rejects-on-critical`, `review-fr-coverage`, etc. — all currently-passing) keep passing.
  - Test: `deno task acceptance-tests -f review` (filters all review-* scenarios)
  - Evidence: `deno task acceptance-tests -f review` (0 failures in summary)
- [x] FR-JIT-REVIEW: SRS section rewritten: scope points at `framework/atoms/review.md` (JiT-subset); old standalone scope language removed; `**Acceptance:**` field references the migrated scenario IDs.
  - Test: `grep -n "framework/engineering/skills/jit-review" documents/requirements.md` returns 0 lines
  - Evidence: `bash -c '! grep -q "framework/engineering/skills/jit-review" documents/requirements.md'`
- [x] FR-JIT-REVIEW: `framework/engineering/skills/jit-review/` directory removed (SKILL.md + acceptance-tests).
  - Test: `! test -d framework/engineering/skills/jit-review`
  - Evidence: `bash -c '! ls framework/engineering/skills/jit-review 2>/dev/null'`
- [x] FR-JIT-REVIEW: Cross-references in README, `framework/CLAUDE.md`, `framework/AGENTS.md`, `documents/design.md`, and any other framework docs pointing at the standalone `jit-review` are updated to point at the `review` atom JiT-subset (or removed).
  - Test: `grep -rn 'jit-review' README.md framework/ documents/ --include='*.md' | grep -v '^Binary'` returns only updated-form references (no `engineering/skills/jit-review` paths)
  - Evidence: `bash -c '! grep -rn "engineering/skills/jit-review" README.md framework/ documents/ --include="*.md"'`
- [x] FR-JIT-REVIEW: Trigger acceptance scenarios (FR-ACCEPT.TRIGGER) for `review` remain 3 in total; the previous `jit-review/trigger-*` scenarios are deleted (review already has its own trigger trio).
  - Test: `deno run -A scripts/check-trigger-coverage.ts`
  - Evidence: `deno run -A scripts/check-trigger-coverage.ts` exits 0
- [x] Full project verification.
  - Test: `deno task check`
  - Evidence: `deno task check` (0 failures in final summary line)

## Solution

### Phase 0 — Pre-flight baseline

1. Read `framework/atoms/review.md` and `framework/engineering/skills/jit-review/SKILL.md` in full. Confirm current line counts and step structure match the merge plan.
2. List existing review acceptance scenarios: `ls framework/core/skills/review/acceptance-tests/`. Pick the FIRST execution scenario whose ID does NOT start with `trigger-` (typical default: `review-approve-on-clean-diff` or `review-rejects-on-critical`); record the chosen ID as `<baseline-scenario>` for Phase 3 step 14.
3. Run the picked scenario: `deno task acceptance-tests -f <baseline-scenario>`. Confirm pass. Cache state is now warm — this becomes the baseline for "still passing after merge".
4. Pre-flight downstream composite scenarios: `grep -l 'Catching Tests\|Intents (inferred' framework/core/commands/{review-and-commit,do-with-plan,ship}/acceptance-tests/*/mod.ts 2>/dev/null` — empty result means existing checklist items DO NOT pin to JiT-specific sections (safe). Non-empty: list the affected scenarios and add an explicit "adapt scenario checklist" sub-step to Phase 3.
5. Inspect mocking approach in existing JiT scenarios: read `framework/engineering/skills/jit-review/acceptance-tests/catch-regression/mod.ts` to see how it handles parent vs diff `test`-command outcomes. Document: real sandbox `git worktree` + real `test` command (no conditional mock — CLAUDE.md states mocks are static), OR a fixture-script that returns deterministic exit codes. The migrated scenario MUST keep the same approach.
6. Run `deno task check`. Capture the summary line. This is the green-baseline gate.

### Phase 1 — Atom edit (RED)

Edit `framework/atoms/review.md` per the merge map. Single edit (Write tool — full rewrite) to avoid LSP unused-export-style races on multi-step Edit calls. Resulting structure:

5. **Update frontmatter description**: extend the `description:` to mention regression probing (catching tests) so the model picks up the new triggering surface — e.g. `... verdict on task completion, code quality, architecture, cleanup, AND ephemeral regression probes (Catching JiTTests, pass-on-parent / fail-on-diff). Requires an existing diff. ...`. Keep the negative-trigger clause ("Do NOT trigger on generic 'is this code good?' questions without a diff, or on post-merge code review of historical commits.") unchanged.
6. **Extend `<context>`**: add a third input-source bullet — "Parent worktree (created via `git worktree add <sha>` or `git show` fallback) used by the JiT subset for pass-on-parent verification."
7. **Extend `<rules>`**: append rules 9-12:
   - **Rule 9 — Catching tests as findings**: catching tests that fail-on-diff are `[critical]` findings, treated identically to other critical findings in the verdict gate. No separate gate.
   - **Rule 10 — JiT graceful degradation**: if AGENTS.md declares no `test`/`check` command, OR parent baseline is red, OR diff is pure-deletion, OR diff > ~10 files or > ~500 LOC, the JiT subset disables itself silently; flag in "Degradation notes". Review continues unaffected.
   - **Rule 11 — Ephemeral tests**: catching tests are written outside the main test tree, under a session-id'd scratch directory (`.flowai/review-jit/<sid>/` with `.gitignore` ensure, or `$(mktemp -d)/review-jit-<sid>/`). Before writing to `.flowai/`, verify exact `.gitignore` entry with `grep -qE '^\.flowai/(\*|$)' .gitignore`; append `.flowai/` only when grep returns non-zero. Never tracked by git. Deleted on `discard`. Session id MUST be unique per invocation.
   - **Rule 12 — No production-code edit**: JiT subset NEVER modifies production code. Catching tests stay in the scratch directory until the user explicitly `save`s them.
8. **Rewrite `<step_by_step>`** per the merge map (see chat for full structure):
   - Step 1: Empty Diff Guard (unchanged).
   - Step 2: Pre-flight Project Check — split into 2a (current revision, existing logic) and 2b (parent worktree + same `test` command; red parent → set "JiT disabled" flag and continue review).
   - Step 3: Gather Context — keep 3a-c, add 3d (commit-message + optional `gh pr view` intent hints), add 3e (≤5 intent inference from task DoD + commit messages + diff). Keep parallel SA1/SA2 delegation.
   - Step 4: QA: Task Completion — unchanged.
   - Step 4a: FR Coverage Audit — unchanged.
   - Step 5: QA: Hygiene — unchanged.
   - Step 6: Code Review: Design & Architecture — extend with side-channel: while reading hunks, accumulate ≤3 risk hypotheses per intent in the form "if author slipped on Y while doing X, behavior would fail at Z". Risks are diff-specific; no generic code smells.
   - Step 7: Code Review: Implementation Quality — same side-channel continues.
   - Step 8: Code Review: Readability & Style — same side-channel continues.
   - **Step 8a (new)**: Mutant + Catching Test Synthesis. Generate ≤15 mutants (≤5 intents × ≤3 risks). Typical mutations: comparator flip, removed guard, inverted return, off-by-one, swapped args. Write one ephemeral test per surviving risk to scratch dir. SKIP entire step on pure-deletion diff or JiT-disabled flag.
   - **Step 8b (new)**: Dual-Run + Filter. (a) parent worktree run — drop tests failing on parent (assumption leak). (b) diff worktree run — failing tests = catching JiTTests; record file:line and assertion output. (c) optional mutant kill-rate; SKIP if a single `test`-command invocation > 30s — explicitly write `Mutant kill-rate skipped — single test invocation exceeded 30 s threshold (recorded N s)` in Degradation Notes so the user sees the lost signal, not just an absent section. Filter: 3x rerun for flake (flips → drop), assertion duplicates, zero-kill drops.
   - Step 9: Run Automated Checks — unchanged.
   - **Step 10 (extended)**: Final Report. Add sections (in this order before `### Summary`): `### Intents (inferred from diff, ≤5)` (only if JiT ran), `### Catching Tests (pass on parent, fail on diff)` (top-5 by severity × uniqueness, [critical] severity), `### Uncovered Risks` (with reason e.g. non-deterministic / external I/O), `### Degradation Notes` (only if JiT disabled or mutant-probe skipped). Extend `### Summary` with `Catching tests: N` line.
   - **Step 11 (new)**: Ephemeral Dispose. ONLY when catching tests exist. Interactive prompt — `save <name>` / `save all` / `discard all`. Default on timeout/ambiguous → discard, scratch dir deleted. On `save`: propose destination beside the file under test, ask confirmation, then `git mv` (or equivalent) and stage.
9. **Extend `<verification>` checklist** with bullets for: parent worktree created (or graceful skip noted), intents ≤5, risks ≤3 per intent, every reported catching test passed on parent and failed on diff, ephemeral dir cleaned on discard, no production code modified.

### Phase 2 — Acceptance scenario migration (RED proof)

10. `mkdir -p framework/core/skills/review/acceptance-tests/` (already exists). Copy and rename:
    - `framework/engineering/skills/jit-review/acceptance-tests/catch-regression/` → `framework/core/skills/review/acceptance-tests/review-catches-regression-via-jittests/`. Update `mod.ts`:
      - Replace `skill: "jit-review"` → `skill: "review"`.
      - Update checklist items to reference the new section labels (`Catching Tests`, `Intents`) in the report.
      - Userquery rewritten to a generic "review my changes" — the JiT-subset must trigger automatically inside review, not via a JiT-specific phrase. (Pre-flight: confirm scenario fixture's diff has the comparator-flip mutation needed to surface a catching test.)
    - `framework/engineering/skills/jit-review/acceptance-tests/no-change-no-alarm/` → `framework/core/skills/review/acceptance-tests/review-no-change-no-alarm/`. Update similarly: scenario fixture has empty or pure-deletion diff; verify report contains `### Degradation Notes` mentioning JiT graceful-skip.
    - DELETE the three `trigger-*` scenarios under `jit-review/` (review already has its own trigger trio; FR-ACCEPT.TRIGGER requires exactly 3 per skill, not 6).
11. Run migrated scenarios — they MUST fail at this point (atom not yet regenerated since the source `review.md` was edited but `--write` not yet run). RED proof:
    `deno run -A scripts/generate-skill-composites.ts --write && deno task acceptance-tests -f review-catches-regression-via-jittests`.
    If they pass before the regeneration step, the scenario is testing the wrong thing — revise the scenario, not the atom.

### Phase 3 — Make it green (GREEN)

12. `deno run -A scripts/generate-skill-composites.ts --write` regenerates `framework/core/skills/review/SKILL.md` and ALL downstream composites (`review-and-commit`, `do-with-plan`, `ship`) — the composite wrappers reinline the new step_by_step automatically.
13. Run the two new scenarios. They must pass. If not, root-cause in the atom (NOT in the scenario). Iterate atom only.
14. Run the previously-picked baseline review scenario from Phase 0. Must still pass — guards against regression of existing review behavior.

### Phase 4 — SRS rewrite

15. Open `documents/requirements.md` at FR-JIT-REVIEW (line ~979). Replace section body keeping the heading text:
    - **Description**: "JiT-subset of the `review` atom: given a diff, the JiT phase synthesizes ephemeral Catching JiTTests — temporary tests that pass on the parent revision and fail on the diff revision. Adapts Meta's Intent-Aware JiTTests pipeline (FSE 2026). Activates automatically inside every `review` invocation (and every composite that uses it). Graceful degradation when AGENTS.md declares no `test` command, when parent baseline is red, when diff is pure-deletion, or when diff exceeds the >10-file / >500-LOC guardrail."
    - **Scope**: "Lives inside `framework/atoms/review.md` as steps 2b, 3d-e, 6-8 side-channel, 8a, 8b, extended step 10, and step 11. NOT a standalone skill."
    - **Scenario**: keep the 1-9 numbered pipeline (parent worktree, intents, mutants, dual-run, filter, report, dispose); update to reference the interleaved step numbers.
    - **Constraints**: keep all original constraints (language-agnostic, fail-fast, no production code edit, diff guardrail, mutant budget); ADD "Verdict gate inherits from `review` — no separate JiT gate; catching tests are `[critical]` findings".
    - **Acceptance verified by acceptance tests**: `review-catches-regression-via-jittests`, `review-no-change-no-alarm`.
16. Surgical-edit `**Tasks:**` back-pointer (FR-DOC-TASK-LINK) under FR-JIT-REVIEW's `**Description:**` bullet — already done by the plan skill at step 5c of this plan run.

### Phase 5 — Cross-reference sweep

17. Two-pass grep — separate path-references from conceptual references:
    - Pass A (path references, MUST be 0 after sweep): `grep -rn 'engineering/skills/jit-review' README.md framework/ documents/ --include='*.md'`
    - Pass B (skill-name references, REVIEW each hit individually): `grep -rn '\bjit-review\b' README.md framework/ documents/ --include='*.md'`
18. For each Pass A hit: remove or repoint at `framework/atoms/review.md`. For each Pass B hit, classify:
    - Skill-list table or catalog row → remove (no longer a standalone skill).
    - Conceptual reference ("the jit-review skill catches…") → rewrite to "the `review` atom's JiT subset catches…".
    - Anchor in URL → update to FR-JIT-REVIEW anchor (`requirements.md#fr-jit-review-jit-review-skill-jit-review`).
    - In-flight prose about methodology (not naming the skill) → leave as-is.
    - Verify anchor stability after edits by spot-checking that `documents/index.md` FR-JIT-REVIEW link resolves in a Markdown preview (or against `marked --silent` if available locally).
19. Update `documents/design.md` if it has a section describing the JiT-review skill architecture — fold into the review section, or remove if redundant.
20. Update `documents/index.md` FR-JIT-REVIEW row summary to reflect the JiT-subset framing (handled by step 5b of this plan run).

### Phase 6 — Delete standalone

21. `rm -rf framework/engineering/skills/jit-review/`.
22. Re-run `deno task check`. If anything still references the deleted path (lint exclude, check-pack-refs scripts, etc.) — fix the reference, not the deletion.

### Phase 7 — CHECK

23. `deno task check` — green required.
24. Hand off to user (per AGENTS.md CHECK rule): full-sweep acceptance for `review` is a 5+ scenario run, exceeding the per-task budget. Provide the exact command: `deno task acceptance-tests -f review`. List the two new scenarios already verified single-run; user runs the rest.

### Verification commands (collected)

- `deno run -A scripts/generate-skill-composites.ts --check` → atom + composite canon.
- `deno task acceptance-tests -f review-catches-regression-via-jittests` → new behavioral scenario.
- `deno task acceptance-tests -f review-no-change-no-alarm` → graceful-skip scenario.
- `deno task acceptance-tests -f review` → full review sweep (user-side, CHECK phase).
- `deno run -A scripts/check-trigger-coverage.ts` → trigger trio invariant.
- `bash -c '! grep -rn "engineering/skills/jit-review" README.md framework/ documents/ --include="*.md"'` → cross-reference sweep complete.
- `bash -c '! test -d framework/engineering/skills/jit-review'` → directory deletion verified.
- `deno task check` → terminal gate.

## Follow-ups

- Add a `skipJit` option / scenario flag for legacy review acceptance scenarios that don't want to pay the JiT runtime cost. Only if Phase 7 reveals scenario-time regressions worth optimizing.
- Consider promoting the time-budget threshold (currently 30s/test-invocation → mutant-probe skip) to an AGENTS.md-tunable knob — out of scope here.
- Touch `FR-REVIEW-COMMIT` / `FR-DO-WITH-PLAN` / `FR-SHIP` descriptions to mention catching-tests as part of the review phase output — minor doc improvement, can ride in a separate doc-only commit.
- Cross-IDE interactive prompt: the Ephemeral Dispose step (step 11) relies on an interactive `save / discard` exchange. This was already a constraint of the standalone `jit-review` skill; it is now inherited by every review composite. If any target IDE (Codex, OpenCode in certain modes) lacks interactive turn-taking, propose a "non-interactive review" mode that defaults to `discard` after the report is printed — separate task.
- Review wall-clock regression: JiT adds a second `test`-command run in a parent worktree. On projects with long `test` (e.g. our own `deno task check`) overall review time roughly doubles. If Phase 7 reveals scenario timeouts or unacceptable user wall-clock, optimize via single-run probing or scoped sub-targets — separate task.
