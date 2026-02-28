---
name: flow-review
description: "Review current changes as QA engineer and lead engineer simultaneously: verify task completion, code quality, architecture, and cleanup."
disable-model-invocation: true
---

# Task: Review Changes

## Overview

Act as **QA engineer + lead engineer** simultaneously. Review only the **current
changes** (diff from the task branch or unstaged/staged changes) against the
original request and plan. Verify task completion AND code quality in a single
pass.

## Context

<context>
The user has completed (or nearly completed) a coding task and needs a combined
review before committing. You review ONLY the changes made during this task, NOT
the entire project. Your two hats:
1. **QA**: Did the changes satisfy the request? Is anything missing, broken, or
   left in a dirty state?
2. **Lead Engineer**: Are the changes well-designed, readable, safe, and
   consistent with the project's conventions?

Input sources:
- Git diff (`git diff`, `git diff --cached`, `git diff <base>..HEAD`).
- The original User Request (from chat history).
- The Plan (task management tool or `documents/whiteboard.md`).
- Project conventions (`AGENTS.md`, linter/formatter configs).
</context>

## Rules & Constraints

<rules>
1. **Scope**: Review ONLY changed/added files. Do NOT audit the whole project
   (that is `flow-maintenance`'s job).
2. **Diff-first**: Start from `git diff`. Every finding must reference a
   specific file and line in the diff.
3. **Two roles, one pass**: Produce findings under two categories (QA, Code
   Review) but run them in parallel, not sequentially.
4. **Verification**: Do not assume it works — read files, run project checks
   (linter, tests, type-checker) if available.
5. **Mandatory**: Use a task management tool (e.g., `todo_write`, `todowrite`)
   to track the execution steps of this review.
6. **Severity levels**: Tag each finding as `[critical]`, `[warning]`, or
   `[nit]`. Critical = blocks merge. Warning = should fix. Nit = optional
   improvement.
7. **Output**: Final verdict is **Approve**, **Request Changes**, or
   **Needs Discussion** with actionable items.
</rules>

## Instructions

<step_by_step>

1. **Gather Context**
   - Create a review plan in the task management tool.
   - Collect the diff: `git diff` (unstaged), `git diff --cached` (staged),
     or `git log --oneline <base>..HEAD` + `git diff <base>..HEAD` for
     branch-based changes.
   - Read the original user request and the plan (whiteboard / task list).
   - Identify project conventions from `AGENTS.md` and config files.

2. **QA: Task Completion**
   - Map each requirement/plan item to concrete changes in the diff.
   - Flag requirements with no corresponding changes as `[critical] Missing`.
   - Flag plan items marked "done" but not present in diff as
     `[critical] Phantom completion`.
   - Check for regressions: do changed files break existing functionality?

3. **QA: Hygiene**
   - **Temp artifacts**: New `temp_*`, `*.tmp`, `*.bak`, debug `console.log`/
     `print` statements, hardcoded secrets or localhost URLs.
   - **Unfinished markers**: New `TODO`, `FIXME`, `HACK`, `XXX` introduced in
     this diff (distinguish from pre-existing ones).
   - **Dead code**: Commented-out blocks, unused imports/variables/functions
     added in this diff.

4. **Code Review: Design & Architecture**
   - **Responsibility**: Does each changed file/module stay within its stated
     responsibility? Flag scope creep.
   - **Coupling**: Are new dependencies (imports, API calls) justified?
     Flag tight coupling or circular dependencies.
   - **Abstraction**: Is the level of abstraction appropriate? Flag
     over-engineering (unnecessary interfaces, premature generalization) and
     under-engineering (god-functions, duplicated logic).

5. **Code Review: Implementation Quality**
   - **Naming**: Are new identifiers (vars, funcs, types) clear and consistent
     with project conventions?
   - **Error handling**: Are errors handled explicitly? Flag swallowed
     exceptions, missing error paths, generic catch-all handlers.
   - **Edge cases**: Are boundary conditions (null, empty, overflow, concurrent
     access) handled?
   - **Types & contracts**: Are type signatures precise? Flag `any`, untyped
     parameters, missing return types (where project conventions require them).
   - **Tests**: Do new/changed behaviors have corresponding tests? Are existing
     tests updated for changed behavior?

6. **Code Review: Readability & Style**
   - **Consistency**: Do changes follow the project's established patterns
     (file structure, naming, formatting)?
   - **Comments**: Are non-obvious decisions explained? Flag misleading or
     stale comments.
   - **Complexity**: Flag functions > 40 lines or cyclomatic complexity spikes
     introduced in this diff.

7. **Run Automated Checks**
   - If the project has a check command (`deno task check`, `npm run lint`,
     `make check`, etc.), run it and include results.
   - If tests exist, run them and report failures.

8. **Final Report**
   Output a structured report:

   ```
   ## Review: [Approve | Request Changes | Needs Discussion]

   ### QA Findings
   - [severity] file:line — description

   ### Code Review Findings
   - [severity] file:line — description

   ### Automated Checks
   - [pass|fail] command — summary

   ### Summary
   - Requirements covered: X/Y
   - Critical issues: N
   - Warnings: N
   - Nits: N
   ```

   If **no issues**: short confirmation "Changes look good. All requirements
   covered, no issues found."

</step_by_step>

## Verification

<verification>
[ ] Diff collected and reviewed (not the whole project).
[ ] Each requirement/plan item mapped to changes.
[ ] Hygiene check: no temp files, debug output, unfinished markers in diff.
[ ] Design review: responsibility, coupling, abstraction checked.
[ ] Implementation review: naming, errors, edge cases, types, tests checked.
[ ] Readability: consistency, comments, complexity checked.
[ ] Automated checks executed (if available).
[ ] Structured report produced with severity-tagged findings.
</verification>
