---
name: flow-update
description: >-
  Update AssistFlow framework: sync skills/agents, detect convention changes, and migrate scaffolded project artifacts (AGENTS.md, devcontainer, deno.json, scripts/).
disable-model-invocation: true
---

# Task: Update AssistFlow Framework

## Overview

Single entry point for updating the AssistFlow framework in a project. Handles CLI update, skill/agent sync, and migration of scaffolded project artifacts using template diffs as migration source.

## Context

<context>
AssistFlow generates two types of outputs:
- **Synced** (skills/, agents/) — updated automatically by `flowai sync`
- **Scaffolded** (AGENTS.md, .devcontainer/, deno.json tasks, scripts/check.ts, documents/) — created once by setup skills (flow-init, flow-setup-agent-*, flow-skill-configure-deno-commands), then owned by the project

When framework conventions change (TDD flow, planning rules, doc format, devcontainer best practices), scaffolded artifacts become stale. This skill detects and resolves the drift.

See `references/scaffolded-artifacts.md` for the full source-skill → artifact mapping.
</context>

## Rules & Constraints

<rules>
1. **Explicit sync only**: Never auto-sync. Always run `flowai sync` explicitly.
2. **Per-file confirmation**: Show diffs and ask user before modifying each scaffolded artifact. Never silently overwrite.
3. **Preserve user content**: Only update framework-originated sections. Do not touch project-specific customizations.
4. **No changes without evidence**: Only propose migrations when template diffs show relevant convention changes.
5. **Cross-IDE**: Must work for Cursor, Claude Code, and OpenCode projects.
6. **Mandatory tracking**: Use a task management tool (e.g., todo write) to track execution steps.
7. **Atomic commit**: Stage synced files + migrated artifacts together in one commit.
</rules>

## Instructions

<step_by_step>

1. **Update CLI**
   - Run `flowai --version`. It prints the current version and checks JSR for updates.
   - If not installed, inform the user: `deno install -gArf jsr:@korchasa/flowai` and stop.
   - If the output contains "Update available", run the update command shown in the output (e.g., `deno install -g -A -f jsr:@korchasa/flowai@X.Y.Z`).
   - After updating, run `flowai --version` again to verify.

2. **Sync framework**
   - Run `flowai sync -y --skip-update-check` via shell. Capture output.
     - IMPORTANT: `sync` is a **subcommand** — always `flowai sync [flags]`, never bare `flowai [flags]`.
     - Bare `flowai` is blocked in IDE context and will print a help message instead of syncing.

3. **Detect changes**
   - Determine which IDE config dirs exist in the project (check for `.claude/`, `.cursor/`, `.opencode/` directories, or read `.flowai.yaml` `ides` field).
   - For each existing IDE config dir, run `git status --porcelain` filtered to `<ide-dir>/skills/` and `<ide-dir>/agents/`. This catches both new (untracked) and modified files, unlike `git diff` which misses untracked files.
   - If no changes detected — report "Framework is up to date" and stop.

4. **Analyze template diffs**
   - For each changed skill/agent file, run `git diff <file>`.
   - Parse diffs to understand what conventions changed (e.g., new TDD step, updated doc format, changed devcontainer pattern).
   - Summarize changes per skill.

5. **Map to project artifacts**
   - Read `references/scaffolded-artifacts.md` for source-skill → artifact mapping.
   - Cross-reference changed skills with scaffolded artifacts:
     - `flow-init` templates changed → check `./AGENTS.md`, `./documents/AGENTS.md`, `./scripts/AGENTS.md`
     - `flow-setup-agent-code-style-*` changed → check code style section in `./AGENTS.md`
     - `flow-skill-setup-ai-ide-devcontainer` changed → check `.devcontainer/`
     - `flow-skill-configure-deno-commands` changed → check `deno.json` tasks, `scripts/check.ts`
   - If no affected artifacts found — report only sync results and stop.

6. **Propose changes**
   - For each affected artifact, show:
     - What changed in the framework template (summary of diff)
     - Current state of the project artifact (relevant section)
     - Proposed update (preserving project-specific content)
   - Clearly explain **why** the change is recommended.

7. **Apply with confirmation**
   - Show per-file diff to the user.
   - Wait for user approval/rejection of each change.
   - Apply only approved changes.

8. **Commit**
   - Stage all synced files + migrated artifacts.
   - Commit with message: `chore(framework): update AssistFlow framework`
   - Include list of migrated artifacts in commit body.

</step_by_step>
