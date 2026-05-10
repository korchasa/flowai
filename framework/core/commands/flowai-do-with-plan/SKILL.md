---
name: flowai-do-with-plan
description: "Self-contained — execute the inlined steps directly. Three-phase full-cycle workflow: write a committed plan, implement under TDD, then review and commit with a verdict gate. Do NOT invoke other skills via the Skill tool."
argument-hint: task description or issue URL
effort: high
---

# Task: Full-Cycle — Plan, Implement, Review & Commit

## Overview

Single user-invoked command that drives the canonical task lifecycle end-to-end:

1. **Plan Phase** — write a committed plan at `documents/tasks/<YYYY>/<MM>/<slug>.md` using GODS framework, with variant analysis, DoD acceptance tuples, and surgical SRS back-pointers.
2. **Implement Phase** — execute the Solution section under TDD (RED → GREEN → REFACTOR → CHECK per AGENTS.md).
3. **Review-and-Commit Phase** — review the diff against the plan, gate by verdict (Approve only), commit with documentation sync, auto-invoke reflect on complexity, post-reflect cleanup commit.

Three explicit gates between phases prevent silent skips:

- **Plan → Implement**: user must select a variant before the Solution section is written.
- **Implement → Review-and-Commit**: `deno task check` (or project equivalent) MUST exit 0 AND `git status` MUST be non-empty.
- **Review verdict gate**: only **Approve** proceeds to commit; **Request Changes** / **Needs Discussion** stops the workflow without committing.

## Context

<context>
The user wants the full task lifecycle in a single invocation. The composite inlines three source workflows so each gate executes inside this command rather than being delegated to a re-entered Skill tool call (which would silently bypass gate logic). Maintainer note (NOT for runtime): the inlined `<step_by_step>` blocks are kept in sync with the source skills via `scripts/check-skill-sync.ts`. Source-of-truth bookkeeping only.
</context>

## Rules & Constraints

<rules>
1. **No delegation**: Plan, Implement, and Review-and-Commit phases are FULLY INLINED below. Execute the steps directly. Do NOT invoke `flowai-plan-exp-permanent-tasks`, `flowai-skill-plan`, `flowai-skill-review`, `flowai-commit`, `flowai-commit-beta`, `flowai-review-and-commit`, `flowai-review-and-commit-beta`, or any other skill via the Skill tool — they would re-enter without the composite's gate logic and the workflow would silently exit between phases.
2. **Three Phases, Strict Order**: Execute Plan fully, then Implement fully, then Review-and-Commit fully. Never interleave.
3. **Plan → Implement Gate**: After Plan Phase, the user MUST have selected a variant. If the user declines or aborts, STOP without entering Implement Phase.
4. **Implement → Review-and-Commit Gate**: Before Review-and-Commit, run the project check command (per the manifest-detection rule below). If it fails, STOP. If `git status` is clean (no diff after Implement), STOP — nothing to review.
5. **Verdict Gate**: After Phase-3 Review, only **Approve** proceeds to commit. **Request Changes** or **Needs Discussion** → output the report and STOP. Phase-3 crashes → STOP.
6. **No partial commit**: If any earlier phase fails (errors, crashes, gate violation), STOP — do not advance.
7. **Transparency**: Output Plan Phase artifact path, Implement Phase test results, Review verdict, and Commit results to the user.
8. **Planning**: Use a task management tool (e.g., `todo_write`, `todowrite`) to track all three phases.
9. **Session Scope**: For Review and Commit, by default exclude files already modified/untracked at session start (compare to git-status snapshot from system context). Files created during Implement Phase ARE in scope. If unsure, ask before staging.
</rules>

## Instructions

### Plan Phase

<step_by_step>

1. **Initialize**
   - Use a task management tool (e.g., `todo_write`, `todowrite`) to create a plan based on these steps.
   - Compute today's date in `YYYY-MM-DD` format (e.g. via `date +%Y-%m-%d` or your environment's date primitive). Hold it as `<DATE>`. Derive `<YYYY>`, `<MM>`, `<DD>` (zero-padded) and the eventual file path `documents/tasks/<YYYY>/<MM>/<slug>.md`.
