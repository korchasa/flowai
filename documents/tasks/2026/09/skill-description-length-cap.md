---
date: 2026-09-01
status: to do
implements:
  - FR-DESC-QUALITY
tags: [skills, context-budget, check-skills]
---
# Cap skill description length so the skill listing fits the IDE budget

## Goal

Keep every installed pack's skill listing inside the context budget the IDE gives it, so descriptions are never truncated and skill routing keeps working.

## Overview

### Context

An IDE shows the model one line per installed skill — name plus `description` — on every turn. Claude Code budgets that listing at roughly 1 % of the context window (about 2k tokens on a 200k window); past the budget, entries are truncated and description-based routing degrades.

Measured on 2026-09-01 over `framework/*/{skills,commands}/*/SKILL.md` (estimate: characters / 4):

- 63 entries in total, about 3.7k est. tokens when every pack is installed.
- `core` alone: 20 entries, about 1.26k est. tokens. `engineering`: 15 entries, about 1.05k. `core` + `engineering` already exceed the 2k budget.
- Mean description length about 290 characters; the longest (`delegate-to-ide`, `review`, `plan`) are 380–384 characters.

The agentskills.io limit (1024 characters) is far above the point where the listing overflows, so the spec does not protect the budget.

### Current State

`scripts/check-skills.ts` validates descriptions under criterion `FR-DESC-QUALITY` (wording quality) but has no length cap. `scripts/check-trigger-coverage.ts` requires three trigger scenarios per skill, which is how description changes are verified behaviourally.

### Constraints

- A cap must not break trigger accuracy: shortening a description is a skill change and goes through the Acceptance-Test TDD flow (`trigger-pos-1` / `trigger-adj-1` / `trigger-false-1` per skill).
- Commands (`framework/*/commands/`) count toward the listing too, even though they are exempt from trigger coverage.
- The cap value is a decision above the class/method line: propose it with the measured distribution, do not pick it silently.

## Definition of Done

- [ ] FR-DESC-QUALITY: `check-skills.ts` fails on a `description` longer than the agreed cap and reports the offending skill, its length and the cap.
  - Test: `scripts/check-skills_test.ts::description length cap`
  - Evidence: `deno test -A scripts/check-skills_test.ts`
- [ ] FR-DESC-QUALITY: every shipped skill and command passes the cap; each shortened description keeps its three trigger scenarios green.
  - Test: `Benchmark: <skill>-trigger-pos-1`, `<skill>-trigger-adj-1`, `<skill>-trigger-false-1` for each shortened skill
  - Evidence: `deno task check` (skill validation step) and `deno task acceptance-tests -f trigger-`
- [ ] FR-DESC-QUALITY: SRS `FR-DESC-QUALITY` states the cap and its rationale (listing budget), SDS §5 lists the validation rule.
  - Test: `scripts/check-fr-coverage_test.ts`
  - Evidence: `grep -n "length" documents/requirements.md | grep -i desc`

## Solution

1. Measure: dump `(pack, skill, description length)` for every entry and present the distribution with two or three candidate caps (for example 200, 250, 300 characters) and the resulting per-pack listing size; the user picks the cap.
2. RED: add a `check-skills_test.ts` case with a fixture description one character over the cap; run it and watch it fail.
3. GREEN: add the length check to `validateDescription` (or the nearest existing description validator) in `scripts/check-skills.ts` under criterion `FR-DESC-QUALITY`.
4. Shorten every description over the cap, one skill at a time, running that skill's three trigger scenarios after each edit (RED is the current scenario state, GREEN is unchanged verdicts on the shorter text).
5. Update SRS `FR-DESC-QUALITY` and SDS §5, then run `deno task check`.
