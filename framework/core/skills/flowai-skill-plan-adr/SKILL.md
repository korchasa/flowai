---
name: flowai-skill-plan-adr
description: Planning skill for architectural decisions. Writes persistent MADR documents/adr/<date>-<slug>.md — rationale + implementation contract (DoD + Solution). Triggers — "record this decision", "write an ADR", "plan migration X→Y", "design X pick approach", "запиши ADR". Skip trivial fixes / refactors / micro-tasks (use flowai-skill-plan).
argument-hint: decision title or short context summary
effort: high
---

# Architecture Decision Record (ADR) — Planning Skill

## Overview

Create a clear, critiqued plan in `./documents/adr/` using the MADR (Markdown Architectural Decision Records) format. The ADR file persists as forensics for future sessions: it captures *why* the system became the way it is (alternatives, rejected paths) AND the implementation contract (DoD with runnable acceptance, Solution steps).

This skill is parallel to `flowai-skill-plan`. Pick ADR when there is an architectural decision to capture; pick plan when the task is mechanical (bug fix, refactor with no design choice).

## Context

<context>
Principal Software Architect role focused on analysis and planning without implementation.
You are autonomous and proactive. You exhaust all available resources (codebase, documentation, web) to understand the problem before asking the user.
ADR files persist past the task lifecycle — they outlive `documents/tasks/` files and serve as the canonical "why" record. Future sessions reading the ADR must be able to reconstruct the decision without spelunking commit history.
</context>

## Rules & Constraints

<rules>
1. **Pure Planning — NO IMPLEMENTATION**: You are a planner, NOT an implementer. You MUST NOT create, modify, or delete any project source files, config files, tests, or production documentation, EXCEPT the two doc-system navigation artifacts listed below.
   - **Allow-list**:
     - (a) A single ADR file in `./documents/adr/<YYYY-MM-DD>-<slug>.md` (slug = kebab-case, ≤40 chars, derived from decision title). Examples: `2026-03-24-pick-rag-over-finetune.md`, `2026-03-24-drop-postgres-for-sqlite.md`.
     - (b) `./documents/index.md` — agent-maintained navigation index (FR-DOC-INDEX). Add a row under `## ADR` for the new ADR.
   - The ADR file is PERSISTENT (NOT gitignored). Treat it as a long-lived artifact. SRS section creation is NOT in scope (handled in develop/commit phases).
2. **Decision required — at least 2 alternatives**: A non-trivial decision must exist in conversation context. If you cannot identify (a) the chosen path AND (b) at least one weighted alternative — STOP and ask the user to clarify. NEVER invent alternatives to satisfy the format. Single-option "decisions" are not ADR material; suggest the user invoke `flowai-skill-plan` instead.
3. **Auto-write — NO chat round-trip**: After the Detail Solution step, write the file IMMEDIATELY. Do NOT show the full draft body in chat and ask "approve before write?". Do NOT prompt for an edit round. Chat output post-write is a brief summary only (path + ID + DoD count). The user edits in the file if changes are needed; chat round-trips are forbidden.
4. **Brief alternatives**: Each alternative entry in `## Alternatives` is 3–5 lines max — 1-line description, short Pros, short Cons, and (for non-chosen) a 1-sentence "Rejected because". Do NOT write detailed designs of rejected alternatives. The chosen alternative gets the detail in `## Solution`, not in `## Alternatives`. Brevity is intentional — alternatives are the "considered set", not full designs.
5. **Planning**: Use a task management tool (`todo_write`, `todowrite`, etc.) to track the steps of this skill.
6. **Chat-First Reasoning for variants**: Variant analysis happens in CHAT, not in the file. The file gets the brief Alternatives summary AFTER user selects.
7. **No SwitchMode**: Do not call SwitchMode tool. Mandatory.
8. **Proactive Resolution**: Follow `Proactive Resolution` rule from `## Planning Rules` in AGENTS.md.
9. **Stop-Analysis Protocol**: Follow Stop-Analysis rules from AGENTS.md.
10. **AGENTS.md Planning Rules**: Follow all rules from `## Planning Rules` section of AGENTS.md (Environment Side-Effects, Verification Steps, Functionality Preservation, Data-First, Architectural Validation, Variant Analysis, User Decision Gate).
11. **Traceability & Acceptance Tuple**: If the decision creates, modifies, or implements FR-* requirements, the `implements:` YAML frontmatter is REQUIRED. Every item in `## Definition of Done` MUST pair with an FR-ID and a runnable acceptance reference — `Test: <path>::<name>` (or `Benchmark: <scenario-id>`) + `Evidence: <command>`. Exception — `manual — <reviewer>` — only when automation cost exceeds defect cost. DoD items without this tuple are not accepted and must be rewritten before writing the file. The test does not need to exist yet — develop phase creates it as RED — but the plan MUST fix WHERE it will live. If an FR is new (not yet in `documents/requirements.md`), the plan MUST also list "add FR-XXX section to SRS with `**Acceptance:**` field" as a DoD item.
12. **No SDS / SRS / code modification**: This skill does NOT touch `documents/requirements.md`, `documents/design.md`, or any source code. If the decision implies an SRS/SDS update, list it as a DoD item with `manual — <reviewer>` evidence (or as a sub-step in `## Solution`). Develop/commit phase will execute the actual edits.
13. **GFM cross-references only**: any link from the ADR to another document MUST use standard GFM form `[text](relative/path.md#auto-slug)`. Do NOT use ID-only shortcuts or wikilinks.
14. **Status set**: `proposed | accepted | implemented | rejected | superseded | deprecated`. Default for new ADRs is `accepted` (decision recorded and committed-to). Use `proposed` only if this is a draft awaiting separate sign-off. The `implemented` status is set automatically by `flowai-commit` / `flowai-review-and-commit` when the commit closes all DoD items — DO NOT set it manually here.
15. **MADR sections in order**: `## Context`, `## Alternatives`, `## Decision`, `## Consequences`, `## Definition of Done`, `## Solution`. Optional `## Follow-ups` may trail. No other top-level sections in the body.
</rules>

