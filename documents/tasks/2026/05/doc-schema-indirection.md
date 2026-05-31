---
date: "2026-05-30"
status: done
implements: [FR-DOCS, FR-UNIVERSAL]
tags: [docs, primitives, plugins, portability]
related_tasks:
  - 2026/05/universal-plugin-skills.md
  - 2026/05/replace-adr-with-tasks.md
---
# Documentation Schema Indirection for Plugin Primitives

## Goal

Keep plugin primitives portable by removing hardcoded project documentation file names, paths, and schema blocks from skills, commands, agents, references, hooks, and scripts. Only the AGENTS.md project-instructions template, exposed to Claude Code as the same CLAUDE.md content, should define documentation locations and schemas. Runtime primitives should read or follow the project documentation schema declared there.

## Overview

### Context

flowai now distributes packs as plugin resources across multiple IDEs. Project documentation structure is project-owned: the root project-instructions artifact (`AGENTS.md`, with `CLAUDE.md` as the same content for Claude Code compatibility) carries the Documentation Hierarchy, Documentation Map, SRS/SDS formats, task layout, traceability rules, and acceptance rules. If distributed plugin primitives hardcode `documents/requirements.md`, `documents/design.md`, `documents/tasks/<YYYY>/<MM>/<slug>.md`, or SRS/SDS/GODS schemas, any project that customizes its documentation layout in AGENTS.md cannot rely on those primitives without adaptation.

The requested target state is:

- The AGENTS.md project-instructions template contains concrete documentation file names, locations, and schema definitions; CLAUDE.md is a compatibility alias/symlink/mirror of the same content, not a second schema source.
- Other plugin elements contain documentation-behavior instructions only: discover the project documentation schema from the project-instructions artifact, resolve the semantic roles `SRS`, `SDS`, `tasks`, and `index`, then follow those role bindings.
- Scaffolding and initialization can create default files, but the operational primitives should not treat those defaults as universal truth after project instructions exist.

### Current State

- `framework/core/assets/AGENTS.template.md` currently defines documentation hierarchy and concrete schemas for SRS, SDS, tasks, index, traceability, acceptance, planning, and TDD. This is the intended central schema location.
- Outside AGENTS assets and acceptance fixtures, at least 18 framework files mention concrete documentation paths or schemas, including generated atom sources, standalone skills, references, pack metadata, init/update commands, and helper scripts.
- Key affected primitive sources include:
  - `framework/atoms/plan.md`
  - `framework/atoms/implement.md`
  - `framework/atoms/review.md`
  - `framework/atoms/commit.md`
  - `framework/composites/ship.md`
  - `framework/core/skills/epic/SKILL.md`
  - `framework/core/commands/init/SKILL.md`
  - `framework/core/commands/update/SKILL.md`
  - `framework/core/skills/maintenance/SKILL.md`
  - `framework/core/skills/reflect/SKILL.md`
  - `framework/core/pack.yaml`
- Existing documentation requirements cover the broad areas:
  - FR-DOCS: documentation schemas preserve project knowledge.
  - FR-UNIVERSAL: framework primitives must work consistently across supported IDEs.
- Prior related tasks:
  - `documents/tasks/2026/05/universal-plugin-skills.md` — FR-UNIVERSAL plugin-skill portability context.
  - `documents/tasks/2026/05/replace-adr-with-tasks.md` — documentation lifecycle and committed task layout context.

### Constraints

- No source implementation happens in this planning phase.
- Changes to skills, commands, or agents require Acceptance Test TDD.
- Generated primitive targets must not be hand-edited; update atom/composite sources and regenerate.
- Documentation must remain English and compressed.
- Do not remove concrete documentation schemas from the AGENTS.md template; it is the source of truth for the CLAUDE.md compatibility view too.
- Avoid silent fallback behavior. If a primitive cannot discover the documentation schema in project instructions, it must fail clearly or ask for the missing location.
- Preserve default scaffolding behavior for new projects unless the selected variant explicitly changes pack metadata or init scaffolds.
- Treat `AGENTS.md` and `CLAUDE.md` as the same project-instructions artifact. `CLAUDE.md` should be a symlink or byte-equivalent compatibility mirror; if it is a divergent regular file, report stale compatibility content and use `AGENTS.md` as canonical.
- Existing code-traceability rules require GFM links to SRS/SDS headings. If the no-hardcoded-path rule scans plugin scripts, the implementation must either define a narrow traceability-comment exception or revise the traceability mechanism in SRS/SDS first.