2. **Deep Context & Uncertainty Resolution**
   - If you don't know the content of `documents/requirements.md` (SRS) and `documents/design.md` (SDS) — read them now.
   - **Load related committed tasks**: glob `documents/tasks/**/*.md` (the path is recursive — task files live under date-hierarchy subdirs `<YYYY>/<MM>/<slug>.md`). For each found file, parse its YAML frontmatter `implements:` field. Keep only tasks whose `implements:` set has a non-empty intersection with the FR-IDs you are about to put in the new task's `implements:`. Cap at 10 by recency (newest first by frontmatter `date`); if more match, list IDs in chat without bodies and ask the user which to expand. Read the full body of each kept task before drafting GODS. List the loaded tasks in chat (one bullet per task: file path + matched FR-IDs + one-line summary). If no related tasks exist, say "No prior tasks share FRs with this one — drafting from scratch."
   - Follow `Proactive Resolution` from AGENTS.md: analyze prompt, codebase, search for gaps.
   - Use search tools (e.g., `glob`, `grep`, `ripgrep`, `search`, `webfetch`) for unknowns.
   - If uncertainties remain: ask user clarifying questions. STOP and wait.
3. **Draft Framework (G-O-D)**
   - Create the parent directories `documents/tasks/<YYYY>/<MM>/` (use `mkdir -p` or your environment's equivalent).
   - Write `documents/tasks/<YYYY>/<MM>/<slug>.md` with:
     - Frontmatter containing ALL required keys per Rule 9. Set `status: to do` initially.
     - Body sections per `### GODS Format` from AGENTS.md: `## Goal`, `## Overview` (with `### Context`, `### Current State`, `### Constraints`), `## Definition of Done` (placeholder bullets — fill in step 5a).
   - **CRITICAL**: Do NOT fill `## Solution` section yet.
4. **Strategic Analysis & Variant Selection**
   - Generate variants in chat following `Variant Analysis` from AGENTS.md.
   - MUST propose **2+ distinct** implementation approaches for non-trivial tasks.
   - For EACH variant, present: **Pros**, **Cons**, **Risks**, and **Best For** (use cases/constraints it handles).
   - Across all variants, analyze **Trade-offs**: security vs complexity, performance vs maintainability, cost vs features.
   - **Exception — single variant**: Only offer 1 variant when the task has an obvious path (e.g., "create a text file", "add a config line") with no meaningful trade-offs. Briefly explain why alternatives don't apply.
   - Ask user which variant they prefer. Wait for response.
   - When user selects a variant, immediately proceed to fill the Solution section (Step 5). Do NOT stop after receiving the selection.

   *(Variant analysis is exempt from FR-UNIVERSAL.QA-FORMAT — see SRS scope. The format above continues to use multi-section presentation per variant.)*
5. **Detail Solution (S)** — execute immediately after user selects a variant
   - Re-read the task file you created in Step 3.
   - Overwrite the `## Solution` section placeholder with concrete implementation steps for the selected variant (follow `### GODS Format` from AGENTS.md).
   - The Solution section MUST contain: files to create/modify, implementation approach, code structure, dependencies, error handling strategy (especially for async/callback conversions), and verification commands.
   - **CRITICAL**: You MUST write the updated content to the task file. Never leave Solution as a placeholder or comment.
5a. **Acceptance Tuple Check** — execute immediately, no permission needed
   - Walk every entry in `## Definition of Done`. For each, confirm the tuple `(FR-ID, Test path or Benchmark id, Evidence command)` is present and concrete (no placeholders like `<TBD>` or `TODO`). `manual — <reviewer>` is acceptable only with an explicit reviewer name.
   - If any DoD item lacks the tuple, edit the task file to add it. Prefer reusing an existing FR (for bug fixes and small refactors) over coining a new one. Only introduce a new FR for user-visible or contract-level changes.
   - If new FRs appear in `implements:` that are absent from `documents/requirements.md`, the task MUST contain an explicit DoD entry "add FR-XXX section to SRS with `**Acceptance:**` field filled".
   - Do NOT create the test files themselves — that is the develop phase's RED step. This skill only FIXES the test location contract.
5c. **Write SRS-inline `**Tasks:**` Back-Pointer (FR-DOC-TASK-LINK)** — execute immediately, no permission needed. This is a write step.
   - For each FR-ID in the task's `implements:` frontmatter, locate the heading `### <FR-ID>:` in `documents/requirements.md`.
   - If the heading does not exist (new FR introduced by the same task), SKIP this FR for now and emit a chat note: "FR-XXX SRS section pending — task back-pointer deferred." The develop/commit phase will add the section AND the back-pointer atomically.
   - If the heading exists, find the section's existing `**Description:**` bullet (`- **Description:** ...`). Look at the line(s) immediately following it within the same section.
     - If a `- **Tasks:** [...]` bullet already exists: append `, [<slug>](tasks/<YYYY>/<MM>/<slug>.md)` to the comma-separated list. **Idempotency**: if the exact link `[<slug>](tasks/...)` is already in the list, do nothing for that FR.
     - If no `**Tasks:**` bullet exists yet: insert a new line `- **Tasks:** [<slug>](tasks/<YYYY>/<MM>/<slug>.md)` immediately AFTER the `**Description:**` bullet (before any other bullets in the section).
   - **Surgical edit only**: the rest of the SRS file MUST remain byte-identical. Do not re-format, do not touch other sections, do not adjust whitespace anywhere except the inserted/extended line.

5b. **Update Documentation Index (FR-DOC-INDEX)** — execute immediately, no permission needed. This is a write step, not a planning step.
   - For every FR-ID in the task's `implements:` frontmatter, register a row in `./documents/index.md`.
   - If `documents/index.md` does not exist, create it with a `## FR` heading (additional sections like `## SDS`, `## NFR` may be added by other skills; do not pre-scaffold them here).
   - Within `## FR`, ensure exactly one row per FR-ID. Row format:
     `- [<FR-ID>](requirements.md#<anchor>) — <one-line summary> — <status>`
     - `<anchor>` — GFM auto-slug of the SRS heading `### <FR-ID>: <title>` (lowercase, non-alphanumeric → `-`, collapse runs, strip leading/trailing `-`). If the SRS section does not yet exist, use the placeholder `<fr-id-lowercased>-tbd` (e.g. `fr-pause-tbd`); develop/commit will fix the anchor when the SRS section is added.
     - `<one-line summary>` — pull from the SRS `**Description:**` first sentence if the section exists, otherwise reuse the task title (or a short paraphrase ≤80 chars).
     - `<status>` — mirror the SRS `**Status:**` value if present, else `[ ]`.
   - Sort rows alphabetically by FR-ID inside `## FR` before writing.
   - Idempotent: if a row already exists for the FR-ID, only update its summary or status if the existing one is now stale; do NOT duplicate.
   - This step is REQUIRED — it is part of execution, not the plan's Solution section. Skipping it leaves the index out of date and breaks the project's Interconnectedness Principle.
6. **Critique** — execute immediately, no permission needed
   - Critically analyze the plan for risks, gaps, missing edge cases, over-engineering, and unclear steps. Present critique in chat as a numbered list.
7. **Triage & Auto-Apply Refinements** — execute immediately, no permission needed
   - For EACH critique item from step 6, classify in chat with an explicit label (one of):
     - **apply** — fold into the task file now.
     - **discard** — over-engineering / speculative; one-sentence why.
     - **defer** — out of scope for this plan; record under a "Follow-ups" section.
   - Edit the task file to incorporate every **apply** item (update Solution, DoD, Overview, or Follow-ups as appropriate). The edit MUST happen AFTER the critique was emitted.
   - Do NOT ask the user which items to address — the triage IS the answer. Do NOT prompt with phrases like "which would you like addressed", "should I apply", "do you want me to incorporate".
   - Report the applied/discarded/deferred counts in chat so the user can override any classification on their next turn.
8. **Hand off to Implement Phase**
   - Announce: "Plan complete at `documents/tasks/<YYYY>/<MM>/<slug>.md`. Entering Implement Phase."
   - Do NOT issue a TOTAL STOP. Continue immediately into Implement Phase below.

</step_by_step>

### Plan → Implement Gate

- User did NOT select a variant in step 4 OR aborted → **STOP**. Do not enter Implement Phase.
- Task file was not written or is missing required frontmatter → **STOP**. Report the error.
- Otherwise → enter Implement Phase.

### Implement Phase

<step_by_step>

1. **Re-read the Task File**
   - Read `documents/tasks/<YYYY>/<MM>/<slug>.md` from disk (do NOT rely on memory).
   - Extract the `## Solution` section. The implementation steps are authoritative.
   - Re-plan the todo list with the Solution's concrete steps.

2. **Execute Under TDD — STRICTLY WITHIN SOLUTION SCOPE**
   - Follow AGENTS.md "TDD Flow":
     - **RED**: write a failing test for the new/changed behavior. Run the project test command — it MUST fail.
     - **GREEN**: write the minimal code to make the test pass.
     - **REFACTOR**: improve code and tests without changing behavior. Re-run tests.
   - For benchmark-driven changes (skill/command/agent), follow "Benchmark TDD":
     - **RED**: write or update the benchmark scenario before changing the SKILL.md/agent.md. Run it — it MUST fail.
     - **GREEN**: edit the SKILL.md/agent.md until the benchmark passes.
     - **REFACTOR**: tighten wording without behavior change.
   - When a test fails, fix the source — never the test (per AGENTS.md "Code Test Rules").
   - On second failed fix attempt, STOP per AGENTS.md "Diagnosing Failures" — emit STOP-ANALYSIS REPORT, do NOT advance.
   - **Scope discipline (CRITICAL)**: the only changes you may make in this phase are those required by the `## Solution` section of the task file. If during the phase you discover unrelated issues — pre-existing failing tests, formatter drift on untouched files, missing `deno.lock`, dependency updates, README polish, AGENTS.md cleanup — DO NOT fix them here. Note them in chat as "out-of-scope findings" so the user can spawn a separate task for them. Adopting them silently makes Phase 2 produce a diff broader than the plan, defeats the empty-diff gate below, and turns a no-op task into an unrequested cleanup commit.
   - **No-op handling**: if you re-read the task file, examine the codebase, and conclude the requested feature already exists / the Solution is already satisfied → STOP HERE. Do NOT make any source-code changes. Do NOT touch tooling, formatting, or unrelated files. Surface a clear "Solution turns out to be a no-op — nothing to implement" message and let the gate below fire on the empty-diff branch.

3. **Run Project Check**
   - Determine the check command using the same manifest-detection rule as the Review-and-Commit Phase below (priority: AGENTS.md/CLAUDE.md → manifest detection → "no checks").
   - Run it. It MUST exit 0 before transitioning to Review-and-Commit.
   - If it fails: fix the root cause **only if the failing item is within Solution scope**. Pre-existing failures unrelated to your Solution are out-of-scope — surface them, do NOT fix them in this phase. On a second failed fix attempt within scope, emit STOP-ANALYSIS REPORT and STOP.

</step_by_step>

### Implement → Review-and-Commit Gate

- Project check did NOT exit 0 → **STOP**. Do not enter Review-and-Commit Phase.
- `git status` is clean (no diff after Implement) → **STOP**. Nothing to review or commit. Report "Implement Phase produced no changes — task may be doc-only or no-op; nothing to commit." Do NOT invent unrelated work to populate the diff — the empty diff IS the correct outcome and means the gate fires as designed.
- `git status` shows changes outside Solution scope (tooling, formatting, unrelated docs) → **STOP**. Do not proceed; revert the out-of-scope edits and report "Implement Phase produced changes beyond Solution scope — reverting and stopping; please re-plan if those changes are wanted."
- Otherwise → enter Review-and-Commit Phase.

### Review-and-Commit Phase

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
- `Approve` → **DO NOT commit yet**. Continue with the Commit steps below: re-plan the todo list with the Commit steps and execute all of them in order. Committing before reaching the Reflect step is a workflow violation.
- `Request Changes` or `Needs Discussion` → output the full report and **STOP**. Do NOT commit.
- Phase-3 review crashed or produced no verdict → report the error and **STOP**.

### Commit Steps (continuation of Review-and-Commit Phase)

<step_by_step>

1. **Verify Unchanged State**
   - The diff and file list are already in context from the Review steps. Do NOT re-read them.
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
6. **Session Complexity Check → Auto-Invoke Reflect**
   - After all commits are done, analyze the current conversation for complexity signals:
     - Errors or failed attempts occurred (test failures, lint errors, build errors).
     - Agent retried the same action multiple times.
     - User corrected the agent's approach or output.
     - Workarounds or non-obvious solutions were applied.
   - Also check the **user's invocation message** for explicit complexity descriptors: phrases like "rough session", "had to retry", "wrong approach", "failed", "had to correct you". These count as direct signals.
   - If **any** of these signals are detected:
     a. Announce briefly which signals fired (one line, e.g., "Detected retries and user correction — running /flowai-skill-reflect").
     b. **Pre-command signal check**: if the signals appear only in the invocation message (i.e., the problematic interactions predated this command and are not visible in the conversation history), output: "You mentioned a rough session — briefly describe what went wrong and what you corrected. This will be included as reflect context." Use the user's answer as additional context when invoking reflect.
     c. Invoke the `flowai-skill-reflect` skill directly (via the Skill tool, native slash-command execution, or inline execution of its `SKILL.md` instructions — whichever the host IDE supports).
     d. Do NOT ask the user for confirmation before invoking; proceed autonomously (the context question in step b is not a confirmation request — it gathers missing information).
   - If none detected, skip silently.
7. **Post-Reflect Cleanup Commit** _(skip if reflect produced no edits)_
   - Run `git status`. If reflect left working-tree edits (typically `AGENTS.md`, `**/CLAUDE.md`, `framework/**`, `.claude/**`, `documents/**`): stage them and commit as `agent: apply reflect-suggested improvements` (or narrower scope, e.g. `agent(flowai-commit-beta): tighten doc-audit gate`). Do NOT amend earlier commits — keep reflect-driven edits as a separate commit. If `git status` is clean, skip.
8. **Verify Clean State**
   - Run `git status` to confirm all changes are committed.
   - If uncommitted changes remain, investigate and report to the user.

</step_by_step>

### Final Combined Report

Output a combined summary:
- **Plan**: task file path + selected variant.
- **Implement**: tests passed, project check result.
- **Review**: verdict + key findings (or "no issues found").
- **Commit**: files committed, commit message(s).

## Verification

<verification>
[ ] Plan Phase produced a task file at `documents/tasks/<YYYY>/<MM>/<slug>.md` with required frontmatter (`date`, `status: to do`, `implements`, `tags`, `related_tasks`).
[ ] Plan Phase variant selection gate enforced — Solution section filled only after user picked a variant.
[ ] Implement Phase ran TDD per AGENTS.md (RED → GREEN → REFACTOR → CHECK).
[ ] Implement → Review-and-Commit gate enforced: project check exit 0 AND `git status` non-empty.
[ ] Review-and-Commit Phase produced structured report with verdict on first line.
[ ] Verdict gate enforced: only Approve proceeds to commit.
[ ] Documentation sync performed: affected sections updated or justified skip.
[ ] Changes grouped by logical purpose (default 1 commit).
[ ] Commits used Conventional Commits format.
[ ] Task file cleanup: completed task files deleted, partial task files confirmed with user.
[ ] Session complexity check performed; `/flowai-skill-reflect` auto-invoked if signals detected.
[ ] Post-reflect cleanup commit created when reflect left uncommitted edits to project instructions; otherwise skipped.
[ ] Plan / Implement / Review / Commit results all reported to user.
</verification>
