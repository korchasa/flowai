---
name: af-commit
description: Automated commit workflow with atomic grouping
disable-model-invocation: true
---

# Commit Workflow

## Overview

Automated workflow to prepare, group, commit, and publish changes following
"Atomic Commit" principles and Conventional Commits.

## Context

<context>
The project follows Conventional Commits 1.0.0 and uses a structured documentation system in `./documents`. All changes must be reflected in the documentation.
</context>

## Rules & Constraints

<rules>
1. **Atomic Commits**: STRICTLY separate changes according to these principles:
   - **Refactor vs Logic**: Never mix behavior changes with refactoring.
   - **Style vs Code**: Formatting changes (Prettier/Linter) must be separate.
   - **Logical Isolation**: Independent bugs/features must be separate commits.
   - **Deps vs Logic**: Dependency updates (package.json) separate from business logic.
   - **Config vs Impl**: Build/Config changes separate from source code.
   - **Generated Files**: Generated artifacts separate from logic source.
2. **Automation**: Automatically group and commit changes. DO NOT ask the user for permission to split commits.
3. **Strict Commits**: Compose messages in **English** per Conventional Commits 1.0.0.
4. **Git Pager**: Use `GIT_PAGER=cat` for all git commands.
5. **Planning**: The agent MUST use `todo_write` to track the execution steps.
6. **Documentation First**: Every logical change MUST be reflected in documentation. Commits without corresponding documentation updates (if applicable) are forbidden.
</rules>

## Instructions

<step_by_step>

1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Documentation Audit & Compression**
   - **Analyze Impact**: For each code change, identify which documentation files must be updated:
     - `requirements.md`: If functional/non-functional requirements changed.
     - `design.md`: If architecture, components, or data structures changed.
     - `AGENTS.md`: If global project rules or agent definitions changed.
   - **Apply Compression Rules**:
     - Use **combined extractive + abstractive summarization** (preserve all facts, minimize words).
     - Use compact formats: lists, tables, YAML, or Mermaid diagrams.
     - Optimize lexicon: use concise language, remove filler phrases, and use abbreviations after first mention.
   - **Execute Updates**: Perform necessary edits in `./documents` BEFORE proceeding to grouping.
3. **Atomic Grouping Strategy**
   - Analyze all file changes and hunks.
   - **Formulate a Commit Plan** by grouping changes into atomic units:
     1. **Style/Formatting**: `style: ...`
     2. **Refactoring**: `refactor: ...`
     3. **Config/Deps**: `chore: ...` or `build: ...`
     4. **Documentation**: `docs: ...`
     5. **Features/Fixes**: `feat: ...` or `fix: ...` (split if logically
        distinct)
   - _Note: Use `git add -p` logic if a single file contains mixed types of
     changes (e.g., refactor + fix)._
4. **Commit Execution Loop**
   - **Iterate** through the planned groups:
     1. Stage specific files or hunks for the group.
     2. Verify the staged content matches the group's intent.
     3. Commit with a Conventional Commits message.
     - _Note: Ensure documentation changes are included in the same commit as the logic they describe._
5. **Publish**
   - Push all created commits to GitHub.
   - If not on `main`, create a pull request via `gh pr create` and share the
     link. </step_by_step>

## Verification

<verification>
- [ ] Documentation audit performed and files updated in `./documents`.
- [ ] Compression rules applied (facts preserved, content minimized).
- [ ] Changes grouped into Atomic Commits (no mixed logical concerns).
- [ ] Commits executed automatically without user prompt.
- [ ] Conventional Commits format used.
- [ ] PR created/pushed.
</verification>