## Definition of Done

- [x] FR-DOCS: SRS defines the documentation-schema indirection contract.
  - Test: `documents/requirements.md::FR-DOCS`
  - Evidence: `NO_COLOR=1 rg -n "Documentation schema indirection|SRS.*SDS.*tasks.*index|SDS.*SRS.*tasks.*index" documents/requirements.md`
- [x] FR-DOCS: SDS documents how primitives discover project documentation roles from the AGENTS.md project-instructions artifact and how the template remains the schema source.
  - Test: `documents/design.md::3.16 Documentation System`
  - Evidence: `NO_COLOR=1 rg -n "schema indirection|SRS|SDS|tasks|index" documents/design.md`
- [x] FR-UNIVERSAL: Distributed plugin primitives no longer hardcode concrete SRS/SDS/task paths or schema blocks outside allowed project-instructions templates and acceptance fixtures.
  - Test: `scripts/check-skills_test.ts::doc schema indirection forbids hardcoded project doc paths`
  - Evidence: `NO_COLOR=1 deno test scripts/check-skills_test.ts --filter "doc schema indirection"`
- [x] FR-UNIVERSAL: The validation gate covers skills, commands, agents, references, scripts, hooks, and pack metadata according to the selected scope.
  - Test: `scripts/check-skills_test.ts::doc schema indirection scans plugin resources`
  - Evidence: `NO_COLOR=1 deno test scripts/check-skills_test.ts --filter "doc schema indirection scans"`
- [x] FR-UNIVERSAL: Affected primitive behavior remains covered by acceptance tests that verify schema discovery from AGENTS.md instead of path literals.
  - Benchmark: `plan-doc-schema-discovery`, `review-doc-schema-discovery`, `commit-doc-schema-discovery`
  - Evidence: `NO_COLOR=1 deno task acceptance-tests -f plan-doc-schema-discovery && NO_COLOR=1 deno task acceptance-tests -f review-doc-schema-discovery && NO_COLOR=1 deno task acceptance-tests -f commit-doc-schema-discovery`
- [x] FR-UNIVERSAL: Generated atom/composite outputs are refreshed from source and pass project checks.
  - Test: `deno task check`
  - Evidence: `NO_COLOR=1 deno task check`

## Solution

Implement Variant 3 with concrete semantic documentation roles: `SRS`, `SDS`, `tasks`, and `index`.

1. Establish the contract in documentation.
   - Update `documents/requirements.md` under `FR-DOCS` and `FR-UNIVERSAL`:
     - `FR-DOCS`: the AGENTS.md project-instructions template is the only shipped location that may define concrete project-document paths and schema blocks; CLAUDE.md exposes the same content for compatibility.
     - `FR-UNIVERSAL`: distributed plugin primitives must resolve documentation through semantic roles (`SRS`, `SDS`, `tasks`, `index`) before reading or writing docs.
     - Traceability exception decision: either allow GFM links in code comments as a narrow implementation-evidence exception, or update the traceability rule before scanning plugin scripts.
   - Update `documents/design.md` §3.16:
     - Define role meanings:
       - `SRS`: project requirements document.
       - `SDS`: project design document.
       - `tasks`: persistent task-plan record location.
       - `index`: documentation navigation aggregate.
     - State that root AGENTS.md is parsed/read by the agent, not by a new runtime parser, unless a later task explicitly introduces one.
     - State that CLAUDE.md is not a second schema source: it must be a symlink or byte-equivalent compatibility mirror of AGENTS.md.
     - State that default flowai paths are examples from the template, not a universal primitive contract.

2. Add a validation gate.
   - Extend `scripts/check-skills.ts` or an adjacent checker invoked by `deno task check` to scan distributed plugin resources:
     - `framework/<pack>/skills/**`
     - `framework/<pack>/commands/**`
     - `framework/<pack>/agents/**`
     - `framework/<pack>/hooks/**`
     - `framework/<pack>/pack.yaml`
     - `framework/atoms/**`
     - `framework/composites/**`
   - Allow concrete documentation paths and schema blocks only in:
     - `framework/*/assets/AGENTS*.md`
     - `framework/*/assets/CLAUDE*.md`
     - acceptance-test fixtures and scenario assertions.
   - Fail clearly when forbidden content appears, naming the file, matched literal, and allowed replacement pattern (`resolve role SRS/SDS/tasks/index from project instructions`).

