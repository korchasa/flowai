---
name: plan
description: Use ONLY when the user explicitly asks to plan a task, create a role-resolved task file, produce a GODS-format breakdown, or prepare a critiqued implementation strategy before coding. Writes tasks under the `tasks` role with extended frontmatter. Do NOT trigger on brief design discussion, ad-hoc code suggestions, or casual "how would you approach X?" questions.
argument-hint: task description or issue URL
effort: high
_params:
  TERMINATION:
    choices: [TOTAL_STOP, HAND_OFF_TO_NEXT]
    default: TOTAL_STOP
    description: Final-step behaviour — TOTAL_STOP for standalone use; HAND_OFF_TO_NEXT when consumed inside a composite (e.g. ship) so the agent continues into the next phase instead of stopping.
---

# Task Planning

## Overview

Create a clear, critiqued plan in the `tasks` location resolved from AGENTS.md using the GODS framework. The template default uses date hierarchy directories and a slug without a date prefix, but the project instructions are authoritative. Tasks are committed records with extended frontmatter, so they serve as the canonical record of what was decided, planned, and shipped.

## Context

<context>
Principal Software Architect role focused on analysis and planning without implementation.
You are autonomous and proactive. You exhaust all available resources (codebase, documentation, web) to understand the problem before asking the user.
</context>

## Rules & Constraints

<rules>
1. **Pure Planning — NO IMPLEMENTATION**: You are a planner, NOT an implementer. You MUST NOT create, modify, or delete any project source files, config files, tests, or documentation, EXCEPT the doc-system navigation artifacts listed below. First resolve `SRS`, `tasks`, and `index` from AGENTS.md. If any role is missing, STOP and ask the user to bind it in project instructions. If the resolved task directory does not exist, CREATE it. If you catch yourself about to modify any file outside the allow-list — STOP immediately and return to planning.
   - **Allow-list**:
     - (a) A single task file under the resolved `tasks` role where date components and `<slug>` follow the project instructions; if the template default is in force, use `<YYYY>/<MM>/<slug>.md` below the role root.
     - (b) The resolved `index` role — agent-maintained navigation index (FR-DOC-INDEX). Plan registers each FR-ID from `implements:` as a row here; SRS section creation is NOT in scope (that happens in develop/commit). See step 5b.
     - (c) The resolved `SRS` role — **surgical-edit only**. The skill MAY insert/extend a single line `- **Tasks:** [REF:task:<slug>][, ...]` (SALP form) directly under the existing `**Description:**` bullet of each FR section listed in the new task's `implements:` (FR-DOC-TASK-LINK). All other SRS lines MUST remain byte-identical. See step 5c. The skill MUST NOT add, remove, or modify any other content in this file.
2. **Planning**: The agent MUST use a task management tool (e.g., `todo_write`, `todowrite`, `Task`) to track the execution steps.
3. **Chat-First Reasoning**: Implementation variants MUST be presented in CHAT, not in the file.
4. **No SwitchMode**: Do not call SwitchMode tool. This is a mandatory rule!
5. **Proactive Resolution**: Follow `Proactive Resolution` rule from `## Planning Rules` in AGENTS.md.
6. **Stop-Analysis Protocol**: Follow Stop-Analysis rules from `# YOU MUST` in AGENTS.md.
7. **AGENTS.md Planning Rules**: Follow all rules from `## Planning Rules` section in AGENTS.md (Environment Side-Effects, Verification Steps, Functionality Preservation, Data-First, Architectural Validation, Variant Analysis, User Decision Gate).
8. **Traceability & Acceptance Tuple**: If the task creates, modifies, or implements FR-* requirements, the `implements:` YAML frontmatter is REQUIRED with every affected FR-* code. Every item in `## Definition of Done` MUST pair with an FR-ID and a runnable acceptance reference — `Test: <path>::<name>` (or `Benchmark: <scenario-id>`) + `Evidence: <command>`. Exception — `manual — <reviewer>` — only when automation cost exceeds defect cost. DoD items without this tuple are not accepted and must be rewritten before the plan is finalized. The test does not need to exist yet — the develop phase creates it as RED — but the plan MUST fix WHERE it will live. If an FR is new (not yet in the resolved `SRS`), the plan MUST also list "add FR-XXX section to SRS with `**Acceptance:**` field" as a DoD item, paired with the same tuple.
9. **Frontmatter Shape**: The task file's YAML frontmatter MUST contain ALL FIVE of the following keys, in this exact order. **Each key MUST be PRESENT even when its value is empty** — write `implements: []`, `tags: []`, `related_tasks: []` rather than omitting the key. Eliding a key is a defect:
   - `date: <YYYY-MM-DD>` — today's date as a quoted ISO string. Use the date you used for the directory hierarchy.
   - `status: to do` — initial value for a freshly-created task with all DoD items unchecked. Other valid values: `in progress`, `done`, `superseded`. Non-superseded status is auto-derived from DoD checkbox state by `commit` / `review-and-commit` on every subsequent commit; do NOT update it manually. Use `superseded` only for provenance records replaced by another task, with `superseded_by:` set.
   - `implements: [FR-..., ...]` — FR-IDs the task touches. May be empty `[]` if the task is purely operational, but prefer naming an FR. **The key itself is mandatory.**
   - `tags: [...]` — short keyword list (lowercase). May be empty `[]`. **The key itself is mandatory.**
   - `related_tasks: [...]` — relative paths to other tasks under the resolved `tasks` role, e.g. `2026/03/20/precursor-task.md`. May be empty `[]`. **The key itself is mandatory.**

   Canonical empty-valued example for an operational task with no FR / tags / related tasks:

   ```yaml
   ---
   date: "2026-05-17"
   status: to do
   implements: []
   tags: []
   related_tasks: []
   ---
   ```
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
   - Compute today's date in `YYYY-MM-DD` format (e.g. via `date +%Y-%m-%d` or your environment's date primitive). Hold it as `<DATE>`. Derive `<YYYY>` and `<MM>` (zero-padded). Resolve the `tasks` role from AGENTS.md and then derive the eventual task file path from that role's layout.
