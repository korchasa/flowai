---
name: flowai-conduct-qa-session
description: How to conduct a Q&A session with the user. Canonical reference for FR-UNIVERSAL.QA-FORMAT.
---

# Q&A Session Format

When prompting the user to choose, use the **exact** transcript shape shown
below. Imitate the assistant lines verbatim — only swap placeholder text. Do
NOT rewrite the structure into your usual markdown habits: bullets or dashes
for option choices are wrong in this skill.

## Required output shape

For a multi-select prompt, the option list MUST end with two extra service
options literally named `all` and `agent's choice` appended after the real
choices, in that order.

## Hard rules

1. The question itself MUST be a numbered list item starting with `1.`,
   `2.`, …
2. The option choices MUST be a nested numbered list. Wrong: `- option`,
   `* option`, `— option`.
3. Multi-select adds two service options (`all`, `agent's choice`).
   Single-select does not.
