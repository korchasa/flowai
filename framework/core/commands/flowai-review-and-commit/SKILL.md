---
name: flowai-review-and-commit
description: "Two-phase workflow: review changes, then commit if approved. Verdict gate between phases. Self-contained — execute the inlined steps directly, do NOT invoke other skills via the Skill tool."
---

# Task: Review and Commit

## Overview

Two-phase command: first review current changes (QA + code review), then commit
only if approved. A verdict gate between the phases ensures only approved changes
get committed.

## Context

<context>
Single command to review and commit. Inlines two phases: Phase 1 (review) — QA + code review, produces verdict; Phase 2 (commit) — documentation audit, atomic grouping, commit. Gate logic prevents committing code with critical issues.
</context>

## Rules & Constraints

<rules>
1. **No delegation**: Phase 1 and Phase 2 are FULLY INLINED below. Execute the steps directly. Do NOT invoke `flowai-skill-review`, `flowai-commit`, `flowai-commit-beta`, or any other skill via the Skill tool — they would re-enter without the composite's verdict gate and the workflow would silently exit after the review step.
2. **Two Phases**: Execute Phase 1 (review) fully before considering Phase 2
   (commit). Never interleave.
3. **Gate Logic**: After Phase 1, check the verdict. Only **Approve** proceeds
   to Phase 2. **Request Changes** or **Needs Discussion** → output the review
   report and STOP. Do not commit.
4. **No partial commit**: If Phase 1 itself fails (errors, crashes), STOP — do
   not proceed to Phase 2.
5. **Transparency**: Output both review findings and commit results to the user.
6. **Planning**: Use a task management tool (e.g., `todo_write`, `todowrite`)
   to track steps.
7. **Session Scope**: By default exclude files already modified/untracked at session start (compare to git-status snapshot from system context); note them but do not review or commit. Exception: include pre-existing files when the user's request names them explicitly ("review and commit the sum function"). Ask before staging if unsure.
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
   - **First**: check if `documents/requirements.md` (SRS) and `documents/design.md` (SDS) exist (`ls documents/` or equivalent). If they exist and their current content is not already in your context — read them before proceeding.
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

4a. **FR Coverage Audit** _(blocking gate — see Requirements Lifecycle in AGENTS.md)_
   - **Identify FRs in scope**: (a) FR-* codes from the task file's `implements:` frontmatter; (b) any FR section added or modified in the diff to `documents/requirements.md`; (c) any `// FR-<ID>` / `# FR-<ID>` markers introduced or touched in the diff.
   - **For each FR in scope**:
     1. SRS section MUST contain `**Acceptance:**` with a runnable reference (test `path::name`, benchmark id, verification command, or `manual — <reviewer>`). Missing or placeholder (`<TBD>`, `TODO`) → `[critical] FR-<ID> has no acceptance reference`.
     2. Run the evidence command (or `deno run -A scripts/check-fr-coverage.ts FR-<ID>` if the script exists). Non-zero exit, failing test, or `manual` without a reviewer name → `[critical] FR-<ID> acceptance fails`.
     3. Grep the diff for `// FR-<ID>` / `# FR-<ID>` in implementing source files. FR claimed implemented in diff but no marker in changed source → `[critical] FR-<ID> missing code marker`.
     4. Task DoD has `[x]` paired with this FR but no evidence-command run in this session and no cached pass → `[critical] Phantom completion on FR-<ID>`.
   - **Gate**: findings here are blocking. Verdict cannot be `Approve` while any FR-gate issue remains, regardless of other findings.

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
- `Approve` → **DO NOT commit yet**. Phase 2 below is MANDATORY: re-plan the todo list with Phase 2 steps and execute all of them in order. Committing before reaching Phase 2 step 6 (Reflect) is a workflow violation.
- `Request Changes` or `Needs Discussion` → output the full report and **STOP**. Do NOT commit.
- Phase 1 crashed or produced no verdict → report the error and **STOP**.

### Phase 2 — Commit

<step_by_step>

1. **Initialize**
   - Use a task management tool (e.g., todo write) to create a plan based on these steps.
   - Run `git status` to identify ALL changes: modified (unstaged), staged, and **untracked** files.
   - If working directory is clean (no changes at all), report "Nothing to commit" and STOP.
