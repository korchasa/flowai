---
name: flow-review-and-commit
description: "Composite command: review changes then commit only if approved. Inlines flow-review and flow-commit with a verdict gate between them."
disable-model-invocation: true
---

# Task: Review and Commit

## Overview

Two-phase command: first review current changes (QA + code review), then commit
only if approved. A verdict gate between the phases ensures only approved changes
get committed.

## Context

<context>
The user has completed a coding task and wants a single command to review and
commit. This command inlines both workflows:
1. **Phase 1 — Review** (from `flow-review`): QA + code review, produces verdict
2. **Phase 2 — Commit** (from `flow-commit`): documentation audit, verification,
   atomic grouping, commit

The gate logic prevents committing code that has critical issues.

NOTE: The step_by_step sections of Phase 1 and Phase 2 are kept in sync with
flow-review/SKILL.md and flow-commit/SKILL.md respectively. The sync check
script (scripts/check-skill-sync.ts) verifies this — if you change one, update
the other.
</context>

## Rules & Constraints

<rules>
1. **Two Phases**: Execute Phase 1 (review) fully before considering Phase 2
   (commit). Never interleave.
2. **Gate Logic**: After Phase 1, check the verdict. Only **Approve** proceeds
   to Phase 2. **Request Changes** or **Needs Discussion** → output the review
   report and STOP. Do not commit.
3. **No partial commit**: If Phase 1 itself fails (errors, crashes), STOP — do
   not proceed to Phase 2.
4. **Transparency**: Output both review findings and commit results to the user.
5. **Planning**: Use a task management tool (e.g., `todo_write`, `todowrite`)
   to track steps.
</rules>

## Instructions

<step_by_step>

1. **Empty Diff Guard**
   - Run `git diff --stat`, `git diff --cached --stat`, and
     `git status --short`.
   - If there are NO changes (no diff, no staged files, no untracked files),
     report "No changes to review" and STOP.

2. **Gather Context**
   - Create a review plan in the task management tool.
   - Collect the diff: `git diff` (unstaged), `git diff --cached` (staged),
     or `git log --oneline <base>..HEAD` + `git diff <base>..HEAD` for
     branch-based changes.
   - Read the original user request and the plan (whiteboard / task list).
   - Look for project conventions in `AGENTS.md` and config files.
     If these files do not exist, rely on conventions visible in the diff
     and surrounding code.

3. **QA: Task Completion**
   - Map each requirement/plan item to concrete changes in the diff.
   - Flag requirements with no corresponding changes as `[critical] Missing`.
   - Flag plan items marked "done" but not present in diff as
     `[critical] Phantom completion`.
   - Check for regressions: do changed files break existing functionality?

4. **QA: Hygiene**
   - **Temp artifacts**: New `temp_*`, `*.tmp`, `*.bak`, debug `console.log`/
     `print` statements, hardcoded secrets or localhost URLs.
   - **Unfinished markers**: New `TODO`, `FIXME`, `HACK`, `XXX` introduced in
     this diff (distinguish from pre-existing ones).
   - **Dead code**: Commented-out blocks, unused imports/variables/functions
     added in this diff.

5. **Code Review: Design & Architecture**
   - **Responsibility**: Does each changed file/module stay within its stated
     responsibility? Flag scope creep.
   - **Coupling**: Are new dependencies (imports, API calls) justified?
     Flag tight coupling or circular dependencies.
   - **Abstraction**: Is the level of abstraction appropriate? Flag
     over-engineering (unnecessary interfaces, premature generalization) and
     under-engineering (god-functions, duplicated logic).

6. **Code Review: Implementation Quality**
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

7. **Code Review: Readability & Style**
   - **Consistency**: Do changes follow the project's established patterns
     (file structure, naming, formatting)?
   - **Comments**: Are non-obvious decisions explained? Flag misleading or
     stale comments.
   - **Complexity**: Flag functions > 40 lines or cyclomatic complexity spikes
     introduced in this diff.
   - **Clarity**: Flag clarity sacrificed for brevity — nested ternaries, dense
     one-liners, overly compact expressions. Explicit code is preferred over
     clever short forms.

8. **Run Automated Checks**
   - If the project has a check command (`deno task check`, `npm run lint`,
     `make check`, etc.), run it and include results.
   - If no check command is found, explicitly note "No automated checks
     configured" in the report — do not silently skip.
   - If tests exist, run them and report failures.

9. **Final Report**
   Output a structured report with the verdict on the FIRST line:

   ```
   ## Review: [Approve | Request Changes | Needs Discussion]

   ### QA Findings
   - [severity] file:line — description

   ### Code Review Findings
   - [severity] file:line — description

   ### Automated Checks
   - [pass|fail|skipped] command — summary

   ### Summary
   - Requirements covered: X/Y
   - Critical issues: N
   - Warnings: N
   - Nits: N
   ```

   If **no issues**: short confirmation "Changes look good. All requirements
   covered, no issues found."

</step_by_step>

### Verdict Gate

After completing the review report above:
- If verdict is `## Review: Approve` → proceed to Phase 2 below.
- If verdict is `## Review: Request Changes` or `## Review: Needs Discussion`
  → output the full review report to the user and **STOP**. Do NOT proceed.
- If the review phase crashed or produced no verdict → report the error and
  **STOP**.

### Phase 2 — Commit

<step_by_step>

1. **Initialize**
   - Use a task management tool (e.g., todo write) to create a plan based on these steps.
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
4. **Atomic Grouping Strategy (Subagent)**
   - Use the `flow-diff-specialist` subagent to analyze changes and generate a commit plan.
   - Pass the following prompt to the subagent: "Analyze the current git changes. Default to ONE commit for all changes. Split into multiple commits ONLY if changes serve genuinely different, unrelated purposes. If the user explicitly requested a split, follow that request. Return a JSON structure with proposed commits."
   - The subagent will return a JSON structure with proposed commits.
   - **Review the plan critically**: If the subagent proposes >2 commits, verify each split is justified by genuinely independent purposes. Merge groups that serve the same purpose.
   - **Formulate a Commit Plan** based on the subagent's output:
     - Default: all changes = one commit.
     - Split only when changes serve different, unrelated purposes OR the user explicitly requested a split.
     - Documentation describing a code change goes in the same commit as that code.
      - Use appropriate type: `feat:`, `fix:`, `refactor:`, `build:`, `test:`, `agent:`, `docs:` (standalone only), `style:` (standalone only).
   - _Hunk-level splitting (isolating changes within a single file) is an exceptional measure. Use ONLY when the user explicitly requests it or when changes within one file serve genuinely unrelated purposes._
5. **Commit Execution Loop**
   - **Iterate** through the planned groups:
     1. Stage specific files for the group.
     2. Verify the staged content matches the group's intent.
     3. Commit with a Conventional Commits message.

</step_by_step>

### Final Combined Report

Output a combined summary:
- **Review**: verdict + key findings (or "no issues found")
- **Commit**: files committed, commit message(s)

## Verification

<verification>
[ ] Empty diff guard checked before starting.
[ ] Review phase completed with structured report.
[ ] Verdict gate enforced: only Approve proceeds to commit.
[ ] Documentation audit performed and files updated.
[ ] Pre-commit verification passed (if configured).
[ ] Changes grouped by logical purpose.
[ ] Commits executed with Conventional Commits format.
[ ] Both review and commit results reported to user.
</verification>