2. **Deep Context & Uncertainty Resolution**
   - Resolve `SRS` and `SDS` from AGENTS.md. If you don't know their current content, read the resolved files now.
   - **Load related committed tasks**: glob recursively under the resolved `tasks` role. For each found file, parse its YAML frontmatter `implements:` field. Keep only tasks whose `implements:` set has a non-empty intersection with the FR-IDs you are about to put in the new task's `implements:`. Cap at 10 by recency (newest first by frontmatter `date`); if more match, list IDs in chat without bodies and ask the user which to expand. Read the full body of each kept task before drafting GODS. List the loaded tasks in chat (one bullet per task: file path + matched FR-IDs + one-line summary). If no related tasks exist, say "No prior tasks share FRs with this one — drafting from scratch."
   - Follow `Proactive Resolution` from AGENTS.md: analyze prompt, codebase, search for gaps.
   - Use search tools (e.g., `glob`, `grep`, `ripgrep`, `search`, `webfetch`) for unknowns.
   - **Affected-surface enumeration** (only when the request has a definite outcome set — stated behaviors, named acceptance conditions, a deliverable list): enumerate what the change touches — code: callers and duplicated/parallel logic; infrastructure: environments, regions, dependent services and scheduled jobs; process/non-IT: affected people and downstream steps. Depth proportional to blast radius: for wide surfaces, group into classes. Each item (or class) is either covered by the plan or explicitly excluded with inspected (not assumed) evidence. For open-ended/exploratory requests, skip and route ambiguity to the clarifying questions below.
   - **Independent surface pass (`surface-scout`)**: when the enumeration above ran AND your environment provides the pre-declared `surface-scout` agent, dispatch it now via your subagent tool (e.g. Task, Agent, task). Input: the user's request text VERBATIM (plus quoted user clarification turns, if any) — NOTHING else. Do NOT include your own enumeration, your restatement of the request, a suspected fix location, or a preferred approach: the scout's value is independence, and seeding it with your framing destroys the cross-check. Hold its returned output for step 3. No subagent support or agent not installed → skip the dispatch; step 3 records the degradation visibly.
   - If uncertainties remain: ask user clarifying questions. STOP and wait.
