---
description: Guided commit workflow following Conventional Commits and repository rules
---

# Commit Workflow

## Overview
Guided flow to prepare, commit, and publish changes following Conventional Commits (strict) and repository rules.

## Context
<context>
The project follows Conventional Commits 1.0.0 and uses a structured documentation system in `./documents`. All changes must be reflected in the documentation.
</context>

## Rules & Constraints
<rules>
1. **Strict Commits**: Compose the message in **English** per Conventional Commits 1.0.0 (Strict Profile).
2. **Git Pager**: All git commands must disable pager by setting `GIT_PAGER=cat`.
3. **Inclusion Policy**: Automatically include all verified non-PII changes. **DO NOT** ask for selection unless potential PII is detected.
4. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Pre-flight checks**
   - Run `./run check` if the project wasn’t checked since the last modification.
   - Review `./documents` tree and catalogue facts that need reflection.
   - Inspect changes since last commit using `GIT_PAGER=cat git diff`.
3. **Workspace sync**
   - Update docs under `./documents` (excluding `whiteboard.md`) to reflect current project state in **English**.
   - Apply combined extractive/abstractive summarization.
   - Keep content compact (lists, tables, YAML, Mermaid).
4. **Change review**
   - Study all changes since last commit.
   - Ensure package updates are isolated in their own commit.
   - Stage every verified non-PII change.
5. **Commit creation**
   - Compose the message in **English**.
   - Verify type, scope, header length, body wrapping, and footers.
   - Confirm staged diff contains all relevant files.
6. **Publish**
   - Push the commit to GitHub.
   - If not on `main`, create a pull request via `gh pr create` and share the link.
</step_by_step>

## Verification
<verification>
- [ ] Project checked with `./run check`.
- [ ] `./documents` reviewed and updated to reflect current state.
- [ ] Facts extracted from changes and compressed.
- [ ] Changes reviewed and staged.
- [ ] Dependency changes isolated if applicable.
- [ ] Commit complies with Conventional Commits (strict).
- [ ] PR created and link shared (if not on `main`).
</verification>