3. Write RED tests for the checker.
   - Add tests in `scripts/check-skills_test.ts`:
     - rejects `documents/requirements.md`, `documents/design.md`, and `documents/tasks/` in a non-asset skill.
     - rejects embedded SRS/SDS/task schema blocks in a non-asset skill.
     - allows the same literals in AGENTS.md templates and CLAUDE.md compatibility mirrors.
     - scans pack metadata, references, scripts, hooks, atoms, composites, skills, commands, and agents.
   - Run the targeted tests first and confirm failure before implementation.

4. Rewrite affected primitives to role-based instructions.
   - Update generated sources, not rendered generated targets:
     - `framework/atoms/plan.md`
     - `framework/atoms/implement.md`
     - `framework/atoms/review.md`
     - `framework/atoms/commit.md`
     - `framework/composites/ship.md`
   - Update standalone resources:
     - `framework/core/skills/epic/SKILL.md`
     - `framework/core/commands/init/SKILL.md`
     - `framework/core/commands/update/SKILL.md`
     - `framework/core/skills/maintenance/SKILL.md`
     - `framework/core/skills/reflect/SKILL.md`
     - affected references under `framework/core/skills/maintenance/references/`
     - `framework/devtools/skills/write-agent-benchmarks/SKILL.md`
     - `framework/engineering/skills/diagnose-benchmark-failure/SKILL.md`
   - Replace path-first language with role-first language:
     - "read `documents/requirements.md`" -> "resolve `SRS` from AGENTS.md, then read that file".
     - "write `documents/tasks/<YYYY>/<MM>/<slug>.md`" -> "resolve `tasks` from AGENTS.md, then write the task using that layout".
     - "update `documents/index.md`" -> "resolve `index` from AGENTS.md, then update the navigation aggregate".
   - Keep concise examples only where examples are explicitly labelled as defaults from the template.

5. Handle pack metadata and scaffolds.
   - Inspect whether external flowai CLI scaffolding requires concrete paths from `framework/core/pack.yaml`; verify against the external CLI source before changing metadata shape.
   - If concrete scaffold paths are required by the current installer contract, keep them temporarily only when the new checker has an explicit allow rule for scaffold defaults, and document this as a bounded exception in SRS/SDS.
   - If role-based scaffold metadata is compatible, replace scaffold paths with `SRS`, `SDS`, and related role declarations.
   - Do not silently create fallback locations in operational primitives.

6. Add acceptance coverage.
   - Add or update acceptance scenarios:
     - `framework/core/skills/plan/acceptance-tests/doc-schema-discovery/mod.ts`
     - `framework/core/skills/review/acceptance-tests/doc-schema-discovery/mod.ts`
     - `framework/core/commands/commit/acceptance-tests/doc-schema-discovery/mod.ts`
   - Scenario fixtures should define non-default paths in AGENTS.md for `SRS`, `SDS`, `tasks`, and `index`; CLAUDE.md may be a symlink/mirror in fixtures that need Claude Code compatibility.
   - Checklist verifies the agent reads/writes those non-default locations and does not create default-path files.

7. Regenerate and verify.
   - Run `NO_COLOR=1 deno run -A scripts/generate-skill-composites.ts --write`.
   - Run targeted checker tests:
     - `NO_COLOR=1 deno test scripts/check-skills_test.ts --filter "doc schema indirection"`
   - Run targeted single-scenario acceptance tests authored in this task.
   - Run `NO_COLOR=1 deno task check`.
   - Hand off full primitive sweeps for affected primitives if targeted acceptance passes but full sweep cost is high:
     - `NO_COLOR=1 deno task acceptance-tests -f plan`
     - `NO_COLOR=1 deno task acceptance-tests -f review`
     - `NO_COLOR=1 deno task acceptance-tests -f commit`

8. Error handling.
   - If AGENTS.md lacks a required role, the primitive must stop and ask for the missing role binding or ask the user to update project instructions.
   - If CLAUDE.md exists as divergent regular content, report that compatibility content is stale and continue using AGENTS.md as canonical unless the active IDE cannot read AGENTS.md.
   - No implicit fallback to default flowai paths in operational primitives.

## Follow-ups

- Add dedicated schema-discovery acceptance scenarios for `epic`, `init`, `update`, and `maintenance` if the checker finds those primitives need behavior changes beyond text normalization.
