# Spec: flow-cli Integration & Distribution Delegation

| Field   | Value      |
|---------|------------|
| Status  | Done       |
| Created | 2026-03-13 |
| Updated | 2026-03-13 |

## Goal

Delegate all distribution responsibilities (formatting, installing, upgrading skills/agents for end-user IDEs) to the external `flow-cli` tool. The `flow` repository becomes a pure source-of-truth for canonical resource descriptions; `flow-cli` (as a git submodule) transforms and delivers them to target IDEs.

## Overview

Currently, `flow` manages distribution internally:
- `scripts/install.ts` — end-user installer creating symlinks
- `scripts/check-agents.ts` — validates per-IDE agent frontmatter sync
- `framework/agents/{claude,cursor,opencode}/` — 3 copies of each agent with IDE-specific frontmatter
- FR-10 in SRS — unimplemented requirement for CLI-based distribution

With `flow-cli` taking over distribution:
- `flow` stores **one canonical definition** per agent (no per-IDE variants)
- `flow-cli` knows each IDE's format requirements and transforms at install time
- All install/upgrade/validation logic moves to `flow-cli`
- The two repos are linked via git submodule for synchronized development

## Non-Goals

- Implementing flow-cli itself (separate repo, separate work)
- Modifying flow-cli internal implementation
- Modifying skill content or agent system prompts
- Changing the agentskills.io skill structure (SKILL.md format)
- Migrating existing end-users (flow-cli will handle its own onboarding)

## Architecture & Boundaries

### Always (agent autonomy)

- Delete distribution-related scripts and tests
- Update documentation (SRS, SDS, README, AGENTS.md)
- Restructure `framework/agents/` to canonical format
- Update `deno.json` tasks

### Ask First

- Canonical agent format design (what metadata flow-cli needs)
- Changes to `scripts/task-check.ts` (validation pipeline)

### Never

- Delete or modify skill SKILL.md content
- Remove `deno task check`
- Make changes inside the flow-cli submodule without user approval

## Definition of Done

- [x] `flow-cli` added as git submodule at `flow-cli/`
- [x] `scripts/install.ts` and `scripts/install.test.ts` deleted
- [x] `scripts/check-agents.ts` deleted (IDE-specific validation moves to flow-cli)
- [x] `framework/agents/` contains single canonical agent definitions (no per-IDE subdirs)
- [x] FR-10 delegated to flow-cli in `documents/requirements.md`
- [x] `documents/design.md` updated with flow-cli relationship
- [x] `README.md` documents flow-cli as distribution method
- [x] `deno task check` passes
- [x] `.flow.yaml` configures flow-cli for this project (claude only)
- [x] No references to `scripts/install.ts` remain in codebase (except spec itself)

---

## Phase 1: Submodule & Canonical Agent Format

**Status:** done | **Prerequisites:** none

### Goal

Add flow-cli as a git submodule. Migrate agents from 12 per-IDE files to 4 canonical definitions. Remove IDE-specific agent validation.

### Scope

- `.gitmodules` (new)
- `flow-cli/` (submodule)
- `framework/agents/` (restructure: delete `claude/`, `cursor/`, `opencode/` subdirs; create flat `.md` files)
- `scripts/check-agents.ts` (delete)
- `scripts/task-check.ts` (remove check-agents step)
- `scripts/task-link.ts` (removed — replaced by flow-cli)

### Tasks

1. Add `https://github.com/korchasa/flow-cli` as git submodule at `flow-cli/`
2. Design canonical agent format: single `.md` file per agent. Frontmatter contains only IDE-agnostic metadata (`name`, `description`); body is the shared system prompt. Exact field set to be aligned with flow-cli's resource schema during implementation
3. Create 4 canonical agent files in `framework/agents/` root:
   - `deep-research-worker.md`
   - `flow-console-expert.md`
   - `flow-diff-specialist.md`
   - `flow-skill-executor.md`
4. Delete per-IDE subdirectories: `framework/agents/claude/`, `framework/agents/cursor/`, `framework/agents/opencode/`
5. Delete `scripts/check-agents.ts`
6. Update `scripts/task-check.ts`: remove `check-agents.ts` from the command list (line 36-37)
7. `scripts/task-link.ts` removed — replaced by flow-cli for distribution
8. `.flow.yaml` created at project root for flow-cli configuration

