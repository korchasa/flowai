---
date: 2026-10-18
status: done
implements:
  - FR-WRITE-PRD
  - FR-UNIVERSAL.QA-FORMAT
tags: [write-prd, acceptance-tests]
related_tasks:
  - "[harness-on-ai-ide-cli](harness-on-ai-ide-cli.md)"
  - "[prd-targets-with-recommendation](prd-targets-with-recommendation.md)"
---
# write-prd-basic: ask before drafting, recommend every number, number every question

## Goal

`write-prd-basic` is the acceptance of FR-WRITE-PRD, and it passes about half
the time on codex and almost never on claude. A gate that flips on the same
text tells nothing about a change to the skill. Make the skill do what the FR
says on both IDEs, and make the judge rule the same reply the same way.

## Overview

### Context

- Parity check of the ai-ide-cli migration, 2026-10-18
  ([harness-on-ai-ide-cli](harness-on-ai-ide-cli.md), section Parity): codex
  passed 4 of 7 before and 4 of 8 after; claude 1 of 5 across both sides. The
  transport did not move it; inputs were identical.
- Failed items: `targets_asked_with_recommendation`, `qa_format_compliant`,
  `specific_not_vague`.

### Diagnosis (raw sessions and interviews, 2026-10-18)

- **claude writes the PRD before asking** (`targets_asked_with_recommendation`).
  Both claude runs (`acceptance-tests/runs/2026-10-18T01-50-16`,
  `2026-10-18T01-55-06`) call `Write` on the PRD in turn 1 and ask afterwards;
  the questions themselves are good (numbered, each with a recommended value
  and a reason). Both agents, resumed and asked, named the same skill text:
  - step 2 "If key context is missing (...), ask the user before generating
    the full doc" — the condition left the call to them, and they judged the
    context sufficient;
  - step 3 "A target the user left unanswered goes in as your recommended
    value marked `(proposed, awaiting approval)`" — read as "not given in the
    request", which licenses a draft full of proposals before any question;
  - the "Living Document" principle and the "CRITICAL: MUST save the final PRD
    to a file" banner — pressure to produce the file, with nothing on when.
  - Both said the skill would need a hard order: the first reply is the
    questions only, no file until the user answers.
  Defect: skill text.
- **codex declines to recommend OS versions and guardrail thresholds**
  (`specific_not_vague`, sometimes `targets_asked_with_recommendation`). In 6
  of 8 codex runs of 2026-10-18 the OS question had no number ("please
  specify", "the versions the app currently supports"), although the skill
  already says that is not a value; guardrails were sometimes "set after
  reviewing baselines". Interviewed runs `2026-10-18T02-08-27/run-1` and
  `run-2`: both treated the app's support floor as "project-specific
  information I shouldn't guess", and one asked the skill to say how to
  recommend when the product's own data is unknown. Defect: skill text.
- **A follow-up question written as a bare paragraph** (`qa_format_compliant`).
  Codex runs that found a budget conflict asked "Is 1 million a hard monthly
  cap…?" as a paragraph in turn 2. The interviewed run said it followed the
  project's "stop on contradiction" rule and did not apply the question format
  there; the skill scopes the format to "asking the user a choice (audience,
  constraints, timeline)". Defect: skill text.
- **The judge flips on `1. **question**`** (`qa_format_compliant`). The item
  said "a numbered list item (a line starting with '1.'), NOT a bold heading
  like '**1. Title**'", and the judge read a bold question after the number as
  the forbidden bold heading in some runs. Defect: checklist wording — the
  scenario and persona are fine.

### Current State

- `framework/engineering/skills/write-prd/SKILL.md` section 0 scopes the
  question format to "a choice (audience, constraints, timeline)"; section 2
  step 2 asks only "if key context is missing"; step 3 allows proposals for
  any target "the user left unanswered".
- `framework/engineering/skills/write-prd/acceptance-tests/basic/mod.ts`
  item `qa_format_compliant` does not say how a bold question after the
  number is ruled.

### Constraints

- Persona, user query and the other checklist items stay as they are (no
  test-fitting).
- The trigger scenarios check only that the skill loads; the description is
  not changed.

## Definition of Done

