---
name: review
description: Use when the user asks to review CURRENT uncommitted changes (staged, unstaged, branch diff) before committing, or to synthesize JiT tests against the diff to catch hidden regressions — QA + lead-engineer verdict on completion, quality, architecture, cleanup, plus probes passing on parent and failing on diff. Requires a diff. Do NOT trigger without a diff or on historical commits.
---

# Task: Review Changes

## Overview

Act as **QA engineer + lead engineer** simultaneously. Review only the **current changes** (diff from the task branch or unstaged/staged changes) against the original request and plan. Verify task completion AND code quality in a single pass. In the same pass, interleave the JiT subset: synthesize ephemeral **Catching JiTTests** — pass on the parent revision, fail on the diff revision — probing behavioural regressions static review cannot see.

## Context

<context>
The user finished (or nearly finished) a coding task and needs a combined review before committing. Review ONLY this task's changes, NOT the whole project. Two hats: **QA** (request satisfied? anything missing, broken, left dirty?) and **Lead Engineer** (well-designed, readable, safe, consistent with project conventions?).

Input sources: git diff (unstaged / staged / `<base>..HEAD`); the original User Request (chat history); the Plan (task tool or task file via the `tasks` role in AGENTS.md); project conventions (`AGENTS.md`, linter/formatter configs); parent worktree (`git worktree add <parent-sha>` with a session-id'd path, or `git show <parent-sha>:<file>` fallback) — used by the JiT subset to verify pass-on-parent behaviour of synthesized catching tests.
</context>

## Rules & Constraints

<rules>
1. **Scope**: Review ONLY changed/added files. Do NOT audit the whole project (that is `maintenance`'s job).
2. **Diff-first**: Start from `git diff`. Every finding must reference a specific file and line in the diff.
3. **Two roles, one pass**: Produce findings under two categories (QA, Code Review) but run them in parallel, not sequentially.
4. **Verification**: Do not assume it works — read files, run project checks (linter, tests, type-checker) if available.
5. **Mandatory**: Use a task management tool (e.g., `todo_write`, `todowrite`) to track the execution steps of this review.
6. **Severity levels**: Tag each finding as `[critical]`, `[warning]`, or `[nit]`. Critical = blocks merge. Warning = should fix. Nit = optional improvement.
7. **Output**: Final verdict is **Approve**, **Request Changes**, or **Needs Discussion** with actionable items.
8. **Session Scope**: review session changes only — compare current `git status` to the session-start snapshot; files modified/untracked before the session are out of scope (note them, don't review their content). **Exception**: a file/function/feature the user names explicitly is in scope even if it predates the session.
9. **Catching tests = `[critical]` findings**, processed by the same verdict gate as every other critical. No second gate for the JiT subset.
10. **JiT graceful degradation**: the JiT subset disables itself silently when ANY holds — no `test`/`check` command in AGENTS.md (no guessing); parent baseline red; pure-deletion diff; diff > ~10 files OR > ~500 LOC. Record the reason in `### Degradation Notes` so the lost signal stays visible.
11. **Ephemeral catching tests**: written under a session-id'd scratch dir, either `.flowai/review-jit/<sid>/` (verify `.gitignore` entry first with `grep -qE '^\.flowai/(\*|$)' .gitignore`; append `.flowai/` if missing) or `$(mktemp -d)/review-jit-<sid>/`. Never tracked by git; deletable on `discard`; session-id MUST be unique so parallel reviews do not collide.
12. **JiT subset never edits production code**: report risks; the author fixes. Catching tests stay in scratch until user `save`.
13. **Existing-suite gate**: an `Approve` verdict is FORBIDDEN when the only tests run for the changed area were authored in the same diff (step 4b).
14. **Decision-level verdict, optional diff (Model B)**: LEAD the report with a plain-language verdict the human accepts WITHOUT reading the diff; offer the diff for optional inspection; never block on the human reading code. Delegate heavy diff reading to a diff-analysis subagent (e.g. `diff-specialist`) where supported; else read inline.
</rules>

## Instructions

<step_by_step>

1. **Empty Diff Guard** — `git diff --stat`, `git diff --cached --stat`, `git status --short`. No changes → STOP. System gitStatus snapshot can be stale (hooks / parallel processes); if live status shows unauthored files clean per snapshot, ask user before staging.

2. **Pre-flight Project Check**
   - **Pick the check/test command**: AGENTS.md/CLAUDE.md declares it → manifest detection (`deno.json` → `deno task check`/`test`; `package.json` → `check`/`lint`/`test` script; `Makefile check` → `make check`; `pyproject.toml` → `pytest`/`ruff check .`; `go.mod` → `go vet ./... && go test ./...`) → else "No automated checks configured" in the report and JiT subset disables (Rule 10). Do NOT guess.
   - **MUST NOT** run a stack-specific command without its manifest. Any `deno *` creates `deno.lock`; `npm *` resolves deps; etc. Pre-flight artifacts (`deno.lock`, `node_modules/`, `__pycache__/`) left after verification are a bug.
   - **2a (current revision)**: run on working tree. Skip only if no code files changed since the last successful check in this session. On failure: report immediately as `[critical]` and continue review.
   - **2b (parent baseline — JiT)**: identify parent (unstaged/staged → `HEAD`; commit-range → `<range-start>^`). Prefer `git worktree add
     <SCRATCH>/jit-parent-<sid> <parent-sha>` (full runnable tree); use
     `git show <parent-sha>:<path>` fallback ONLY if worktree-add fails. BEFORE any JiT synthesis, run the SAME project test/check command from 2a inside the parent worktree to verify baseline is green. Fallback path OR red baseline → "JiT disabled — parent baseline unavailable/red" in Degradation Notes; review continues without the JiT subset.

3. **Gather Context**
   - **First**: resolve `SRS`, `SDS`, and `tasks` from AGENTS.md; read the resolved `SRS`/`SDS` files if their content is not already in context. A required role missing → report it and continue only with review steps that do not depend on that role.
   - Create a review plan in the task management tool.
   - Collect the diff: `git diff` (unstaged), `git diff --cached` (staged), or `git log --oneline <base>..HEAD` + `git diff <base>..HEAD` for branch-based changes.
   - **Untracked files**: `git diff` does NOT show them — read each untracked file from step 1's `git status` and include it in scope.
   - Read the original user request and the plan (task file under the resolved `tasks` role / task list).
   - Note project conventions from linter/formatter configs and patterns visible in the diff and surrounding code.
   - **3d (intent hints — JiT)**: collect intent-author hints for the JiT subset: `git log -1 --pretty=%B <parent-sha>..HEAD` (or commit messages of the range). Optionally `gh pr view --json body` IF `gh` is available AND the branch has a PR; on missing/error proceed silently — PR body is a bonus.
   - **3e (intent inference — JiT)**: derive a list of ≤5 explicit intents for the diff in the form "the author tried to do X; invariants Y should hold". Pull from (a) the task file's DoD items, (b) commit messages from 3d, and (c) the diff hunks. >5 candidates → merge related or drop the least-risky. Skip if the JiT subset is disabled (Rule 10).

   **Parallel Delegation** (after gathering context):
   - **Small diff shortcut**: If `git diff --stat` shows < 50 changed lines, skip delegation — run all steps inline (overhead not justified).
   - Otherwise, delegate **2 independent tasks in parallel** (subagents, background tasks, or IDE-specific parallel execution — e.g., `Task`, `Agent`, `parallel`):
     - **SA1**: skip if pre-flight check (step 2a) already ran. Otherwise run the project check command **chosen via the same manifest-detection rule from step 2** (never stack-specific commands without the manifest). Delegate to a console/shell-capable agent (e.g., `console-expert`); return pass/fail + full output.
     - **SA2**: hygiene grep scan on the diff — `TODO`, `FIXME`, `HACK`, `XXX`, `console.log`, `temp_*`, `*.tmp`, `*.bak`, hardcoded-secret patterns. Same delegation; return findings list.
   - **Fallback rule**: a delegated task fails or times out → the main agent performs that step inline. No hard dependency on delegation success.
   - Continue with steps 4, 6, 7, 8 (main agent review) while delegated tasks run.

4. **QA: Task Completion**
   - Map each requirement/plan item to concrete changes in the diff.
   - Flag requirements with no corresponding changes as `[critical] Missing`.
   - Flag plan items marked "done" but not present in diff as `[critical] Phantom completion`.
   - Check for regressions: do changed files break existing functionality?
   - **Doc drift**: for each changed source path, read the docs that describe it (the Documentation Map in AGENTS.md when present, else the resolved `SRS` / `SDS` / `README`). A doc still describing behaviour the diff removed or changed → `[warning] Doc drift` naming the doc `file:line` and the contradicting hunk. Drift alone is NEVER `[critical]` and never blocks the verdict — the commit phase owns Documentation Sync, so escalating here would stop the workflow before the step that fixes it. Do NOT edit the doc in this review.

4a. **FR Coverage Audit** _(blocking gate — see Requirements Lifecycle in AGENTS.md)_
   - **FRs in scope**: (a) FR-* in the task file's `implements:`; (b) FR sections added/modified in the diff to `SRS`; (c) `[REF:fr:<id>]` SALP markers touched in the diff.
   - **Per FR**: (1) SRS has `**Acceptance:**` with a runnable ref (test `path::name`, benchmark id, command, or `manual — <reviewer>`); missing/placeholder → `[critical] no acceptance reference`. (2) Run the evidence command (or `deno run -A scripts/check-fr-coverage.ts FR-<ID>`); non-zero / failing / `manual` without reviewer → `[critical] acceptance fails`. (3) FR claimed implemented but no `[REF:fr:<id>]` marker in changed source → `[critical] missing code marker`. (4) DoD `[x]` with no evidence run/cached pass → `[critical] Phantom completion`.
   - **Gate**: blocking — verdict cannot be `Approve` while any FR-gate issue remains.

4b. **QA: Existing-Suite Execution** _(blocking gate — Rule 13)_
   - **Locate** the repository's PRE-EXISTING test module(s) covering the changed symbols: grep the test tree for each changed symbol AND for its direct CALLERS (importers) — transitive coverage often never names the changed symbol. Exclude test files added by this diff.
   - **RUN** each located module, scoped per AGENTS.md conventions — never a full-suite run. Any failure → `[critical]`; verdict cannot be `Approve`.
   - None found → record "no pre-existing coverage for the changed symbols".
   - Module cannot run locally (live service, missing env) → record module + reason in `### Degradation Notes`; never fabricate a pass.
   - Self-authored tests NEVER satisfy this gate, regardless of how many pass.

5. **QA: Hygiene** _(use SA2 result if available; else inline)_
   - SA2 done → dedupe its findings with own Code Review findings and merge.
   - SA2 failed/timed out or skipped (small diff) → scan inline:
   - **Temp artifacts**: the SA2 pattern list from step 3, plus debug `print` output and hardcoded secrets or localhost URLs.
   - **Unfinished markers**: new `TODO`/`FIXME`/`HACK`/`XXX` introduced in this diff (distinguish from pre-existing ones).
   - **Dead code**: commented-out blocks, unused imports/variables/functions added in this diff.
   - **Deleted directories**: diff deletes an entire skill/agent/module directory (not just files) → `[warning] Entire directory deleted — confirm intentional`; ask the user to verify before proceeding.

6. **Code Review: Design & Architecture**
   - **Responsibility**: each changed file/module stays within its stated responsibility? Flag scope creep.
   - **Coupling**: new dependencies (imports, API calls) justified? Flag tight coupling and circular dependencies.
   - **Abstraction**: appropriate level? Flag over-engineering (unnecessary interfaces, premature generalization) and under-engineering (god-functions, duplicated logic).
   - **Risk hypotheses (JiT side-channel)**: while reading each hunk, accumulate ≤3 risk hypotheses per intent (from Step 3e): "if the author, while doing X, had slipped on Y, the code would now fail at Z". Risks MUST be diff-specific — not generic code smells ("null deref") unless the diff directly exposes that risk. Skip if the JiT subset is disabled.

7. **Code Review: Implementation Quality**
   - **Naming**: new identifiers clear and consistent with project conventions?
   - **Error handling**: explicit? Flag swallowed exceptions, missing error paths, generic catch-all handlers.
   - **Edge cases**: boundary conditions handled (null, empty, overflow, concurrent access)?
   - **Types & contracts**: precise signatures? Flag `any`, untyped parameters, missing return types (where project conventions require).
   - **Tests**: new/changed behaviors covered? Existing tests updated for changed behavior?
   - **Risk hypotheses (JiT side-channel)**: continue accumulating risks started in Step 6 (see Step 8a for the mutation taxonomy).

8. **Code Review: Readability & Style**
   - **Consistency**: changes follow the project's established patterns (file structure, naming, formatting)?
   - **Comments**: non-obvious decisions explained? Flag misleading or stale comments.
   - **Complexity**: flag functions > 40 lines or cyclomatic complexity spikes introduced in this diff.
   - **Clarity**: flag clarity sacrificed for brevity — nested ternaries, dense one-liners, overly compact expressions. Explicit code is preferred over clever short forms.

8a. **Mutant + Catching Test Synthesis (JiT)** _(skip on pure-deletion diff or JiT-disabled flag)_
   - Generate ≤15 mutants total (≤5 intents × ≤3 risks × 1 mutant per risk), each modelling a concrete diff-specific failure mode. Typical mutations: comparator flip, removed guard, inverted return, off-by-one, swapped args, skipped branch.
   - For each mutant, synthesize ONE ephemeral test that:
     1. Compiles / parses in the project's test language.
     2. Passes on the parent revision.
     3. **Kills** the mutant (fails with the mutation applied; passes on the current diff code iff it preserves the parent behaviour).
   - Write tests to the session-id'd scratch directory (Rule 11). Never colocate next to the file under test in the main test tree.

8b. **Dual-Run + Filter (JiT)** _(skip if Step 8a skipped)_
   - **(a) parent**: run the generated tests against the parent worktree from Step 2b. Any test that FAILS on the parent is an assumption leak — discard it.
   - **(b) diff**: run the surviving tests against the diff revision. Any test that FAILS here is a **Catching JiTTest** — record it for the final report with file:line and the assertion output.
   - **(c) mutant kill-rate** _(optional)_: apply each mutant patch to the diff tree, re-run the matching test, record whether the mutant is killed. SKIP if a single smallest-scope test invocation exceeds 30 s — write `Mutant kill-rate skipped — single test invocation exceeded 30 s threshold (recorded N s)` in Degradation Notes so the lost signal stays visible.
   - **Filter ensemble**, in order:
     1. **Flaky** — rerun each surviving test 3 times; if the result flips, discard.
     2. **Assertion duplicates** — two tests asserting the same thing on the same input.
     3. **Zero-kill** — passed on parent, passed on diff, killed no mutant.

9. **Run Automated Checks** _(collect from step 2 and/or SA1)_
   - Pre-flight 2a ran → use its result, do NOT re-run. SA1 broader check → merge.
   - Neither ran (no check command) → note "No automated checks configured" in the report; do not silently skip.

10. **Final Report** — verdict on first line. Include JiT sections (`Intents`, `Catching Tests`, `Uncovered Risks`, `Degradation Notes`) only when the JiT subset ran (or was disabled — Degradation Notes then explains why). Section order:

   ```
   ## Review: [Approve | Request Changes | Needs Discussion]
   ### Verdict (plain language) — 2–4 sentences a non-coder acts on: task complete? design sound? key risks? next step? Accept WITHOUT reading the diff. MUST come first.
   ### Intents (≤5)
   ### QA Findings — [severity] file:line — description
   ### Code Review Findings — [severity] file:line — description
   ### Catching Tests (pass on parent, fail on diff) — name, intent #, mutant killed?, failure, file:line
   ### Uncovered Risks — risk + reason no test (non-deterministic / I/O / etc.)
   ### Existing-Suite Check — pre-existing modules (incl. caller tests) + run result, or why not run
   ### Automated Checks — [pass|fail|skipped] command — summary
   ### Degradation Notes — which JiT step was skipped and why
   ### Summary — requirements X/Y; catching tests N; critical/warning/nit counts
   ### Diff (optional) — offer diff/details for optional inspection; verdict stands without it; never block (Model B). MUST close the report.
   ```

   **Verdict selection** (decide in this order, first match wins): (1) `Request Changes` — ≥1 `[critical]` finding, ≥1 surviving catching test, or a blocking gate (4a FR coverage, 4b existing-suite, Rule 13) still unsatisfied. (2) `Needs Discussion` — no blocker, but a design decision genuinely needs the human before merging. (3) `Approve` — everything else. `[warning]` and `[nit]` findings NEVER force `Request Changes` on their own: list them, hand them to the author, approve. An `Approve` carrying warnings is the normal outcome, not a contradiction. Rank findings top-5 by `severity × uniqueness`. No issues AND zero catching tests → "Changes look good. All requirements covered, no issues found, no behavioural regressions detected." (last clause only when JiT actually ran).

11. **Ephemeral Dispose (JiT)** _(skip when no catching tests exist)_ — prompt: `save <name>` / `save all` / `discard all`. On `save`: propose destination beside file-under-test, confirm, `git mv`, stage. On `discard all` (default for timeout/ambiguous): delete entire scratch directory, leave no stray files.

</step_by_step>

## Verification

<verification>
[ ] Empty diff guard checked before starting.
[ ] Pre-flight project check executed on current revision (or skipped — no code changes since last check).
[ ] Parent baseline (JiT step 2b) executed in `git worktree` (or graceful skip in Degradation Notes).
[ ] Diff collected and reviewed (not the whole project).
[ ] Each requirement/plan item mapped to changes.
[ ] FR Coverage Audit: every FR in scope has runnable Acceptance reference, passing test, code marker, no phantom `[x]`.
[ ] Existing-Suite gate: pre-existing modules (incl. caller tests) located and RUN — or reason recorded; no Approve on self-authored tests alone.
[ ] Intents enumerated (≤5) when JiT subset active.
[ ] Risk hypotheses tied to intents (≤3 per intent), diff-specific.
[ ] Hygiene: no temp files, debug output, unfinished markers in diff.
[ ] Design review: responsibility, coupling, abstraction.
[ ] Implementation review: naming, errors, edge cases, types, tests.
[ ] Readability: consistency, comments, complexity.
[ ] Catching tests (if any): passed on parent, failed on diff, stored in the session-id'd scratch dir (outside test tree and git).
[ ] No production code modified by the JiT subset.
[ ] Automated checks executed (or explicitly noted as missing).
[ ] Structured report with severity-tagged findings.
[ ] Verdict on the first line; catching tests pushed verdict to Request Changes when present.
[ ] Report leads with a plain-language decision-level verdict and closes with optional, non-blocking diff inspection (Model B).
[ ] Save / discard prompt issued whenever catching tests existed; scratch dir deleted on `discard`.
[ ] Degradation Notes present whenever the JiT subset was disabled, partially skipped, or mutant-probe bypassed.
</verification>
