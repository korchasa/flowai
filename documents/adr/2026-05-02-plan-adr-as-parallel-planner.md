---
id: ADR-0001
status: implemented
date: 2026-05-02
implements:
  - FR-DOC-ADR
  - FR-DOC-ADR-LIFECYCLE
  - FR-INIT
tags:
  - skill-design
  - documentation
---

# `flowai-skill-plan-adr` as parallel planning skill

## Context

`flowai-skill-plan-adr` was scoped narrowly: record one architectural decision in MADR format, then point the user to [`flowai-skill-plan`](../../framework/core/skills/flowai-skill-plan/SKILL.md) for the implementation breakdown. In practice this becomes a two-step UX where the agent emits "implementation — separate task via `/flowai-skill-plan`", which loses the rationale-to-plan link, doubles prompt cost, and forces an unnecessary chat round-trip. The base mechanics of `flowai-skill-plan` (variants → DoD with FR-tuples → critique → triage → index update) are reusable — the only differentiator is artifact format and lifetime (persistent MADR vs gitignored GODS task).

## Alternatives

- **Keep ADR narrow, plan separately** — current behavior. Pros: clean responsibility split, ADR stays tight as forensics. Cons: forces second skill invocation, rationale and plan drift, two-step UX surfaces in chat. *Rejected because* the user explicitly objected to the round-trip and confirmed they edit the file post-write rather than in chat.
- **Replace `flowai-skill-plan` entirely** — delete the plan skill, migrate its 22 benchmarks, route every task through ADR. Pros: one entry point. Cons: ADRs accumulate for trivial bug-fixes where no decision was made; large benchmark migration; breaks the "tasks are gitignored" property for routine work. *Rejected because* the user chose to keep both skills as parallel options.
- **(CHOSEN) Make `flowai-skill-plan-adr` a parallel planner** — ADR-skill absorbs the full planning workflow (variants, DoD-tuples, index update, critique, triage), writes a MADR-style artifact under `documents/adr/`, auto-writes without round-trip, and gains an `implemented` status flipped by commit skills. `flowai-skill-plan` is preserved unchanged as the parallel option for non-architectural tasks. Triggers stay distinct: ADR for "decision/architecture/persistent rationale", plan for "task breakdown without architectural choice".

## Decision

`flowai-skill-plan-adr` becomes a planning-class skill that writes a MADR-format artifact at `documents/adr/<YYYY-MM-DD>-<slug>.md` containing Context, Alternatives (brief — 3–5 lines per alternative), Decision, Consequences, Definition of Done (with FR-Test-Evidence tuples), and Solution. Status set extends with `implemented`; [`flowai-commit`](../../framework/core/commands/flowai-commit/SKILL.md) and [`flowai-review-and-commit`](../../framework/core/commands/flowai-review-and-commit/SKILL.md) flip `accepted → implemented` on the commit that closes all referenced ADR DoD items. The skill auto-writes after the Solution step; chat output is summary-only (path + ID + DoD count). [`flowai-skill-plan`](../../framework/core/skills/flowai-skill-plan/SKILL.md) is preserved unchanged.

## Consequences

