---
name: flowai-adapt
description: >-
  Adapt all installed framework primitives (skills, agents, AGENTS.md artifacts, hooks) to project specifics.
  Standalone adaptation — independent of flowai-update.
argument-hint: "[--skills|--agents|--hooks|--assets] [name]"
---

# Task: Adapt Framework Primitives to Project

## Overview

Adapt installed flowai framework primitives (skills, agents, AGENTS.md artifacts, hooks) to the current project's tech stack and conventions. Runs independently of `flowai-update` — use after first install, stack change, or selectively for specific resources.

<context>
flowai installs generic framework primitives with default examples (e.g., `deno test`, `deno lint`). Projects using other stacks (Python/pytest, Go/golangci-lint, etc.) need adaptation: replacing generic commands/examples with project-specific ones.

Adaptation state is tracked through git history — no extra metadata fields needed. The working tree contains the current version; `git show HEAD:<path>` provides the previous adapted version for 3-way merge.

Two subagents handle the actual adaptation work:
- `flowai-skill-adapter` — adapts a single skill's SKILL.md
- `flowai-agent-adapter` — adapts a single agent's .md body (preserving frontmatter)
</context>

## Rules & Constraints

<rules>
1. **Reuse subagents**: Delegate skill adaptation to `flowai-skill-adapter`, agent adaptation to `flowai-agent-adapter`. Never duplicate their logic.
2. **Per-file confirmation**: Show diffs and ask user before accepting each adapted resource. Never silently overwrite.
3. **Parallel execution**: Launch one subagent per resource — all in parallel for each resource type.
4. **Cross-IDE**: Detect and work with any installed IDE config dir (`.claude/`, `.cursor/`, `.opencode/`).
5. **Mandatory tracking**: Use a task management tool (e.g., todo write) to track execution steps.
6. **No auto-commit**: Adaptation changes are staged but not committed. User decides when to commit.
</rules>

## Instructions

<step_by_step>

1. **Detect IDE config directories**
   - Scan project root for `.claude/`, `.cursor/`, `.opencode/`.
   - Use all detected dirs for subsequent operations.
   - If none found, inform user and stop.

2. **Parse arguments**
   - No args -> adapt ALL types (skills, agents, assets, hooks).
   - `--skills` -> only skills.
   - `--agents` -> only agents.
   - `--assets` -> only AGENTS.md artifacts.
   - `--hooks` -> only hooks.
   - Positional name arg -> filter to that single resource within selected type(s).

3. **Adapt skills** (when applicable)
   - List all `flowai-*` directories in `{ide}/skills/`.
   - Filter by name argument if provided.
   - Launch one `flowai-skill-adapter` subagent per skill — **all in parallel**.
   - Each subagent receives the skill name and path. It autonomously reads:
     - Working tree SKILL.md (current version)
     - `git show HEAD:<path>/SKILL.md` (previous adapted version, if exists)
     - AGENTS.md for project context
   - Wait for all subagents to complete.
   - For each adapted skill, show the diff: `git diff HEAD -- <skill-path>`.
   - Ask user for confirmation per skill.
   - Revert rejected adaptations: `git checkout HEAD -- <skill-path>`.

4. **Adapt agents** (when applicable)
   - List all `flowai-*` files in `{ide}/agents/`.
   - Filter by name argument if provided.
   - Launch one `flowai-agent-adapter` subagent per agent — **all in parallel**.
   - Each subagent receives the agent name and path. It autonomously reads:
     - Working tree agent `.md` (current version)
     - `git show HEAD:<path>` (previous adapted version, if exists)
     - AGENTS.md for project context
   - Wait for all subagents to complete.
   - For each adapted agent, show the diff: `git diff HEAD -- <agent-path>`.
   - Ask user for confirmation per agent.
   - Revert rejected adaptations: `git checkout HEAD -- <agent-path>`.

5. **Verify AGENTS.md artifacts** (when applicable)
   - Read `pack.yaml` from installed packs (via `.flowai.yaml`) to get the `assets:` mapping (template name -> artifact path).
   - If `pack.yaml` is unavailable, use default mapping:
     - `AGENTS.template.md` -> `AGENTS.md`
   - If the project still has `documents/AGENTS.md` or `scripts/AGENTS.md`, defer to `flowai-update` or `flowai-init` to run the legacy-collapse procedure — do NOT handle collapse here.
   - For each template -> artifact pair:
     a. Read the framework template from `{ide}/assets/`.
     b. Read the project artifact.
     c. Compare using `git diff --no-index -- <template> <artifact>`.
     d. Ignore `{{PLACEHOLDER}}` sections in the diff.
     e. Focus on **framework-originated sections** (rules, TDD flow, doc formats, planning rules).
     f. If framework sections are outdated -> propose update with before/after.
   - Ask confirmation per artifact.

6. **Adapt hooks** (when applicable)
   - List hook scripts in `{ide}/scripts/` (installed by flowai).
   - For each: read the script, check if it contains stack-specific commands (e.g., `deno lint`, `npm test`).
   - If stack-agnostic (like current validation hooks) -> skip.
   - If stack-specific commands detected -> adapt via direct agent rewrite (replace commands with project-specific equivalents from AGENTS.md).
   - Show diff, ask confirmation.

7. **Summary**
   - Report totals: X skills adapted, Y agents adapted, Z artifacts verified, W hooks adapted.
   - Note any skipped or rejected resources.

</step_by_step>

## Verification

<verification>
[ ] IDE config directories detected.
[ ] Arguments parsed correctly (type filter + name filter).
[ ] Skills adapted via `flowai-skill-adapter` subagents (parallel).
[ ] Agents adapted via `flowai-agent-adapter` subagents (parallel).
[ ] Root AGENTS.md artifact compared template-vs-artifact.
[ ] Hook scripts checked for stack-specific commands.
[ ] Diff shown and user confirmation obtained per resource.
[ ] Rejected adaptations reverted.
[ ] Summary produced.
</verification>
