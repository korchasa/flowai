---
name: flowai-commit-beta
description: Streamlined commit workflow — fewer tool calls, targeted doc sync
---

# Commit Workflow

## Overview

Automated workflow to prepare, group, and commit changes following "Atomic Commit" principles and Conventional Commits. Streamlined version: inline grouping (no subagent), targeted doc sync instead of full audit.

## Context

<context>
The project follows Conventional Commits 1.0.0 and uses a structured documentation system in `./documents`. All changes must be reflected in the documentation.
</context>

## Rules & Constraints

<rules>
1. **Consolidation-First Commits**: Default to ONE commit. Split ONLY when changes are **genuinely independent** (different business purpose, no causal relationship):
   - **Default**: ALL changes related to the same purpose → ONE commit. This includes: implementation code + its tests + its documentation + its configuration.
   - **Split trigger**: Changes serve **different, unrelated purposes** (e.g., an unrelated bug fix mixed with a feature, or a dependency update unrelated to the feature being developed).
   - **User override**: If the user explicitly asks to split (e.g., "split them", "separate X from Y"), follow the user's request.
   - Documentation describing a code change belongs in the SAME commit as that code.
   - `docs:` type ONLY when changes are exclusively in documentation unrelated to any code change.
   - `style:` type ONLY when changes are exclusively formatting/style unrelated to any logic change.
   - **Anti-patterns (DO NOT split these into separate commits)**:
     - Feature code + tests for that feature → 1 commit
     - Feature code + docs describing that feature → 1 commit
     - Refactored function + updated imports across files → 1 commit
     - Config change required by a feature + the feature code → 1 commit
