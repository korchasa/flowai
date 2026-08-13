---
name: commit
description: Commit current changes as atomic, conventional commits with targeted documentation sync — groups the diff into logical commits and updates the docs each change affects.
_params:
  DIFF_SOURCE:
    choices: [FRESH_READ, REUSE_PRIOR_PHASE]
    default: FRESH_READ
    description: How step 1 acquires the diff. FRESH_READ collects git state from scratch (standalone usage); REUSE_PRIOR_PHASE assumes a prior phase already ran `git diff` and only verifies the tree did not change (composite usage).
---

# Commit Workflow

## Overview

Automated workflow to prepare, group, and commit changes following "Atomic Commit" principles and Conventional Commits. Streamlined version: inline grouping (no subagent), targeted doc sync instead of full audit.

## Context

<context>
The project follows Conventional Commits 1.0.0 and uses a structured documentation system defined by AGENTS.md roles (`SRS`, `SDS`, `tasks`, `index`). All changes must be reflected in the documentation.
</context>

## Rules & Constraints

<rules>
1. **Consolidation-First Commits**: Default to ONE commit. Split ONLY when changes are **genuinely independent** (different business purpose, no causal relationship):
   - **Default**: ALL changes related to the same purpose → ONE commit. This includes: implementation code + its tests + its documentation + its configuration.
   - **Split trigger**: Changes serve **different, unrelated purposes** (e.g., an unrelated bug fix mixed with a feature, or a dependency update unrelated to the feature being developed).
   - **User override**: If the user explicitly asks to split (e.g., "split them", "separate X from Y"), follow the user's request.
   - Documentation describing a code change belongs in the SAME commit as that code.
   - `docs:` type ONLY when changes are exclusively in documentation unrelated to any code change.
   - `style:` type ONLY when changes are exclusively formatting/style unrelated to any logic change.
   - **Anti-patterns (DO NOT split these into separate commits)**:
     - Feature code + tests for that feature → 1 commit
     - Feature code + docs describing that feature → 1 commit
     - Refactored function + updated imports across files → 1 commit
     - Config change required by a feature + the feature code → 1 commit
