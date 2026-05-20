---
name: flowai-adapt
description: >-
  Adapt project-local flowai primitives (skills, agents, AGENTS.md artifacts, hooks) to project specifics.
  Standalone adaptation — independent of flowai-update.
argument-hint: "[--skills|--agents|--hooks|--assets] [name]"
---

# Task: Adapt Framework Primitives to Project

## Overview

Adapt project-local flowai framework primitives (skills, agents, AGENTS.md artifacts, hooks) to the current project's tech stack and conventions. Runs independently of `flowai-update` — use after first project-local install, stack change, or selectively for specific resources.

<context>
flowai may install generic framework primitives into the project with default examples (e.g., `deno test`, `deno lint`). Projects using other stacks (Python/pytest, Go/golangci-lint, etc.) need adaptation: replacing generic commands/examples with project-specific ones.

Plugin-installed and user-level primitives are read-only for this command. If flowai is installed through an IDE plugin or a global/user config directory, do not rewrite those files. Report that no project-local primitives are available unless the user asks to create a local copy.

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
7. **Project-local only**: Operate only on IDE config dirs inside the current project. Never edit plugin cache files or user-level dirs such as `~/.claude/skills`, `~/.codex/skills`, or marketplace plugin caches.
</rules>

## Instructions

<step_by_step>

1. **Detect IDE config directories**
   - Scan project root for `.claude/`, `.cursor/`, `.opencode/`.
   - Use all detected dirs for subsequent operations.
   - Ignore global/user-level IDE dirs and plugin cache locations.
   - If none found, inform user that no project-local primitives are installed and stop.

2. **Parse arguments**
   - No args -> verify assets first, then adapt a bounded first batch of clearly mismatched skills/agents/hooks.
   - `--skills` -> only skills.
   - `--agents` -> only agents.
   - `--assets` -> only AGENTS.md artifacts.
   - `--hooks` -> only hooks.
   - Positional name arg -> filter to that single resource within selected type(s).

3. **Adapt skills** (when applicable)
   - List all `flowai-*` directories in `{ide}/skills/`.
   - Use only project-local paths under the current working tree.
   - Filter by name argument if provided.
   - If no name argument is provided, pre-filter candidates before launching subagents:
     a. Read AGENTS.md to identify the project stack and canonical commands.
     b. Read each candidate SKILL.md.
     c. Select only skills with obvious stack mismatch or generic examples that conflict with the project stack (for example `deno test`, `deno lint`, `deno fmt` in a Python/pytest or Go project).
     d. Skip skills that do not contain stack-specific commands/examples, and mention them in the summary.
     e. For no-arg full adaptation, cap the first automatic batch to the highest-signal skills (prefer `flowai-commit`, `flowai-do`, and stack setup skills) so the run can still verify assets and ask confirmation before timeout. Report remaining candidates as deferred follow-ups.
   - Launch one `flowai-skill-adapter` subagent per selected skill — **all in parallel**.
   - Each subagent receives the skill name and path. It autonomously reads:
     - Working tree SKILL.md (current version)
     - `git show HEAD:<path>/SKILL.md` (previous adapted version, if exists)
     - AGENTS.md for project context
   - Wait for all subagents to complete.
   - For each adapted skill, show the full relevant diff: `git diff HEAD -- <skill-path>`.
   - Before asking confirmation, verify the diff actually replaces stale commands with project-specific commands from AGENTS.md. If a selected skill still contains the stale command with no project-specific replacement, rerun the adapter for that skill or fix the proposal before presenting it.
   - Ask user for confirmation per skill.
   - Revert rejected adaptations: `git checkout HEAD -- <skill-path>`.

4. **Adapt agents** (when applicable)
   - List all `flowai-*` files in `{ide}/agents/`.
   - Use only project-local paths under the current working tree.
   - Filter by name argument if provided.
   - If no name argument is provided, pre-filter candidates the same way as skills: select only agents whose body contains stack-specific commands/examples that conflict with AGENTS.md.
   - In no-arg full adaptation, if both skills and agents contain mismatches, adapt at least one selected skill and at least one selected agent before asking for final confirmation. Prefer `flowai-commit` for skills and `flowai-console-expert` for agents when they contain stale commands.
   - Before launching each adapter, save the exact YAML frontmatter block (`---` through closing `---`) for that agent.
   - Launch one `flowai-agent-adapter` subagent per selected agent — **all in parallel**.
   - Each subagent receives the agent name and path. It autonomously reads:
     - Working tree agent `.md` (current version)
     - `git show HEAD:<path>` (previous adapted version, if exists)
     - AGENTS.md for project context
   - Wait for all subagents to complete.
   - After each subagent completes, verify that the YAML frontmatter is byte-for-byte identical to the saved block. If it changed, restore the saved frontmatter and keep only body changes.
   - Verify the adapted body no longer contains stale commands that conflict with AGENTS.md. If an adapted Go project agent still contains `deno test`, `deno lint`, or `deno fmt` as recommended project commands, rerun or fix that agent before presenting the diff.
   - For each adapted agent, show the diff: `git diff HEAD -- <agent-path>`.
   - Ask user for confirmation per agent.
   - Revert rejected adaptations: `git checkout HEAD -- <agent-path>`.

5. **Verify AGENTS.md artifacts** (when applicable)
   - In no-arg full adaptation, run this step before launching expensive skill/agent subagents. Asset verification is cheap and must not be starved by primitive adaptation.
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
   - Use only project-local hook scripts.
   - For each: read the script, check if it contains stack-specific commands (e.g., `deno lint`, `npm test`).
   - If stack-agnostic (like current validation hooks) -> skip.
   - If stack-specific commands detected -> adapt via direct agent rewrite (replace commands with project-specific equivalents from AGENTS.md).
   - Show diff, ask confirmation.

7. **Summary**
   - Report totals: X skills scanned, Y skills adapted, A agents scanned, B agents adapted, Z artifacts verified, W hooks checked/adapted.
   - Note any skipped or rejected resources.

</step_by_step>

## Verification

<verification>
[ ] IDE config directories detected.
[ ] Only project-local IDE config dirs used; plugin cache and user-level dirs skipped.
[ ] Arguments parsed correctly (type filter + name filter).
[ ] Skills adapted via `flowai-skill-adapter` subagents (parallel).
[ ] Agents adapted via `flowai-agent-adapter` subagents (parallel).
[ ] Root AGENTS.md artifact compared template-vs-artifact.
[ ] Hook scripts checked for stack-specific commands.
[ ] Diff shown and user confirmation obtained per resource.
[ ] Rejected adaptations reverted.
[ ] Summary produced.
</verification>
