---
date: 2026-10-08
status: done
implements:
  - FR-WRITE-PRD
tags: [write-prd, acceptance-tests]
---
# write-prd asks for missing numeric targets with a recommended value

## Goal

A PRD from `write-prd` must be measurable from its first draft, and the numbers
in it must be ones the user saw. Today the agent on `gpt-6-luna` leaves every
target the user did not give — latency, availability, retry policy, minimum OS
versions, guardrail thresholds — as an open question, and the PRD fails its own
"Measurable" principle.

## Overview

### Context

- `write-prd-basic` failed `specific_not_vague` in all 4 runs on 2026-10-07
  (`acceptance-tests/runs/2026-10-07T20-44-56`, `2026-10-07T20-47-11`). The
  same scenario passed on 2026-09-02 on `gpt-5.6-terra`, which wrote proposed
  numbers itself ("99% handoff within five minutes").
- Interview of all 3 failed runs of `2026-10-07T20-47-11`, 2026-10-08: each
  named the skill sentence "Living Document: … Mark unknowns clearly" as its
  main support, plus two template rules ("the human owns decisions"; "do not
  add default behaviors … it's an assumption"). None asked the user about the
  numbers. Each said the skill would need to tell it to propose numeric
  targets with a rationale, labelled as proposals awaiting approval.
- User decision 2026-10-08 (variant C of three): ask for each missing target in
  the clarifying questions with a recommended value and rationale; a target the
  user accepts or leaves unanswered goes into the PRD as the recommended number,
  marked as a proposal.

### Current State

- `framework/engineering/skills/write-prd/SKILL.md`: section 1 has both
  "Measurable" and "Living Document: … Mark unknowns clearly"; section 2 step 2
  asks clarifying questions only "if key context is missing", with audience and
  constraints as examples; no rule covers numeric targets.
- The SRS has no FR for `write-prd`.

### Constraints

- The scenario persona is not changed: it does not script answers about
  targets, so the simulated user answers those on its own.
- No change to the project template rules the agents cited.

## Definition of Done

- [x] FR-WRITE-PRD: before drafting, the agent asks for every quantitative
  target the request does not give, with a recommended number and a one-line
  rationale for each.
  - Test: `Benchmark: write-prd-basic` item `targets_asked_with_recommendation`
  - Evidence: `deno task acceptance-tests -f write-prd-basic -n 3 --no-cache` — the item fails on the pre-fix text and passes on the fixed one. Result: failed 2/2 pre-fix (`acceptance-tests/runs/2026-10-07T22-11-20`). The first wording passed it 0/3 (`2026-10-07T22-13-41`): the agents asked with numbers but gave no reason for them, and one recommended "the currently supported versions". With the `Recommended: <value>, because <reason>` form it passed 2/3 (`2026-10-07T22-17-37`); in the failed run the agent declined to recommend OS versions.
- [x] FR-WRITE-PRD: the PRD gives a number for every target; one the user did
  not confirm is marked as a proposal awaiting approval, never left blank.
  - Test: `Benchmark: write-prd-basic` item `specific_not_vague`
  - Evidence: the same `-n 3` run — the item passes in at least 2 of 3 runs (it failed 4/4 before). Result: 2/3 on the first wording, 3/3 on the final one.
- [x] The skill's other scenarios still pass.
  - Evidence: `deno task acceptance-tests -f write-prd-trigger --no-cache` — 3/3. Result: 3/3.
- [x] Gate green.
  - Evidence: `deno task check` ends with `0 failed` in every summary line. Result: 870 and 193 passed, 0 failed.

## Solution

1. RED: add the critical item `targets_asked_with_recommendation` to
   `write-prd/acceptance-tests/basic/mod.ts`; run the scenario on the current
   text and confirm the item fails.
2. SRS: new `FR-WRITE-PRD` with this rule and its acceptance.
3. GREEN: in `write-prd/SKILL.md` replace "Mark unknowns clearly" with the
   proposal rule; extend section 2 step 2 to ask for missing targets with a
   recommended value; mark proposals in the template's open questions.
4. Run `write-prd-basic -n 3` and the trigger scenarios.
5. `deno task check`, commit by path, push.