2. **Automation**: Automatically group and commit changes. DO NOT ask the user for permission to split commits.
3. **Dependency Updates**: ALWAYS use `build:` prefix for dependency and configuration updates (e.g., `build: update dependencies`). Do NOT use `chore:` type.
4. **Strict Commits**: Compose messages in **English** per Conventional Commits 1.0.0.
   - **MANDATORY**: ALWAYS prefix commit messages with a type (e.g., `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `build:`, `agent:`).
   - **`agent:` type**: Use for changes to AI agent configuration, skills, and rules:
     - **Scope**: Files in `framework/agents/`, `framework/skills/`, `**/AGENTS.md`, `**/CLAUDE.md`, IDE agent/skill directories (`.claude/agents/`, `.claude/skills/`).
     - **Auto-detection**: When ALL staged files match the `agent:` scope paths above, automatically use `agent:` type without asking.
     - **Mixed changes**: If staged files include both agent/skill files AND application code, use the appropriate application type (`feat:`, `fix:`, etc.) — NOT `agent:`.
     - **Example**: `agent: update commit skill with atomic grouping rules` or `agent(init): add brownfield detection logic`.
   - **Scope**: MAY use optional scope in parentheses to provide context, e.g., `feat(llm): add retry logic`.
   - **Breaking Changes**: MUST indicate breaking changes by adding a `!` before the colon (e.g., `feat!: change API contract`) OR by adding `BREAKING CHANGE:` in the footer.
   - **CRITICAL**: Commits without these prefixes are STRICTLY FORBIDDEN.
5. **Git Pager**: Use `GIT_PAGER=cat` for all git commands.
6. **Documentation First**: Every logical change MUST be reflected in documentation. Commits without corresponding documentation updates (if applicable) are forbidden.
7. **Error Handling**: On any error (commit failure, merge conflict, unexpected git state): investigate the cause, propose a fix method to the user, and **STOP** without making corrections.
8. **Session Scope**: If the working tree contains pre-existing uncommitted changes (files already modified/untracked at session start — visible in git status snapshot from system context), exclude them from the commit scope. Only commit files created or modified by the agent in the current session. If unsure which changes are yours, ask the user before staging.
9. **Three obligations outlive the commit**: landing the commit finishes step 4, not the workflow. After it you still owe (a) the session-complexity check with its spoken verdict — step 6, (b) the post-reflect cleanup commit when reflect edited anything — step 7, and (c) the clean-state check — step 8. Summarising the work, reporting success, or handing control back before all three is the most common way this workflow is left half-done; the commit landing is exactly the moment it feels finished and is not.
</rules>

## Instructions

<step_by_step>

{{DIFF_SOURCE}}
2. **Documentation Sync** _(mandatory — do NOT skip)_
   - **Determine scope**: look at the file paths from step 1. Classify the change:
     - **Infra-only**: ALL changed files are tests (`*_test.*`, `*.test.*`), CI (`.github/`), acceptance tests (`acceptance-tests/`), formatting, or dev-environment (`.devcontainer/`). → Skip doc sync. Output: `Documentation sync: skipped — infra-only changes (tests/CI/acceptance-tests)`.
     - **Product changes**: anything else → proceed with doc sync below.
   - **Resolve the documents first**: `SRS`, `SDS`, and `index` are ROLES, not filenames. Read `./AGENTS.md` and take the path each role is bound to — a project may put its SDS at `architecture/system.md` or its SRS at `specs/product.md`, and the mapping below then means those files. Never go looking for `design.md` / `requirements.md` by name, and never create a file at the conventional path when the role already points somewhere else: that leaves the real document stale and adds a second one nobody reads. **Take the WHOLE list the project declares, not just the three named roles** — a documentation hierarchy that also binds, say, an API reference or an operations runbook is naming documents this step must keep in sync, and a change belonging to one of them does not become the SDS's problem because the SDS is the familiar name. A role you cannot resolve → say so in one line and sync only what you can.
   - **Find the mapping**: check if `./AGENTS.md` has a `## Documentation Map` section. If yes → use the path→document mapping from there. If no → use the default mapping:
     - New/changed exported functions, classes, types → SDS (component section)
     - New feature, CLI command, skill, agent → SRS (new FR) + SDS (new component section)
     - Removed feature/component → remove from SRS + SDS
     - Changed behavior (fix that alters documented contract) → SDS (update description)
     - Renamed/moved modules → SDS (update paths and structure)
     - Config/build changes → SDS only if architecture section references them
     - **Renamed or removed name that documents mention → EVERY document that still prints the old one.** A CLI flag, subcommand, option, environment variable, or exported symbol that changed its name is not covered by the "new feature" row, and this is the row that catches it. Do not infer the affected set from the kind of change: `grep` the OLD string across the resolved documents and README, and take the set from the hits. Searching for the NEW name instead returns nothing, which reads as "docs are fine" — that is how a rename passes this step with every document left stale.
     - README.md → update only for user-facing changes (new install steps, new features, changed API). **A rename on the user-facing surface IS a changed API** — a CLI flag, subcommand, option, or environment variable that changed its name belongs here.
   - **Sync each affected document**:
     - For each changed file, identify which document section describes its component (using the mapping).
     - **READ** that specific section from the document.
     - **COMPARE** the section text with the actual code after your changes. Ask: "Does this section accurately describe the code as it is NOW?"
     - If inaccurate → update the section. If accurate → no change needed.
     - For **new** functionality with no corresponding section → add a new section.
     - For **removed** functionality → remove the section.
     - **Renamed or removed identifiers — search by the OLD name, across every resolved document.** A flag, command, option, environment variable, function, or path that changed its name leaves the old one printed wherever it was documented, and grepping for the NEW name comes back empty, which reads as "docs are fine" and is how a rename passes this step untouched. Grep the old string verbatim in each resolved document plus README, and fix every hit. **One document updated is not the step finished**: the same name usually sits in several of them, and stopping at the first is the usual way the rest go stale.
   - **Gather change context** for commit message and doc updates:
     1. **Active task file**: If the user referenced a task file in this session, resolve `tasks` from AGENTS.md and read that file there. Do NOT scan all task files.
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
     2. Verify the staged content matches the group's intent — check WHICH files are staged with `git status --short`. When step 1 reused a diff from a prior phase rather than reading one, that is the whole check: staging moves files, it cannot change content you have already read, so do NOT run `git diff` in any form (`--cached`, `--stat`, per-file) to re-confirm it.
     3. **Task Status Lifecycle** (FR-DOC-TASK-LIFECYCLE) — for each staged task file under the resolved `tasks` role with `date:` frontmatter (skip legacy flat-path), first check frontmatter `status:`. If it is `superseded`, require/keep `superseded_by:` and skip DoD derivation because the stale original DoD no longer maps to current reality. Otherwise count top-level `- [ ]`/`- [x]` items in `## Definition of Done`. Derive `status`: `K=0→"to do"`, `0<K<N→"in progress"`, `K=N→"done"` (warn if no DoD). Rewrite frontmatter and `git add` if it differs. Idempotent. Never downgrade `done`. Warn-only on parse errors.
     4. Commit with a Conventional Commits message (including any task-status frontmatter edit).
   - **The commit is not the end of this workflow.** Steps 6, 7 and 8 still run after the last group lands. Reporting completion, summarising what you did, or handing control back before step 8 leaves the workflow half-executed.
5. **Task files are never deleted** _(only if a task file was used in step 2)_ — task files of ANY shape (new-shape `date:` frontmatter or legacy flat-path) are persistent canonical records; `commit` MUST NOT delete them, regardless of DoD completion. The only lifecycle action is the status derivation in step 4.3; `status: superseded` records are preserved.
6. **Session Complexity Check → Auto-Invoke Reflect**
   - After all commits are done, analyze the current conversation for complexity signals:
     - Errors or failed attempts occurred (test failures, lint errors, build errors).
     - Agent retried the same action multiple times.
     - User corrected the agent's approach or output.
     - Workarounds or non-obvious solutions were applied.
   - Also check the **user's invocation message** for explicit complexity descriptors: phrases like "rough session", "had to retry", "wrong approach", "failed", "had to correct you". These count as direct signals.
   - If **any** of these signals are detected:
     a. Announce briefly which signals fired (one line, e.g., "Detected retries and user correction — running /reflect").
     b. **Pre-command signal check**: if the signals appear only in the invocation message (i.e., the problematic interactions predated this command and are not visible in the conversation history), output: "You mentioned a rough session — briefly describe what went wrong and what you corrected. This will be included as reflect context." **Then go straight on to (c) in the same turn — this question does not pause the workflow.** You are asking for detail you would like, not for input you need: the invocation message already carries the signals that fired the check, and that is context enough to run reflect on. Waiting for an answer that may never come turns the whole complexity check into a dead end — the announcement in (a) is made, reflect never runs, and steps 7 and 8 are never reached. If the answer does arrive, fold it into the reflect context you are already building.
     c. Invoke the `reflect` skill directly (via the Skill tool, native slash-command execution, or inline execution of its `SKILL.md` instructions — whichever the host IDE supports). **Carry the return obligation into the invocation itself** — append this sentence verbatim to the context you pass reflect: `When you are done — including after applying any edit I approve — control returns to the calling workflow at its post-reflect step: run git status and commit everything you changed as a separate agent: commit. Do not close out the session.` By the time reflect ends you will be many steps away from this file, and the only instruction still in front of you is the one you carried in.
     d. Do NOT ask the user for confirmation before invoking; proceed autonomously (the context question in step b is not a confirmation request — it gathers missing information).
     e. **`reflect` does not end this workflow — say so to yourself before you hand control over.** The moment it returns you are back here, at step 7, with two steps still owed. This is where the workflow is most often abandoned: reflect closes with a report and, if you approved one, an applied edit, and that ending reads like the ending. It is not yours. Reflect's report is not your final report, and "applied the corrective action" is not a place to stop — the edit it just made is precisely what step 7 has to commit.
   - **Always say aloud how the check came out** — one line either way: `Session complexity: none detected — skipping reflect`, or the announcement from (a). A silent skip is indistinguishable from having forgotten the step, both to the user and to you on the next read.
7. **Post-Reflect Cleanup Commit** _(skip if reflect produced no edits)_
   - Run `git status` — always, the moment reflect returns, and before you write a word of summary. Do not decide from memory whether reflect changed anything; it edits `AGENTS.md` and `**/CLAUDE.md` in place, and an approved edit you applied yourself is exactly the case that feels already handled. If reflect left working-tree edits (typically `AGENTS.md`, `**/CLAUDE.md`, `framework/**`, `.claude/**`, `documents/**`): stage them and commit as `agent: apply reflect-suggested improvements` (or narrower scope, e.g. `agent(commit): tighten doc-audit gate`). The Conventional Commits **type MUST be `agent`** — it marks a change to the agent's own instructions. Do NOT classify by the file touched: a reflect-driven edit to a Markdown instruction file is `agent:`, never `docs:`, `chore:`, or `feat:`. Do NOT amend earlier commits — keep reflect-driven edits as a separate commit. If `git status` is clean, skip.
8. **Verify Clean State**
   - Run `git status` to confirm all changes are committed.
   - If uncommitted changes remain, investigate and report to the user.
   - Before you report anything, re-read your own output for the step-6 line. Missing? Step 6 did not run — go back and run it now. This is the last place the omission can still be caught.
</step_by_step>

## Verification

<verification>
- [ ] Documentation sync performed: affected sections updated or justified skip.
- [ ] Compression rules applied (facts preserved, content minimized).
- [ ] Changes grouped by logical purpose (no mixed independent concerns).
- [ ] Commits executed automatically without user prompt.
- [ ] Conventional Commits format used.
- [ ] Task files preserved: no task file deleted (any shape); status derived from DoD (step 4.3) is the only lifecycle action.
- [ ] Session complexity check performed; `/reflect` auto-invoked if signals detected.
- [ ] Post-reflect cleanup commit created when reflect left uncommitted edits to project instructions; otherwise skipped.
</verification>

<param-branch name="DIFF_SOURCE" value="FRESH_READ">
1. **Gather Changes**
   - Collect all git state in a single command:
     `git status -s && echo '---DIFF---' && git diff && echo '---CACHED---' && git diff --cached && echo '---LOG---' && git log --oneline -5`
   - If working directory is clean (no changes at all), report "Nothing to commit" and STOP.
</param-branch>

<param-branch name="DIFF_SOURCE" value="REUSE_PRIOR_PHASE">
1. **Verify Unchanged State**
   - The diff and file list are already in context from the prior phase. Do NOT re-read them.
   - Run only `git status -s` to confirm nothing changed between phases.
   - If new changes appeared (unexpected), report and STOP.
   - **`git diff` is banned for the rest of this phase — every form of it.** Not `git diff`, not `--cached`, not `--stat`, not a single file path, not "just to confirm what I staged" and not "to check the working tree matches the index". You have already read this content; `git add` moves files between index and working tree and cannot alter what is inside them, so a second read can only return what you already have, at the cost of the context this phase exists to save. `git status -s` answers every question you legitimately have here, because the only open question is WHICH files are staged.
</param-branch>
