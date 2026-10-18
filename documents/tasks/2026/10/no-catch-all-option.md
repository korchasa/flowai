---
date: 2026-10-08
status: done
implements:
  - FR-UNIVERSAL.QA-FORMAT
tags: [agents-rules, qa-format]
related_tasks:
  - option-standalone
  - option-essence
---
# No catch-all option in questions

## Goal

A question to the user must not end with an option that only invites a
free-form answer («Другое — расскажу», «Свой вариант»). The user can always
type a reply instead of a letter, and an IDE's question tool already has its own
free-text field, so such an option costs a line and offers no choice.

## Overview

### Context

The user asked (2026-10-08) to stop agents from adding "other" to every
question. A scan of the last 600 Claude transcripts found 5 catch-all options
between 2026-09-30 and 2026-10-06 (Opus 5, Fable 5.1), all in short clarifying
questions with an open answer space: «D. Другое — расскажу» under "why do you
need Consul", «C. Что-то другое, напиши что» under "which app should catch the
key", «C. Свой вариант», «C. Другое — скажи, что нужно». Two more matches were
legitimate options with concrete content («Другое сочетание по умолчанию»).

### Current State

- FR-UNIVERSAL.QA-FORMAT had rules 1-6 and nothing about catch-all options; no
  framework text asked for one either — the agent added it on its own.
- The question format lives in `framework/core/assets/AGENTS.template.md`,
  `AGENTS.md`, `framework/atoms/plan.md` (generates `plan/SKILL.md`) and the
  Question Format blocks of `epic`, `maintenance`, `engineer-skill`,
  `engineer-command`, `write-prd`; the user's personal `CLAUDE.md` in both
  account roots carries its own question rules.

### Constraints

- An option with concrete content stays allowed even when its title starts with
  «Другое» / "Other".
- The defect is a Claude one; acceptance runs on `-i claude -m claude-opus-5-5`.

## Definition of Done

- [x] FR-UNIVERSAL.QA-FORMAT rule 7: no question carries a catch-all option.
  - Test: `Benchmark: agents-rules-no-catch-all-option` item `no_catch_all_option`
  - Evidence: `deno task acceptance-tests -i claude -m claude-opus-5-5 -f agents-rules-no-catch-all-option -n 5 --no-cache` — fails on the pre-fix text, passes on the fixed one. Result: 2/5 pre-fix, catch-all in 3 runs (`acceptance-tests/runs/2026-10-08T10-20-42`); 5/5 after, none (`2026-10-08T10-23-36`).
- [x] The judge separates a catch-all from a concrete «Другое: …» option.
  - Test: `framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts` case `no-catch-all`
  - Evidence: `deno test -A framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts -- <new-dir> no-catch-all` — every fixed reply matches. Result: 6/6 (`acceptance-tests/runs/no-catch-all-calibration-catch-all-1`).
- [x] `agents-rules-option-standalone` stays green with the extra guard item.
  - Test: `Benchmark: agents-rules-option-standalone` items `options_standalone`, `essence_line_per_option`, `no_catch_all_option`
  - Evidence: `deno task acceptance-tests -i claude -m claude-opus-5-5 -f agents-rules-option-standalone -n 5 --no-cache` and its `option-standalone` calibration case. Result: pre-fix 4/4 with no catch-all, one run errored (`2026-10-08T10-16-13`) — the scenario cannot go red on this defect, so it is a guard only; after 5/5 (`2026-10-08T10-29-53`), calibration 12/12 (`option-standalone-calibration-catch-all-2`). A planted catch-all sample was dropped from this case: the judge also failed it on `options_standalone` or `essence_line_per_option`, 1 of 2 times each (`option-standalone-calibration-catch-all-1`).
- [x] The rule sits in every place that carries the format.
  - Evidence: `grep -liF "no catch-all option" framework/core/assets/AGENTS.template.md AGENTS.md framework/atoms/plan.md framework/core/skills/epic/SKILL.md framework/core/skills/maintenance/SKILL.md framework/devtools/skills/engineer-skill/SKILL.md framework/devtools/skills/engineer-command/SKILL.md framework/engineering/skills/write-prd/SKILL.md | wc -l` prints 8. Result: 8.
- [x] The personal instructions of both accounts forbid the catch-all option.
  - Evidence: `grep -c 'catch-all option' ~/.claude/CLAUDE.md ~/.claude-work/CLAUDE.md` — non-zero in both. Result: 1 and 1.
- [x] Gate green.
  - Evidence: `deno task check` ends with `0 failed` in every summary line. Result: 870 and 193 passed, 0 failed.

## Solution

1. RED: add `no_catch_all_option` to `agents-rules-option-standalone`; run it on
   the pre-fix text — no catch-all appeared, so write
   `agents-rules-no-catch-all-option` (a "why do you need an LLM cache" question,
   the open answer space of the observed cases) and confirm it fails.
2. SRS rule 7 with scope and acceptance; SDS note next to the rule-6 scenario.
3. GREEN: the rule in the template, `AGENTS.md`, the `plan` atom and five
   Question Format blocks; regenerate composites; re-run both scenarios.
4. Calibration: a `no-catch-all` case with the observed catch-all reply as the
   negative control and a concrete «Другое: …» option as a positive one.
5. Personal `CLAUDE.md` in both roots, rule 3 of "Questions to me".
6. `deno task check`.
