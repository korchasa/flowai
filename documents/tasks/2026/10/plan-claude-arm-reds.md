---
date: "2026-10-18"
status: done
implements:
  - FR-PLAN-HANDS-OFF
  - FR-PLAN-VARIANT-ARCHETYPES
  - FR-DOC-TASK-CONTEXT
tags: [plan, acceptance, claude-arm]
related_tasks:
  - 2026/10/review-hands-off-after-verdict.md
---
# Plan: four red scenarios of the first claude-arm sweep [ANC:task:2026-10-plan-claude-arm-reds]

## Goal

The `plan` skill must pass its acceptance scenarios on the claude arm, which became the default on 2026-10-17. Four of them were red in the full sweep of 2026-10-18: two because the agent went on to write code after the plan, one because the agent dropped the trade-offs of later option sets, and one because the judge read a frontmatter check as loading a task.

## Overview

### Context

Full sweep `acceptance-tests/runs/2026-10-18T14-45-21/` (claude arm, agent and judge `claude-sonnet-5-5`, one run per scenario), log `acceptance-tests/runs/full-sweep-2026-10-18.log`. The red `plan` scenarios:

- `plan-updates-index-on-new-fr` — `no_srs_modification` and `no_code_changes`. Turn 3 ended with the triage report and "Say if you want a different classification on any critique point." The persona (scripted to answer every confirmation with "yes, proceed") replied "Yes, proceed." The agent invoked the `implement` skill, created `documents/requirements.md`, `src/pause/pause.ts`, a test, `scripts/check.ts`, `deno.json`, and edited `AGENTS.md` / `CLAUDE.md`. It failed the same way in the `-f update` sweep of the same day.
- `plan-writes-task-new-frontmatter` — `no_code_changes`. The agent itself closed the plan with "To start the TDD work, say \"implement\" and name the task file." The persona replied `implement documents/tasks/2026/10/add-healthz-endpoint.md`, and the agent invoked `implement` and wrote `index.js`, tests and `package.json`.
- `plan-loads-related-tasks` — `skips_unrelated_profile_task`. The agent opened `add-profile-edit.md` to read its `implements:`, kept only `add-login-form.md`, wrote `related_tasks: [2026/04/add-login-form.md]`, and said "No other task shares FR-AUTH-LOGIN, so I did not load any other task." The judge failed the item "under a strict reading" because the file had been read.
- `plan-variant-properties-labelled` — `cross_variant_tradeoffs_outside_option_properties`. Question 1 (the variants) had a `**Trade-offs:**` block; questions 2 (fail open vs fail closed) and 3 (where the requirement text lives) had labelled options but no trade-offs.

### Current State

- `framework/atoms/plan.md` rule 1 forbids implementation, and the `TOTAL_STOP` branch of step 8 is the bare line `8. **TOTAL STOP**`. Nothing says what a later reply starts.
- Interviewed (`claude -p --resume`), the `plan-updates-index-on-new-fr` agent said "TOTAL STOP" and rule 1 bind the plan run itself, "neither says what a later bare 'yes' starts", and the AGENTS.md forward-motion rule pushed it to read "proceed" as a go-ahead for the next phase. This is the shape fixed for `review` in `6edb83c1` (FR-AI-CODE-REVIEW.HANDS-OFF).
- The Question Format block says every option set carries the five labelled lines "plus its own trade-offs"; step 4 says trade-offs belong "directly under the option list" of the variant question. Interviewed, the `plan-variant-properties-labelled` agent named step 4 as the only text that seemed to scope trade-offs to the main question, and said it skipped them on the other two "because the pairs looked simple".
- Step 2 of the atom already says "Opening a candidate's frontmatter to test the intersection is not loading it". The checklist item of `plan-loads-related-tasks` says only "must NOT appear as loaded context" and leaves "loaded" undefined, so the judge used "read by a tool".

### Constraints

- Do not touch `framework/core/assets/AGENTS.template.md` or `scripts/acceptance-tests/lib/` (shared cache key with six parallel sessions).
- The stop rule must render only into the standalone `plan` SKILL.md; `ship` consumes the atom with `HAND_OFF_TO_NEXT` and must still continue into implementation.
- No test-fitting: personas and the two stop checklists stay as they are.

## Definition of Done