3. **Draft Framework (G-O-D)**
   - Create the resolved task file's parent directories (use `mkdir -p` or your environment's equivalent).
   - Write the resolved task file with:
     - Frontmatter containing ALL required keys per Rule 9. Set `status: to do` initially.
     - Body sections per `### GODS Format` from AGENTS.md: `## Goal`, `## Overview` (with `### Context`, `### Current State`, `### Constraints`), `## Definition of Done` — seed one bullet per outcome the request states (behaviors, examples, acceptance conditions, deliverables), in the request's own terms; preserve stated expected results exactly (no paraphrase). Related outcomes may collapse into one bullet when a single acceptance check proves them all. No discrete outcomes stated → leave placeholder bullets. Acceptance tuples are added in step 5a.
     - For async/callback conversions, include an explicit error-handling DoD item or constraint before variant selection: how callback errors map to Promise rejection / `try`-`catch`, and which tests prove error propagation is preserved.
     - `### Affected Surface` under `## Overview` (only when the affected-surface enumeration ran): FIRST the scout's returned output as a clearly delimited VERBATIM block (fenced, unedited — this is the raw record `plan-critic`, `review`, and the human recompute the divergence from); THEN one PLAIN bullet per surface item/class from the UNION of your list and the scout's — `- <item> — <disposition>`, where the disposition is one of: `covered-by <DoD item / planned step>`; `not affected — <inspected evidence>` (evidence forms by domain: code = path/lines; infrastructure = environment/service + config key; process = document/step/owner); `deferred — human choice`. Checkbox bullets (`- [ ]`/`- [x]`) are FORBIDDEN in this subsection — they would corrupt automatic task-status derivation. Items you are unsure about default to `deferred — human choice` and are surfaced at variant selection. If the scout did not run (no subagent support), write one line under `## Follow-ups` instead: `Surface cross-check (surface-scout) did not run — no subagent support in this environment.`
   - **CRITICAL**: Do NOT fill `## Solution` section yet.
4. **Strategic Analysis & Variant Selection**
   - Generate variants in chat following `Variant Analysis` from AGENTS.md.
   - For non-obvious tasks, the variant set MUST cover three distinct **archetypes** (the agent MAY add more, e.g. a defer/do-nothing option):
     - **Quick fix** — minimal change within the current scope; solves the immediate problem fastest, may incur tech debt.
     - **Architecturally-correct** — correct design within the task's current constraints/scope (not merely the fastest).
     - **Best long-term** — strategic; optimizes maintainability over the horizon, may exceed current scope (refactor/investment).
   - If two archetypes collapse into the same option for a given task, state that explicitly and still surface a distinct third — never silently drop below the three without noting the collapse.
   - For EACH variant, present: **Pros**, **Cons**, **Risks**, and **Best For** (use cases/constraints it handles).
   - Across all variants, analyze **Trade-offs**: security vs complexity, performance vs maintainability, cost vs features.
   - **Recommendation ranking (root-cause fidelity first)**: When you recommend a variant AND the variants differ in root-cause fidelity, rank "fixes the named root cause / matches the issue's own causal description" ABOVE "smallest diff" and "lowest speculative risk". The recommendation MUST (a) name the root cause it addresses, (b) state why the recommended variant fixes THAT cause, and (c) if a root-cause variant exists but is NOT recommended, justify the rejection with EVIDENCE — callers/usages you actually inspected — NOT a speculative "might break X". A cited risk used to down-rank the root-cause variant MUST be verified against the real callers before it counts; an un-inspected fear is not a valid reason to prefer a symptom patch.
   - **Scope-cut transparency**: outcome coverage is a heading-level property of a variant, not an ordinary Con. When the request has a stated outcome set, every variant's title MUST end with a scope marker: `— full scope` when the variant covers all stated outcomes, or `— partial: drops <dropped outcome(s)>` when it does not. If the dropped list is too long for a title, use a count in the title (`— partial: covers 2 of 4 stated outcomes`) and name every dropped outcome in the variant's Cons. A bare `partial` marker without named outcomes or a count is a defect. Dropped outcomes MUST also be named in the variant's Cons. A stated outcome must appear in ≥1 variant or be explicitly named as deferred at selection time — a silent drop is a planning defect. The scope choice is made at variant selection on this visible information; after selection, record the chosen variant's dropped outcomes under `## Follow-ups` in the task file.
   - **Exception — single variant**: Only offer 1 variant when the task has an obvious path (e.g., "create a text file", "add a config line") with no meaningful trade-offs. Briefly explain why alternatives don't apply.
   - Ask user which variant they prefer. Wait for response.
   - When user selects a variant, immediately proceed to fill the Solution section (Step 5). Do NOT stop after receiving the selection.

   *(Variant analysis is exempt from FR-UNIVERSAL.QA-FORMAT — see SRS scope. The format above continues to use multi-section presentation per variant.)*
