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

4. **Analyze template diffs (what changed in synced files)**
   - For each changed skill/agent file from step 3, run:
     ```
     git diff -- <ide-dir>/skills/<skill-name>/
     ```
   - Parse diffs to understand what conventions changed (e.g., new TDD step, updated doc format, changed devcontainer pattern).
   - Summarize changes per skill: separate **formatting-only** changes from **substantive** changes (new rules, new sections, changed behavior).
   - IMPORTANT: Do NOT conclude "no migration needed" based on this step alone. Formatting-only diffs in templates can still mask substantive differences between templates and project artifacts. Always proceed to step 5.

5. **Compare templates against project artifacts**
   - Read `references/scaffolded-artifacts.md` for source-skill → artifact mapping.
   - For each affected mapping, run `git diff --no-index` to compare the **template** directly against the **project artifact**:
     ```
     # flow-init templates → project artifacts
     git diff --no-index -- <ide-dir>/skills/flow-init/assets/AGENTS.template.md ./AGENTS.md
     git diff --no-index -- <ide-dir>/skills/flow-init/assets/AGENTS.documents.template.md ./documents/AGENTS.md
     git diff --no-index -- <ide-dir>/skills/flow-init/assets/AGENTS.scripts.template.md ./scripts/AGENTS.md

     # flow-setup-agent-code-style-* → code style section in ./AGENTS.md
     # (read the skill's SKILL.md to find the injection content, then check if ./AGENTS.md has it)

     # flow-skill-setup-ai-ide-devcontainer → .devcontainer/
     # (compare reference files from the skill against project's .devcontainer/)

     # flow-skill-configure-deno-commands → deno.json tasks, scripts/check.ts
     # (compare template in skill against project files)
     ```
   - Templates contain `{{PLACEHOLDERS}}` — ignore placeholder sections in the diff. Focus on **framework-originated sections** (rules, planning rules, TDD flow, doc formats, standard interface).
   - For each artifact, determine: does the project artifact contain all substantive content from the template? If yes — no migration needed. If no — record what's missing.
   - If no gaps found in any artifact — report only sync results and stop.

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
