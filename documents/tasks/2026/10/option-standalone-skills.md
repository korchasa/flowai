---
date: 2026-10-18
status: done
implements:
  - FR-UNIVERSAL.QA-FORMAT
related_tasks:
  - documents/tasks/2026/10/option-standalone-claude.md
---
# Carry the new rule-6 wording into every copy of the question format

## Goal

Every place that ships or applies the question format says the same rule 6 ("Each option stands on its own"), so an
agent working from a skill's Question Format block names things in words inside an option, exactly as an agent working
from the `AGENTS.md` template does.

## Overview

### Context

Commit 5d8780c2 rewrote rule 6 in `framework/core/assets/AGENTS.template.md`: name things in words on every option
line, a label in parentheses is still bare, a percentage names its whole, and any group phrase (a count, a category, a
superlative, a partial list) is replaced by all its members. `agents-rules-option-standalone` went from 0/3 to 2/3 and
3/3 on `claude-sonnet-5-5`. Seven copies kept the old wording ("explain inside the option any id, name, number or
term..."), deliberately, because each is a primitive with its own acceptance coverage (record:
`documents/tasks/2026/10/option-standalone-claude.md`, follow-ups).

### Current State

- Old wording in: this repo's `AGENTS.md` (`CLAUDE.md` is a symlink to it), `framework/atoms/plan.md` (source of the
  generated `plan` SKILL.md), and the Question Format blocks of `epic`, `maintenance`, `engineer-skill`,
  `engineer-command`, `write-prd`.
- The old tail is byte-identical in all seven; the sentences before it ("Each option stands on its own", the title and
  Essence sentences) stay as they are.

### Constraints

- Only the rule-6 tail changes; every file keeps its own lead-in.
- Acceptance Test TDD: one option-question scenario per primitive, run on HEAD and after the edit; the full
  per-primitive sweep goes to the user.

## Definition of Done

- [x] FR-UNIVERSAL.QA-FORMAT: no copy of the question format outside run artefacts and worktrees carries the old rule-6
      sentence.
  - Test: `grep -rlF "Explain inside the option any id" --include='*.md' framework AGENTS.md`
  - Evidence: the grep prints nothing (exit 1) — verified 2026-10-19
- [x] FR-UNIVERSAL.QA-FORMAT: the new rule-6 sentence sits in the template, the six Question Format blocks and this
      repo's `AGENTS.md`.
  - Test: `grep -lF "name things in words, never by a report's ids" framework/core/assets/AGENTS.template.md framework/atoms/plan.md framework/core/skills/plan/SKILL.md framework/core/skills/epic/SKILL.md framework/core/skills/maintenance/SKILL.md framework/devtools/skills/engineer-skill/SKILL.md framework/devtools/skills/engineer-command/SKILL.md framework/engineering/skills/write-prd/SKILL.md AGENTS.md | wc -l`
  - Evidence: prints 9 — verified 2026-10-19
- [x] FR-UNIVERSAL.QA-FORMAT: the option-question scenario of each edited primitive is no worse after the edit than on
      HEAD.
  - Benchmark: `plan-variants-complex`, `epic-basic`, `maintenance-basic`, `engineer-skill-basic`,
    `engineer-command-create`, `write-prd-basic`
  - Evidence: `deno task acceptance-tests -f <id> -n 3 --no-cache` on HEAD and after the edit (run dirs below)
  - HEAD (5d8780c2), `claude-sonnet-5-5`: `plan-variants-complex` 2/3 (`acceptance-tests/runs/2026-10-18T20-03-23`),
    `epic-basic` 2/3 (`2026-10-18T20-03-28`, the failure an exit-124 timeout that also edited files outside the epic),
    `maintenance-basic` 3/3 (`2026-10-18T20-03-33`), `engineer-skill-basic` 3/3 (`2026-10-18T20-24-57`),
    `engineer-command-create` 3/3 (`2026-10-18T20-25-02`), `write-prd-basic` 3/3 (`2026-10-18T20-25-07`). None is red
    on the old text, so these six are regression guards for the edit, not its acceptance; the rule's acceptance stays
    `agents-rules-option-standalone`.
  - After the edit: `plan-variants-complex` 2/3 (`2026-10-18T20-31-51`, same item `selection_question_self_contained`
    as on HEAD; this text was over the token cap and was trimmed afterwards, see the next item), `epic-basic` 3/3 (`2026-10-18T20-31-56`), `maintenance-basic` 3/3
    (`2026-10-18T20-32-01`), `engineer-skill-basic` 3/3 (`2026-10-18T20-52-01`), `engineer-command-create` 3/3
    (`2026-10-18T20-52-06`), `write-prd-basic` 1/3 (`2026-10-18T20-52-11`).
  - `write-prd-basic` resampled `-n 4` on both sides: HEAD 3/4 (`2026-10-18T21-07-22-head`), new text 4/4
    (`2026-10-18T20-59-05`). Totals 6/7 against 5/7, and every failure on both sides is the same item,
    `qa_format_compliant`, on a question asked without a number in a later turn (rule 1, not rule 6): model variance.
- [x] FR-UNIVERSAL.DISCLOSURE: `plan` SKILL.md stays under the 10000-token cap with rule 6 whole, and the trim breaks
      neither its variant scenario nor its layout scenario.
  - Test: `deno run -A scripts/check-skills.ts`; Benchmark: `plan-variants-complex`, `plan-variant-properties-labelled`
  - Evidence: check-skills passes (9994 tokens, 22 chars of margin); after the trim `plan-variants-complex` 2/3 (`acceptance-tests/runs/2026-10-18T22-25-14`, the same
    item `selection_question_self_contained` as on HEAD) and `plan-variant-properties-labelled` 3/3
    (`2026-10-18T22-25-19`)
- [x] The project gate is green.
  - Test: `deno task check`
  - Evidence: summary lines `922 passed | 0 failed` and `214 passed | 0 failed`, exit 0 — 2026-10-19

## Solution

1. Run the six scenarios on HEAD, `-n 3 --no-cache`.
2. Replace the old tail with the template's text from "**Inside an option, name things in words" to "replace each
   with words or remove it." in the seven files, by a script that fails unless the old tail occurs exactly once.
3. Regenerate the `plan` SKILL.md (`deno run -A scripts/generate-skill-composites.ts --write`).
4. Point the SRS evidence for "Rule 6 text sits in every place" at the new sentence, so it checks the current wording
   rather than the heading every version shares.
5. Re-run the six scenarios; run `deno task check`.
6. **Trim `plan`** (user decision, «Сохранить правило, убрать повторы»): the full rule pushed `plan` SKILL.md to ~10287
   tokens, over the 10000 cap of `check-skills.ts`. Rule 6 stays whole; three Verification lines that restated steps
   2-3 (outcome mapping, the `surface-scout` dispatch, the critique source), the paragraph after the property-line
   example that restated "each property gets its own labelled line", and the tail of the Self-contained bullet
   ("they send the reader back up the transcript...") were dropped. Same move as `plan-claude-arm-reds.md` (Trim).
   Re-run `plan-variants-complex` and the layout scenario `plan-variant-properties-labelled`.
7. Hand the full per-primitive sweeps to the user.

## Follow-ups

- `plan` SKILL.md has 22 characters of margin under the cap: the next addition to `framework/atoms/plan.md` outside
  its step blocks needs a trim of its own, or the Question Format block should move to a shared reference.