2. **Automation**: Automatically group and commit changes. DO NOT ask the user for permission to split commits.
3. **Dependency Updates**: ALWAYS use `build:` prefix for dependency and configuration updates (e.g., `build: update dependencies`). Do NOT use `chore:` type.
4. **Strict Commits**: Compose messages in **English** per Conventional Commits 1.0.0.
   - **MANDATORY**: ALWAYS prefix commit messages with a type (e.g., `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `build:`, `agent:`).
   - **`agent:` type**: Use for changes to AI agent configuration, skills, and rules:
     - **Scope**: Files in `framework/agents/`, `framework/skills/`, `**/AGENTS.md`, `**/CLAUDE.md`, IDE agent/skill directories (`.claude/agents/`, `.claude/skills/`).
     - **Auto-detection**: When ALL staged files match the `agent:` scope paths above, automatically use `agent:` type without asking.
     - **Mixed changes**: If staged files include both agent/skill files AND application code, use the appropriate application type (`feat:`, `fix:`, etc.) — NOT `agent:`.
     - **Example**: `agent: update flowai-commit skill with atomic grouping rules` or `agent(flowai-init): add brownfield detection logic`.
   - **Scope**: MAY use optional scope in parentheses to provide context, e.g., `feat(llm): add retry logic`.
   - **Breaking Changes**: MUST indicate breaking changes by adding a `!` before the colon (e.g., `feat!: change API contract`) OR by adding `BREAKING CHANGE:` in the footer.
   - **CRITICAL**: Commits without these prefixes are STRICTLY FORBIDDEN.
5. **Git Pager**: Use `GIT_PAGER=cat` for all git commands.
6. **Documentation First**: Every logical change MUST be reflected in documentation. Commits without corresponding documentation updates (if applicable) are forbidden.
7. **Error Handling**: On any error (commit failure, merge conflict, unexpected git state): investigate the cause, propose a fix method to the user, and **STOP** without making corrections.
8. **Session Scope**: If the working tree contains pre-existing uncommitted changes (files already modified/untracked at session start — visible in git status snapshot from system context), exclude them from the commit scope. Only commit files created or modified by the agent in the current session. If unsure which changes are yours, ask the user before staging.
</rules>

## Instructions

<step_by_step>

1. **Gather Changes**
   - Collect all git state in a single command:
     `git status -s && echo '---DIFF---' && git diff && echo '---CACHED---' && git diff --cached && echo '---LOG---' && git log --oneline -5`
   - If working directory is clean (no changes at all), report "Nothing to commit" and STOP.
2. **Documentation Sync** _(mandatory — do NOT skip)_
   - **Determine scope**: look at the file paths from step 1. Classify the change:
     - **Infra-only**: ALL changed files are tests (`*_test.*`, `*.test.*`), CI (`.github/`), acceptance tests (`acceptance-tests/`), formatting, or dev-environment (`.devcontainer/`). → Skip doc sync. Output: `Documentation sync: skipped — infra-only changes (tests/CI/acceptance-tests)`.
     - **Product changes**: anything else → proceed with doc sync below.
   - **Find the mapping**: check if `./AGENTS.md` has a `## Documentation Map` section. If yes → use the path→document mapping from there. If no → use the default mapping:
     - New/changed exported functions, classes, types → SDS (component section)
     - New feature, CLI command, skill, agent → SRS (new FR) + SDS (new component section)
     - Removed feature/component → remove from SRS + SDS
     - Changed behavior (fix that alters documented contract) → SDS (update description)
     - Renamed/moved modules → SDS (update paths and structure)
     - Config/build changes → SDS only if architecture section references them
     - README.md → update only for user-facing changes (new install steps, new features, changed API)
   - **Sync each affected document**:
     - For each changed file, identify which document section describes its component (using the mapping).
     - **READ** that specific section from the document.
     - **COMPARE** the section text with the actual code after your changes. Ask: "Does this section accurately describe the code as it is NOW?"
     - If inaccurate → update the section. If accurate → no change needed.
     - For **new** functionality with no corresponding section → add a new section.
     - For **removed** functionality → remove the section.
   - **Gather change context** for commit message and doc updates:
     1. **Active task file**: If the user referenced a task file in this session, read it from `documents/tasks/`. Do NOT scan all task files.
     2. **Session context**: User messages explaining intent, decisions, requirements.
   - **Apply Compression Rules** to any doc updates:
     - Use combined extractive + abstractive summarization (preserve all facts, minimize words).
     - Compact formats: lists, YAML, Mermaid diagrams.
     - Concise language, abbreviations after first mention.
   - **Execute Updates**: Edit documents BEFORE proceeding to grouping.
3. **Commit Grouping**
   - Review the diff from step 1. Determine the primary business purpose.
   - **Default: ALL changes → 1 commit.** Only split if:
     a. Changes serve genuinely different, unrelated purposes (no causal link), OR
     b. The user explicitly requested a split.
   - Documentation describing a code change → same commit as that code.
   - Tests for a feature → same commit as that feature.
   - If splitting: use appropriate Conventional Commits types for each group.
   - Hunk-level splitting (within a single file) — ONLY when user explicitly requests it.
4. **Commit Execution Loop**
   - **Iterate** through the planned groups:
     1. Stage specific files for the group.
     2. Verify the staged content matches the group's intent.
     3. Commit with a Conventional Commits message.
5. **Task file Cleanup** _(only if a task file was used in step 2)_
   - If the user referenced a task file and it contains a `## Definition of Done` (or similar checklist):
     a. Compare each DoD item against the committed changes.
     b. If **all** DoD items are satisfied by the committed code and documentation → delete the task file (`git rm`) and include the deletion in the commit (amend the last commit or create a separate `docs: remove completed task file` commit).
     c. If **any** DoD item is NOT satisfied → ask the user: "The task file has incomplete items: [list]. Delete it anyway or keep for next session?" Act on the user's answer.
   - If the task file has no DoD section → ask the user whether the planned work is complete and whether to delete the task file.
6. **Session Complexity Check → Auto-Invoke Reflect**
   - After all commits are done, analyze the current conversation for complexity signals:
     - Errors or failed attempts occurred (test failures, lint errors, build errors).
     - Agent retried the same action multiple times.
     - User corrected the agent's approach or output.
     - Workarounds or non-obvious solutions were applied.
   - Also check the **user's invocation message** for explicit complexity descriptors: phrases like "rough session", "had to retry", "wrong approach", "failed", "had to correct you". These count as direct signals.
   - If **any** of these signals are detected:
     a. Announce briefly which signals fired (one line, e.g., "Detected retries and user correction — running /flowai-reflect").
     b. **Pre-command signal check**: if the signals appear only in the invocation message (i.e., the problematic interactions predated this command and are not visible in the conversation history), output: "You mentioned a rough session — briefly describe what went wrong and what you corrected. This will be included as reflect context." Use the user's answer as additional context when invoking reflect.
     c. Invoke the `flowai-reflect` skill directly (via the Skill tool, native slash-command execution, or inline execution of its `SKILL.md` instructions — whichever the host IDE supports).
     d. Do NOT ask the user for confirmation before invoking; proceed autonomously (the context question in step b is not a confirmation request — it gathers missing information).
   - If none detected, skip silently.
7. **Post-Reflect Cleanup Commit** _(skip if reflect produced no edits)_
   - Run `git status`. If reflect left working-tree edits (typically `AGENTS.md`, `**/CLAUDE.md`, `framework/**`, `.claude/**`, `documents/**`): stage them and commit as `agent: apply reflect-suggested improvements` (or narrower scope, e.g. `agent(flowai-commit-beta): tighten doc-audit gate`). Do NOT amend earlier commits — keep reflect-driven edits as a separate commit. If `git status` is clean, skip.
8. **Verify Clean State**
   - Run `git status` to confirm all changes are committed.
   - If uncommitted changes remain, investigate and report to the user.
</step_by_step>

## Verification

<verification>
- [ ] Documentation sync performed: affected sections updated or justified skip.
- [ ] Compression rules applied (facts preserved, content minimized).
- [ ] Changes grouped by logical purpose (no mixed independent concerns).
- [ ] Commits executed automatically without user prompt.
- [ ] Conventional Commits format used.
- [ ] Task file cleanup: completed task files deleted, partial task files confirmed with user.
- [ ] Session complexity check performed; `/flowai-reflect` auto-invoked if signals detected.
- [ ] Post-reflect cleanup commit created when reflect left uncommitted edits to project instructions; otherwise skipped.
</verification>
