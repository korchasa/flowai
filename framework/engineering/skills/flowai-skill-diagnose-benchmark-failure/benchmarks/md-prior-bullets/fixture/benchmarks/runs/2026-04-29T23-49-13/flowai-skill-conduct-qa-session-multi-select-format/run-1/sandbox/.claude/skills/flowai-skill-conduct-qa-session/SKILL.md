---
name: flowai-skill-conduct-qa-session
description: How to conduct a Q&A session with the user
---

# How to Conduct a Q&A Session

When you need to clarify requirements, gather missing information, or discuss
design choices with the user, follow these strict guidelines. This skill is the
**canonical reference** for `FR-UNIVERSAL.QA-FORMAT`. Other framework skills
that prompt the user inline must follow the same format.

## 1. Language

- **Match the User's Language**: Ask questions in the same language as the
  user's last query, unless explicitly instructed otherwise.

## 2. Question Format (FR-UNIVERSAL.QA-FORMAT) — MANDATORY

The format below overrides your default markdown habits. Bullets/dashes for
option choices are wrong here, even though they are standard elsewhere.

### Required output shape

Copy this skeleton verbatim — same numbering, same nesting. Only the literal
text inside the placeholders changes:

1. **Question title** — context. Optional recommendation.
   1. option-1 — short reason
   2. option-2 — short reason
   3. option-3 — short reason

For a multi-select prompt, the option list MUST end with two extra service
options literally named `all` and `agent's choice` appended after the real
choices, in that order:

1. **Question title** — context.
   1. option-1 — short reason
   2. option-2 — short reason
   3. option-3 — short reason
   4. all
   5. agent's choice

### Hard rules (MUST)

1. **Question line shape**: every question MUST start with `1.`, `2.`, `3.`, …
   followed by a space. Wrong: `**1. Title**` (bold heading), `# Title`
   (heading), bare paragraph, bulleted item.
2. **Option line shape**: every option MUST start with `1.`, `2.`, `3.`, …
   followed by a space, indented under its question (3-space indent for
   numbering up to `9.`, 4 spaces for `10.`+). Wrong: `- option`, `* option`,
   `— option`, run-in prose.
3. **No bullets between question and options**: do NOT insert a bulleted list
   ("Each signal has X, Y, Z:") between the question and the option numbers.
   The option numbers come on the next indented line under the question.
4. **Multi-select adds two service options**: append `all` and `agent's
   choice` as the last two numbered options. Single-select questions do NOT
   include them.
5. **Batch size**: 1–5 questions per response. Most blocking question first.
6. **Context required**: never ask a "naked" question — give context inline.
7. **One classifier per question**: each question is single-select OR
   multi-select, not both.

### Anti-patterns (NEVER emit any of these)

- ❌ Bold heading instead of numbered question:

  **1. Question title** — context.

- ❌ Bulleted options instead of numbered:

  1. **Question title** — context.
     - option-1 — reason
     - option-2 — reason

- ❌ Run-in prose options:

  1. **Question title** — pick one of A, B, or C?

- ❌ Multi-select without service options:

  1. **Question title** — pick any subset.
     1. option-1
     2. option-2
     3. option-3
        _(missing `all` + `agent's choice` at the end)_

### Pre-send self-check

Before sending your response, scan it line-by-line. For every option line,
confirm the line begins with a digit + `.` + space (e.g. `1.`). If any
option line begins with `-`, `*`, `—`, or any other marker, rewrite it as a
numbered list item. For any multi-select question, confirm the last two
options are literally named `all` and `agent's choice`.

## 3. Single-Select

The user picks exactly one option. The option list contains only the real
choices. **No service options.**

Reply with the chosen number or option name → proceed with that choice.

## 4. Multi-Select

The user picks any subset. The option list ends with two service options:

- `all` — apply every real option.
- `agent's choice` — the agent picks the subset, emits a one-line
  justification, and proceeds **without waiting for confirmation**. Do not
  prompt yes/no on the auto-selection.

Resolution:

- User picks numbers (e.g. `1, 3`) or option names → use exactly those.
- User picks `all` → apply every real option.
- User picks `agent's choice` → choose the subset, emit one short line
  naming what you picked and why (e.g. _"Picking metrics + logs — sufficient
  for baseline SLOs without trace storage cost."_), then continue.

## 5. Content & Guidance

- **Facilitate decisions**: provide data or hints that make the answer easier.
- **Compare variants**: list Pros/Cons/Risks per option and trade-offs across
  options when the choice is non-obvious.
- **Recommend** when one option is clearly better for the stated context.