2. **Documentation Audit & Compression** _(mandatory — do NOT skip)_
   - **Gather change context** from three sources:
     1. **Git diff**: `git diff` (unstaged) + `git diff --cached` (staged). Primary source of WHAT changed.
     2. **Active task file**: If the user referenced a task file or plan in this session, read that specific file from `documents/tasks/`. Use it to understand the WHY behind changes. Do NOT scan all task files — only read one explicitly linked to the current task.
     3. **Session context**: User messages in this conversation explaining intent, decisions, or requirements.
   - **Discover document list** (if `./documents` exists):
     - If `./AGENTS.md` exists → read its `## Documentation Hierarchy` section → extract all document paths listed there.
     - Classify each document: `READ-ONLY` (explicitly marked), `derived` (e.g. README — "Derived from..."), or `editable` (default).
     - If `./AGENTS.md` does not exist → use default list: `requirements.md`, `design.md`, `AGENTS.md` (all editable).
   - **Audit each editable document** against the combined context (diff + task file + session):
     - For each document: does the change context reveal new/changed/removed information relevant to this document's scope? If yes → update. If no → note reason.
     - For `derived` documents (e.g. README.md): update only when changes are significant (new public API, changed installation steps, new features).
     - Skip `READ-ONLY` documents entirely.
   - **Apply Compression Rules**:
     - Use **combined extractive + abstractive summarization** (preserve all facts, minimize words).
     - Use compact formats: lists, tables, YAML, or Mermaid diagrams.
     - Optimize lexicon: use concise language, remove filler phrases, and use abbreviations after first mention.
   - **Execute Updates**: Perform necessary edits in `./documents` BEFORE proceeding to grouping.
   - **Output Documentation Audit Report** (always, even if no updates needed):
     ```
     ### Documentation Audit
     - <doc-name>: [updated | no changes — <reason>] (for each discovered document)
     - Task file context: [used <filename> | none found]
     ```
   - **Gate**: If code changes exist but zero documents were updated, re-examine — new exports, functions, changed signatures, or new modules almost always require an update. Only proceed without updates if justified in the audit report.
   - **FR Acceptance Gate** _(blocking — see Requirements Lifecycle in AGENTS.md)_: If the diff adds or modifies FR sections in `documents/requirements.md`, each new/modified FR MUST contain a filled `**Acceptance:**` field pointing to a runnable test, benchmark id, verification command, or `manual — <reviewer>`. If any FR lacks this, STOP and ask the user to fill it (or route the plan back through `flowai-skill-plan`). Do not commit SRS sections that violate the lifecycle contract.
3. **Atomic Grouping Strategy (Subagent)**
   - Use the `flowai-diff-specialist` subagent to analyze changes and generate a commit plan.
   - Pass the following prompt to the subagent: "Analyze the current git changes. Default to ONE commit for all changes. Split into multiple commits ONLY if changes serve genuinely different, unrelated purposes. If the user explicitly requested a split, follow that request. Return a JSON structure with proposed commits."
   - The subagent will return a JSON structure with proposed commits.
   - **Review the plan critically**: If the subagent proposes >2 commits, verify each split is justified by genuinely independent purposes. Merge groups that serve the same purpose.
   - **Formulate a Commit Plan** based on the subagent's output:
     - Default: all changes = one commit.
     - Split only when changes serve different, unrelated purposes OR the user explicitly requested a split.
     - Documentation describing a code change goes in the same commit as that code.
      - Use appropriate type: `feat:`, `fix:`, `refactor:`, `build:`, `test:`, `agent:`, `docs:` (standalone only), `style:` (standalone only).
   - _Hunk-level splitting (isolating changes within a single file) is an exceptional measure. Use ONLY when the user explicitly requests it or when changes within one file serve genuinely unrelated purposes._
4. **Commit Execution Loop**
   - **Iterate** through the planned groups:
     1. Stage specific files for the group.
     2. Verify the staged content matches the group's intent.
     3. **Task Status Lifecycle** (FR-DOC-TASK-LIFECYCLE) — for each staged `documents/tasks/**/*.md` with `date:` frontmatter (skip legacy flat-path), count top-level `- [ ]`/`- [x]` items in `## Definition of Done`. Derive `status`: `K=0→"to do"`, `0<K<N→"in progress"`, `K=N→"done"` (warn if no DoD). Rewrite frontmatter `status` and `git add` if it differs. Idempotent. Never downgrade `done`. Warn-only on parse errors.
     4. Commit with a Conventional Commits message (now including the optional task-status frontmatter edit).
5. **Task file Cleanup** _(only if a task file was used in step 2)_
   - **New-shape tasks** (`documents/tasks/<YYYY>/<MM>/<DD>/<slug>.md` with `date:` frontmatter): NEVER delete — persistent canonical records. Status auto-flip in step 4.3 is the only lifecycle action.
   - **Legacy tasks** (flat path, no `date:` frontmatter): if all DoD items satisfied → `git rm` and commit; if any unsatisfied → ask user "Delete or keep?"; if no DoD → ask user.
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
     "This session had [errors/retries/corrections/workarounds]. Consider running `/flowai-skill-reflect` to capture improvements for project instructions."
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
[ ] Documentation audit performed and files updated.
[ ] Changes grouped by logical purpose.
[ ] Commits executed with Conventional Commits format.
[ ] Task lifecycle: every staged new-shape task had `status:` auto-derived from DoD checkboxes (`to do | in progress | done`) and rewritten if it differed. Never downgrades `done`. Warn-only on parse errors.
[ ] Task file cleanup: legacy flat-path tasks — completed deleted, partial confirmed with user. New-shape tasks NEVER deleted.
[ ] Session complexity check performed; `/flowai-skill-reflect` suggested if signals detected.
[ ] Both review and commit results reported to user.
</verification>
