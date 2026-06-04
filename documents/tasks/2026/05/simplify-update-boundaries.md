---
date: "2026-05-18"
status: done
implements:
  - FR-UPDATE
  - FR-ADAPT
  - FR-DIST
tags: [commands, adaptation, cli-boundary, instructions]
related_tasks:
  - 2026/05/extract-cli-to-separate-repo.md
  - 2026/05/claude-code-plugin-marketplace-pilot.md
---

# Simplify flowai-update boundaries

## Goal

Make `flowai-update` a project-integration workflow instead of a CLI
orchestration workflow. CLI self-update, `flowai sync`, config migration, and
sync-output parsing belong to `korchasa/flowai-cli`; this repo's
`flowai-update` should update project-owned integration artifacts
(`AGENTS.md`, `CLAUDE.md`, scaffolded docs/config) against the current
framework templates. Installed primitives are read-only inputs unless they live
inside the project worktree from a legacy/project-local CLI install.

## Overview

### Context

- The CLI was extracted to `korchasa/flowai-cli`; this repo now owns the
  framework packs, primitives, acceptance tests, and project-facing docs.
- Current `flowai-update` still starts with `flowai update`, runs
  `flowai sync -y --skip-update-check`, parses sync output, validates installed
  frontmatter, and commits the synced result.
- Current `flowai-update` also performs framework-local work: adapting updated
  skills, comparing `AGENTS.template.md` against `AGENTS.md`, preserving
  project-specific instruction sections, and migrating scaffolded artifacts.
- `flowai-adapt` already covers on-demand adaptation of installed skills,
  agents, assets, and hooks. The desired `flowai-update` surface overlaps with
  this command and with `flowai-adapt-instructions`.
- `flowai-adapt-instructions` is only meaningfully called by `flowai-update`
  and acceptance tests; its public existence adds an extra mental model around
  `init`, `update`, and `adapt`.
- Expected user path is plugin-first: most users are likely to consume flowai
  skills through native IDE plugin marketplaces rather than through
  `flowai-cli`. Plugin updates happen through the IDE plugin manager, not
  through `flowai sync`.
- Expected install scope is often user-level/global rather than project-level.
  Project-local `.claude/skills/` may be absent even when flowai skills are
  available to the agent.

### Current State

- `framework/core/commands/flowai-update/SKILL.md` is a broad workflow:
  CLI update -> sync -> self-bootstrap -> parse sync output -> skill
  adaptation -> asset migration -> scaffold migration -> frontmatter validation
  -> commit.
- `documents/requirements.md` `FR-UPDATE` describes `flowai-update` as a single
  entry point for CLI update, sync, AGENTS.md migration, scaffold migration, and
  legacy AGENTS layout collapse.
- `documents/design.md` §3.5 describes CLI internals in the external repo, but
  §3.5.1 still says `flowai-update` delegates AGENTS.md migration to
  `flowai-adapt-instructions`.
- Existing `flowai-update` acceptance tests include CLI-specific scenarios:
  `flowai-update-update-command` and `flowai-update-sync-command`.
- Existing asset-focused tests (`flowai-update-basic`,
  `flowai-update-template-vs-artifact`, `flowai-update-asset-drift-no-sync`)
  are still relevant if reframed around already-installed local framework
  changes.

### Constraints

- No framework command should implement flowai CLI lifecycle details after the
  CLI split. CLI update, sync, config migration, install-scope resolution, and
  sync result rendering must live in `korchasa/flowai-cli`.
- `flowai-update` must remain useful when the local project already has updated
  framework primitives installed by CLI sync, plugin update, or any future
  distribution channel.
- Plugin-installed primitives are not project-owned source files. The update
  flow must not assume it can rewrite plugin cache contents the same way it can
  rewrite project-local `.claude/skills/` files created by CLI sync.
- User-level/global primitives are outside the project worktree. A project
  workflow may read their metadata/templates when needed, but must not treat
  them as project files to adapt, stage, or commit.
