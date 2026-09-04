---
date: 2026-09-04
status: done
implements:
  - FR-TASK-OVERVIEW
tags: [skills, tasks, core, scaffold]
related_tasks: []
---
# Task overview skill with a project-tailored status script [ANC:task:2026-09-tasks-overview-skill]

## Goal

Let a user (or the agent) see the current state of the project's open tasks in one command — which tasks are in progress, which are still to do, how far each is — without reading every task file, and without assuming every project uses flowai's own task layout.

## Overview

### Context

flowai proposes a task convention (`documents/tasks/<YYYY>/<MM>/<slug>.md`, GODS body, `status: to do | in progress | done | superseded` frontmatter) but only proposes it: a project that adopted flowai on an existing codebase may keep tasks in another directory, with another status field and another set of "closed" values. A viewer that hardcodes the flowai layout would print nothing on those projects.

The user's request (2026-09-04): "реализуй скрипт и скил для просмотра текущего состояния задач, кроме архивированных. Но нужно учесть, что у разных проектов может быть разная схема задач, т.к. свою мы только предлагаем. Наверное нужно писать скрипт во время прохода скила, который формирует правила расположения и формата задач."

So the deliverable is two-layered: a skill that reads the project's own task rules (from AGENTS.md — the `tasks` role and its format section), derives the schema, writes a project-local script tailored to that schema, and runs it; and the script itself, which becomes part of the project and is reused on later invocations.

### Current State

- No skill or command enumerates task state. `framework/core/skills/` holds 11 skills: `plan`, `epic`, `implement`, `review`, `reflect`, `reflect-by-history`, `investigate`, `maintenance`, `configure-deno-commands`, `setup-ai-ide-devcontainer`, `write-gods-tasks`.
- The only code that parses flowai-shaped task files is the dev-side validator `scripts/check-task-format.ts` (`classifyTaskPath`, DoD derivation). It is not distributed to projects.
- "Archived" is not a status value in this repo. The task-state set is `to do | in progress | done | superseded`; there is no archive directory either (scout grep for `archiv` under `framework/` found only an unrelated memex fixture). For flowai's own schema, "archived" therefore means `done` and `superseded`; other projects may have a literal `archived` value or an `archive/` directory, and the skill must read that from the project's rules rather than assume it.
- Precedents for a skill that writes a project script: `configure-deno-commands` (scaffolds `scripts/check.ts`, registered under `scaffolds:` in `framework/core/pack.yaml`) and `init` (`scripts/generate_agents.ts`, bundled with the command). Precedent for a bundled script the user's agent runs: `draw-mermaid-diagrams/scripts/validate.py` with a `validate_test.ts` beside it.
- `framework/AGENTS.md` Key Decisions: scripts under `<pack>/skills/*/scripts/` must be standalone-runnable, and Python (standard library only) is preferred for a script a skill step tells the user's agent to run, because the target project may not have Deno.
- Every skill needs 1+ execution scenario and exactly 3 trigger scenarios (`trigger-pos-1`, `trigger-adj-1`, `trigger-false-1`), enforced by `scripts/check-trigger-coverage.ts`.

### Constraints

- Agent-invocable skill under `framework/core/skills/tasks-overview/` (the user says "скил"; "what tasks are open?" is a description-matched question). No `disable-model-invocation` in source.
- The bundled script uses the Python standard library only, no third-party packages, no network.
- The generated project script must not depend on the flowai bundle at run time: once written, it runs on its own (`python3 scripts/tasks-overview.py`).
- Schema derivation reads the project's AGENTS.md (the `tasks` role in the Documentation Hierarchy plus the task-format section). Nothing is hardcoded to `documents/tasks/`; flowai's layout is only the default the skill falls back to when AGENTS.md declares the flowai convention verbatim.
- The skill must not edit task files. Read-only over `tasks`; the only write is the generated script.
- Acceptance Test TDD: scenarios before the SKILL.md (RED → GREEN), one scenario per capability.
- New FR `FR-TASK-OVERVIEW` with an `**Acceptance:**` reference in the SRS; SDS section; README §Packs core list; `documents/index.md` row; SDS §3.0 primitive inventory count.

### Affected Surface

Scout report (`surface-scout`, dispatched with the verbatim request, collected in the foreground):

