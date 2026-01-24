---
name: cmd-qa
description: "Verify task completion, implementation quality, and cleanup as a QA agent."
disable-model-invocation: true
---

# Task: Review & QA

## Overview

Act as a strict QA agent to verify that the current task is fully implemented
according to the user request and plan, ensuring no technical debt or temporary
artifacts remain.

## Context

<context>
The user has completed a coding task and needs a quality assurance pass.
You need to verify the implementation against:
1. The original User Request.
2. The Plan (tracked in `todo_write` or "whiteboard").
3. General code hygiene (no temp files, no dead code).
</context>

## Rules & Constraints

<rules>
1. **Role**: Act as a "Good QA" - be thorough, skeptical, and detail-oriented.
2. **Verification**: Do not assume it works; verify it (read files, run checks if applicable).
3. **Cleanup**: Aggressively look for and flag temporary files, TODOs that should have been done, and unused code/data.
4. **Mandatory**: The agent MUST use `todo_write` to track the execution steps of this review.
5. **Output**: Provide a clear pass/fail report with specific actionable items if issues are found.
</rules>

## Instructions

<step_by_step>

1. **Initialize Review**
   - Use `todo_write` to create a plan for this QA session (e.g., "Analyze
     Request", "Verify Plan", "Code Audit", "Cleanup Check").
   - Read the current `todo_write` status (the "whiteboard") to understand the
     original plan.
   - Read the original user request (from chat history or context).

2. **Verify Implementation vs. Request & Plan**
   - Compare the current codebase state against the original user requirements.
   - Check off each item in the original plan.
   - **Critical**: If a planned item is marked "completed" but code is missing,
     flag it immediately.

3. **Code Hygiene & Cleanup Audit**
   - **Temporary Files**: Search for files like `temp_*`, `*.tmp`, `*.bak`, or
     files in unexpected locations.
   - **Dead Code**: Look for commented-out blocks of code (that aren't
     documentation), unused variables, or "zombie" functions.
   - **Unfinished Work**: Search for `TODO`, `FIXME`, `HACK`, or `implement me`
     comments introduced during this task.

4. **Functional Verification (Static)**
   - logic check: Does the code flow make sense for the requested feature?
   - edge cases: Did the implementation consider obvious edge cases?

5. **Final Report**
   - Summarize findings.
   - If **Passed**: Confirm "Task is fully implemented and clean."
   - If **Failed**: List specific gaps:
     - Missing features.
     - Deviations from plan.
     - Leftover artifacts (files/code). </step_by_step>

## Verification

<verification>
[ ] Confirmed implementation matches User Request.
[ ] Confirmed implementation matches the Plan.
[ ] Checked for and reported any temporary files.
[ ] Checked for and reported any dead code or data.
[ ] Checked for incomplete parts (TODOs, etc.).
</verification>