- Project-owned instruction files (`AGENTS.md`, `CLAUDE.md` symlink/file) must
  preserve project-specific sections while receiving framework-originated rule
  changes.
- Skill/command/agent changes require acceptance-test TDD. CLI-specific
  acceptance tests must be removed, replaced, or moved to CLI-side tests rather
  than left stale.
- Docs must reflect the new ownership boundary: framework repo defines the
  update/adaptation contract; CLI repo owns installation and sync execution.
- The plan must not assume a silent fallback from one distribution channel to
  another.

## Definition of Done

- [x] FR-UPDATE: SRS redefines `flowai-update` as a framework-local
  post-install adaptation command and removes CLI self-update / sync execution
  from its framework-side responsibility.
  - Test: `manual — korchasa`
  - Evidence: `rg -n 'Project Integration Update|Boundary.*Never runs|No CLI lifecycle' documents/requirements.md documents/design.md framework/core/commands/flowai-update/SKILL.md && ! rg -n 'flowai sync -y|skip-update-check|self-bootstrap|validate_frontmatter|Atomic commit' framework/core/commands/flowai-update/SKILL.md` exits 0.
- [x] FR-UPDATE: `flowai-update` accepts already-installed local changes as
  input and focuses on adapting project-owned instruction artifacts, while
  primitive adaptation is deferred to `flowai-adapt`.
  - Benchmark: `flowai-update-template-vs-artifact`
  - Evidence: `deno task acceptance-tests -f flowai-update-template-vs-artifact` exits 0.
- [x] FR-UPDATE: Plugin and user-level/global installs are handled as read-only
  framework sources; the command updates project-owned artifacts only and does
  not try to rewrite plugin cache or user-level skill directories.
  - Benchmark: `flowai-update-plugin-user-scope`
  - Evidence: `deno task acceptance-tests -f flowai-update-plugin-user-scope` exits 0.
- [x] FR-UPDATE: CLI-specific acceptance coverage is removed from this repo or
  rehomed as an explicit `korchasa/flowai-cli` follow-up, so framework
  acceptance tests no longer require the command to run `flowai update` or
  `flowai sync`.
  - Test: `manual — korchasa`
  - Evidence: `! rg -n 'used_sync_subcommand|used_update_subcommand|sync-command|update-command|flowai-update-sync-command|flowai-update-update-command' framework/core/commands/flowai-update/acceptance-tests` exits 0.
- [x] FR-ADAPT: duplication between `flowai-update` and `flowai-adapt` is
  resolved by a single documented ownership model for skills, agents, assets,
  hooks, and instruction artifacts.
  - Benchmark: `flowai-adapt-all`
  - Evidence: `deno task acceptance-tests -f flowai-adapt` exits 0.
- [x] FR-UPDATE: the public `flowai-adapt-instructions` surface is removed;
  AGENTS.md/CLAUDE.md reconciliation belongs to `flowai-update --instructions`.
  - Test: `manual — korchasa`
  - Evidence: `! rg -n 'flowai-adapt-instructions|adapt-instructions' README.md documents/requirements.md documents/design.md framework/core scripts/build-plugins_test.ts` exits 0.
- [x] FR-DIST: CLI-side ownership for self-update, sync, config migration, and
  installed-resource discovery is documented as living in `korchasa/flowai-cli`.
  - Test: `manual — korchasa`
  - Evidence: `rg -n "flowai-cli.*(update|sync|config|migration)|sync.*flowai-cli" README.md documents/requirements.md documents/design.md` returns the updated boundary text.

## Solution

Selected variant: **Variant A — redefine `flowai-update` as project-instructions update**.

### Ownership Model

- `korchasa/flowai-cli` owns CLI lifecycle:
  - self-update (`flowai update`);
  - sync/install into IDE directories;
  - config migration (`.flowai.yaml`);
  - scope resolution (`global` / `local` / `auto`);
  - sync output and install action reporting.
- Native plugin managers own plugin lifecycle:
  - plugin install/update/uninstall;
  - plugin cache management;
  - user-level/global plugin scope.
