---
name: flowai-plan-exp-permanent-tasks
description: Experimental committed-tasks variant of flowai-plan. User-invoked. Writes tasks at documents/tasks/<YYYY>/<MM>/<slug>.md with extended frontmatter (date, status, implements, tags, related_tasks).
argument-hint: task description or issue URL
effort: high
---

# Task Planning (committed-tasks variant)

## Overview

Create a clear, critiqued plan in `./documents/tasks/<YYYY>/<MM>/<slug>.md` using the GODS framework. **This skill writes a different path layout than the legacy AGENTS.md "Documentation Hierarchy" item 4 mentions** — the path here is `documents/tasks/<YYYY>/<MM>/<slug>.md` (date in directory hierarchy, slug WITHOUT a date prefix), not `documents/tasks/<YYYY-MM-DD>-<slug>.md`. Tasks are committed (no longer gitignored) and carry extended frontmatter so they serve as the canonical record of *what was decided, planned, and shipped*.

## Context

<context>
Principal Software Architect role focused on analysis and planning without implementation.
You are autonomous and proactive. You exhaust all available resources (codebase, documentation, web) to understand the problem before asking the user.
</context>

## Rules & Constraints

<rules>
1. **Pure Planning — NO IMPLEMENTATION**: You are a planner, NOT an implementer. You MUST NOT create, modify, or delete any project source files, config files, tests, or documentation, EXCEPT the two doc-system navigation artifacts listed below. If the task directory does not exist (`./documents/tasks/<YYYY>/<MM>/`), CREATE it (with intermediate year/month/day directories). If you catch yourself about to modify any file outside the allow-list — STOP immediately and return to planning.
   - **Allow-list**:
     - (a) A single task file at `./documents/tasks/<YYYY>/<MM>/<slug>.md` where `<YYYY>`, `<MM>`, `<DD>` are today's date components (zero-padded month/day) and `<slug>` is derived from the task (kebab-case, ≤40 chars, NO date prefix). Examples: `documents/tasks/2026/03/add-dark-mode.md`, `documents/tasks/2026/03/fix-auth-bug.md`, `documents/tasks/2026/03/refactor-db-layer.md`.
     - (b) `./documents/index.md` — agent-maintained navigation index (FR-DOC-INDEX). Plan registers each FR-ID from `implements:` as a row here; SRS section creation is NOT in scope (that happens in develop/commit). See step 5b.
     - (c) `./documents/requirements.md` — **surgical-edit only**. The skill MAY insert/extend a single line `- **Tasks:** [<slug>](tasks/<path>.md)[, ...]` directly under the existing `**Description:**` bullet of each FR section listed in the new task's `implements:` (FR-DOC-TASK-LINK). All other SRS lines MUST remain byte-identical. See step 5c. The skill MUST NOT add, remove, or modify any other content in this file.
2. **Planning**: The agent MUST use a task management tool (e.g., `todo_write`, `todowrite`, `Task`) to track the execution steps.
3. **Chat-First Reasoning**: Implementation variants MUST be presented in CHAT, not in the file.
4. **No SwitchMode**: Do not call SwitchMode tool. This is a mandatory rule!
5. **Proactive Resolution**: Follow `Proactive Resolution` rule from `## Planning Rules` in AGENTS.md.
6. **Stop-Analysis Protocol**: Follow Stop-Analysis rules from `# YOU MUST` in AGENTS.md.
7. **AGENTS.md Planning Rules**: Follow all rules from `## Planning Rules` section in AGENTS.md (Environment Side-Effects, Verification Steps, Functionality Preservation, Data-First, Architectural Validation, Variant Analysis, User Decision Gate).
8. **Traceability & Acceptance Tuple**: If the task creates, modifies, or implements FR-* requirements, the `implements:` YAML frontmatter is REQUIRED with every affected FR-* code. Every item in `## Definition of Done` MUST pair with an FR-ID and a runnable acceptance reference — `Test: <path>::<name>` (or `Benchmark: <scenario-id>`) + `Evidence: <command>`. Exception — `manual — <reviewer>` — only when automation cost exceeds defect cost. DoD items without this tuple are not accepted and must be rewritten before the plan is finalized. The test does not need to exist yet — the develop phase creates it as RED — but the plan MUST fix WHERE it will live. If an FR is new (not yet in `documents/requirements.md`), the plan MUST also list "add FR-XXX section to SRS with `**Acceptance:**` field" as a DoD item, paired with the same tuple.
9. **Frontmatter Shape**: The task file's YAML frontmatter MUST contain ALL of the following keys (in this order recommended):
   - `date: <YYYY-MM-DD>` — today's date as a quoted ISO string. Use the date you used for the directory hierarchy.
   - `status: to do` — initial value for a freshly-created task with all DoD items unchecked. Other valid values: `in progress`, `done`. Status is auto-derived from DoD checkbox state by `flowai-commit` / `flowai-review-and-commit` on every subsequent commit; do NOT update it manually.
   - `implements: [FR-..., ...]` — FR-IDs the task touches (may be empty `[]` if the task is purely operational, but prefer naming an FR).
   - `tags: [...]` — short keyword list (lowercase). May be empty `[]`.
   - `related_tasks: [...]` — relative paths to other tasks under `documents/tasks/`, e.g. `2026/03/20/precursor-task.md`. May be empty `[]`.
</rules>

## Question Format (FR-UNIVERSAL.QA-FORMAT)

For **clarifying questions** in Step 2 (uncertainties → ask user before drafting):

- Each question MUST be a numbered list item (`1.`, `2.`, …) — not a heading, bold-only line, or paragraph.
- For multi-select questions, when the user delegates with `agent's choice` (or equivalent), pick the subset yourself, emit a one-line justification of the pick, and proceed without re-asking for confirmation.

**Variant selection in Step 4 is exempt** — the multi-section variant-analysis presentation (`### Variant N` per option with Pros/Cons/Risks/Best For details) is the legacy pattern and remains in place.

## Instructions

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
8. **TOTAL STOP**
   </step_by_step>

## Output Format (GODS)

Follow GODS framework template from `### GODS Format` section in AGENTS.md. Frontmatter MUST extend the AGENTS.md template with `date`, `status`, `tags`, `related_tasks` (rule 9 above).

## Verification

<verification>
- [ ] The task file path matches `documents/tasks/<YYYY>/<MM>/<slug>.md` exactly — date hierarchy directories present, slug without date prefix.
- [ ] Frontmatter contains `date`, `status: to do`, `implements`, `tags`, `related_tasks` keys (in any order).
- [ ] Files modified are limited to the task file, `./documents/index.md` (when the task introduces or touches FRs), and surgical `**Tasks:**` line inserts/extends in `./documents/requirements.md`. No other files touched.
- [ ] For every FR-ID in `implements:`, `documents/index.md` contains a corresponding row under `## FR` with a GFM-link to `requirements.md#<anchor>`.
- [ ] For every FR-ID in `implements:` whose SRS section already exists, `documents/requirements.md` carries a `- **Tasks:**` bullet under that section's `**Description:**` linking to the new task. Other SRS lines remain byte-identical.
- [ ] Follow all rules from AGENTS.md: Planning Rules, Proactive Resolution, Stop-Analysis.
</verification>
