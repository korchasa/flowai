---
date: 2026-05-07
status: done
implements:
  - FR-DOC-TASKS
  - FR-DOC-TASK-LIFECYCLE
  - FR-DOC-TASK-CONTEXT
  - FR-DOC-TASK-LINK
  - FR-DOC-RESCUE
  - FR-DOC-INDEX
tags: [framework, refactor, docs, skills, lifecycle]
related_tasks: []
---
# Replace ADR with first-class committed Tasks (via flowai-plan-exp-permanent-tasks)

## Goal

Drop the separate ADR primitive. Promote `documents/tasks/` from gitignored session scratch to the committed canonical record of *what was decided, planned, and shipped*. Tasks already carry `implements:`, GODS body, DoD, and Solution — adding date hierarchy, status, tags, related_tasks, and SRS-inline back-pointer makes them a strict superset of what ADR/PDR were meant to cover. One primitive, fewer skills, no parallel taxonomy.

The new task-writing logic ships as a parallel **commands** primitive `flowai-plan-exp-permanent-tasks` (per project convention: directory `framework/core/commands/`, prefix `flowai-*` without `-skill-`, `disable-model-invocation: true` injected by the CLI writer at sync time — i.e. a "skill" that the agent cannot auto-trigger; user invokes it via `/flowai-plan-exp-permanent-tasks`). The existing `flowai-plan` stays **untouched** in this iteration so its 22 benchmarks remain green; promotion (rename exp → plan, delete old plan, fold into one primitive) is a follow-up task once the exp primitive proves out.

## Overview

### Context

`flowai-plan-adr` was introduced as a sibling planner for architectural decisions. In practice it duplicates `flowai-plan` (variant analysis, DoD, persistence) for a narrow trigger window, and the `documents/adr/` directory is a second canonical-record location alongside `documents/tasks/`. Removing the duplication requires three structural changes:

1. Tasks must be committed (today `documents/tasks/` is ignored via `documents/.gitignore`).
2. Tasks need stable identity, status lifecycle, scaling layout (date hierarchy), and metadata (tags, related_tasks).
3. `flowai-plan` (and `flowai-epic`) must adopt the new layout/frontmatter and load related tasks as planning context.

After landing, `flowai-plan-adr` is deleted, all 3 ADRs migrate to `documents/tasks/<YYYY>/<MM>/<slug>.md`, the `## ADR` section in `documents/index.md` disappears with no replacement (SRS-inline `**Tasks:**` carries the navigation load).

### Current State

- Gitignore: `documents/.gitignore` line `tasks/` ignores the entire dir recursively.
- ADR skill: `framework/core/skills/flowai-plan-adr/SKILL.md` (160 lines) + 12 bench scenarios.
- ADR records: 3 files in [`documents/adr/`](../../../adr/):
  - `2026-05-02-plan-adr-as-parallel-planner.md` (status: implemented)
  - `2026-05-03-skill-trigger-benchmarks.md` (status: accepted)
  - `2026-05-03-decompose-complexity-hotspots.md` (status: accepted)
- Plan skill: `framework/core/skills/flowai-plan/` — already writes `documents/tasks/<YYYY-MM-DD>-<slug>.md`. 22 bench scenarios.
- Epic skill: `framework/core/skills/flowai-epic/` — writes `documents/tasks/epic-<name>.md`. 12 bench scenarios.
- Commit skills: `flowai-commit` and `flowai-review-and-commit` carry `flips-adr-status` benches (rename targets) plus task-aware `task-cleanup`, `task-cleanup-partial`, `task-context`.
- Reflect skill: `flowai-reflect` carries `rescues-decision-as-adr` bench.
- Cross-references: 73 in `framework/`, 9 in SRS, 5 in SDS, 3 in `AGENTS.template.md`, 1 each in `README.md` and `documents/index.md`. Zero in `cli/src/` and `scripts/` — bundle regen is automatic, no code edits.

### Constraints

