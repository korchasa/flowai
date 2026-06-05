---
name: review
description: Use when the user asks to review CURRENT uncommitted changes (staged, unstaged, or branch diff) as QA + lead engineer before committing — verdict on task completion, code quality, architecture, cleanup, plus ephemeral regression probes (pass-on-parent / fail-on-diff). Requires an existing diff. Do NOT trigger without a diff or on post-merge review of historical commits.
---

# Task: Review Changes

## Overview

Act as **QA engineer + lead engineer** simultaneously. Review only the **current
changes** (diff from the task branch or unstaged/staged changes) against the
original request and plan. Verify task completion AND code quality in a single
pass. As part of the same pass, interleave a JiT-subset: synthesize ephemeral
**Catching JiTTests** — tests that pass on the parent revision and fail on the
diff revision — to probe behavioural regressions the static review cannot see.

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
- The Plan (task management tool or a task file resolved through the `tasks` role in AGENTS.md).
- Project conventions (`AGENTS.md`, linter/formatter configs).
- Parent worktree (reconstructed via `git worktree add <parent-sha>` with a
  session-id'd path, or via `git show <parent-sha>:<file>` as fallback) — used
  by the JiT subset to verify pass-on-parent behaviour of synthesized catching
  tests.
</context>

## Rules & Constraints

<rules>
1. **Scope**: Review ONLY changed/added files. Do NOT audit the whole project
   (that is `maintenance`'s job).
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
8. **Session Scope**: review session changes only — compare current `git status`
   to the session-start snapshot; files modified/untracked before the session are
   out of scope (note them, don't review their content). **Exception**: if the
   user names a specific file/function/feature (e.g. "review the login function"),
   review it even if it predates the session.
9. **Catching tests = `[critical]` findings**, processed by the same verdict
   gate as every other critical. No second gate for the JiT subset.
10. **JiT graceful degradation**: the JiT subset disables itself silently when
    ANY holds — no `test`/`check` command in AGENTS.md (no guessing); parent
    baseline red; pure-deletion diff; diff > ~10 files OR > ~500 LOC. Record
    the reason in `### Degradation Notes` so the lost signal stays visible.
11. **Ephemeral catching tests**: written under a session-id'd scratch dir,
    either `.flowai/review-jit/<sid>/` (verify `.gitignore` entry first with
    `grep -qE '^\.flowai/(\*|$)' .gitignore`; append `.flowai/` if missing) or
    `$(mktemp -d)/review-jit-<sid>/`. Never tracked by git; deletable on
    `discard`; session-id MUST be unique so parallel reviews do not collide.
12. **JiT subset never edits production code**: report risks; the author
    fixes. Catching tests stay in scratch until user `save`.
13. **Decision-level verdict, optional diff (Model B)**: LEAD the report with a
    plain-language verdict the human accepts WITHOUT reading the diff; offer the
    diff for optional inspection; never block on the human reading code. Delegate
    heavy diff reading to a diff-analysis subagent (e.g. `diff-specialist`) where
    the IDE supports it; else read inline.
</rules>

## Instructions

<step_by_step>

1. **Empty Diff Guard** — `git diff --stat`, `git diff --cached --stat`,
   `git status --short`. No changes → STOP. System gitStatus snapshot
   can be stale (hooks / parallel processes); if live status shows
   unauthored files clean per snapshot, ask user before staging.

2. **Pre-flight Project Check**
   - **Pick the check/test command**: AGENTS.md/CLAUDE.md declares it →
     manifest detection (`deno.json` → `deno task check`/`test`;
     `package.json` → `check`/`lint`/`test` script; `Makefile check` →
     `make check`; `pyproject.toml` → `pytest`/`ruff check .`; `go.mod` →
     `go vet ./... && go test ./...`) → else "No automated checks configured"
     in the report and JiT subset disables (Rule 10). Do NOT guess.
   - **MUST NOT** run a stack-specific command without its manifest. Any
     `deno *` creates `deno.lock`; `npm *` resolves deps; etc. Pre-flight
     artifacts (`deno.lock`, `__pycache__/`, `node_modules/`, `.pytest_cache/`)
     in the tree after verification are a bug.
   - **2a (current revision)**: run on working tree. Skip only if no code
     files changed since the last successful check in this session. On
     failure: report immediately as `[critical]` and continue review.
   - **2b (parent baseline — JiT)**: identify parent (unstaged/staged →
     `HEAD`; commit-range → `<range-start>^`). Prefer `git worktree add
     <SCRATCH>/jit-parent-<sid> <parent-sha>` (full runnable tree); use
     `git show <parent-sha>:<path>` fallback ONLY if worktree-add fails.
     BEFORE any JiT synthesis, run the SAME project test/check command from
     2a inside the parent worktree to verify baseline is green. Fallback
     path OR red baseline → "JiT disabled — parent baseline unavailable/red"
     in Degradation Notes; review continues without the JiT subset.

3. **Gather Context**
   - **First**: resolve `SRS`, `SDS`, and `tasks` from AGENTS.md. If `SRS` or
     `SDS` exists and its current content is not already in your context —
     read the resolved file before proceeding. If a required role is missing,
     report it and continue only for review steps that do not depend on that
     role.
   - Create a review plan in the task management tool.
   - Collect the diff: `git diff` (unstaged), `git diff --cached` (staged),
     or `git log --oneline <base>..HEAD` + `git diff <base>..HEAD` for
     branch-based changes.
   - **Untracked files**: `git diff` does NOT show untracked files. Check
     `git status` output from step 1 — for each untracked file, read its
     content directly and include it in the review scope.
   - Read the original user request and the plan (task file under the
     resolved `tasks` role / task list).
   - Look for project conventions in config files (linter, formatter configs).
     Rely on conventions visible in the diff and surrounding code.
   - **3d (intent hints — JiT)**: collect intent-author hints for the JiT
     subset: `git log -1 --pretty=%B <parent-sha>..HEAD` (or commit messages
     of the range). Optionally `gh pr view --json body` IF the `gh` CLI is
     available AND the branch has a PR. If `gh` is missing or errors, proceed
     silently — PR body is a bonus.
   - **3e (intent inference — JiT)**: derive a list of ≤5 explicit intents
     for the diff in the form "the author tried to do X; invariants Y should
     hold". Pull from (a) the task file's DoD items, (b) commit messages
     from 3d, and (c) the diff hunks. If more than 5 candidates surface,
     merge related intents or drop the least-risky. Skip this sub-step if
     the JiT subset is disabled (Rule 10).

   **Parallel Delegation** (after gathering context):
   - **Small diff shortcut**: If `git diff --stat` shows < 50 changed lines,
     skip delegation — run all steps inline (overhead not justified).
   - Otherwise, delegate **2 independent tasks in parallel** (via subagents,
     background tasks, or IDE-specific parallel execution — e.g., `Task`,
     `Agent`, `parallel`):
     - **SA1**: If pre-flight check (step 2a) already ran, skip SA1. Otherwise,
       run the project check command **chosen via the same manifest-detection
       rule from step 2** (MUST NOT run stack-specific commands without the
       corresponding manifest). Delegate to a console/shell-capable agent
       (e.g., `console-expert`). Return pass/fail + full output.
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
   - **FRs in scope**: (a) FR-* in the task file's `implements:`; (b) FR sections added/modified in the diff to `SRS`; (c) `[REF:fr:<id>]` SALP markers touched in the diff.
   - **Per FR**: (1) SRS has `**Acceptance:**` with a runnable ref (test `path::name`, benchmark id, command, or `manual — <reviewer>`); missing/placeholder → `[critical] no acceptance reference`. (2) Run the evidence command (or `deno run -A scripts/check-fr-coverage.ts FR-<ID>`); non-zero / failing / `manual` without reviewer → `[critical] acceptance fails`. (3) FR claimed implemented but no `[REF:fr:<id>]` marker in changed source → `[critical] missing code marker`. (4) DoD `[x]` with no evidence run/cached pass → `[critical] Phantom completion`.
   - **Gate**: blocking — verdict cannot be `Approve` while any FR-gate issue remains.

5. **QA: Hygiene** _(use SA2 result if available; else inline)_
   - SA2 done → dedupe its findings with own Code Review findings and merge.
   - SA2 failed/timed out or skipped (small diff) → perform inline:
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
   - **Risk hypotheses (JiT side-channel)**: while reading each hunk, also
     accumulate ≤3 risk hypotheses per intent (from Step 3e) in the form
     "if the author, while trying to do X, had slipped on Y, the code would
     now fail at Z". Risks MUST be diff-specific — not generic code smells
     ("null deref", "unhandled exception") unless the diff directly exposes
     that risk. Skip this side-channel if the JiT subset is disabled.

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
   - **Risk hypotheses (JiT side-channel)**: continue accumulating risks
     started in Step 6 (see Step 8a for the mutation taxonomy).

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

8a. **Mutant + Catching Test Synthesis (JiT)** _(skip on pure-deletion diff or JiT-disabled flag)_
   - Generate ≤15 mutants total (≤5 intents × ≤3 risks × 1 mutant per risk),
     each modelling a concrete diff-specific failure mode. Typical mutations:
     comparator flip, removed guard, inverted return, off-by-one, swapped
     args, skipped branch.
   - For each mutant, synthesize ONE ephemeral test that:
     1. Compiles / parses in the project's test language.
     2. Passes on the parent revision.
     3. **Kills** the mutant (fails when the mutation is applied to the
        diff-side code; passes on the current diff code if and only if the
        current code preserves the parent behaviour).
   - Write tests to the session-id'd scratch directory (Rule 11). Never
     colocate next to the file under test in the main test tree.

8b. **Dual-Run + Filter (JiT)** _(skip if Step 8a skipped)_
   - **(a) parent**: run the generated tests against the parent worktree
     from Step 2b. Any test that FAILS on the parent is an assumption leak —
     discard it.
   - **(b) diff**: run the surviving tests against the diff revision. Any
     test that FAILS here is a **Catching JiTTest** — record it for the
     final report with file:line and the assertion output.
   - **(c) mutant kill-rate** _(optional)_: apply each mutant patch to the
     diff tree, re-run the matching test, record whether the mutant is
     killed. SKIP this sub-stage if a single invocation of the project's
     test command on the smallest scope exceeds 30 s — explicitly write
     `Mutant kill-rate skipped — single test invocation exceeded 30 s
     threshold (recorded N s)` in Degradation Notes so the lost signal is
     visible (not just an absent section).
   - **Filter ensemble**, in order:
     1. **Flaky** — rerun each surviving test 3 times; if the result flips,
        discard.
     2. **Assertion duplicates** — two tests asserting the same thing on the
        same input.
     3. **Zero-kill** — passed on parent, passed on diff, killed no mutant.

9. **Run Automated Checks** _(collect from step 2 and/or SA1)_
   - Pre-flight 2a ran → use its result, do NOT re-run. SA1 broader check → merge.
   - Neither ran (no check command) → note "No automated checks configured" in
     the report; do not silently skip.

10. **Final Report** — verdict on first line. Include JiT sections (`Intents`,
   `Catching Tests`, `Uncovered Risks`, `Degradation Notes`) only when the
   JiT subset ran (or was disabled — Degradation Notes then explains why).
   Section order:

   ```
   ## Review: [Approve | Request Changes | Needs Discussion]
   ### Verdict (plain language) — 2–4 sentences a non-coder acts on: task complete? design sound? key risks? next step? Accept WITHOUT reading the diff. MUST come first.
   ### Intents (≤5)
   ### QA Findings — [severity] file:line — description
   ### Code Review Findings — [severity] file:line — description
   ### Catching Tests (pass on parent, fail on diff) — name, intent #, mutant killed?, failure, file:line
   ### Uncovered Risks — risk + reason no test (non-deterministic / I/O / etc.)
   ### Automated Checks — [pass|fail|skipped] command — summary
   ### Degradation Notes — which JiT step was skipped and why
   ### Summary — requirements X/Y; catching tests N; critical/warning/nit counts
   ### Diff (optional) — offer diff/details for optional inspection; verdict stands without it; never block (Model B). MUST close the report.
   ```

   ≥1 surviving catching test → verdict = `Request Changes` regardless of
   other findings. Rank findings top-5 by `severity × uniqueness`. No issues
   AND zero catching tests → "Changes look good. All requirements covered, no
   issues found, no behavioural regressions detected." (last clause only when
   JiT actually ran).

11. **Ephemeral Dispose (JiT)** _(skip when no catching tests exist)_ —
   prompt: `save <name>` / `save all` / `discard all`. On `save`: propose
   destination beside file-under-test, confirm, `git mv`, stage. On
   `discard all` (default for timeout/ambiguous): delete entire scratch
   directory, leave no stray files.

</step_by_step>

## Verification

<verification>
[ ] Empty diff guard checked before starting.
[ ] Pre-flight project check executed on current revision (or skipped — no code changes since last check).
[ ] Parent baseline (JiT step 2b) executed in `git worktree` (or graceful skip recorded in Degradation Notes).
[ ] Diff collected and reviewed (not the whole project).
[ ] Each requirement/plan item mapped to changes.
[ ] FR Coverage Audit executed: every FR in scope has runnable Acceptance reference, passing test, code marker, and no phantom `[x]`.
[ ] Intents enumerated (≤5) when JiT subset active.
[ ] Risk hypotheses tied to intents (≤3 per intent), diff-specific.
[ ] Hygiene check: no temp files, debug output, unfinished markers in diff.
[ ] Design review: responsibility, coupling, abstraction checked.
[ ] Implementation review: naming, errors, edge cases, types, tests checked.
[ ] Readability: consistency, comments, complexity checked.
[ ] Catching tests (if any): each passed on parent, failed on diff, written to ephemeral session-id'd scratch dir outside main test tree and outside git tracking.
[ ] No production code modified by the JiT subset.
[ ] Automated checks executed (or explicitly noted as missing).
[ ] Structured report produced with severity-tagged findings.
[ ] Verdict on the first line of the report; catching tests pushed verdict to Request Changes when present.
[ ] Report leads with a plain-language decision-level verdict and closes by offering diff inspection as optional/non-blocking (Model B) — acceptable without reading code.
[ ] Save / discard prompt issued whenever catching tests existed; scratch dir deleted on `discard`.
[ ] Degradation Notes section present whenever the JiT subset was disabled, partially skipped, or mutant-probe was bypassed.
</verification>
