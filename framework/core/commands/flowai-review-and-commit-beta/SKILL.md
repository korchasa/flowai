---
name: flowai-review-and-commit-beta
description: "Streamlined composite: review then commit. Targeted doc sync, no subagent, no diff re-reading in Phase 2."
---

# Task: Review and Commit

## Overview

Two-phase command: first review current changes (QA + code review), then commit
only if approved. A verdict gate between the phases ensures only approved changes
get committed. Streamlined version: Phase 2 reuses diff from Phase 1, targeted
doc sync, inline commit grouping.

## Context

<context>
The user has completed a coding task and wants a single command to review and
commit. This command inlines both workflows:
1. **Phase 1 — Review** (from `flowai-review`): QA + code review, produces verdict
2. **Phase 2 — Commit** (from `flowai-commit-beta`): targeted doc sync, inline
   grouping, commit

The gate logic prevents committing code that has critical issues.

NOTE: Phase 2 steps 2-7 are kept in sync with flowai-commit-beta/SKILL.md.
Step 1 intentionally diverges: Phase 2 reuses diff from Phase 1 instead of
re-reading. The sync check script (scripts/check-skill-sync.ts) allows this
divergence via allowedDivergentSteps.
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
5. **Session Scope**: Compare current `git status` with the git status snapshot
   from session start (available in system context). Files already
   modified/untracked at session start are outside the review and commit scope —
   note them but do not review or commit. Focus on changes made in the current
   session. If unsure which changes are yours, ask the user before staging.
</rules>

## Instructions

<step_by_step>

1. **Empty Diff Guard**
   - Run `git diff --stat`, `git diff --cached --stat`, and
     `git status --short`.
   - If there are NO changes (no diff, no staged files, no untracked files),
     report "No changes to review" and STOP.

2. **Pre-flight Project Check**
   - **Determine the check command** using this priority:
     1. If `AGENTS.md`/`CLAUDE.md` (already in your context) documents a
        project check command, use that command.
     2. Otherwise detect the stack from manifest files in the repo root:
        - `deno.json`/`deno.jsonc` → `deno task check`
        - `package.json` → the script defined as `check` (or fall back to
          `lint`/`test`)
        - `Makefile` with a `check` target → `make check`
        - `pyproject.toml` → `ruff check .` / `pytest` (if configured there)
        - `go.mod` → `go vet ./... && go test ./...`
     3. None of the above → note "No automated checks configured" in the
        report and proceed. Do NOT invent a command.
   - **MUST NOT** run a stack-specific command when its manifest is absent.
     Any `deno *` command (`deno task check`, `deno check <file>`, `deno fmt`,
     `deno lint`, `deno test`, `deno cache`) creates `deno.lock` as a side
     effect and is forbidden without `deno.json`/`deno.jsonc`. Same rule for
     `npm *` without `package.json`, `go *` without `go.mod`,
     `python -m py_compile`/`pytest`/`ruff` without `pyproject.toml`, etc.
     Pre-flight artifacts (`deno.lock`, `__pycache__/`, `node_modules/`,
     `.pytest_cache/`) in the working tree after verification are a bug.
   - Skip the run ONLY if no code files were modified since the last
     successful check run in this session.
   - If the check fails: report failures immediately, then continue with the
     review — failures will be included in the final report as `[critical]`.

3. **Gather Context**
   - If you don't know the content of `documents/requirements.md` (SRS) and `documents/design.md` (SDS) — read them now.
   - Create a review plan in the task management tool.
   - Collect the diff: `git diff` (unstaged), `git diff --cached` (staged),
     or `git log --oneline <base>..HEAD` + `git diff <base>..HEAD` for
     branch-based changes.
   - **Untracked files**: `git diff` does NOT show untracked files. Check
     `git status` output from step 1 — for each untracked file, read its
     content directly and include it in the review scope.
   - Read the original user request and the plan (task file in `documents/tasks/` / task list).
   - Look for project conventions in config files (linter, formatter configs).
     Rely on conventions visible in the diff and surrounding code.

   **Parallel Delegation** (after gathering context):
   - **Small diff shortcut**: If `git diff --stat` shows < 50 changed lines,
     skip delegation — run all steps inline (overhead not justified).
   - Otherwise, delegate **2 independent tasks in parallel** (via subagents,
     background tasks, or IDE-specific parallel execution — e.g., `Task`,
     `Agent`, `parallel`):
     - **SA1**: If pre-flight check (step 2) already ran, skip SA1. Otherwise,
       run the project check command **chosen via the same manifest-detection
       rule from step 2** (MUST NOT run stack-specific commands without the
       corresponding manifest). Delegate to a console/shell-capable agent
       (e.g., `flowai-console-expert`). Return pass/fail + full output.
     - **SA2**: Run hygiene grep scan on diff output — search for `TODO`,
       `FIXME`, `HACK`, `XXX`, `console.log`, `temp_*`, `*.tmp`, `*.bak`,
       hardcoded secrets patterns. Delegate to a console/shell-capable agent.
       Return findings list.
   - **Fallback rule**: If any delegated task fails or times out, the main
     agent performs that step inline. No hard dependency on delegation success.
   - Continue with steps 4, 6, 7, 8 (main agent review) while delegated
     tasks run.