- [x] FR-UNIVERSAL.QA-FORMAT: the judge rules `1. **question**` compliant and a
  bare-paragraph follow-up question non-compliant, consistently.
  - Test: `Benchmark: write-prd-basic` item `qa_format_compliant`
  - Evidence: `grep -c "Bold text AFTER the number does not matter" framework/engineering/skills/write-prd/acceptance-tests/basic/mod.ts` prints 1. Result: 1. In the 20 runs below no verdict failed a `1. **question**`; the 3 baseline failures each named a bare-paragraph follow-up question, and the one remaining failure is described under Results.
- [x] FR-WRITE-PRD: the first reply asks and writes no file; every missing
  target gets a concrete number with a reason; every question, follow-ups
  included, is numbered.
  - Test: `Benchmark: write-prd-basic`
  - Evidence: `deno task acceptance-tests -f write-prd-basic -i claude -n 4 --no-cache` and `-i codex -n 4`, on the old skill text (with the new checklist) and on the new one; the new text passes clearly more often on both IDEs. Result: see Results — claude 2/4 → 7/8, codex 3/4 → 4/4.
- [x] The skill's trigger scenarios still pass.
  - Test: `Benchmark: write-prd-trigger-pos-1`, `write-prd-trigger-adj-1`, `write-prd-trigger-false-1`
  - Evidence: `deno task acceptance-tests -f write-prd-trigger --no-cache`. Result: 3/3 on claude (`acceptance-tests/runs/2026-10-18T02-56-15`).
- [x] Gate green.
  - Evidence: `deno task check > "$SCRATCH/check.log" 2>&1; echo "EXIT: $?"` and the `0 failed` summary lines. Result: EXIT 0; 907 and 213 passed, 0 failed.

## Results

All runs `-n 4 --no-cache`, agent models `claude-sonnet-5-5` / `gpt-6-luna`
(effort medium), judge `claude-sonnet-5-5`. "Turn-1 write" counts runs whose
first turn wrote the PRD file; "OS numbers" counts PRDs that name concrete
minimum iOS and Android versions.

- Parity (old text, old checklist, from the migration task): claude 1/5, codex 8/15. Turn-1 write in 4 of 5 claude runs.
- Old text, clarified checklist (RED):
  - claude 2/4 (`acceptance-tests/runs/2026-10-18T02-28-39`): both failures a bare-paragraph follow-up question. Turn-1 write 0/4, OS numbers 3/4.
  - codex 3/4 (`2026-10-18T02-28-44`): the failure a bare-paragraph budget-conflict question. OS numbers 2/4, and in turn 1 only 1 of 4 runs recommended a version; the judge passed the other three anyway, so `specific_not_vague` does not catch this reliably.
- New text (GREEN):
  - claude 3/4 (`2026-10-18T02-39-16`). Turn-1 write 0/4, OS numbers 4/4. The failure: a 12-turn run that drifted into epic planning; every question was numbered, but the judge failed it because a numbered list of findings preceded the questions and the question list restarted at 1. The rule does not forbid that, so the item now says only questions are judged.
  - claude 4/4 with that final item wording (`2026-10-18T02-56-10`). Turn-1 write 0/4, OS numbers 4/4.
  - codex 4/4 (`2026-10-18T02-39-21`). OS numbers 4/4; turn 1 recommended concrete versions in 2 of the 3 runs that asked about them.
- Caveat: the drafting-first defect did not reproduce in the 4 RED claude runs (it did in 4 of 5 parity runs), so the order rule is backed by the interviews and the 0/12 turn-1 writes after the fix, not by a same-batch red/green pair.

## Solution

1. Checklist: reword `qa_format_compliant` so a bold question after the
   number passes and a bare-paragraph question in any turn fails.
2. RED: run `write-prd-basic -n 4` on claude and codex with the OLD skill
   text and the new checklist.
3. GREEN: in `write-prd/SKILL.md`
   - section 0 binds the format to every question in every turn, a single
     follow-up included;
   - step 2 becomes unconditional and ordered: the first reply is the
     questions only, no PRD file in that reply;
   - step 2 says how to recommend when the product's own data is unknown
     (public data and common practice, stated in the reason), and lists
     "specify yours", "what the app supports today", "set after review" as
     non-values;
   - step 3 and the banner say the file is written after the round of
     questions; proposals are for targets the user left open after being
     asked, or noticed only while drafting.
4. Run `write-prd-basic -n 4` on claude and codex with the new text; run the
   trigger scenarios.
5. SRS FR-WRITE-PRD: record the measured pass rates.
6. `deno task check`.
