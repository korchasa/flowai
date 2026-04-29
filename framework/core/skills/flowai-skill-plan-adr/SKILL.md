---
name: flowai-skill-plan-adr
description: Record an architectural decision (chosen path + rejected alternatives + rationale) as a persistent MADR-style ADR in documents/adr/. Triggers — "record this decision", "write an ADR", "capture our rationale for picking X", "запиши ADR". Do NOT use for regular task planning (use flowai-skill-plan), already-decided trivial choices, or simple bug fixes.
argument-hint: decision title or short context summary
effort: medium
---

# Architecture Decision Record (ADR)

## Overview

Record a non-trivial architectural decision in `./documents/adr/<YYYY-MM-DD>-<slug>.md` so the rationale survives past the originating task file. ADR files are persistent (NOT gitignored) and capture: the context that forced the decision, the alternatives weighed, the chosen path, and the consequences. The format mirrors MADR (Markdown Architectural Decision Records).

## Context

<context>
ADRs are write-once forensics. They explain *why* the system became the way it is. Without them, future sessions see *what* the system is (in SDS) but not the alternatives that were rejected and the reasoning that survived contact with the problem. Re-deriving lost rationale wastes time and re-opens already-settled debates.

This skill is invoked AFTER a decision has been made — or is being committed to in this conversation — not for "what should we do?" exploration. Use `flowai-skill-plan` for the latter. ADR captures the OUTCOME of decision-making.
</context>

## Rules & Constraints

<rules>
1. **Decision required**: A non-trivial decision must exist in conversation context. If you cannot identify (a) the chosen path AND (b) at least one weighted alternative — STOP and ask the user to clarify. NEVER invent alternatives to satisfy the format.
2. **Persistent location**: File goes to `./documents/adr/<YYYY-MM-DD>-<slug>.md`. Slug = kebab-case, ≤40 chars, derived from the decision title. Create `./documents/adr/` if it does not exist.
3. **ID assignment**: Frontmatter MUST contain `id: ADR-NNNN` where `NNNN` is one greater than the highest existing `ADR-NNNN` found by scanning `./documents/adr/`. Start at `ADR-0001` if the directory is empty or absent.
4. **Status values**: `proposed | accepted | rejected | superseded | deprecated`. Default to `accepted` when the user is recording a decision they have already made; use `proposed` only if this is a draft awaiting separate sign-off.
5. **MADR sections in order**: `## Context`, `## Alternatives`, `## Decision`, `## Consequences`. No other top-level sections in the body.
6. **Alternatives format**: ≥2 entries (1 chosen + ≥1 rejected). Each entry: 1-line description, then Pros / Cons (2–4 bullets each), then a 1-sentence rejection cause for non-chosen. Mark the chosen one with `(CHOSEN)` next to its name. Be brief — do NOT pad.
7. **No SDS / SRS / code modification**: This skill is forensics-only. Do NOT touch `documents/requirements.md`, `documents/design.md`, or any source code. If the decision implies an SDS update, mention it in `## Consequences` so the user can run `flowai-skill-plan` or another appropriate skill.
8. **GFM cross-references only**: any link from the ADR to another document MUST use the standard GFM form `[text](relative/path.md#auto-slug)` per the project's Interconnectedness Principle. Do NOT use ID-only shortcuts or wikilinks.
9. **Forward motion**: after the user approves the draft, write the file without re-asking. Re-confirmation is appropriate only if a precondition fails (missing alternative, ambiguous decision).
10. **Task management**: use a task management tool (`todo_write`, `todowrite`, `Task`, etc.) to track steps.
</rules>

## Step by Step

<step_by_step>

1. **Plan the work** with a task management tool.

2. **Identify the decision** from the conversation or from a referenced task file:
   - Decision title (short, imperative).
   - Context that forced the decision (constraints, tradeoffs in play).
   - Chosen path (what we are committing to).
   - At least one alternative that was considered and rejected (with reason).
   - If any of these is missing after scanning the conversation, ASK the user. Do not invent.

3. **Assign the ADR ID**:
   - Scan `./documents/adr/` (if it exists) for `*.md` files. For each, read the frontmatter `id:` value. The new ID is `ADR-{maxExistingNumber+1}`, zero-padded to 4 digits. If the directory is empty or absent, the new ID is `ADR-0001`.

4. **Compute slug + filename**:
   - Kebab-case from the decision title, ≤40 chars.
   - Filename: `./documents/adr/<YYYY-MM-DD>-<slug>.md` where `<YYYY-MM-DD>` is today's date.

5. **Draft the ADR** in chat:
   - Frontmatter: `id`, `status`, `date`, optional `tags` array.
   - `## Context` — 2–4 sentences on the situation and constraints.
   - `## Alternatives` — bullet list. For each alternative:
     ```
     - **<short name>** — 1-line description.
       - Pros: <bullet list>
       - Cons: <bullet list>
       - Rejected because: <one sentence> (omit for the chosen alternative; mark it `(CHOSEN)`)
     ```
   - `## Decision` — 1–2 sentences stating exactly what was decided.
   - `## Consequences` — bullet list of follow-on effects, both positive and negative. Mention any SDS/SRS updates implied (so the user knows to run further skills).

6. **Show draft to the user**, ONE round of edits, then write.

7. **Write the file**:
   - `mkdir -p documents/adr/` if missing.
   - Write the ADR. Report the path and the assigned ID.

</step_by_step>

## Verification

<verification>
[ ] File exists at `./documents/adr/<YYYY-MM-DD>-<slug>.md`.
[ ] Frontmatter contains `id: ADR-NNNN`, `status:`, `date:`.
[ ] Body has exactly four top-level sections in order: Context, Alternatives, Decision, Consequences.
[ ] At least one alternative is marked `(CHOSEN)` and at least one carries a "Rejected because" line.
[ ] No edits to SRS, SDS, or code in the same change.
[ ] Any cross-doc references use GFM `[text](path.md#anchor)` form.
</verification>