- ADR files are thicker (rationale + plan in one document), but persistent-archive property guarantees future sessions reconstruct *why* without spelunking commit history.
- ADR-skill triggers must be sharpened to avoid poaching trivial bug-fix queries that belong with `flowai-skill-plan`. Trigger benchmarks (`trigger-pos-*`, `trigger-adj-*`, `trigger-false-*`) need rebalancing.
- `flowai-commit` and `flowai-review-and-commit` gain a small step "scan touched ADRs; flip `accepted → implemented` if all DoD items are `[x]`". Failure is warn-only — never blocks the commit.
- [AGENTS.template.md](../../framework/core/assets/AGENTS.template.md) gains an `### ADR (documents/adr/)` rules section + `### MADR Format` block, parallel to the existing Tasks/GODS pair, so generated `AGENTS.md` teaches both formats.
- [SDS §3](../design.md#3-components) skill catalog and README skill list need updates reflecting expanded ADR-skill role.
- Existing [`FR-DOC-ADR`](../requirements.md#fr-doc-adr-architecture-decision-record-skill-flowai-skill-plan-adr) description (status set, sections) is now incomplete and must be revised. New `FR-DOC-ADR-LIFECYCLE` section captures status-flip mechanics.

## Definition of Done

- [x] FR-DOC-ADR: ADR skill produces MADR file with Context / Alternatives (brief) / Decision / Consequences / DoD / Solution sections; auto-writes without chat round-trip.
  - Benchmark: `flowai-skill-plan-adr-full-planning-shape` (new) + `flowai-skill-plan-adr-records-decision-with-alternatives` (existing — assertions adapted)
  - Evidence: `deno task bench -f flowai-skill-plan-adr-full-planning-shape`
- [x] FR-DOC-ADR: chat output post-write is summary-only (path + ID + DoD count); no draft preview, no edit prompt.
  - Benchmark: `flowai-skill-plan-adr-auto-writes-without-roundtrip` (new)
  - Evidence: `deno task bench -f flowai-skill-plan-adr-auto-writes-without-roundtrip`
- [x] FR-DOC-ADR-LIFECYCLE: status set extends with `implemented`; SKILL.md rules section documents the lifecycle and the `accepted → implemented` transition trigger.
  - Test: `grep -q 'implemented' framework/core/skills/flowai-skill-plan-adr/SKILL.md`
  - Evidence: `grep -q 'implemented' framework/core/skills/flowai-skill-plan-adr/SKILL.md`
- [x] FR-DOC-ADR-LIFECYCLE: `flowai-commit` flips `accepted → implemented` on the commit that closes a referenced ADR's DoD; warn-only on parse errors.
  - Benchmark: `flowai-commit-flips-adr-status` (new)
  - Evidence: `deno task bench -f flowai-commit-flips-adr-status`
- [x] FR-DOC-ADR-LIFECYCLE: `flowai-review-and-commit` mirrors the same flip in its commit phase (inline, no Skill-tool delegation per composite rules).
  - Benchmark: `flowai-review-and-commit-flips-adr-status` (new)
  - Evidence: `deno task bench -f flowai-review-and-commit-flips-adr-status`
- [x] FR-INIT: `framework/core/assets/AGENTS.template.md` gains `### ADR (documents/adr/)` rules section + `### MADR Format` block parallel to Tasks/GODS.
  - Test: `grep -q '### MADR Format' framework/core/assets/AGENTS.template.md && grep -q 'documents/adr/' framework/core/assets/AGENTS.template.md`
  - Evidence: `grep -q '### MADR Format' framework/core/assets/AGENTS.template.md && grep -q 'documents/adr/' framework/core/assets/AGENTS.template.md`
- [x] Add `FR-DOC-ADR-LIFECYCLE` section to `documents/requirements.md` with `**Acceptance:**` referencing the two new commit benchmarks.
  - Test: `grep -q 'FR-DOC-ADR-LIFECYCLE' documents/requirements.md`
  - Evidence: `grep -q 'FR-DOC-ADR-LIFECYCLE' documents/requirements.md`
- [x] Revise existing `FR-DOC-ADR` description in SRS (planning + lifecycle scope); update [SDS §3](../design.md#3-components) catalog entry for `flowai-skill-plan-adr` and the commit/review-and-commit sections.
  - Test: manual — korchasa
  - Evidence: PR diff review
- [x] [documents/index.md](../index.md) gains a `## ADR` section with the row for ADR-0001.
  - Test: `grep -q 'ADR-0001' documents/index.md`
  - Evidence: `grep -q 'ADR-0001' documents/index.md`

## Solution

1. **SRS edits** (`documents/requirements.md`):
   - Revise [`FR-DOC-ADR`](../requirements.md#fr-doc-adr-architecture-decision-record-skill-flowai-skill-plan-adr) description: scope now includes planning workflow (variants/DoD/critique/index/auto-write); add new MADR sections to format spec.
   - Add `FR-DOC-ADR-LIFECYCLE` section with `**Acceptance:**` referencing `flowai-commit-flips-adr-status` and `flowai-review-and-commit-flips-adr-status`.
   - No new top-level FR for AGENTS.template.md — fold under existing [`FR-INIT`](../requirements.md#fr-init-project-initialization) as a DoD evidence row.

2. **SDS edits** (`documents/design.md` §3):
   - Update component entry for `flowai-skill-plan-adr` to describe the planning-class shape, auto-write behavior, and `implemented` lifecycle.
   - Update `flowai-commit` / `flowai-review-and-commit` entries to mention the ADR-status-flip step (warn-only).

3. **AGENTS.template.md** (`framework/core/assets/AGENTS.template.md`):
   - Insert `### ADR (\`documents/adr/\`)` rules block after the existing `### Tasks` block (around line 150). Mirror Tasks structure: file naming, slug rules, persistence note (NOT gitignored, kebab-case slug ≤40 chars).
   - Insert `### MADR Format` block after `### GODS Format` (around line 193), with full template (frontmatter `id` / `status` / `date` / `implements` / `tags`, Context, Alternatives, Decision, Consequences, DoD, Solution).
   - Extend documentation-hierarchy line 40 to mention `implemented` status: `status: proposed | accepted | implemented | rejected | superseded | deprecated`.

4. **`flowai-skill-plan-adr/SKILL.md`** (`framework/core/skills/flowai-skill-plan-adr/SKILL.md`) — full rewrite mirroring `flowai-skill-plan` step structure:
   - Steps: Initialize (todo) → Deep Context & Uncertainty → Draft G-O-D in MADR shape → Variants (chat-first) → User Decision Gate → Detail Solution → **Auto-write file** (no draft preview, no edit round) → Acceptance Tuple Check → Update Index (`## ADR` section) → Critique → Triage & Auto-Apply → STOP.
   - Replace existing step 6 ("Show draft to the user, ONE round of edits, then write") with single-write step.
   - Frontmatter `description:` rewritten to position skill as parallel planner; explicitly states it does NOT poach trivial-task queries (those go to `flowai-skill-plan`). Add "Self-contained" hint? — no, this is not a composite.
   - Status list extended with `implemented`; default for new ADRs stays `accepted`. Document transition rule (commit skills handle it).
   - Verification block updated: MADR shape + auto-write + DoD-tuple presence + index row.
   - Brief-alternatives rule (3–5 lines per alternative; no detailed design) preserved per user instruction.

5. **`flowai-commit/SKILL.md`** (`framework/core/commands/flowai-commit/SKILL.md`):
   - Add a step in the commit phase: "Scan changed files in this commit for `implements:` frontmatter values referencing `ADR-NNNN`. For each ADR, parse `documents/adr/<file>.md`. If all `## Definition of Done` items are `[x]` after this commit, flip `status: accepted` to `status: implemented` in the ADR's frontmatter and stage the file. Warn-only on parse errors; never block the commit."
   - Update verification block.

6. **`flowai-review-and-commit/SKILL.md`** (`framework/core/commands/flowai-review-and-commit/SKILL.md`):
   - Mirror step from #5 inline (composite no-delegation rule). Add identical step text to its Phase-2 commit block.
   - Run `scripts/check-skill-sync.ts` after edits; if drift detected, sync inline.

7. **Benchmarks**:
   - `framework/core/skills/flowai-skill-plan-adr/benchmarks/full-planning-shape/mod.ts` — new. Asserts DoD + Solution sections present in written file; alternatives section is brief (≤8 lines per entry).
   - `framework/core/skills/flowai-skill-plan-adr/benchmarks/auto-writes-without-roundtrip/mod.ts` — new. Asserts no chat draft preview, no "approve?" prompt before write; file appears in single agent step.
   - `framework/core/commands/flowai-commit/benchmarks/flips-adr-status/mod.ts` — new. Sandbox with ADR file (status `accepted`, all DoD `[x]` after diff) + diff implementing it; asserts frontmatter flipped to `implemented` and staged.
   - `framework/core/commands/flowai-review-and-commit/benchmarks/flips-adr-status/mod.ts` — new. Same fixture under composite.
   - Update existing `records-decision-with-alternatives/mod.ts` assertions if they assume the old chat-draft flow.
   - Rebalance trigger benchmarks (`trigger-pos-*`, `trigger-adj-*`, `trigger-false-*`) so ADR-skill no longer activates on trivial bug-fix queries; verify `flowai-skill-plan` trigger-pos still passes (no regressions).

8. **`documents/index.md`**: add `## ADR` section if absent; insert `- [ADR-0001](adr/2026-05-02-plan-adr-as-parallel-planner.md) — flowai-skill-plan-adr as parallel planner — accepted`. Once implemented, status flips to `implemented` automatically (via #5/#6).

9. **Verification commands**:
   - `deno task check` — full pipeline (lint + test + skill validation).
   - `deno task bench -f flowai-skill-plan-adr` — entire ADR-skill bench suite green (existing + new).
   - `deno task bench -f flowai-commit-flips-adr-status` — new commit scenario green.
   - `deno task bench -f flowai-review-and-commit-flips-adr-status` — new composite scenario green.
   - Manual: run `flowai init` against a scratch project, confirm generated `AGENTS.md` has `### ADR` and `### MADR Format` sections.

## Follow-ups

- Migration of any existing one-off ADR-style notes scattered in `documents/rnd/` into the new `documents/adr/` directory — out of scope for this change.
- `scripts/check-traceability.ts` could later be extended to verify ADR `implements:` references resolve to actual FRs in SRS — deferred until after the lifecycle mechanics ship.
