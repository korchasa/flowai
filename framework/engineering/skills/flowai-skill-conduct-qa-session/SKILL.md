---
name: flowai-skill-conduct-qa-session
description: How to conduct a Q&A session with the user. Canonical reference for FR-UNIVERSAL.QA-FORMAT.
---

# How to Conduct a Q&A Session

When you need to clarify requirements, gather missing information, or discuss
design choices with the user, follow these guidelines. This skill is the
**canonical reference** for `FR-UNIVERSAL.QA-FORMAT`.

## 1. Language

Match the user's language. Reply in the same language as the last user turn
unless explicitly told otherwise.

## 2. Numbered questions (mandatory)

Every question MUST be a numbered list item — a line starting with `1.`,
`2.`, `3.`, …, followed by a space. Not a heading (`# …`, `## …`), not a
bold-only line (`**Title**`), not a bare paragraph.

Example (single question, single-select):

1. **Storage backend** — sessions are short-lived (≤ 30 min); persistence not
   required.
   - Redis — fastest, ephemeral with TTL.
   - PostgreSQL — already in stack, simpler deploy.
   - In-memory — zero deps, loses state on restart.

The user replies with a label or a number; you proceed.

## 3. Multi-select with `agent's choice`

When the user picks any subset from a list (multi-select) and delegates the
choice to you — by saying `agent's choice`, `на твой выбор`, `выбери сам`,
or an equivalent — apply this resolution:

1. Pick the subset yourself.
2. Emit **one short line** naming what you picked and why (e.g.
   *"Picking metrics + logs — sufficient for baseline SLOs without trace
   storage cost."*).
3. Proceed with the rest of the task. Do NOT prompt the user for yes/no
   confirmation on your auto-selection.

Examples of the user delegating: `agent's choice`, `pick the best`,
`на твой выбор`, `тебе виднее`. Treat any clear delegation phrase the same
way.

When the user picks the options themselves (e.g. `metrics, logs`,
`1, 3`, `all`), use exactly those — no auto-pick.

## 4. Content & guidance

- **Provide context** with each question — never naked.
- **Compare variants** when trade-offs matter: list short Pros/Cons or impact
  per option.
- **Recommend** when one option is clearly better for the stated context.
- **Batch size**: 1–5 questions per response. Most blocking question first.