- Placement of new primitive: `framework/core/commands/flowai-plan-exp-permanent-tasks/SKILL.md`. Source `SKILL.md` MUST NOT declare `disable-model-invocation` — CLI writer injects it. Bench dir: `framework/core/commands/flowai-plan-exp-permanent-tasks/benchmarks/`.
- Coexistence with `flowai-plan`: legacy flat-path tasks (`documents/tasks/<YYYY-MM-DD>-<slug>.md`) remain valid until promotion. `check-task-format.ts` enforces strict shape ONLY on tasks under `documents/tasks/<YYYY>/<MM>/` path; legacy flat paths get a deprecation warning. `flowai-commit` / `flowai-review-and-commit` status-derivation acts only on tasks with new-shape frontmatter (presence of `date:` field) — legacy tasks are skipped.
- Acceptance Test TDD: every skill change paired with a failing-then-passing benchmark scenario (RED → GREEN). Renames must preserve trigger coverage (3 pos / 3 adj-neg / 3 false-use).
- Status field is **derived**, not authored: `flowai-commit` / `flowai-review-and-commit` rewrite `status:` on every commit that touches `documents/tasks/**/*.md`, computed purely from `## Definition of Done` checkbox state (`0 of N → to do`, `1..N-1 of N → in progress`, `N of N → done`). Tasks without a DoD section: warn-only, status untouched. Skill-on-creation writes `status: to do` to match empty DoD.
- Filenames lose the date prefix; date moves into frontmatter. New layout: `documents/tasks/<YYYY>/<MM>/<slug>.md`. Slugs remain kebab-case, ≤40 chars.
- Identity = relative markdown link. SRS/index reference tasks as `[slug](tasks/2026/05/replace-adr-with-tasks.md)` — no separate ID counter.
- `**Tasks:**` SRS back-pointer accumulates ALL tasks linked to an FR regardless of status (in-flight + completed). Comma-separated; one bullet per FR section, placed immediately after `**Description:**`. Idempotent.
- Existing ADR bodies are kept as-is during migration (decision-shaped content). Only frontmatter is rewritten. A `## Definition of Done` section is synthesized per file (one bullet matching the prior status: implemented → `[x]`, accepted → `[ ]`) so the auto-derive rule has something to compute on.
- `flowai-plan-adr` is deleted in full (SKILL.md, 12 benches, all 73 references). No grandfather period.
- Migration commits must keep `deno task check` green at every commit boundary; CLI bundle (`cli/src/bundled.json`) regenerates per framework-touching commit.

## Definition of Done

- [x] FR-DOC-TASKS: tasks live at `documents/tasks/<YYYY>/<MM>/<slug>.md`; frontmatter carries `date`, `status`, `implements`, `tags`, `related_tasks`; `documents/.gitignore` no longer ignores `tasks/`.
  - Test: `scripts/check-task-format_test.ts` (new) — validates layout, frontmatter shape, status enum.
  - Evidence: `git ls-files documents/tasks/ | wc -l` returns ≥4 (3 migrated ADRs + this plan); `grep -c '^tasks/$' documents/.gitignore` returns 0.
- [x] FR-DOC-TASKS: `flowai-plan-exp-permanent-tasks` writes the new layout with the new frontmatter shape.
  - Benchmark: `flowai-plan-exp-permanent-tasks/benchmarks/writes-task-new-frontmatter`
  - Evidence: `deno task bench -f flowai-plan-exp-permanent-tasks-writes-task-new-frontmatter` passes.
- [x] FR-DOC-TASKS: `flowai-epic` writes `documents/tasks/<YYYY>/<MM>/epic-<name>.md` with new frontmatter.
  - Benchmark: `flowai-epic/benchmarks/writes-epic-new-path`
  - Evidence: `deno task bench -f flowai-epic-writes-epic-new-path` passes.
- [x] FR-DOC-TASK-LIFECYCLE: `flowai-commit` and `flowai-review-and-commit` derive `status` from DoD checkbox count on every commit touching `documents/tasks/**/*.md`. States: `to do | in progress | done`. Idempotent. Warn-only on tasks without DoD.
  - Benchmark: `flowai-commit/benchmarks/flips-task-status` (rename of `flips-adr-status`)
  - Benchmark: `flowai-review-and-commit/benchmarks/flips-task-status` (rename)
  - Benchmark: `flowai-commit/benchmarks/derives-in-progress-status` (new — partial DoD case)
  - Evidence: `deno task bench -f flips-task-status 2>&1 | tail -10` shows 2 passes; `deno task bench -f derives-in-progress-status` passes.