- [x] FR-PLAN-HANDS-OFF: after the plan, a later reply ("yes, proceed", "implement <file>") produces no code, config or SRS change, and the plan does not offer to start implementation.
  - Benchmark: `plan-updates-index-on-new-fr`, `plan-writes-task-new-frontmatter`
  - Evidence: `deno task acceptance-tests -f <id> -n 3 -p 3 --no-cache` on the fixed atom passes 3 of 3 each; pre-fix rate recorded under Results.
- [x] FR-PLAN-HANDS-OFF: the stop rule renders only into the standalone skill.
  - Evidence: `grep -c "Every later turn of this conversation stays inside planning" framework/core/skills/plan/SKILL.md` prints 1, and the same grep over `framework/core/skills/ship/SKILL.md` prints 0.
- [x] FR-PLAN-VARIANT-ARCHETYPES: every option set in a plan reply ends with its own trade-offs block.
  - Benchmark: `plan-variant-properties-labelled`
  - Evidence: `deno task acceptance-tests -f plan-variant-properties-labelled -n 3 -p 3 --no-cache` passes 3 of 3 on the fixed atom.
- [x] FR-DOC-TASK-CONTEXT: the checklist of `plan-loads-related-tasks` defines loaded context as the chat list, a summary offered as context, and `related_tasks:`; a frontmatter read alone does not fail it.
  - Benchmark: `plan-loads-related-tasks`
  - Evidence: `deno task acceptance-tests -f plan-loads-related-tasks -n 3 -p 3 --no-cache` passes 3 of 3.
- [x] The gate stays green.
  - Evidence: `deno task check > log 2>&1`, final summary `0 failed`.

## Solution

1. Resample the four scenarios `-n 3` on HEAD and record the rates (RED for the three primitive defects).
2. `framework/atoms/plan.md`, `TOTAL_STOP` branch: the task file is the answer and the workflow ends with it; no offer to implement and no reply word to start it; every later turn stays inside planning; implementation is a separate workflow the user starts by invoking it by name, and a reply in this conversation is not that invocation; the forward-motion rule covers this workflow, not the next one.
3. Question Format: a bullet that every option set ends with its own trade-offs block, two-option sets included; step 4 says the same of later option sets.
4. `plan-loads-related-tasks` checklist: define loaded context as the skill does.
5. SRS: add FR-PLAN-HANDS-OFF; extend FR-PLAN-VARIANT-ARCHETYPES Layout with the trade-offs block and a Rationale.
6. Re-run the four scenarios `-n 3`, run `deno task check`, hand the full `-f plan` sweep to the user.

## Results

All runs: claude arm, agent and judge `claude-sonnet-5-5`, `-n 3 -p 3 --no-cache`.

- **RED, HEAD `f14ce6df`:** `plan-updates-index-on-new-fr` 0/3 (`2026-10-18T17-30-52-2`; implement phase or SRS creation in every run, plus `implements: []` where the agent obeyed FR-DOC-NO-SRS); `plan-writes-task-new-frontmatter` 1/3 (`17-42-50`; code written after "implement" / "go"); `plan-variant-properties-labelled` 1/3 (`17-36-52`; later option sets without trade-offs or labelled properties); `plan-loads-related-tasks` 0/3 (`17-30-52`; the rejected task as an "excluded" bullet under the loaded list, or the judge failing a frontmatter read).
- **GREEN, first text:** 3/3, 3/3, 3/3 and 2/3 (`17-58-57`, `18-08-57`, `18-05-47`, `17-58-57-2`). The one red `plan-loads-related-tasks` run cited the rejected task in `### Affected Surface` because its constraint "Re-use the form components from auth" may link it to the reset forms — the affected-surface rule and the related-task filter disagree there; left to the user.
- **Trim:** the first text pushed `plan` SKILL.md to ~10290 tokens, over the 10000 cap of `check-skills.ts` (FR-UNIVERSAL.DISCLOSURE). The additions were shortened, and two Verification lines that restated rules 5-7 and 9 were dropped (one of them said "in any order", against rule 9's exact order).
- **GREEN, final text:** 3/3 each — `plan-updates-index-on-new-fr` `18-16-48-2`, `plan-writes-task-new-frontmatter` `18-23-44`, `plan-variant-properties-labelled` `18-16-48`, `plan-loads-related-tasks` `18-18-21`.
- **Render check:** the hands-off line renders into `plan` SKILL.md (1) and not into `ship` (0).
- **Gate:** `deno task check` exit 0 (916 passed, 0 failed; 214 passed, 0 failed).
- **Hand-off:** the full sweep `deno task acceptance-tests -f plan` is left to the user.
