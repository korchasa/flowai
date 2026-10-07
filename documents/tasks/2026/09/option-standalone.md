---
date: 2026-09-30
status: done
implements:
  - FR-UNIVERSAL.QA-FORMAT
tags: [agents-rules, qa-format, readability]
---
# Every option of a question stands on its own

## Goal

A reader who jumps straight to a question's options must be able to choose
without reading the report above the question or the earlier turns. Today the
user has to ask for the options again («подробнее все рекомендации»), which
costs a round-trip on every decision the agent hands over.

## Overview

### Context

Observed 2026-09-30 in the `factory` session `5aec518d` (Opus 5.5, Naoba work):
after a long report the agent asked "what to do next" with three options, and
each option depended on the report or the earlier chat to make sense:

- «Сократить объём прочитанных страниц» — understandable only after the
  paragraph above it that says page text is over half the cost of a long
  errand.
- «Сначала разобрать найденные странности Naoba» — listed them by shorthand
  («пропущенные строки на GitHub, пустой YouTube, меню Booking») explained only
  in the report.
- «Повторить текущий раунд» — "раунд" was a word the agent coined earlier in
  the session.

The user's reply was «подробнее все рекомендации». The user's own definition of
the defect: the description of an option must be sufficient on its own, so
that nobody has to read the chat above.

### Current State

Every place that describes the question format requires the QUESTION to be
answerable "from itself and its options alone" (FR-UNIVERSAL.QA-FORMAT rule 2).
No place requires the same of each OPTION. Places carrying the format:

- shipped template `framework/core/assets/AGENTS.template.md` — `Variant
  Analysis` bullet, and the `The reader did not see this session` bullet;
- Question Format blocks in `framework/atoms/plan.md` (renders `plan` and
  `ship`), `epic`, `maintenance`, `write-prd`, `engineer-skill`,
  `engineer-command`;
- SRS `FR-UNIVERSAL.QA-FORMAT`;
- this repo's `AGENTS.md` (`Self-Contained Questions`, `Variant Layout`);
- outside flowai: the user's `~/.claude/CLAUDE.md` and `~/.claude-work/CLAUDE.md`
  ("Questions to me"), which is what the `factory` session actually followed.

### Constraints

- Acceptance-test TDD: the scenario must fail on the current text first.
- Layout defects reproduce on the Claude arm, not on the default codex arm
  (memory `codex-arm-never-writes-option-paragraphs`), so RED and GREEN run
  with `-i claude`. The default Claude model (Haiku) did not show this defect;
  the `factory` session ran on Opus 5.5, so the runs use `-m claude-opus-5-5`.
- The judge item needs a negative control in the calibration harness — the
  reader-context items showed that a checklist item can almost never fire.

## Definition of Done

- [x] FR-UNIVERSAL.QA-FORMAT: scenario `agents-rules-option-standalone`
  reproduces the defect on the pre-fix text.
  - Test: `framework/core/acceptance-tests/agents-rules-option-standalone/mod.ts`
  - Evidence: `deno task acceptance-tests -i claude -m claude-opus-5-5 -f agents-rules-option-standalone -n 3 --no-cache`
    on the pre-fix text fails `options_standalone` in at least one run.
- [x] FR-UNIVERSAL.QA-FORMAT: the judge separates a standalone option set from
  one that leans on the report.
  - Test: `framework/core/acceptance-tests/agents-rules-option-standalone/calibration.json`
  - Evidence: `deno test -A framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts -- acceptance-tests/runs/<new-dir> option-standalone`
    reports every sample `matched`.
- [x] FR-UNIVERSAL.QA-FORMAT rule 6: the rule text is in every place that
  carries the question format.
  - Evidence: `grep -lF "stands on its own" framework/core/assets/AGENTS.template.md framework/atoms/plan.md framework/core/skills/epic/SKILL.md framework/core/skills/maintenance/SKILL.md framework/engineering/skills/write-prd/SKILL.md framework/devtools/skills/engineer-skill/SKILL.md framework/devtools/skills/engineer-command/SKILL.md AGENTS.md documents/requirements.md | wc -l`
    prints 9.
- [x] FR-UNIVERSAL.QA-FORMAT: the scenario passes on the fixed text.
  - Evidence: `deno task acceptance-tests -i claude -m claude-opus-5-5 -f agents-rules-option-standalone -n 5 --no-cache`
    reports a pass rate of at least 3/5 (the runner's threshold).
- [x] The project gate stays green.
  - Evidence: `deno task check` ends with `0 failed`.
- [x] The user's personal instructions carry the same rule in both roots.
  - Evidence: `grep -cF "each option" ~/.claude/CLAUDE.md ~/.claude-work/CLAUDE.md`
    is non-zero for both files.

## Solution

1. Author `agents-rules-option-standalone`: a Russian-language, single-turn
   scenario on a fixture holding the summary of a benchmark round (errands with
   short ids, anomalies with short ids, cost split). The one request asks for a
   report and then one question with options about what to do next, as in the
   `factory` session; the judge reads only the options. A three-turn version
   was dropped: the user emulator answers only when the agent asks something,
   so the report-only first turn ended the dialogue (`2026-09-30T13-14-33`).
2. Add fixed calibration replies — one clear, one built like the `factory`
   reply — and teach `calibrate.ts` the new case.
3. RED: run the scenario 3 times on the Claude arm against the current text.
   If it never fails, stop and report instead of editing the rules.
4. GREEN: add rule 6 to FR-UNIVERSAL.QA-FORMAT, then the same requirement plus
   the "read each option alone" self-check to the template, the six Question
   Format blocks and this repo's `AGENTS.md`. Re-run the scenario.
5. Copy the rule into `~/.claude/CLAUDE.md` and `~/.claude-work/CLAUDE.md`.
6. `deno task check`; hand off the full sweeps of the touched skills.

## Results

- RED on the pre-fix text: 1/3 (`acceptance-tests/runs/2026-09-30T13-17-42`);
  the failing options cited «логи E3, E4 и E5» and «как в E4».
- Calibration: 6/6 matched (`acceptance-tests/runs/option-standalone-calibration-2`).
- First rule wording ("read each option alone"): 1/5
  (`2026-09-30T13-21-38`). Titles became plain actions, but ids stayed bare.
  All four failed agents, resumed and asked, said they skipped the self-check
  and treated an id as known because the report above had defined it.
- Current wording (an explanation above does not count; a label in
  parentheses is explained or deleted; list every label before sending):
  4/5 (`2026-09-30T13-28-41`). The one failure left «повторить поручения E1–E5»
  unexplained.
- `deno task check`: 867 passed, 0 failed; 187 passed, 0 failed.