- [x] FR-DOC-TASK-CONTEXT: `flowai-plan-exp-permanent-tasks` Step 2 globs `documents/tasks/**/*.md`, parses frontmatter `implements:`, lists tasks whose set intersects the planned task's `implements:` (cap 10). Reads bodies of kept tasks before drafting GODS.
  - Benchmark: `flowai-plan-exp-permanent-tasks/benchmarks/loads-related-tasks`
  - Evidence: `deno task bench -f flowai-plan-exp-permanent-tasks-loads-related-tasks` passes.
- [x] FR-DOC-TASK-LINK: SRS-inline back-pointer — `flowai-plan-exp-permanent-tasks` (and `flowai-epic`) inserts/extends `- **Tasks:** [slug](tasks/<path>.md)[, ...]` directly after `**Description:**` in each FR section listed in the new task's `implements:`. Surgical: only this line is touched; no other SRS edits. Idempotent on re-invocation with the same task.
  - Benchmark: `flowai-plan-exp-permanent-tasks/benchmarks/updates-srs-task-back-pointer`
  - Benchmark: `flowai-plan-exp-permanent-tasks/benchmarks/srs-task-edit-scope-limited`
  - Benchmark: `flowai-plan-exp-permanent-tasks/benchmarks/srs-task-back-pointer-idempotent`
  - Evidence: `deno task bench -f srs-task-back-pointer 2>&1 | tail -10` shows 3 passes.
- [x] FR-DOC-RESCUE: `flowai-reflect` Step 2b recommends `/flowai-plan-exp-permanent-tasks` (not `/flowai-plan-adr`) on detected decision passages; references `documents/tasks/<YYYY>/<MM>/`.
  - Benchmark: `flowai-reflect/benchmarks/rescues-decision-as-task` (rename of `rescues-decision-as-adr`)
  - Evidence: `deno task bench -f rescues-decision-as-task` passes.
- [x] FR-DOC-INDEX: `documents/index.md` `## ADR` section removed; no replacement section added.
  - Evidence: `git grep -E '^## ADR' documents/index.md` returns empty; `git grep -E '^## (PDR|Tasks)' documents/index.md` returns empty.
- [x] Migration: 3 ADRs moved to `documents/tasks/<YYYY>/<MM>/<slug>.md` via `git mv` with frontmatter rewrite and synthesized DoD.
  - Evidence: `git ls-files documents/tasks/2026/05/ documents/tasks/2026/05/ | wc -l` returns 3; `git log --follow documents/tasks/2026/05/plan-adr-as-parallel-planner.md | head -3` shows pre-migration commits; `git ls-files documents/adr/` returns empty.
- [x] `flowai-plan-adr` deleted in full.
  - Evidence: `ls framework/core/skills/flowai-plan-adr/ 2>&1` reports "No such file"; `git grep flowai-plan-adr` returns empty.
- [x] SRS rewrites: drop `FR-DOC-ADR`, `FR-DOC-ADR-LIFECYCLE`; add `FR-DOC-TASKS`, `FR-DOC-TASK-LIFECYCLE`, `FR-DOC-TASK-CONTEXT`, `FR-DOC-TASK-LINK`; update `FR-DOC-RESCUE`, `FR-DOC-INDEX`.
  - Test: `scripts/check-fr-coverage_test.ts` passes.
  - Evidence: `git grep -nE 'FR-DOC-ADR' documents/requirements.md` returns empty; `git grep -nE 'FR-DOC-TASKS|FR-DOC-TASK-' documents/requirements.md | wc -l` ≥4.
- [x] SDS rewrites: §3.13 (or whichever section holds the doc-system block) replaces ADR text with Tasks lifecycle.
  - Evidence: `git grep -nE '\bADR\b' documents/design.md` returns empty.
- [x] AGENTS.template.md rewrite: Documentation Hierarchy item 4 updated; `### ADR` and `### MADR Format` blocks removed; new `### Tasks (documents/tasks/)` block describes layout, frontmatter, lifecycle.
  - Test: `scripts/check-agents-template_test.ts` passes.
  - Evidence: `git grep -nE '\bADR\b|MADR' framework/core/assets/AGENTS.template.md` returns empty.