4. **QA: Task Completion**
   - Map each requirement/plan item to concrete changes in the diff.
   - Flag requirements with no corresponding changes as `[critical] Missing`.
   - Flag plan items marked "done" but not present in diff as
     `[critical] Phantom completion`.
   - Check for regressions: do changed files break existing functionality?

5. **QA: Hygiene** _(use SA2 result if available; otherwise run inline)_
   - If SA2 completed: review its findings, deduplicate with own Code Review
     findings, and merge into the report.
   - If SA2 failed/timed out or skipped (small diff): perform inline:
   - **Temp artifacts**: New `temp_*`, `*.tmp`, `*.bak`, debug `console.log`/
     `print` statements, hardcoded secrets or localhost URLs.
   - **Unfinished markers**: New `TODO`, `FIXME`, `HACK`, `XXX` introduced in
     this diff (distinguish from pre-existing ones).
   - **Dead code**: Commented-out blocks, unused imports/variables/functions
     added in this diff.
   - **Deleted directories**: If the diff deletes an entire skill, agent, or
     module directory (not just individual files), flag as
     `[warning] Entire directory deleted — confirm intentional` and ask the
     user to verify before proceeding.

6. **Code Review: Design & Architecture**
   - **Responsibility**: Does each changed file/module stay within its stated
     responsibility? Flag scope creep.
   - **Coupling**: Are new dependencies (imports, API calls) justified?
     Flag tight coupling or circular dependencies.
   - **Abstraction**: Is the level of abstraction appropriate? Flag
     over-engineering (unnecessary interfaces, premature generalization) and
     under-engineering (god-functions, duplicated logic).

7. **Code Review: Implementation Quality**
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

8. **Code Review: Readability & Style**
   - **Consistency**: Do changes follow the project's established patterns
     (file structure, naming, formatting)?
   - **Comments**: Are non-obvious decisions explained? Flag misleading or
     stale comments.
   - **Complexity**: Flag functions > 40 lines or cyclomatic complexity spikes
     introduced in this diff.
   - **Clarity**: Flag clarity sacrificed for brevity — nested ternaries, dense
     one-liners, overly compact expressions. Explicit code is preferred over
     clever short forms.

9. **Run Automated Checks** _(collect results from step 2 and/or SA1)_
   - If pre-flight check (step 2) already ran: use its result. Do NOT re-run.
   - If SA1 completed with a different/broader check: merge its results.
   - If neither ran (no check command found): explicitly note "No automated
     checks configured" in the report — do not silently skip.

10. **Final Report**
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

1. **Verify Unchanged State**
   - The diff and file list are already in context from Phase 1. Do NOT re-read them.
   - Run only `git status -s` to confirm nothing changed between phases.
   - If new changes appeared (unexpected), report and STOP.
2. **Documentation Sync** _(mandatory — do NOT skip)_
   - **Determine scope**: look at the file paths from step 1. Classify the change:
     - **Infra-only**: ALL changed files are tests (`*_test.*`, `*.test.*`), CI (`.github/`), benchmarks (`benchmarks/`), formatting, or dev-environment (`.devcontainer/`). → Skip doc sync. Output: `Documentation sync: skipped — infra-only changes (tests/CI/benchmarks)`.
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
6. **Verify Clean State**
   - Run `git status` to confirm all changes are committed.
   - If uncommitted changes remain, investigate and report to the user.
7. **Session Complexity Check → Suggest Reflect**
   - After all commits are done, analyze the current conversation for complexity signals:
     - Errors or failed attempts occurred (test failures, lint errors, build errors).
     - Agent retried the same action multiple times.
     - User corrected the agent's approach or output.
     - Workarounds or non-obvious solutions were applied.
   - If **any** of these signals are detected, suggest:
     "This session had [errors/retries/corrections/workarounds]. Consider running `/flowai-reflect` to capture improvements for project instructions."
   - If none detected, skip silently.
</step_by_step>

### Final Combined Report

Output a combined summary:
- **Review**: verdict + key findings (or "no issues found")
- **Commit**: files committed, commit message(s)

## Verification

<verification>
[ ] Empty diff guard checked before starting.
[ ] Pre-flight project check executed (or skipped — no code changes since last check).
[ ] Review phase completed with structured report.
[ ] Verdict gate enforced: only Approve proceeds to commit.
[ ] Documentation sync performed: affected sections updated or justified skip.
[ ] Changes grouped by logical purpose.
[ ] Commits executed with Conventional Commits format.
[ ] Task file cleanup: completed task files deleted, partial task files confirmed with user.
[ ] Session complexity check performed; `/flowai-reflect` suggested if signals detected.
[ ] Both review and commit results reported to user.
</verification>
