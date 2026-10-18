---
date: 2026-10-18
status: done
implements:
  - FR-UNIVERSAL.QA-FORMAT
related_tasks:
  - documents/tasks/2026/10/chat-rules-claude-reds.md
---
# Rule 6 (each option stands on its own) green on the default claude arm

## Goal

Make `agents-rules-option-standalone` pass on `claude-sonnet-5-5`, the default arm, so rule 6 of the question
format is enforced where users actually run, and do it on a judge whose verdicts were measured first.

## Overview

### Context

The full sweep of 2026-10-18 left the scenario red, and the session "chat rules" reverted two rule rewrites that
stayed at 0/3 (record: `documents/tasks/2026/10/chat-rules-claude-reds.md`). The judge could not be calibrated on the
claude arm: `calibrate.ts` built a codex judge home for a claude judge model, and its first call hung.

### Current State

- `calibrate.ts` builds the judge home through `buildJudgeConfig` + `runClaudeJudgeHome` (commit 96c29dde).
- Calibration of the single `options_standalone` item, 12 fixed replies × 2 calls: right on every negative call, on
  3 of 10 clean-reply calls at judge effort `medium`, 6 of 10 after allowances; longer wordings got worse.
- Six real replies from runs `2026-10-18T17-50-51` and `2026-10-18T17-30-11-3` were labelled by the rule text: 5 of
  6 carry the defect, mostly bare errand ids (`E2–E5`, `E4`).

### Constraints

- No edits under `scripts/acceptance-tests/lib/` without the user's OK.
- Checklists are sharpened to the rule text, never relaxed to a verdict; controls are labelled by the rule.
- The template edit lands in one commit (it invalidates every cached verdict).

## Definition of Done

- [x] FR-UNIVERSAL.QA-FORMAT: the judge for rule 6 is calibrated on the claude arm.
  - Test: `framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts` (case `option-standalone`)
  - Evidence: `deno test -A framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts -- <new-dir> option-standalone` — 22/24 matched with the committed config (`acceptance-tests/runs/option-calibration-2026-10-18-i`), 24/24 at effort high on the scratch copy (`-g-high`)
- [x] FR-UNIVERSAL.QA-FORMAT: rule 6 passes at least 2/3 on the default arm.
  - Benchmark: `agents-rules-option-standalone`
  - Evidence: `deno task acceptance-tests -f agents-rules-option-standalone -n 3 --no-cache` — pre-fix 0/3 (`acceptance-tests/runs/2026-10-18T19-43-52`), fixed 2/3 (`2026-10-18T19-49-59`) and 3/3 (`2026-10-18T19-52-50`)

## Solution

1. Fix `calibrate.ts` to build the judge home the runner's way (done, 96c29dde).
2. Add the six observed replies as controls labelled by the rule text (done, 96c29dde).
3. Split `options_standalone` into `options_labels_explained`, `options_pointers_resolved` and
   `options_numbers_terms_explained`; relabel all 12 controls per item (the AND of the three equals the old label).
4. Raise the judge effort to `high` in `acceptance-tests/config.json` on every IDE — the same checklist scored 9/24 at
   `medium` and 24/24 at `high` (user decision).
5. Rewrite rule 6 in `framework/core/assets/AGENTS.template.md`: name things in words on every option line, a label in
   parentheses is still bare, a percentage names its whole, any group phrase (count, category, superlative, partial
   list) is replaced by all its members, with a "report deleted" test. The pointer wording came from interviewing the
   three failed sessions of `2026-10-18T19-46-46`.

Follow-ups, not in this task:

- Read by the rule text, 2 of the 6 fixed-text replies are clean; four kept «те же пять заданий» or «остальные три
  странности», and the judge passed three of them. Add such replies as controls and sharpen `options_pointers_resolved`.
  Done 2026-10-18: two controls added, item sharpened, 28/28 calls matched (`option-calibration-2026-10-18-k`); see
  the calibration README.
- The old rule-6 wording still sits in the repo's `AGENTS.md`, `framework/atoms/plan.md` and five skills (`epic`,
  `maintenance`, `engineer-skill`, `engineer-command`, `write-prd`); each needs its own acceptance cycle.
- The judge effort change moves every scenario's verdict on every arm; the other judge calibrations
  (`agents-rules-chat-*`, `no-catch-all`) have not been re-run at `high`. Done 2026-10-18: all seven cases matched
  every call at `high` (`calib-high-2026-10-18-<case>`); live scenario runs at `high` are still not re-measured.