5. **Detail Solution (S)** — execute immediately after user selects a variant
   - Re-read the task file you created in Step 3.
   - Overwrite the `## Solution` section placeholder with concrete implementation steps for the selected variant (follow `### GODS Format` from AGENTS.md).
   - The Solution section MUST contain: files to create/modify, implementation approach, code structure, dependencies, error handling strategy (especially for async/callback conversions), and verification commands.
   - **CRITICAL**: You MUST write the updated content to the task file. Never leave Solution as a placeholder or comment.
   - When `### Affected Surface` exists: update its dispositions to the SELECTED variant — every `covered-by` must point at a step or DoD item of the chosen variant's Solution; items the chosen variant drops become `deferred — human choice` with a matching `## Follow-ups` entry.
5a. **Acceptance Tuple Check** — execute immediately, no permission needed
   - Walk every entry in `## Definition of Done`. For each, confirm the tuple `(FR-ID, Test path or Benchmark id, Evidence command)` is present and concrete (no placeholders like `<TBD>` or `TODO`). `manual — <reviewer>` is acceptable only with an explicit reviewer name.
   - If any DoD item lacks the tuple, edit the task file to add it. Prefer reusing an existing FR (for bug fixes and small refactors) over coining a new one. Only introduce a new FR for user-visible or contract-level changes.
   - If new FRs appear in `implements:` that are absent from the resolved `SRS`, the task MUST contain an explicit DoD entry "add FR-XXX section to SRS with `**Acceptance:**` field filled".
   - Do NOT create the test files themselves — that is the develop phase's RED step. This skill only FIXES the test location contract.
5c. **Write SRS-inline `**Tasks:**` Back-Pointer (FR-DOC-TASK-LINK)** — execute immediately, no permission needed. This is a write step.
   - For each FR-ID in the task's `implements:` frontmatter, locate the heading `### <FR-ID>:` in the resolved `SRS`.
   - If the heading does not exist (new FR introduced by the same task), SKIP this FR for now and emit a chat note: "FR-XXX SRS section pending — task back-pointer deferred." The develop/commit phase will add the section AND the back-pointer atomically.
   - If the heading exists, find the section's existing `**Description:**` bullet (`- **Description:** ...`). Look at the line(s) immediately following it within the same section.
     - If a `- **Tasks:** [...]` bullet already exists: append `, [REF:task:<YYYY>-<MM>-<slug> | <slug>]` to the comma-separated list. **Idempotency**: if the exact SALP REF is already in the list, do nothing for that FR.
     - If no `**Tasks:**` bullet exists yet: insert a new line `- **Tasks:** [REF:task:<YYYY>-<MM>-<slug> | <slug>]` immediately AFTER the `**Description:**` bullet (before any other bullets in the section). The `task:` namespace id is `<YYYY>-<MM>-<slug>` (e.g. `2026-06-adopt-salp-anchors`), derived from the task file's path.
   - **Surgical edit only**: the rest of the SRS file MUST remain byte-identical. Do not re-format, do not touch other sections, do not adjust whitespace anywhere except the inserted/extended line.

5b. **Update Documentation Index (FR-DOC-INDEX)** — execute immediately, no permission needed. This is a write step, not a planning step.
   - Resolve `index` from AGENTS.md. For every FR-ID in the task's `implements:` frontmatter, register a row there.
   - If the resolved `index` file does not exist, create it with a `## FR` heading (additional sections like `## SDS`, `## NFR` may be added by other skills; do not pre-scaffold them here).
   - Within `## FR`, ensure exactly one row per FR-ID. Row format (SALP):
     `- [REF:fr:<id> | <FR-ID>] — <one-line summary> — <status>`
     - `<id>` — lower-kebab of the FR mnemonic (strip `FR-` prefix, lowercase, preserve `.` for hierarchical IDs like `FR-DIST.MARKETPLACE` → `dist.marketplace`). The reference resolves against the `[ANC:fr:<id>]` token next to the SRS heading. If the SRS section does not yet exist, write the REF anyway — develop/commit will add the matching ANC when the SRS section is added, at which point `scripts/check-salp.ts` will resolve it.
     - `<one-line summary>` — pull from the SRS `**Description:**` first sentence if the section exists, otherwise reuse the task title (or a short paraphrase ≤80 chars).
     - `<status>` — mirror the SRS `**Status:**` value if present, else `[ ]`.
   - Sort rows alphabetically by FR-ID inside `## FR` before writing.
   - Idempotent: if a row already exists for the FR-ID, only update its summary or status if the existing one is now stale; do NOT duplicate.
   - This step is REQUIRED — it is part of execution, not the plan's Solution section. Skipping it leaves the index out of date and breaks the project's Interconnectedness Principle.
