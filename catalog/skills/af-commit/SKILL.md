---
name: af-commit
description: Automated commit workflow with atomic grouping
disable-model-invocation: true
---

# Commit Workflow

## Overview

Automated workflow to prepare, group, and commit changes following "Atomic Commit" principles and Conventional Commits.

## Context

<context>
The project follows Conventional Commits 1.0.0 and uses a structured documentation system in `./documents`. All changes must be reflected in the documentation.
</context>

## Rules & Constraints

<rules>
1. **Atomic Commits**: Group changes by logical purpose, not by file type:
   - Each commit = ONE logical change (one feature, one bug fix, one refactoring).
   - Documentation describing a code change belongs in the SAME commit.
   - `docs:` type ONLY when changes are exclusively in documentation.
   - `style:` type ONLY when changes are exclusively formatting/style.
   - Logically independent changes MUST be in separate commits (e.g., unrelated bug fix must not be in a feature commit).
2. **Automation**: Automatically group and commit changes. DO NOT ask the user for permission to split commits.
3. **Dependency Updates**: ALWAYS use `build:` prefix for dependency and configuration updates (e.g., `build: update dependencies`). Do NOT use `chore:` type.
4. **Strict Commits**: Compose messages in **English** per Conventional Commits 1.0.0.
   - **MANDATORY**: ALWAYS prefix commit messages with a type (e.g., `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `build:`).
   - **Scope**: MAY use optional scope in parentheses to provide context, e.g., `feat(llm): add retry logic`.
   - **Breaking Changes**: MUST indicate breaking changes by adding a `!` before the colon (e.g., `feat!: change API contract`) OR by adding `BREAKING CHANGE:` in the footer.
   - **Example**: `feat: add user authentication` or `build: bump version to 1.1.0`.
   - **CRITICAL**: Commits without these prefixes are STRICTLY FORBIDDEN.
5. **Git Pager**: Use `GIT_PAGER=cat` for all git commands.
6. **Planning**: The agent MUST use `todo_write` to track the execution steps.
7. **Documentation First**: Every logical change MUST be reflected in documentation. Commits without corresponding documentation updates (if applicable) are forbidden.
8. **Error Handling**: On any error (commit failure, merge conflict, unexpected git state): investigate the cause, propose a fix method to the user, and **STOP** without making corrections.
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
3. **Pre-commit Verification**
   - Run project-specific verification (linter, formatter, tests) if configured.
   - If verification fails, report the error and **STOP**.
4. **Atomic Grouping Strategy**
   - Analyze all file changes and hunks.
   - **Formulate a Commit Plan** by grouping changes by logical purpose:
     - Each logically independent change = one commit.
     - Documentation describing a code change goes in the same commit as that code.
     - Use appropriate type: `feat:`, `fix:`, `refactor:`, `build:`, `test:`, `docs:` (standalone only), `style:` (standalone only).
   - _If a single file contains logically independent changes, sequentially edit the file to isolate each change, stage and commit it, then apply the next._
5. **Commit Execution Loop**
   - **Iterate** through the planned groups:
     1. Stage specific files for the group.
     2. Verify the staged content matches the group's intent.
     3. Commit with a Conventional Commits message.
</step_by_step>

## Verification

<verification>
- [ ] Documentation audit performed and files updated in `./documents`.
- [ ] Compression rules applied (facts preserved, content minimized).
- [ ] Pre-commit verification passed (if configured).
- [ ] Changes grouped by logical purpose (no mixed independent concerns).
- [ ] Commits executed automatically without user prompt.
- [ ] Conventional Commits format used.
</verification>
