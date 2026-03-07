---
name: flow-review-and-commit
description: "Composite command: review changes, then commit only if approved. Chains flow-review and flow-commit with a verdict gate."
disable-model-invocation: true
---

# Task: Review and Commit

## Overview

Composite command that chains `flow-review` (QA + code review) with `flow-commit`
(atomic commit workflow). A verdict gate between them ensures only approved changes
get committed.

## Context

<context>
The user has completed a coding task and wants a single command to review and commit.
This command orchestrates two existing skills:
1. `flow-review` — performs QA and code review, produces a verdict
2. `flow-commit` — handles documentation audit, verification, atomic grouping, commit

The gate logic prevents committing code that has critical issues.
</context>

## Rules & Constraints

<rules>
1. **Delegation**: Use `flow-review` and `flow-commit` skills as-is. Do NOT
   reimplement their logic.
2. **Gate Logic**: After review, check the verdict. Only **Approve** proceeds to
   commit. **Request Changes** or **Needs Discussion** → output review report and
   STOP. Do not commit.
3. **Transparency**: Output both review findings and commit results to the user.
4. **Planning**: Use a task management tool (e.g., `todo_write`, `todowrite`) to
   track steps.
5. **No partial commit**: If the review phase itself fails (errors, crashes),
   STOP — do not proceed to commit.
6. **Empty diff guard**: If there are no changes to review (empty `git diff` and
   `git diff --cached` and no untracked files), report this and STOP — do not
   invoke review or commit.
</rules>

## Instructions

<step_by_step>

1. **Initialize**
   - Create a task list to track the steps below.
   - Run `git diff --stat`, `git diff --cached --stat`, and `git status --short`
     to check for changes.
   - If there are NO changes (no diff, no staged files, no untracked files),
     report "No changes to review or commit" and STOP.

2. **Review Phase**
   - Invoke the `flow-review` skill. Let it run its full workflow (QA + code
     review, automated checks, structured report).
   - Capture the full output including the verdict header.

3. **Gate Check**
   - Look for the verdict in the review output:
     - `## Review: Approve` → proceed to step 4.
     - `## Review: Request Changes` → output the full review report to the user
       and STOP. Do NOT proceed to commit.
     - `## Review: Needs Discussion` → output the full review report to the user
       and STOP. Do NOT proceed to commit.
   - If the review phase crashed or produced no verdict → report the error and
     STOP.

4. **Commit Phase**
   - Invoke the `flow-commit` skill. Let it run its full workflow (documentation
     audit, pre-commit verification, atomic grouping, commit execution).
   - Capture commit results (files committed, commit messages).

5. **Final Report**
   - Output a combined summary:
     - **Review**: verdict + key findings (or "no issues found")
     - **Commit**: files committed, commit message(s)

</step_by_step>

## Verification

<verification>
[ ] Empty diff guard checked before starting.
[ ] flow-review skill invoked (not reimplemented).
[ ] Verdict extracted from review output.
[ ] Gate enforced: only Approve proceeds to commit.
[ ] flow-commit skill invoked (not reimplemented).
[ ] Both review and commit results reported to user.
</verification>