- This repo's `flowai-update` owns project integration after framework content is already available:
  - reconcile `AGENTS.md` with current framework instruction template;
  - maintain `CLAUDE.md` as a project-owned file or symlink policy target;
  - migrate scaffolded project artifacts when current framework templates require it;
  - detect project-local installed primitives only to report that `flowai-adapt`
    is available for explicit primitive adaptation.

Default behavior: `flowai-update` updates project-owned integration artifacts
only. It does not adapt skills, commands, agents, or hooks by default, even when
project-local CLI-installed primitive files exist. Primitive adaptation remains
an explicit `flowai-adapt` responsibility.

### Implementation Steps

1. Update SRS `FR-UPDATE`.
   - Redefine `flowai-update` as a project-integration command.
   - Remove framework-side responsibility for `flowai update`, `flowai sync`, config migration, sync-output parsing, and atomic commits of synced files.
   - Explicitly state that plugin/user-level installs are read-only framework sources.
   - Keep the requirement to preserve project-specific sections in `AGENTS.md` / `CLAUDE.md`.

2. Update SDS.
   - Replace the current `flowai-update` lifecycle with:
     1. detect available framework template source;
     2. read current project-owned artifacts;
     3. classify framework-owned vs project-owned sections;
     4. propose merge;
     5. apply only after confirmation;
     6. verify by diff and targeted acceptance tests.
   - Document source priority:
     - project-local `.claude/assets/AGENTS.template.md` / `.cursor/assets/...` when present;
     - plugin-local assets copied into the invoking skill when available;
     - user-level/global asset locations as read-only fallback.
   - Document that plugin cache and user-level skill directories are never rewritten.

3. Rewrite `framework/core/commands/flowai-update/SKILL.md`.
   - Remove steps for CLI self-update, sync execution, sync-output parsing, self-bootstrap from synced files, frontmatter validation of installed dirs, staging, and committing.
   - Add a fail-fast source detection step:
     - if no framework template/source is discoverable, report the missing source and tell the user to update/install flowai through their chosen distribution channel;
     - do not run `flowai sync` as a fallback.
   - Keep project artifact migration:
     - compare template content with `AGENTS.md`;
     - handle `CLAUDE.md` as symlink/file policy;
     - preserve project sections;
     - show diff before write.
   - Add project-local primitive detection:
     - if `.claude/skills/flowai-*`, `.cursor/...`, or `.opencode/...` exist in the worktree, report that explicit primitive adaptation is available through `flowai-adapt`;
     - do not adapt those primitive files inside `flowai-update`;
     - skip plugin/user-level primitives with an explicit note.

4. Remove `flowai-adapt-instructions`.
   - Fold its user-facing behavior into `flowai-update --instructions`.
   - Delete the public skill and its acceptance tests.
   - Update active references from `/flowai-adapt-instructions` to the selected ownership model.
   - Verify plugin build behavior after removal: assets formerly copied into `adapt-instructions` must still be available to `flowai-update`.

5. Update `flowai-adapt` docs and command text.
   - Clarify that `flowai-adapt` is for explicit on-demand adaptation.
   - Add scope rule:
     - project-local primitives may be adapted;
     - plugin/user-level primitives are read-only;
     - `--assets` reconciles project-owned instruction artifacts.
   - Ensure overlap with `flowai-update` is described as: `update` = reconcile after framework change, `adapt` = explicit user-requested adaptation.

6. Acceptance-test TDD.
   - Add RED scenario `flowai-update-plugin-user-scope`:
     - fixture has no project-local `.claude/skills`;
     - fixture exposes a template source as plugin/user-level read-only input;
     - project `AGENTS.md` is missing a framework rule;
     - expected behavior: agent updates/proposes only `AGENTS.md`, does not write plugin/user-level directories, does not call `flowai sync`.
   - Add or rewrite RED scenario `flowai-update-local-adaptation`:
     - fixture has project-local updated framework template and optionally project-local primitive files;
     - expected behavior: project artifact reconciliation happens; project-local primitive files are not adapted by `flowai-update`; the agent points to `flowai-adapt` for explicit primitive adaptation; no CLI lifecycle command is run.
   - Delete or rehome CLI-specific framework scenarios:
     - `flowai-update-update-command`;
     - `flowai-update-sync-command`.
   - Keep/reframe asset-oriented scenarios:
     - `flowai-update-basic`;
     - `flowai-update-template-vs-artifact`;
     - `flowai-update-asset-drift-no-sync`.