- [x] README.md skill catalog: drop `flowai-plan-adr` row; no leftover ADR mentions.
  - Evidence: `git grep -i '\bADR\b' README.md` returns empty.
- [x] CLI bundle regenerated; no leftover `flowai-plan-adr` paths.
  - Evidence: `git grep flowai-plan-adr cli/src/bundled.json` returns empty.
- [x] Zero residual ADR references in product code.
  - Evidence: `git grep -E '\bADR-[0-9]+\b|flowai-plan-adr|documents/adr/|FR-DOC-ADR' framework/ documents/requirements.md documents/design.md documents/index.md README.md cli/src/ scripts/ | grep -v 'documents/tasks/2026/05/replace-adr-with-tasks.md'` returns empty.
- [x] All baseline checks pass.
  - Evidence: `deno task check 2>&1 | tail -5` summary shows "0 failed".

## Solution

Single feature branch, grouped commits by area. Each commit ends `deno task check` green and (for framework-touching commits) `deno task bundle` re-run.

### Phase 0 — Bench infrastructure smoke test

- Run `deno task bench -f flowai-plan-basic` (existing scenario). Confirms infra: scenarios actually execute, agent does ≥1 step, no "Unknown skill" errors. If it fails on infrastructure (not on the scenario verdict), fix `scripts/acceptance-tests/lib/` first; do not write new scenarios on broken infra.

### Phase 1 — Foundation: gitignore + format validator

- Edit `documents/.gitignore`: remove the `tasks/` line. Verify `git status` now sees `documents/tasks/2026/05/replace-adr-with-tasks.md` (this plan).
- Add `scripts/check-task-format.ts` + `_test.ts`. Validates every committed file under `documents/tasks/`:
  - **Coexistence rule**: tasks with new-shape path `documents/tasks/<YYYY>/<MM>/<slug>.md` get full validation (frontmatter shape + status derivation). Legacy flat-path tasks `documents/tasks/<slug>.md` (including dated `<YYYY-MM-DD>-<slug>.md` form) emit a deprecation warning but pass (so existing `flowai-plan` outputs keep working until promotion). Exception: `documents/tasks/README.md` if present is ignored.
  - Frontmatter shape (new-path tasks): required `date`, `status` ∈ `to do | in progress | done`, `implements: [...]`. Optional: `tags`, `related_tasks`.
  - Status consistency: declared `status` must match derivation from `## Definition of Done` checkbox count (`0/N → to do`, `1..N-1 → in progress`, `N/N → done`). Warn-only on absent DoD.
- Wire `scripts/check-task-format.ts` into `scripts/task-check.ts` so `deno task check` runs it.

### Phase 2 — Migrate 3 ADRs

For each ADR: `git mv documents/adr/<file>.md documents/tasks/<YYYY>/<MM>/<slug>.md` (slug = filename without date prefix), then rewrite frontmatter:

```yaml
---
date: <YYYY-MM-DD>          # extracted from old filename
status: to do | done        # derived from old status: accepted→to do, implemented→done
implements: [...]           # carried over if present
tags: [decision, migrated]
related_tasks: []
migrated-from: ADR-NNNN     # provenance
---
```

Append `## Definition of Done` to body if missing:
- For `status: implemented`: `- [x] FR-XXX: <one-line summary>`
- For `status: accepted`: `- [ ] FR-XXX: <one-line summary>`

After Phase 2: `documents/adr/` is empty; `git rm -r documents/adr/` (the directory itself).

### Phase 3 — Create `flowai-plan-exp-permanent-tasks` (new commands primitive)