6. **Critique** — execute immediately, no permission needed
   - **Independent critique (`plan-critic`)**: when the task file contains a `### Affected Surface` scout block OR step 4 presented 2+ variants, AND your environment provides the pre-declared `plan-critic` agent — dispatch it via your subagent tool with the task file path as input. Present its returned objection list in chat VERBATIM as the critique for step 7. A fresh context is the point: do not summarize, soften, or pre-filter its objections. If the dispatch fails or the agent is not installed, fall back to self-critique below AND write one line under `## Follow-ups`: `Independent critique (plan-critic) did not run — no subagent support in this environment.`
   - Otherwise (trivial single-variant plan with no scout block, or the fallback above): critically analyze the plan yourself for risks, gaps, missing edge cases, over-engineering, and unclear steps. Present critique in chat as a numbered list.
7. **Triage & Auto-Apply Refinements** — execute immediately, no permission needed
   - For EACH critique item from step 6, classify in chat with an explicit label (one of):
     - **apply** — fold into the task file now.
     - **discard** — over-engineering / speculative; one-sentence why.
     - **defer** — out of scope for this plan; record under a "Follow-ups" section.
   - Edit the task file to incorporate every **apply** item (update Solution, DoD, Overview, or Follow-ups as appropriate). The edit MUST happen AFTER the critique was emitted.
   - Do NOT ask the user which items to address — the triage IS the answer. Do NOT prompt with phrases like "which would you like addressed", "should I apply", "do you want me to incorporate".
   - **Completeness check (after triage)**: every outcome seeded in Step 3 and every affected-surface item/class from Step 2 maps to a DoD item, a Solution step, or a `## Follow-ups` entry naming the deferral reason; additionally, every `covered-by` pointer in `### Affected Surface` resolves to an existing Solution step or DoD item (no dangling pointers). Complements Rule 8 (items↔tuples); this check ensures nothing stated in the request is missing. The task file, not the chat, is the record.
   - Report the applied/discarded/deferred counts in chat so the user can override any classification on their next turn.
{{TERMINATION}}

</step_by_step>

## Output Format (GODS)

Follow GODS framework template from `### GODS Format` section in AGENTS.md. Frontmatter MUST extend the AGENTS.md template with `date`, `status`, `tags`, `related_tasks` (rule 9 above).

## Verification

<verification>
- [ ] The task file path matches the `tasks` role layout from AGENTS.md.
- [ ] Frontmatter contains `date`, `status: to do`, `implements`, `tags`, `related_tasks` keys (in any order).
- [ ] Files modified are limited to the task file, the resolved `index` file (when the task introduces or touches FRs), and surgical `**Tasks:**` line inserts/extends in the resolved `SRS`. No other files touched.
- [ ] For every FR-ID in `implements:`, the resolved `index` contains a corresponding row under `## FR` with a GFM-link to the SRS heading.
- [ ] For every FR-ID in `implements:` whose SRS section already exists, the resolved `SRS` carries a `- **Tasks:**` bullet under that section's `**Description:**` linking to the new task. Other SRS lines remain byte-identical.
- [ ] Every stated outcome maps to a DoD item, Solution step, or `## Follow-ups` entry; narrower variants name dropped outcomes in Cons.
- [ ] When the surface enumeration ran and subagents are available: `surface-scout` was dispatched with the verbatim request; `### Affected Surface` under `## Overview` holds its verbatim block + plain-bullet dispositions (no checkboxes). When subagents are unavailable: the degradation line is present under `## Follow-ups`.
- [ ] The critique came from `plan-critic` (verbatim) when the dispatch condition held; otherwise self-critique ran and, if subagents were missing, the critique degradation line is recorded.
- [ ] Follow all rules from AGENTS.md: Planning Rules, Proactive Resolution, Stop-Analysis.
</verification>

<param-branch name="TERMINATION" value="TOTAL_STOP">
8. **TOTAL STOP**
</param-branch>

<param-branch name="TERMINATION" value="HAND_OFF_TO_NEXT">
8. **Hand off to the next phase**
   - Announce the resolved task path and: "Entering the next phase."
   - Do NOT issue a TOTAL STOP. Continue immediately into the next phase of the composite workflow.
</param-branch>
