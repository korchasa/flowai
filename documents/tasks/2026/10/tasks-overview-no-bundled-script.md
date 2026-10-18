---
date: 2026-10-18
status: done
implements:
  - FR-TASK-OVERVIEW
tags: [skills, tasks, core]
related_tasks: [2026-09-tasks-overview-skill]
---
# tasks-overview writes its own script instead of copying a template [ANC:task:2026-10-tasks-overview-no-bundled-script]

## Goal

Make `tasks-overview` work on any task storage a project uses — one file per task, one roadmap file, a tracker reached through its CLI — not only on Markdown files with a status key in the frontmatter.

## Overview

### Context

The user asked (2026-10-18) for a task-status skill that carries NO script and writes its own data-collection script on the first run, because the task storage schema differs between projects. Decisions taken in chat:

- Rework the existing `tasks-overview` skill, do not add a second one (two skills with the same trigger would compete for one request).
- Replace the guarantees of the tested template with: a fixed output contract in `SKILL.md`, any task source, and a mandatory completeness check after the first run — the agent counts the tasks a second, independent way and compares with the script's total.

### Current State

- `framework/core/skills/tasks-overview/SKILL.md` copies the bundled template `scripts/tasks_overview.py` into `scripts/tasks-overview.py` and replaces only the block between `# --- SCHEMA BEGIN ---` and `# --- SCHEMA END ---`. Rule 4 forbids writing the script from scratch.
- The template reads only `<root>/<pattern>` Markdown files with a frontmatter status key. A project keeping tasks under headings of one file, or in a tracker, cannot be served.
- `scripts/tasks_overview_test.ts` unit-tests the template; FR-TASK-OVERVIEW and SDS §3.24 describe the template and its schema block.
- This repo's own `scripts/tasks-overview.py` is a project copy made from the template; it stays (an existing script wins).

### Constraints

- The project script keeps its path `scripts/tasks-overview.py` (the reuse gate and `scripts/project-status_test.ts` depend on it) and stays Python 3 standard library only.
- An existing project script is still run as-is and never rewritten.
- The skill never edits a task file.
- No bundled script under the skill directory.

## Definition of Done

- [x] FR-TASK-OVERVIEW: the skill directory carries no script.
  - Test: `framework/core/skills/tasks-overview/` listing
  - Evidence: `test -z "$(find framework/core/skills/tasks-overview -name '*.py' -o -name '*_test.ts' | grep -v acceptance-tests)"`
- [x] FR-TASK-OVERVIEW: on a project with frontmatter tasks the agent writes the script itself, runs it, and checks completeness against an independent count.
  - Test: `Benchmark: tasks-overview-basic`
  - Evidence: `deno task acceptance-tests -f tasks-overview-basic`
- [x] FR-TASK-OVERVIEW: on a project whose tasks are headings in one roadmap file, with status given by the section they sit under, the agent writes a working script for that layout.
  - Test: `Benchmark: tasks-overview-single-file-roadmap`
  - Evidence: `deno task acceptance-tests -f tasks-overview-single-file-roadmap`
- [x] FR-TASK-OVERVIEW: an existing project script is still reused unchanged.
  - Test: `Benchmark: tasks-overview-reuses-existing-script`
  - Evidence: `deno task acceptance-tests -f tasks-overview-reuses-existing-script`
- [x] FR-TASK-OVERVIEW: SRS and SDS no longer describe a template or schema block.
  - Test: doc grep
  - Evidence: `! grep -nE 'SCHEMA BEGIN|tasks_overview_test' documents/requirements.md documents/design.md README.md && ! grep -n 'tasks_overview\.py' documents/requirements.md README.md` (SDS §3.24 keeps one sentence naming the removed template as the reason it was removed)
- [x] The gate stays green.
  - Test: `deno task check`
  - Evidence: `deno task check > "$SCRATCH/check.log" 2>&1; grep -E 'passed \| [0-9]+ failed' "$SCRATCH/check.log"`

## Solution

Result (2026-10-18): RED — `tasks-overview-basic` failed `completeness_checked`, `tasks-overview-single-file-roadmap` failed 3 critical items (no script written). GREEN on the final text — both pass with 0 errors; `tasks-overview-reuses-existing-script` and `tasks-overview-trigger-pos-1` pass; `deno task check` 907 + 213 passed, 0 failed. The non-critical `derivation_shown` item of `tasks-overview-basic` warns on both the old and the new text.


1. RED: in `tasks-overview-basic`, replace the schema-block item with "the script reads `docs/todo` with `state`" and add a critical item for the completeness check. Add `tasks-overview-single-file-roadmap`: one `ROADMAP.md` with `## In progress`, `## Next`, `## Done` sections and `### <task>` headings with checklists under them; AGENTS.md says so. Run both on the current skill; they must fail.
2. GREEN: rewrite `SKILL.md` — reuse gate unchanged; derive the storage from AGENTS.md (any shape, quoted); write `scripts/tasks-overview.py` from the output contract (grouping order, line shape, footer, `--all`, exit 2 naming the path, stdlib only); run it; completeness check on the first run (independent count vs script total; on mismatch fix the fresh script and rerun once, then report and stop). Delete `scripts/tasks_overview.py` and `scripts/tasks_overview_test.ts` from the skill.
3. Update FR-TASK-OVERVIEW, SDS §3.24 and §3.0 line, README pack line, and the comments in `scripts/build-plugins.ts` / `scripts/build-plugins_test.ts` that cite the deleted tests.
4. `deno task check`; run the three changed scenarios; hand the full sweep `deno task acceptance-tests -f tasks-overview` to the user.