## Question Format (FR-UNIVERSAL.QA-FORMAT)

For **clarifying questions** in Step 2 (uncertainties → ask user before drafting):

- Each question MUST be a numbered list item (`1.`, `2.`, …) — not a heading, bold-only line, or paragraph.
- For multi-select questions, when the user delegates with `agent's choice` (or equivalent), pick the subset yourself, emit a one-line justification, and proceed without re-asking.

**Variant selection in Step 4 is exempt** — the multi-section variant-analysis presentation (`### Variant N` per option with Pros/Cons/Risks/Best For) is the legacy pattern and remains in place for chat-first reasoning.

## Step by Step

<step_by_step>

1. **Initialize**
   - Use a task management tool (`todo_write`, `todowrite`) to plan the steps below.

2. **Deep Context & Uncertainty Resolution**
   - If you don't know the content of `documents/requirements.md` (SRS) and `documents/design.md` (SDS) — read them now.
   - Follow `Proactive Resolution` from AGENTS.md: analyze prompt, codebase, search for gaps.
   - Use search tools (`glob`, `grep`, `ripgrep`, `webfetch`) for unknowns.
   - If uncertainties remain (decision title unclear, chosen path unstated, alternatives missing): ask user clarifying questions per FR-UNIVERSAL.QA-FORMAT. STOP and wait.

3. **Assign ADR ID + filename**
   - Scan `./documents/adr/` (if it exists) for `*.md` files. For each, read the frontmatter `id:` value. New ID = `ADR-{maxExistingNumber+1}`, zero-padded to 4 digits. Empty/absent dir → `ADR-0001`.
   - Compute slug: kebab-case from the decision title, ≤40 chars.
   - Filename: `./documents/adr/<YYYY-MM-DD>-<slug>.md` where `<YYYY-MM-DD>` is today's date.

4. **Strategic Analysis & Variant Selection (chat-first)**
   - Generate variants in chat following `Variant Analysis` from AGENTS.md.
   - MUST propose **2+ distinct** alternatives.
   - For EACH variant, present in chat: **Pros**, **Cons**, **Risks**, and **Best For**.
   - Across all variants, analyze **Trade-offs**: security vs complexity, performance vs maintainability, cost vs features.
   - **Exception — single variant**: not allowed. ADR requires ≥2 alternatives. If only one path exists, STOP and suggest `flowai-skill-plan` instead.
   - Ask user which variant they prefer. Wait for response.
   - When user selects, proceed immediately to Step 5 (do NOT stop after selection).

   *(Variant analysis exempt from FR-UNIVERSAL.QA-FORMAT — multi-section presentation per variant.)*