### Verification

- [x] `git submodule status` shows flow-cli
- [x] `framework/agents/` contains exactly 4 `.md` files, no subdirectories
- [x] `scripts/check-agents.ts` does not exist
- [x] flow-cli installs framework resources via `.flow.yaml`
- [x] `deno task check` passes

### Notes

- Canonical agent format uses universal frontmatter (superset of all IDE fields). Transformation rules live in flow-cli's `transformAgent()`.
- `task-link.ts` removed entirely. Dev resources moved to `.claude/` directly. `.dev/` eliminated.

---

## Phase 2: Remove Install Infrastructure

**Status:** done | **Prerequisites:** Phase 1

### Goal

Remove legacy end-user installer and the corresponding SRS requirement. Clean all references.

### Scope

- `scripts/install.ts` (delete)
- `scripts/install.test.ts` (delete)
- `deno.json` (remove `install` task)
- `documents/requirements.md` (remove FR-10)

### Tasks

1. Delete `scripts/install.ts` (761 lines)
2. Delete `scripts/install.test.ts`
3. Remove `"install"` task from `deno.json`
4. Remove FR-10 section (§3.10, lines ~406-443) from `documents/requirements.md`
5. Update implementation order section in `documents/requirements.md` (lines ~32-46): remove FR-10 from dependency graph and notes

### Verification

- [ ] `scripts/install.ts` and `scripts/install.test.ts` do not exist
- [ ] `deno task install` is not a valid command (errors with "unknown task")
- [ ] `grep -r "install.ts" scripts/ documents/ README.md` returns no matches
- [ ] `grep -r "FR-10" documents/` returns no matches
- [ ] `deno task check` passes

### Notes

- FR-10 acceptance criteria (idempotent install, no user data loss, clean-and-copy, multi-IDE) are now flow-cli's responsibility. They don't disappear — they move to flow-cli's own requirements.
- Check that no other FR references depend on FR-10 (currently FR-10 depends on FR-21, but nothing depends on FR-10).

---

## Phase 3: Documentation Update

**Status:** done | **Prerequisites:** Phase 1, Phase 2

### Goal

Update all documentation to reflect flow-cli as the distribution method and the new flat agent structure.

### Scope

- `README.md`
- `documents/design.md`
- `framework/AGENTS.md`
- `scripts/AGENTS.md`

### Tasks

1. Update `documents/design.md` §3.5: replace "Not yet implemented" with description of flow-cli as external distribution tool. Add: submodule relationship, flow-cli repo URL, responsibility boundary (flow = canonical source, flow-cli = transformation + delivery)
2. Update `documents/design.md` §3.2: change from per-IDE subdirectory structure to flat `framework/agents/*.md` with canonical format description. Move IDE frontmatter differences to a "Reference: IDE frontmatter formats" subsection with a note that flow-cli owns the transformation
3. Update `README.md` Installation section: replace `deno run` one-liner with flow-cli installation instructions. Keep "From a local clone" section pointing to flow-cli usage
4. Update `README.md` Project Structure: reflect flat `framework/agents/` (no per-IDE subdirs), add `flow-cli/` submodule entry
5. Update `README.md` "What happens" section: describe flow-cli's role (transforms canonical resources → IDE-specific format, copies to config dirs)
6. Update `framework/AGENTS.md`: change "distributed via `scripts/install.ts`" → "distributed via `flow-cli`". Update agents description from per-IDE variants to canonical format
7. Update `scripts/AGENTS.md`: remove `install` from task list and script descriptions. Remove `check-agents.ts` from check-*.ts list

### Verification

- [ ] `grep -r "install.ts" README.md framework/ scripts/AGENTS.md` returns no matches
- [ ] `grep -r "agents/{claude,cursor,opencode}" documents/ framework/ README.md` returns no matches (or only historical references)
- [ ] README.md mentions flow-cli as primary distribution method
- [ ] `documents/design.md` §3.5 describes flow-cli relationship
- [ ] `deno task check` passes

### Notes

- README installation section should be concise — point to flow-cli's own README for detailed usage.
- README updated: development setup uses flow-cli + `.flow.yaml`.
- `documents/design.md` §3.6 (Conventional Commits `agent:` type) references `framework/agents/**` pattern — this stays valid since agents are still under `framework/agents/`, just flat now.