7. Cross-repo follow-up for `korchasa/flowai-cli`.
   - File or update a CLI-side task or GitHub issue covering:
     - CLI update/sync lifecycle after framework split;
     - plugin-detected abort when CLI sync would collide with plugin install;
     - post-sync guidance that project-owned artifacts may need reconciliation via `/flowai-update` or `/flowai-adapt --assets`.
   - This framework task does not implement CLI behavior.

8. Documentation updates.
   - README:
     - plugin/user-level install is the primary expected user path;
     - CLI remains a distribution channel, but CLI lifecycle docs point to `korchasa/flowai-cli`;
     - `/flowai-update` described as project integration, not installer/sync runner.
   - SRS/SDS:
     - update ownership boundaries;
     - remove stale `flowai-update` -> `flowai-adapt-instructions` delegation wording if `adapt-instructions` is removed or internalized.

9. Verification.
   - Run specific RED/GREEN/REFACTOR scenarios during implementation:
     - `deno task acceptance-tests -f flowai-update-plugin-user-scope`;
     - `deno task acceptance-tests -f flowai-update-template-vs-artifact`;
     - affected retained scenarios from `flowai-update`.
   - Run focused code checks:
     - `deno task check`.
   - Hand off full primitive sweep:
     - `deno task acceptance-tests -f flowai-update`;
     - `deno task acceptance-tests -f flowai-adapt` if `flowai-adapt` changes;
     - replacement or removal check for `flowai-adapt-instructions`.

### Error Handling

- Missing framework source: stop with a clear message naming searched locations and the distribution channel to update; do not guess or run sync.
- Plugin/user-level source detected: treat as read-only; only project-owned files may be changed.
- `CLAUDE.md` is a regular file rather than symlink: show a diff/proposal and ask before replacing or editing.
- Conflicting project customizations in `AGENTS.md`: show section-level choices and ask before applying.
- Project-local primitive files detected: report them as eligible for `flowai-adapt`, leave them unchanged, and continue with project-owned artifact reconciliation.

### Source Detection Contract

Search in this order and stop at the first complete source set:

1. Project-local assets:
   - `.claude/assets/AGENTS.template.md`
   - `.cursor/assets/AGENTS.template.md`
   - `.opencode/assets/AGENTS.template.md`
   - `.codex/assets/AGENTS.template.md`
2. Plugin-local assets bundled beside the invoking command/skill:
   - `assets/AGENTS.template.md`
3. User-level/global assets:
   - `~/.claude/assets/AGENTS.template.md`
   - `~/.cursor/assets/AGENTS.template.md`
   - `~/.config/opencode/assets/AGENTS.template.md`
   - `~/.codex/assets/AGENTS.template.md`

All non-project sources are read-only. If multiple read-only sources exist and
their content differs, pick the newest mtime only after warning the user and
showing the competing paths.

### Follow-ups

- Create a cross-repo `korchasa/flowai-cli` task or issue for CLI-side update
  messaging and plugin-collision handling.
- Revisit the public name `flowai-update` after plugin-first rollout data is
  available; a future rename to `flowai-refresh-project` may be clearer but is
  out of scope for this task.

### Files Expected To Change During Implementation

- `framework/core/commands/flowai-update/SKILL.md`
- `framework/core/commands/flowai-update/acceptance-tests/**`
- `framework/core/commands/flowai-adapt/SKILL.md`
- `framework/core/commands/flowai-adapt/acceptance-tests/**` if scope wording changes behavior
- `framework/core/skills/flowai-adapt-instructions/**` if removed/internalized
- `documents/requirements.md`
- `documents/design.md`
- `README.md`