5. **Detail Solution + DoD (file-side)**
   - Build the file content in memory:
     - **Frontmatter**: `id: ADR-NNNN`, `status: accepted` (default), `date: YYYY-MM-DD`, `implements: [FR-...]` (if applicable), optional `tags:`.
     - **`## Context`** — 2–4 sentences on the situation and constraints.
     - **`## Alternatives`** — bullet list, one entry per considered option. Each entry brief (3–5 lines):
       ```
       - **<short name>** — 1-line description.
         - Pros: <bullet list, 2–4 items>
         - Cons: <bullet list, 2–4 items>
         - Rejected because: <one sentence>  (omit for the chosen alternative; mark it `(CHOSEN)`)
       ```
     - **`## Decision`** — 1–2 sentences stating exactly what was decided. Include GFM cross-links to affected components if applicable.
     - **`## Consequences`** — bullet list of follow-on effects (positive AND negative). Mention any SRS/SDS updates implied so the user knows further skills may be needed.
     - **`## Definition of Done`** — checklist with FR-Test-Evidence tuples (per Rule 11 above):
       ```
       - [ ] FR-XXX: <observable behavior>
         - Test: `<path/to/test>::<test_name>` (or `Benchmark: <scenario-id>`)
         - Evidence: `<command that passes iff the item is done>`
       ```
     - **`## Solution`** — concrete step-by-step implementation guidance for the CHOSEN alternative. Files to create/modify, approach, dependencies, verification commands. NO placeholder text.
     - Optional **`## Follow-ups`** — items deferred or out-of-scope but worth recording.
   - Walk the DoD: confirm every item has `(FR-ID, Test/Benchmark, Evidence)`. No placeholders. No `<TBD>`. `manual — <reviewer>` only with explicit reviewer name.
   - If new FRs appear in `implements:` that are absent from `documents/requirements.md`, add a DoD entry "add FR-XXX section to SRS with `**Acceptance:**` field filled".

6. **Auto-write the file** — execute immediately, no permission needed
   - `mkdir -p documents/adr/` if missing.
   - Write the ADR file. **Do NOT show the full draft in chat first. Do NOT ask "approve before write?".**
   - This step is unconditional after Step 5; no user gate.

7. **Update Documentation Index (FR-DOC-INDEX)** — execute immediately, no permission needed
   - Open `./documents/index.md` (create with `# Documentation Index` header if missing).
   - Add a row under `## ADR` (create the section if absent):
     `- [<ADR-ID>](adr/<filename>.md) — <decision title> — <status>`
   - For every FR-ID in the new ADR's `implements:` frontmatter, also register/update a row under `## FR` with the standard format `- [<FR-ID>](requirements.md#<anchor>) — <one-line summary> — <status>` (anchor = GFM auto-slug or placeholder `<fr-id-lowercased>-tbd` if SRS section missing).
   - Sort rows alphabetically by ID within each section. Idempotent: update existing rows in place; do not duplicate.

8. **Critique** — execute immediately, no permission needed
   - Critically analyze the recorded ADR for risks, gaps, missing edge cases, over-engineering, unclear steps. Present critique in chat as a numbered list. Reference specific sections of the ADR (Context / Alternatives / DoD / Solution).

9. **Triage & Auto-Apply Refinements** — execute immediately, no permission needed
   - For EACH critique item from Step 8, classify in chat with an explicit label:
     - **apply** — fold into the ADR file now.
     - **discard** — over-engineering / speculative; one-sentence why.
     - **defer** — out of scope; record under `## Follow-ups` in the ADR.
   - Edit the ADR file to incorporate every **apply** item (update Solution, DoD, Consequences, or Follow-ups as appropriate). Edit happens AFTER critique was emitted.
   - Do NOT ask the user which items to address — triage IS the answer. Do NOT prompt with "which would you like addressed", "should I apply", "do you want me to incorporate".
   - Report applied/discarded/deferred counts in chat so the user can override on their next turn.

10. **Summary & STOP**
    - Emit a brief chat summary: ADR ID, file path, DoD item count, applied/discarded/deferred counts. ≤10 lines.
    - Do NOT re-paste the full ADR body in chat.
    - Do NOT delegate implementation to another skill via chat (no "next, run /flowai-skill-plan to implement" — the ADR's Solution section IS the plan; the implementing agent reads the ADR directly).
    - TOTAL STOP.

</step_by_step>

## Output Format (MADR)

Follow the MADR template documented in `### MADR Format` of AGENTS.md. Frontmatter + 6 body sections in fixed order: Context, Alternatives, Decision, Consequences, Definition of Done, Solution. Optional `## Follow-ups` may trail.

## Verification

<verification>
[ ] File exists at `./documents/adr/<YYYY-MM-DD>-<slug>.md`.
[ ] Frontmatter contains `id: ADR-NNNN`, `status:` (one of the 6 lifecycle values), `date:`. Optional `implements:` and `tags:` accepted.
[ ] Body has six top-level sections in order: Context, Alternatives, Decision, Consequences, Definition of Done, Solution.
[ ] `## Alternatives` has ≥2 entries; one marked `(CHOSEN)`; ≥1 carries a `Rejected because:` line. Each entry brief (≤8 lines).
[ ] `## Definition of Done` items each pair with `(FR-ID, Test/Benchmark, Evidence)` tuple.
[ ] `## Solution` has concrete steps for the chosen alternative (no placeholders).
[ ] `documents/index.md` `## ADR` section contains a row for the new ADR.
[ ] No edits to SRS, SDS, or production source code in the same change.
[ ] Cross-doc references use GFM `[text](path.md#anchor)` form.
[ ] Agent did NOT show the full ADR body in chat for approval before writing the file.
</verification>
