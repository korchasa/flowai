---
date: 2026-10-07
status: done
implements:
  - FR-UNIVERSAL.QA-FORMAT
  - FR-PLAN-VARIANT-ARCHETYPES
tags: [agents-rules, qa-format, readability]
related_tasks:
  - option-standalone
---
# Every option carries an Essence line

## Goal

The reader of a question must learn what an option is before reading its pros
and cons. Today the title carries that load (rule 6 of FR-UNIVERSAL.QA-FORMAT:
"say what would be done, to what, and what the reader gets"), so titles grow
into sentences and a missing explanation is invisible. A separate labelled
`**Essence:**` line makes the explanation a property like the other four: a
missing one shows as a missing line.

## Overview

### Context

The user asked (2026-10-07) to add a mandatory "Суть" property to every option.
The chosen variant: the title becomes a short name the user answers by, and the
Essence line takes over rule 6's duty — what would be done, to what, and what
the reader gets. Scope chosen: the framework product (SRS, shipped template, the
six Question Format blocks, scenarios), this repo's `AGENTS.md`, and the user's
personal `CLAUDE.md` in both account roots (`~/.claude`, `~/.claude-work`).

### Current State

- FR-UNIVERSAL.QA-FORMAT rule 5: four labelled properties per option — Pros,
  Cons, Risks, Best for. Rule 6: the title and the lines under it make the
  option understandable; the title says what would be done.
- The format lives in: `framework/core/assets/AGENTS.template.md`
  (`Variant Analysis`), `AGENTS.md` (`Variant Presentation`, `Variant Layout`,
  `Self-Contained Questions`), `framework/atoms/plan.md` (generates
  `plan/SKILL.md`), and the Question Format blocks of `epic`, `maintenance`,
  `engineer-skill`, `engineer-command`, `write-prd`.
- Scenarios scoring option layout: `agents-rules-variant-analysis` and
  `plan-variant-properties-labelled` (default codex arm), and
  `agents-rules-option-standalone` (Opus, rule 6) with its judge calibration in
  `agents-rules-chat-calibration/calibrate.ts`.

### Constraints

- Short reply options with no analysis (Apply / Skip / Edit, an approval
  question's replies) carry no properties, so they carry no Essence line either;
  their title alone must stay understandable.
- `plan` Step 4's scope marker (`— full scope` / `— partial: …`) stays on the
  title.
- Rule 6's id/term/number self-check is not weakened: it now applies to the
  Essence line as part of the option.

## Definition of Done

- [x] FR-UNIVERSAL.QA-FORMAT: every option that carries an analysis opens with
  a labelled Essence line before Pros, saying what would be done, to what, and
  what the reader gets; the title is a short name.
  - Test: `Benchmark: agents-rules-variant-analysis` item `essence_line_per_option`
  - Evidence: `deno task acceptance-tests -f agents-rules-variant-analysis -n 3 --no-cache` — the item fails on the pre-fix text and passes on the fixed one. Result: failed pre-fix (`acceptance-tests/runs/2026-10-07T17-33-51`), passed 3/3 after (`2026-10-07T17-37-18`).
- [x] FR-PLAN-VARIANT-ARCHETYPES: `plan` variants carry the Essence line.
  - Test: `Benchmark: plan-variant-properties-labelled` item `essence_line_per_option`
  - Evidence: `deno task acceptance-tests -f plan-variant-properties-labelled -n 3 --no-cache` — fails before, passes after. Result: failed pre-fix (`2026-10-07T17-33-51`), passed 3/3 after (`2026-10-07T17-41-10`; run-1 vacuously — the agent stopped on the pre-existing conflict between `plan` Step 3 "Do NOT fill `## Solution` yet" and the task-format skill's "Solution is never blank").
- [x] FR-UNIVERSAL.QA-FORMAT rule 6 holds on Opus with the reworded rule.
  - Test: `Benchmark: agents-rules-option-standalone` items `options_standalone`, `essence_line_per_option`
  - Evidence: `deno task acceptance-tests -i claude -m claude-opus-5-5 -f agents-rules-option-standalone -n 5 --no-cache` — at least 4/5, as before the change. Result: 4/5, `essence_line_per_option` 5/5 (`2026-10-07T20-12-29`). The first wording scored 3/5 (`2026-10-07T20-05-44`) because one agent read "a short name the reader answers by" as permission to drop the option letters; the title sentence now ties the name to the option's letter or number.
- [x] The judge separates options with and without a proper Essence line.
  - Test: `framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts` case `option-standalone`
  - Evidence: `deno test -A framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts -- <new-dir> option-standalone` — every fixed reply matches its expected verdicts. Result: 10/10 matched (`acceptance-tests/runs/option-essence-calibration-1`).
- [x] The Essence rule sits in every place that carries the format.
  - Evidence: `grep -lF '**Essence:**' framework/core/assets/AGENTS.template.md AGENTS.md framework/atoms/plan.md framework/core/skills/epic/SKILL.md framework/core/skills/maintenance/SKILL.md framework/devtools/skills/engineer-skill/SKILL.md framework/devtools/skills/engineer-command/SKILL.md framework/engineering/skills/write-prd/SKILL.md | wc -l` prints 8. Result: 8.
- [x] The personal instructions of both accounts list «Суть» before «Плюсы».
  - Evidence: `grep -c 'Суть' ~/.claude/CLAUDE.md ~/.claude-work/CLAUDE.md` — non-zero in both. Result: 4 and 4.
- [x] Gate green.
  - Evidence: `deno task check` ends with `0 failed` in every summary line. Result: 869 and 193 passed, 0 failed.

## Solution

1. RED: add the checklist item `essence_line_per_option` to
   `agents-rules-variant-analysis`, `plan-variant-properties-labelled` and
   `agents-rules-option-standalone`; run the two codex scenarios on the pre-fix
   text and confirm the item fails.
2. SRS: FR-UNIVERSAL.QA-FORMAT rules 3, 5 and 6 and the acceptance list;
   FR-PLAN-VARIANT-ARCHETYPES description and layout scope. SDS: any place that
   lists the four properties.
3. GREEN: reword the format in the template, `AGENTS.md`, the `plan` atom and
   the five Question Format blocks; regenerate composites.
4. Calibration: add the Essence line to the passing fixed reply and a negative
   control whose options lack it; run the `option-standalone` calibration case.
5. Re-run the three scenarios; Opus five times for rule 6.
6. Personal `CLAUDE.md` in both roots: «Суть» first in the option analysis.
7. `deno task check`, commit, push.