```
I now have enough coverage to report.

## Surface

- `framework/core/skills/<new-skill-name>/SKILL.md` (new) — the requested skill itself: an agent-invocable capability to view current task status excluding archived items — evidence: no existing skill covers this; `framework/core/skills/` currently holds `plan`, `epic`, `implement`, `review`, `reflect`, `reflect-by-history`, `investigate`, `maintenance`, `configure-deno-commands`, `write-gods-tasks`, none of which enumerate task state.
- `framework/core/skills/<new-skill-name>/scripts/` (new, likely a generated script written into the target project, mirroring `framework/core/commands/init/scripts/generate_agents.ts` and `configure-deno-commands`'s scaffold-into-project pattern) — the "write a script during the skill pass" mechanism the request calls for — evidence: `framework/core/pack.yaml` scaffolds section (`configure-deno-commands: - deno.json - scripts/check.ts`) is the existing precedent for a skill writing a project-local script.
- `framework/core/skills/<new-skill-name>/acceptance-tests/<scenario>/mod.ts` (new, mandatory) — Acceptance Test TDD is required for every skill change per `AGENTS.md` "Acceptance Test TDD" section — evidence: sibling skills all carry `acceptance-tests/` (`framework/core/skills/write-gods-tasks/acceptance-tests/basic/mod.ts`, `framework/core/skills/plan/acceptance-tests/*`).
- `framework/core/skills/adapt/...` (`framework/core/commands/adapt/SKILL.md`) — closest analog and possible sibling to model the "detect project convention, then adapt" logic on — evidence: `adapt` already inspects "Projects using other stacks ... need adaptation" and delegates to `skill-adapter`/`agent-adapter` subagents; a task-schema-detection pass is the same shape of problem (detect project reality vs. flowai's own default), lines 8-20 of `framework/core/commands/adapt/SKILL.md`.
- `framework/core/skills/write-gods-tasks/SKILL.md` — defines flowai's own task convention (`documents/tasks/<YYYY>/<MM>/<slug>.md`, GODS format, `status:` enum) that the new skill must treat as ONE possible schema, not the only one — evidence: SKILL.md lines ~90-104 (frontmatter/status rules), and `AGENTS.md` §"Tasks (`documents/tasks/`)".
- `scripts/check-task-format.ts` — the only existing code that parses/classifies flowai's own task files (`classifyTaskPath`, `DoDDerivation`, status enum `to do|in progress|done|superseded`) — evidence: `/Users/korchasa/www/flowai/flowai/scripts/check-task-format.ts` lines 1-40; a status-viewer for flowai's own dogfood tasks would likely reuse or duplicate this parsing logic, and there is no "archived" status value defined here at all — the request's "excluding archived" has no corresponding enum value in this codebase today.
- `AGENTS.md` §"Tasks (`documents/tasks/`)" / `documents/AGENTS.md` (task-format authoring rules for SRS/SDS-adjacent docs) — no "archived" state or archive directory is documented; if the new skill introduces an "archived" concept, this section is the place that must define it — evidence: `grep` for "archiv" across `framework/**/*.md` returned only one unrelated hit (`framework/memex/skills/save/.../fixture/source.md`), confirming "archived" is not an existing concept in this repo's own task lifecycle.
- `framework/core/assets/AGENTS.template.md` — the per-project template that documents the task convention a newly-`init`'d project inherits; if the new skill needs to record "this project's task layout differs from flowai's default", this template (or a project-local override of it) is the natural home for that record — evidence: file exists at that path and is the asset copied by `init`/`adapt` per `pack.yaml` (`assets: AGENTS.template.md: AGENTS.md`).
- `framework/core/commands/init/scripts/generate_agents.ts` and its test — precedent for a script that inspects a project (stack detection: `node-project-commands` acceptance test) and writes tailored output — evidence: `framework/core/commands/init/acceptance-tests/node-project-commands/`, `brownfield*` scenarios detect existing project conventions rather than assuming flowai's own.
- `framework/core/pack.yaml` `scaffolds:` section — if the new skill scaffolds a script into the consuming project (per the request's "write a script during the pass"), a new scaffold entry may be needed here, following the `configure-deno-commands` precedent — evidence: `/Users/korchasa/www/flowai/flowai/framework/core/pack.yaml` lines 1-19.
- `documents/requirements.md` (SRS) — needs a new `FR-*` clause (with `**Acceptance:**` reference) for this capability per the Documentation Hierarchy / "Acceptance-as-gate" rule — evidence: `AGENTS.md` §"Documentation Rules", and the existing `FR-ADAPT.*` clauses (`documents/requirements.md:1492-1520`) as the nearest sibling shape for a "detect project specifics, adapt behavior" requirement.
- `documents/design.md` (SDS) — needs a new `### 3.x` architecture section describing how project-specific task-schema detection works, mirroring `### 3.12 Standalone Primitive Adaptation — adapt` (`documents/design.md:544`).
- `README.md` §Packs (core section, lines ~247-269) — the skill/command catalog list must gain the new entry; the Documentation Map in `CLAUDE.md` mandates this sync whenever a `SKILL.md` under `framework/<pack>/skills|commands/` changes.
- `README.md` §Project Structure / §Development Setup — may need a mention if the generated script lands in a new top-level convention (e.g. `scripts/` in the consuming project).
- `deno.json` `tasks` section (this repo's own, `/Users/korchasa/www/flowai/flowai/deno.json` lines 21-32) and the pattern in `scripts/task-*.ts` — NOT the same "task" as GODS tasks; naming collision risk. If the new script is added to THIS repo's own `scripts/` (as a dev tool, e.g. `scripts/task-status.ts` viewing `documents/tasks/`), it must not be confused with the `deno task` runner family (`task-check.ts`, `task-test.ts`, `task-dev.ts`, `task-acceptance-tests.ts`) — evidence: `deno.json:21-32` and `scripts/task-check.ts:1-15`.
- `scripts/AGENTS.md` (if present, referenced by `check-task-format.ts` fixture path `scripts/AGENTS.md`) — dev-tooling conventions doc for `scripts/`, would need updating if a new dev script is added there.
- `documents/tasks/README.md` — explicitly carved out as "ignored" by `classifyTaskPath` (`scripts/check-task-format.ts`); the new status-viewing logic should treat it the same way and this is a place worth checking for existing free-text conventions about task listing.
- `CHANGELOG.md` — per repo convention (`chore(release)` commits), a new user-visible skill eventually surfaces here, though CLAUDE.md says "No changelogs" for other docs — worth checking how `CHANGELOG.md` is actually maintained (via `standard-version`, automatic) rather than hand-edited.
- `framework/core/skills/maintenance/SKILL.md` — "project health audit (16-category scan + interactive resolution)"; a maintenance scan worker could plausibly already touch task-status reporting, and any new skill's output should not duplicate a category this skill already scans — evidence: `framework/core/skills/maintenance` and its `maintenance-scan-*` agents listed in README §Packs.
- `framework/core/skills/plan/SKILL.md` and `framework/core/skills/epic/SKILL.md` — both are producers/consumers of `documents/tasks/`; `plan` "writes persistent task files" and loads related tasks (`acceptance-tests/loads-related-tasks`), so a status-viewing skill is a natural consumer sibling and should not duplicate `plan`'s own task-loading logic.
- `framework/memex/hooks/status/` (`hook.yaml`, `run.ts`) — an existing, differently-scoped "status" primitive (SessionStart hook reporting memex page/source counts) — naming collision risk if the new primitive is also called "status"; evidence: `framework/memex/hooks/status/hook.yaml` description is "Detect when cwd is inside a memex ... inject status ... as additionalContext", a different domain (memex knowledge bank, not GODS tasks).
- `scripts/check-pack-refs.ts` (bundle-leakage validator) — if the new skill ships a generator-input asset (like `framework/atoms/*.md` / `framework/composites/*.md`) rather than a flat SKILL.md, it must be excluded from `framework.tar.gz` per this script's `TAR_EXCLUDES`; evidence: `/Users/korchasa/www/flowai/flowai/scripts/check-pack-refs.ts` lines 2-29.
- `deno.json` `lint.exclude` / `fmt.exclude` and `scripts/task-check.ts` `--ignore` — the three-location drift list documented in `CLAUDE.md` §"Lint Exclude / Test Ignore Drift" must gain the new skill's `acceptance-tests/*/fixture/` path if the new acceptance tests carry fixtures with intentionally malformed content.
- Other packs' task usage (`beta`, `engineering`, `devtools`, `memex`, `typescript`) — none currently reference `documents/tasks/` directly outside `core` and its acceptance-test fixtures (per the earlier directory-grep), so cross-pack duplication risk is low, but this was checked only by directory-name grep, not by opening each pack's SKILL.md bodies.

## Queries used
- `ls` on repo root and `framework/`; `find framework -type d -iname '*task*' -o -type d -iname '*status*' -o -type d -iname '*plan*'`
- `grep -rln "archiv" framework --include='*.md' -i`
- `grep -n "status:" framework/core/skills/write-gods-tasks/SKILL.md`
- `grep -n -i "task.*status\|status.*task\|dashboard\|list.*task" documents/requirements.md documents/design.md`
- `ls framework/core/skills framework/core/commands`; `cat framework/core/pack.yaml`
- `find . -maxdepth 2 -iname 'AGENTS.template.md'`; `find framework -iname 'AGENTS.template.md'`
- `sed -n` on `framework/memex/hooks/status/run.ts` and `hook.yaml`
- `grep -n "task" framework/core/assets/AGENTS.template.md`
- `grep -n '"task' deno.json`; `grep -n "## CLI Commands" -A 30 README.md`
- `find`/`sed` on `framework/core/commands/adapt/SKILL.md`
- `find framework/core/skills/plan`, `framework/core/commands/init`, `framework/core/skills/configure-deno-commands`
- `grep -n "^## " README.md`; `grep -n "composites:" framework/composites.yaml`; `grep -n "leakage\|EXCLUDE" scripts/check-pack-refs.ts`
- `grep -n "^#### FR-" documents/requirements.md | grep -i "task\|status\|dashboard\|adapt\|init"`
- `grep -n "^### \|^## " documents/design.md | grep -i "task\|status\|adapt\|pack"`
- `find framework/core/skills/epic`; `grep -n "documents/tasks\|archiv" framework/core/skills/epic/SKILL.md`
- `sed -n '240,280p' README.md`
- `sed -n '1,15p' scripts/task-check.ts`; `grep -n '"tasks"' -A 30 deno.json`

## Not examined (budget)
- Full bodies of `framework/beta/*`, `framework/engineering/*`, `framework/devtools/*`, `framework/typescript/*` pack SKILL.md files — checked only by directory-name grep for "task"/"status"/"plan", not opened individually to rule out a parallel or copy-adapted task-schema-detection routine.
- `framework/core/skills/maintenance/SKILL.md` full body and its `maintenance-scan-*` agent prompts — not opened to confirm whether task-status reporting already exists as one of the 16 audit categories.
- `documents/design.md` and `documents/requirements.md` full text — only grepped by keyword, not read section by section, so a loosely-worded existing requirement touching this behavior could have been missed.
- `framework/core/commands/ship-task/SKILL.md` full body — found but not opened; it consumes ready task files and could reference task-status semantics relevant to the "archived" concept.
- Whether `.flowai.yaml` (pack selection config, referenced in README §Packs) carries any per-project override mechanism for task-location conventions — not opened.
- `scripts/check-fr-coverage.ts` and other `scripts/check-*.ts` validators — not opened to confirm none already touches "archived" task state or task listing.

## Could not rule out
- That "archived" is meant as a new `status:` enum value (extending `to do | in progress | done | superseded`) versus a separate directory/location concept (e.g. `documents/tasks/archive/`) — the request text supports either reading, and no existing code disambiguates it; this is a genuine open design question, not something more searching would resolve.
- Whether the new primitive belongs under `commands/` (user-invoked, e.g. `/task-status`) or `skills/` (agent-invocable) per the framework's Commands-vs-Skills classifier in `CLAUDE.md` — the request's phrasing ("скил") suggests `skills/`, but the "просмотр текущего состояния" (a report-producing, user-facing action) also fits the `commands/` pattern like `push`/`ship`.
```

Union of the scout's list and the planner's own enumeration, with dispositions:

- `framework/core/skills/tasks-overview/SKILL.md` (new) — covered-by DoD "skill derives schema and writes the project script"
- `framework/core/skills/tasks-overview/scripts/tasks_overview.py` (new bundled template) + `tasks_overview_test.ts` — covered-by DoD "bundled script lists open tasks and excludes archived ones"
- `framework/core/skills/tasks-overview/acceptance-tests/{basic,reuses-existing-script,trigger-pos-1,trigger-adj-1,trigger-false-1}` (new) — covered-by DoD "trigger coverage" and the two execution DoD items
- `framework/core/commands/adapt/SKILL.md` — not affected — `adapt` reconciles installed primitives against upstream after `update`; it does not read task files (grep `tasks` in `framework/core/commands/adapt/SKILL.md` gives no task-role hit). The new skill does its own schema detection inline.
- `framework/core/skills/write-gods-tasks/SKILL.md` — not affected — remains the single source of the flowai format; the new skill reads the project's AGENTS.md, not this skill, to learn the schema (a project that did not adopt GODS has nothing here to read).
- `scripts/check-task-format.ts` — not affected — dev-side validator for this repo; the distributed script is standalone Python and cannot import it. Parsing rules (status enum, DoD counting) are re-stated in the template's default schema.
- `AGENTS.md` (this repo) §Tasks and `framework/core/assets/AGENTS.template.md` §Tasks — not affected — no new status value is introduced; "archived" is defined per project by the generated script's schema block, and for the flowai convention it means `done` + `superseded`. Recording a project-level schema override in AGENTS.md is deferred — human choice (see Follow-ups).
- `framework/core/commands/init/scripts/generate_agents.ts` — not affected — precedent only; no shared code.
- `framework/core/pack.yaml` `scaffolds:` — deferred — human choice. Registering `scripts/tasks-overview.py` as a scaffold makes `update` treat it as a template-derived artifact and try to reconcile it against the bundle, which would overwrite the project-tailored schema block. Left unregistered in this task.
- `documents/requirements.md` — covered-by DoD "SRS section FR-TASK-OVERVIEW"
- `documents/design.md` §3.0 inventory (core skill count 11 → 12) and new §3.24 — covered-by DoD "SDS section"
- `README.md` §Packs core — covered-by DoD "README lists the skill"; §Project Structure — not affected — the generated script lands in the consuming project, not in this repo's tree.
- `documents/index.md` — covered-by Solution "Order of work" step 0 (the row was written during planning; its anchor lands with the SRS section in step 0)
- `deno.json` tasks / `scripts/task-*.ts` — not affected — the new script is bundled under the skill, not added to this repo's `scripts/`; no `deno task` entry is added.
- `scripts/AGENTS.md`, `documents/tasks/README.md`, `.flowai.yaml` — not affected — none of the three files exists (`ls` on 2026-09-04: "No such file or directory" for each).
- `CHANGELOG.md` — not affected — generated by `standard-version` from `feat:` commits at release time; not hand-edited.
- `framework/core/skills/maintenance/SKILL.md` — not affected — grep for `documents/tasks`, `task status`, `task file` in that SKILL.md returns nothing; no audit category reports task state.
- `framework/core/skills/plan/`, `framework/core/skills/epic/` — not affected — producers of task files; the viewer only reads. `epic`'s per-phase `Status:` markers inside the body are not frontmatter status and are out of scope (Follow-ups).
- `framework/memex/hooks/status/` — not affected — the new skill is named `tasks-overview`, not `status`; no name collision.
- `scripts/check-pack-refs.ts` — not affected — the skill is a flat SKILL.md plus a `scripts/` dir, both bundled; no generator input is added.
- `deno.json` `lint.exclude` / `fmt.exclude` / `task-check.ts --ignore` — not affected — `scripts/task-check.ts:113` already ignores `framework/*/skills/*/acceptance-tests`, and `deno.json` `lint.exclude` / `fmt.exclude` carry the same pattern (inspected 2026-09-04).
- Other packs (`beta`, `engineering`, `devtools`, `memex`, `typescript`) — not affected — `grep -rl "documents/tasks" framework/*/skills/*/SKILL.md framework/*/commands/*/SKILL.md` outside `core` returns nothing (run 2026-09-04 by `plan-critic`).

## Definition of Done

- [x] FR-TASK-OVERVIEW: the bundled script `tasks_overview.py` scans the task directory declared in its schema block and prints every task that is not archived (default schema: status not in `done`, `superseded`, and not under an archive directory), grouped by status, with path, title, DoD progress, date and `implements`.
  - Test: `framework/core/skills/tasks-overview/scripts/tasks_overview_test.ts::lists open tasks grouped by status with progress`
  - Evidence: `deno test -A framework/core/skills/tasks-overview/scripts/tasks_overview_test.ts --filter "lists open tasks"`
- [x] FR-TASK-OVERVIEW: archived tasks are hidden by default and shown only under `--all`; the footer names how many were hidden.
  - Test: `framework/core/skills/tasks-overview/scripts/tasks_overview_test.ts::hides archived tasks unless --all`
  - Evidence: `deno test -A framework/core/skills/tasks-overview/scripts/tasks_overview_test.ts --filter "hides archived"`
- [x] FR-TASK-OVERVIEW: a replaced schema block is honoured (root, status key, archived values, archive dirs), and a missing root or a malformed schema block exits 2 with the path in the message.
  - Test: `framework/core/skills/tasks-overview/scripts/tasks_overview_test.ts::honours a replaced schema block`, `::exits 2 on a missing root`
  - Evidence: `deno test -A framework/core/skills/tasks-overview/scripts/tasks_overview_test.ts --filter "schema block|missing root"`
- [x] FR-TASK-OVERVIEW: the skill reads the project's task rules from AGENTS.md (the `tasks` role and the task-format section), derives the schema (directory, file pattern, status field, archived values), writes `scripts/tasks-overview.py` into the project with that schema filled in, runs it and shows the result — on a project whose layout differs from flowai's default, the generated script reflects the project's layout, not `documents/tasks/`.
  - Test: `Benchmark: tasks-overview-basic`
  - Evidence: `deno task acceptance-tests -f tasks-overview-basic`
- [x] FR-TASK-OVERVIEW: when the project already has `scripts/tasks-overview.py`, the skill runs it instead of regenerating it and does not modify it.
  - Test: `Benchmark: tasks-overview-reuses-existing-script`
  - Evidence: `deno task acceptance-tests -f tasks-overview-reuses-existing-script`
- [x] FR-TASK-OVERVIEW: trigger coverage — the skill activates on "what tasks are open / current task state" questions and stays silent on planning a task (`plan`) and on editing a task's status by hand.
  - Test: `Benchmark: tasks-overview-trigger-pos-1`, `tasks-overview-trigger-adj-1`, `tasks-overview-trigger-false-1`
  - Evidence: `deno run -A scripts/check-trigger-coverage.ts && deno task acceptance-tests -f tasks-overview-trigger`
- [x] FR-TASK-OVERVIEW: add the `### FR-TASK-OVERVIEW` section to the SRS with `**Acceptance:**` filled, the SDS §3.24 section plus the §3.0 inventory entry (core 11 → 12, pack-wide total 43 → 44 / standalone 41 → 42), and the README §Packs core skill line.
  - Test: `scripts/check-salp.ts` (anchor resolves), `scripts/check-fr-coverage.ts` verdict `COVERED`
  - Evidence: `deno run -A scripts/check-salp.ts && deno run -A scripts/check-fr-coverage.ts FR-TASK-OVERVIEW | grep -q "Verdict: COVERED" && grep -n "tasks-overview" README.md documents/design.md && grep -n "Skills: 44" documents/design.md`

## Solution

Selected variant: **B** — bundled script template + skill that derives the project's task schema and writes a project-local script. Decisions taken at selection (2026-09-04): skill name `tasks-overview`; for the flowai default schema "archived" = `done` + `superseded`.

### Files

- `framework/core/skills/tasks-overview/SKILL.md` — new agent-invocable skill (frontmatter `name`, `description` ≤ 300 chars, no `disable-model-invocation`).
- `framework/core/skills/tasks-overview/scripts/tasks_overview.py` — bundled template, Python 3 standard library only.
- `framework/core/skills/tasks-overview/scripts/tasks_overview_test.ts` — Deno test running the script with `python3` against temp fixtures (precedent: `draw-mermaid-diagrams/scripts/validate_test.ts`). Discovered by `deno task check` (the `--ignore` list excludes only `acceptance-tests/` and fixtures).
- `framework/core/skills/tasks-overview/acceptance-tests/basic/{mod.ts,fixture/}` — execution scenario on a NON-default layout.
- `framework/core/skills/tasks-overview/acceptance-tests/reuses-existing-script/{mod.ts,fixture/}` — execution scenario with a pre-existing `scripts/tasks-overview.py`.
- `framework/core/skills/tasks-overview/acceptance-tests/trigger-{pos,adj,false}-1/mod.ts` — trigger scenarios.
- `documents/requirements.md` — new `### FR-TASK-OVERVIEW: Task Overview Skill — \`tasks-overview\` [ANC:fr:task-overview]` after `FR-DOC-LINT` (in the FR-DOC block, before `FR-MODEL-SELECT`), with `**Tasks:**` back-pointer to this file, `**Acceptance verified by acceptance tests:**` listing the five scenario ids (backticked kebab ids only — `check-fr-coverage.ts` matches nothing else on that line), and a separate `**Unit test:**` bullet naming `tasks_overview_test.ts`.
- `documents/design.md` — §3.0 inventory: core skills 11 → 12, the pack-wide totals line (`design.md:121`) 43 → 44 skills and 41 → 42 standalone, add `tasks-overview — standalone; ships \`scripts/tasks_overview.py\``; new `### 3.24 Task Overview — FR-TASK-OVERVIEW (\`framework/core/skills/tasks-overview/\`) [ANC:sds:3-24]` describing the schema block, derivation, reuse rule.
- `README.md` — §Packs → core → Skills: one line for `tasks-overview`.
- `documents/index.md` — `## FR` row (written in the plan phase).

### Script `tasks_overview.py`

Structure, top to bottom:

1. Shebang, module docstring (what it is, how the skill generated it, that the schema block is project-owned and may be edited by hand).
2. Schema block between the marker lines `# --- SCHEMA BEGIN ---` and `# --- SCHEMA END ---`, a plain dict literal `SCHEMA = {...}`. Keys:
   - `root`: task directory relative to the project root (default `documents/tasks`).
   - `pattern`: glob relative to root (default `**/*.md`).
   - `ignore`: file names to skip (default `["README.md"]`).
   - `status_key`: frontmatter key holding the status (default `status`).
   - `missing_status`: value assumed when the key is absent (default `unknown`), so legacy files still show up.
   - `archived_statuses`: values that hide a task unless `--all` (default `["done", "superseded"]`).
   - `archived_dirs`: subdirectories of root treated as archive regardless of status (default `[]`).
   - `progress_section`: heading whose top-level `- [ ]` / `- [x]` items give progress, or `None` (default `## Definition of Done`).
   No display-tuning keys (column lists, status ordering): the output shape is fixed, only the schema varies.
3. Minimal frontmatter parser: `---` fence, `key: value` lines, inline lists `[a, b]`, block lists `- x`, quoted scalars. No PyYAML. A line that fits none of these forms is reported on stderr with file and line number, and the file is still listed with what could be parsed — a loud warning, not a silent fallback.
4. Scan: `Path(root).glob(pattern)`, skip `ignore` names; files under `archived_dirs` are archived regardless of status; per file read title (first `# ` heading, else file stem), status (`missing_status` when the key is absent, printed as-is so legacy files are visible), progress `K/N`, `date` and `implements` when present.
5. Output: groups by status, open groups in the order they first appear in `archived_statuses`' complement (`in progress`, `to do`, then the rest alphabetically), one line per task: `path  [K/N]  title  (date; implements)`, newest date first within a group, then a footer `N open, M archived (hidden; use --all)`. `--all` includes archived groups. No JSON mode (not requested; see Follow-ups).
6. Exit codes: 0 normal; 2 when `root` does not exist, the schema block is malformed, or a task file cannot be read — the message names the path so the user sees where the derivation or the tree went wrong. No tasks found → 0 with `no tasks under <root>`.
7. `if __name__ == "__main__": sys.exit(main())`.

### Skill `tasks-overview` — workflow

1. **Reuse gate.** If `scripts/tasks-overview.py` exists in the project: run `python3 scripts/tasks-overview.py` (pass `--all` / `--json` through when the user asked for archived tasks or machine output), show the output, STOP. Never rewrite an existing script; if the output looks wrong, say so and point at its schema block.
2. **Derive the schema.** Read the project's `AGENTS.md` (and `CLAUDE.md` when it is a separate file): the `tasks` entry of the Documentation Hierarchy gives `root` and `pattern`; the task-format section gives `status_key`, the status value set and which values mean closed/archived; an `archive/` convention gives `archived_dirs`. A project-specific section that contradicts the framework template wins (later, more specific text over earlier generic text). Confirm the root exists with a listing; when the rules name no task location at all, ask the user for it in one line and STOP.
3. **Show the derivation** in chat as the filled schema block, with one line per key saying which sentence of AGENTS.md it came from ("derived from …", or "flowai default" when the project adopted the default verbatim).
4. **Write the project script.** Copy the bundled `scripts/tasks_overview.py` to `scripts/tasks-overview.py` in the project (create `scripts/` if missing), replacing the text between the SCHEMA markers with the derived block. Do not touch anything else in the file.
5. **Run and report.** `python3 scripts/tasks-overview.py`, print the output, and add one line telling the user the script is theirs now (path, how to re-run, that the schema block is editable).
6. **Never edit task files.** Read-only over the task directory; the only write is step 4.

Copy source for step 4: the skill is installed as a directory, so the template's path is `<skill dir>/scripts/tasks_overview.py` relative to `SKILL.md` — state it as a relative reference the way `draw-mermaid-diagrams` references `scripts/validate.py`.

### Acceptance scenarios

- `tasks-overview-basic`: fixture ships its own `AGENTS.md`, appended after the rendered template by `composeSandboxAgentsMd` (`scripts/acceptance-tests/lib/runner.ts:200-208`). Because the template's contradiction rule tells the agent to stop and ask when two rules conflict, the fixture text is worded as an explicit, deliberate override, not a contradiction: "Project-specific task convention. This project does not use the `documents/tasks/<YYYY>/<MM>/<slug>.md` layout described above; that section is the framework default and is superseded here. Tasks live in `docs/todo/<slug>.md` with frontmatter `state: open | blocked | closed | archived`; `closed` and `archived` tasks count as archived." Fixture holds 4 tasks (open, blocked, closed, archived) and no `documents/` directory. The scenario is `interactive` with a persona that answers "use the docs/todo convention from AGENTS.md" if the agent asks anyway. Query: "Show me the current state of our tasks, what is in progress and what is still open." Checklist: read AGENTS.md; `scripts/tasks-overview.py` written; its schema has `root` `docs/todo` and archived values include `closed` and `archived`; the script was run; output names the open and blocked tasks and not the closed/archived ones; no file under `docs/todo/` modified.
- `tasks-overview-reuses-existing-script`: fixture already contains `scripts/tasks-overview.py` (the template with a deliberately distinctive schema, root `tasks/`) and matching tasks. Checklist: script executed; file byte-identical afterwards (checked via `git status` — the fixture is committed at init); output shown.
- `tasks-overview-trigger-pos-1`: "Which tasks are still open in this project, and how far along are they?" → skill invoked.
- `tasks-overview-trigger-adj-1`: "Plan a task for adding rate limiting to the API" → not invoked (adjacent: `plan`).
- `tasks-overview-trigger-false-1`: "Mark the add-cache task as done in its frontmatter" → not invoked (inside the domain, wrong intent: editing status, which commit workflows own).

### Order of work (TDD)

0. Green baseline first: add the `### FR-TASK-OVERVIEW … [ANC:fr:task-overview]` SRS section (status `[ ]`, acceptance ids named, `**Tasks:**` back-pointer to this file) so the `[REF:fr:task-overview]` row already in `documents/index.md` resolves; run `deno run -A scripts/check-salp.ts` and `deno task check` — both must be green before any test is written.
1. `tasks_overview_test.ts` RED → script GREEN → refactor; run the single test file.
2. Smoke: `deno task acceptance-tests -f configure-deno-commands-trigger-pos-1` (existing scenario, infrastructure check).
3. Write `basic` scenario, run it RED (skill absent) → write SKILL.md → GREEN.
4. `reuses-existing-script` RED → GREEN (tighten step 1 wording if needed).
5. Trigger scenarios; `deno run -A scripts/check-trigger-coverage.ts`.
6. SRS / SDS / README / index edits; `deno task check` green.
7. Hand-off: full sweep `deno task acceptance-tests -f tasks-overview` is the user's CHECK step.

### Error handling

- Script: missing root / malformed schema / unreadable task file → exit 2 with the path in the message; unparseable frontmatter line → warning on stderr naming file and line, task still listed.
- Skill: no task location in the rules → ask in one line and STOP; `python3` missing → report and STOP (no fallback interpreter).

## Follow-ups

- Registering the generated `scripts/tasks-overview.py` under `scaffolds:` in `framework/core/pack.yaml` (so `update` tracks it) — deferred: `update` would reconcile the project-tailored schema block against the bundled template. Needs a decision on whether scaffold reconciliation can carry a project-owned block.
- Writing the derived task schema back into the project's AGENTS.md as a machine-readable block that `plan`, `epic` and `commit` could also consume — deferred, exceeds this task (variant C).
- `epic` per-phase `Status:` markers inside the body are not surfaced by the script; only frontmatter status is.
- A `--json` output mode was dropped from the plan on `plan-critic`'s objection (no stated outcome needs it); add it when a consumer appears.