Create `framework/core/commands/flowai-plan-exp-permanent-tasks/SKILL.md` from scratch (fork of `flowai-plan`'s contract, not a `git mv`). `flowai-plan` itself stays untouched in this iteration.

- Frontmatter: `name: flowai-plan-exp-permanent-tasks`, `description:` covering planning queries (matches the established `flowai-plan` description verbatim plus a leading "(experimental committed-tasks variant)" note), `argument-hint: task title or feature description`. Do NOT declare `disable-model-invocation` — CLI writer injects it.
- Body: lift the GODS planning workflow from `flowai-plan/SKILL.md` (variant analysis, DoD-with-evidence, auto-write). Edit deltas vs source:
  - Task path template: `documents/tasks/<YYYY>/<MM>/<slug>.md`. Date computed at write time.
  - Frontmatter template: `date`, `status: to do`, `implements`, `tags`, `related_tasks`.
  - **New Step 2 sub-bullet** (Deep Context): glob `documents/tasks/**/*.md`, parse each frontmatter, keep tasks whose `implements:` ∩ planned `implements:` is non-empty. Cap 10 by recency (newest first by `date`); if more match, list IDs without bodies and ask user which to expand. Read full bodies of kept tasks before drafting GODS. List loaded tasks in chat.
  - **New final step** (after auto-write): for each FR-ID in `implements:`, locate `### FR-XXX:` heading in `documents/requirements.md`. If section exists:
    - If a `**Tasks:**` bullet exists: append `, [<slug>](tasks/<path>.md)` to the comma list (skip if the link already present — idempotency).
    - Else: insert `- **Tasks:** [<slug>](tasks/<path>.md)` bullet immediately after `**Description:**` bullet of that section.
    - Edit ONLY this line; never touch other SRS lines.
  - If FR section does not exist (new FR introduced by the same task), skip SRS edit; mention in chat: "FR-XXX SRS section pending — task back-pointer deferred."
- Trigger benchmarks: write 3 pos / 3 adj-neg / 3 false-use under `framework/core/commands/flowai-plan-exp-permanent-tasks/benchmarks/trigger-{pos,adj,false}-{1,2,3}/`. Since `disable-model-invocation: true` is injected, "trigger" tests verify the agent reaches the skill ONLY via explicit `/flowai-plan-exp-permanent-tasks` invocation; auto-trigger queries must NOT route here. Adapt FR-ACCEPT.TRIGGER contract accordingly (or use the lighter `expected: never` variant for adj-neg/false-use).

### Phase 4 — `flowai-epic` alignment

Edit `framework/core/skills/flowai-epic/SKILL.md`:

- Path: `documents/tasks/<YYYY>/<MM>/epic-<name>.md` (epic-prefix on slug).
- Same frontmatter shape as plan tasks.
- Same SRS back-pointer step.

### Phase 5 — Lifecycle automation in commit skills

Edit `framework/core/commands/flowai-commit/SKILL.md`:

- Replace "ADR Status Lifecycle" section with "Task Status Lifecycle":
  > For each staged file matching `documents/tasks/**/*.md`:
  > 1. Parse frontmatter. Skip the file if `date:` field is absent (legacy flat-path task from old `flowai-plan` — out of scope until promotion).
  > 2. Locate `## Definition of Done` section.
  > 3. Count `[x]` and total `- [ ]`/`- [x]` items at the top level (ignore nested sub-bullets — those are evidence/test references, not gates).
  > 4. Derive: `0 of N → to do`; `1..N-1 → in progress`; `N of N → done`. No DoD section → warn, leave status alone.
  > 5. If derived ≠ frontmatter `status`, rewrite frontmatter and `git add` the file.
  > 6. Idempotent: re-running on already-correct file is a no-op.
  > 7. Never downgrade `done` if DoD got partially un-checked (warn instead — flagging probable accidental edit).
- Same logic block in `framework/core/commands/flowai-review-and-commit/SKILL.md`.

### Phase 6 — Reflect skill update

Edit `framework/core/skills/flowai-reflect/SKILL.md`:
- Replace `/flowai-plan-adr` → `/flowai-plan-exp-permanent-tasks` (4 occurrences).
- Replace `documents/adr/` → `documents/tasks/`.
- Step 2b prose: rescue covers decision passages AND goal/scope passages; recommended action line names `/flowai-plan-exp-permanent-tasks` (the new committed-tasks writer).
- Rule 7 wording: drop ADR.

### Phase 7 — Delete `flowai-plan-adr`

- `git rm -r framework/core/skills/flowai-plan-adr/`.
- Verify nothing imports/refers: `git grep flowai-plan-adr` returns empty after this commit (other phases will catch the cascade).

### Phase 8 — SRS rewrites (`documents/requirements.md`)

- Drop `### FR-DOC-ADR: …` and `### FR-DOC-ADR-LIFECYCLE: …` sections in full.
- Add `### FR-DOC-TASKS: First-class committed tasks` — describes layout, frontmatter, GODS body, validator.
- Add `### FR-DOC-TASK-LIFECYCLE: Status derived from DoD by commit skills`.
- Add `### FR-DOC-TASK-CONTEXT: Plan loads related tasks into Step 2`.
- Add `### FR-DOC-TASK-LINK: SRS-inline `**Tasks:**` back-pointer`.
- Update `### FR-DOC-RESCUE`: ADR → Task; mention goal-passage detection.
- Update `### FR-DOC-INDEX`: drop `## ADR` clause; namespace list is now `(FR / SDS / NFR)`.
- Anchor cascade: `rg -l 'fr-doc-adr-' .` and update GFM auto-slug links project-wide. `scripts/check-traceability.ts` validates.

### Phase 9 — SDS rewrites (`documents/design.md`)

- Replace ADR-specific section (currently §3.13) with Task Lifecycle System: layout, frontmatter, status derivation algorithm, plan/epic write contract, SRS back-pointer mechanics.
- Drop §3.13.4 "decision-capture skill" block; merge surviving content into the plan-skill SDS section.

### Phase 10 — AGENTS.template.md rewrite

Edit `framework/core/assets/AGENTS.template.md`:

- Documentation Hierarchy item 4: rewrite to describe new layout (`<YYYY>/<MM>/<slug>.md`), committed (no longer "gitignored"), full frontmatter shape, status enum, lifecycle.
- Remove `### ADR (documents/adr/)` block in full.
- Remove `### MADR Format` block in full.
- Add `### Tasks (documents/tasks/)` block:
  - Path convention.
  - Frontmatter snippet.
  - GODS body sections (existing).
  - Status lifecycle (derived).
  - SRS back-pointer convention.
- Update example references that mentioned `ADR-0001` etc.

### Phase 11 — `documents/index.md` update

- Drop `## ADR` section (3 rows).
- No replacement.
- Add `FR-DOC-TASKS`, `FR-DOC-TASK-LIFECYCLE`, `FR-DOC-TASK-CONTEXT`, `FR-DOC-TASK-LINK` rows under `## FR` (alpha-sorted).
- Top-of-file aggregator description: drop ADR mention.

### Phase 12 — Cascade rename across remaining references

- `rg -l 'documents/adr/' framework/ scripts/ cli/src/ README.md` → rewrite to `documents/tasks/`.
- `rg -l 'flowai-plan-adr' framework/ scripts/ cli/src/ README.md` → rewrite to `flowai-plan`.
- `rg -l 'ADR-[0-9]{4}' framework/ scripts/ cli/src/ README.md documents/design.md documents/requirements.md documents/index.md` (skip `documents/tasks/` body texts) → rewrite per migration map.
- `rg -li '\bADR\b' framework/ scripts/ cli/src/ README.md` → rewrite per context (most cases are in templates already touched).

### Phase 13 — Benchmarks (RED → GREEN per phase)

Write/update before the corresponding phase lands; verify RED on parent commit, GREEN on phase commit.

- `flowai-plan-exp-permanent-tasks/benchmarks/writes-task-new-frontmatter` — fixture seeds `documents/requirements.md` with FR-X; query plans a small task; checklist: file at `documents/tasks/<YYYY>/<MM>/<slug>.md`; frontmatter has `date`, `status: to do`, `implements`, `tags`, `related_tasks`.
- `flowai-plan-exp-permanent-tasks/benchmarks/loads-related-tasks` — fixture seeds two pre-existing tasks (FR-X + FR-Y `implements:`); query plans new task with `implements: [FR-X]`; checklist: chat names FR-X task as loaded, does NOT name FR-Y task.
- `flowai-plan-exp-permanent-tasks/benchmarks/updates-srs-task-back-pointer` — fixture has FR-X section with only `**Description:**` bullet; checklist: post-skill SRS contains `**Tasks:**` bullet right after `**Description:**` linking the new task.
- `flowai-plan-exp-permanent-tasks/benchmarks/srs-task-edit-scope-limited` — fixture has multi-line FR-X section; checklist: ONLY the `**Tasks:**` line was added; all other lines byte-identical.
- `flowai-plan-exp-permanent-tasks/benchmarks/srs-task-back-pointer-idempotent` — fixture has existing `**Tasks:** [slug-a](...)` line; checklist: skill appends `, [slug-b](...)` (no duplicate bullet); second invocation with same task is no-op.
- `flowai-epic/benchmarks/writes-epic-new-path` — fixture; checklist: epic at `documents/tasks/<YYYY>/<MM>/epic-<name>.md` with new frontmatter.
- `flowai-commit/benchmarks/flips-task-status` (rename `flips-adr-status`) — fixture: task with `status: in progress`, all DoD `[x]`; checklist: post-commit `status: done`.
- `flowai-commit/benchmarks/derives-in-progress-status` — fixture: task with `status: to do`, 1 of 3 DoD `[x]`; checklist: post-commit `status: in progress`.
- `flowai-commit/benchmarks/skips-legacy-task` — fixture: task at legacy flat path with no `date:` frontmatter; checklist: commit succeeds, file content unchanged (verifies coexistence rule).
- `flowai-review-and-commit/benchmarks/flips-task-status` (rename) — same logic as commit.
- `flowai-reflect/benchmarks/rescues-decision-as-task` (rename `rescues-decision-as-adr`) — fixture text; checklist: agent recommends `/flowai-plan-exp-permanent-tasks`; mentions `documents/tasks/`.

### Phase 14 — CLI bundle + final verification

- `deno task bundle` (regenerates `cli/src/bundled.json`).
- `deno test -A cli/src/` (from repo root) — CLI tests pass.
- `deno task check 2>&1 | tail -10` — summary "0 failed".
- `deno task bench -f flowai-plan- 2>&1 | tail -20` — existing 22 plan benches still pass (untouched skill).
- `deno task bench -f flowai-plan-exp-permanent-tasks 2>&1 | tail -20` — new 5 exp-skill benches + 9 trigger benches pass.
- `deno task bench -f flips-task-status` — 2 passes.
- `deno task bench -f rescues-decision-as-task` — passes.
- Anti-residue grep:
  ```sh
  git grep -E '\bADR-[0-9]+\b|flowai-plan-adr|documents/adr/|FR-DOC-ADR' \
    framework/ documents/ README.md cli/src/ scripts/ \
    | grep -v 'documents/tasks/2026/05/replace-adr-with-tasks.md'
  ```
  Expected: empty.

### Commit grouping

1. `chore(tasks): ungitignore + add task-format validator (coexistence-aware)` — Phase 1.
2. `feat(plan-exp): new flowai-plan-exp-permanent-tasks command — writes new layout + frontmatter` — Phase 3 + bench `writes-task-new-frontmatter`.
3. `feat(epic): align epic skill with new task layout` — Phase 4 + bench.
4. `feat(plan-exp): step 2 loads related tasks into context` — Phase 3 sub-bullet + bench `loads-related-tasks`.
5. `feat(plan-exp,epic): SRS-inline **Tasks:** back-pointer` — Phase 3/4 final step + 3 SRS-edit benches.
6. `feat(commit,review-and-commit): derive task status from DoD (skip legacy)` — Phase 5 + bench renames + `derives-in-progress-status` + `skips-legacy-task`.
7. `feat(reflect): rescue points to flowai-plan-exp-permanent-tasks` — Phase 6 + bench rename.
8. `chore(adr): migrate 3 ADRs to documents/tasks/` — Phase 2 (one commit, otherwise GFM links break mid-stream).
9. `chore(skills): delete flowai-plan-adr` — Phase 7.
10. `docs(srs,sds,template,readme,index): replace ADR with Tasks semantics` — Phases 8–11.
11. `chore(refs): cascade ADR→Task rename across code+docs` — Phase 12.
12. `chore(cli): regenerate bundled.json` — Phase 14 (or fold into each framework commit).

Bundle consistency: every commit touching `framework/` ends with `deno task bundle && git add cli/src/bundled.json` before commit, otherwise `cli/src/source_test.ts` fails on intermediate commits.

## Follow-ups

(Empty until Critique & Triage step generates entries.)
