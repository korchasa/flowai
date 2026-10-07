---
date: 2026-10-07
status: done
implements:
  - FR-DOC-NO-SRS
tags: [plan, review, template, acceptance-tests]
related_tasks: [no-srs-plan-review]
---
# No FR reference into nowhere when the requirements document is missing

## Goal

An agent working in a project without a requirements document must not reference a requirement whose text is recorded nowhere. Where the text lives is the agent's call: it may ask the user or use a document the project already has.

## Overview

### Context

- `no-srs-plan-review` (commit `ec33fec3`) told the plan to coin no FR when the `SRS` file is absent ("creating the requirements document is `init`'s job").
- Its review scenario `review-missing-srs-not-blocking` planted a code marker for `FR-TRIM` and a task naming `FR-TRIM` with the requirement text recorded nowhere. The doc-anchors Stop hook reported the marker as a dead ref on every turn.
- The user's verdict (2026-10-07): a reference to nothing gives nothing, and the scenario showed it to the agent as normal. The agent decides where to record the requirement — ask the user, or write it into the README.

### Current State

- `framework/atoms/plan.md` rule 8 and `framework/core/assets/AGENTS.template.md` Plan line prescribe `implements: []` and name `init` as the only way to an SRS.
- `plan-no-srs-no-coined-fr` asserts an empty `implements:` and no requirements document.
- `review-missing-srs-not-blocking` plants `// [REF:fr:trim ...]` in code, with no anchor anywhere.

### Constraints

- `plan.md`, `AGENTS.template.md`, `documents/requirements.md` and `documents/design.md` carry other sessions' uncommitted edits; the commit is built from HEAD with these edits only.
- Measured 2026-10-07: once the `FR-TRIM` text lives in the fixture README, `review-missing-srs-not-blocking` PASSES on the pre-fix rules too (3/3: `2026-10-07T12-03-20`, `2026-10-07T12-08-24`, `2026-10-07T12-10-09`) — the old review blocked only on a reference into nowhere, which this task forbids. The scenario stays as a regression guard, and the SRS no longer cites it as acceptance of the review rule.

## Definition of Done

- [x] FR-DOC-NO-SRS: the plan references no FR whose text is recorded nowhere, and it decides where the text lives.
  - Test: `Benchmark: plan-no-srs-no-dead-fr-ref`
  - Evidence: `deno task acceptance-tests -f plan-no-srs-no-dead-fr-ref --no-cache` passes; it fails on the rules of `e21e6956`. FAILED in run `2026-10-07T12-04-41` (`no_dead_fr_ref`: `FR-STR-TRIM` defined nowhere), PASSED 4/4 in `2026-10-07T12-12-51` (`implements: []`, no FR-ID); `plan-updates-index-on-new-fr` still PASSED in `2026-10-07T12-16-18`.
- [x] FR-DOC-NO-SRS: the review approves a change whose FR text lives in the README, without an SRS file and without a dead reference in the scenario (regression guard: it passes on the pre-fix rules as well, see Constraints).
  - Test: `Benchmark: review-missing-srs-not-blocking`
  - Evidence: `deno task acceptance-tests -f review-missing-srs-not-blocking --no-cache` passes. PASSED 5/5 in `2026-10-07T12-15-03`.
- [x] FR-DOC-NO-SRS: the full cycle still commits and pushes.
  - Test: `Benchmark: ship-full-cycle-success`
  - Evidence: `deno task acceptance-tests -f ship-full-cycle-success --no-cache` passes. PASSED 7/7 in `2026-10-07T12-22-17`.
- [x] The doc-anchors hook reports nothing.
  - Evidence: `echo "{\"cwd\":\"$PWD\"}" | deno run -A framework/beta/hooks/doc-anchors-validate/run.ts` prints nothing, exit 0 (2026-10-07).
- [x] The project check stays green.
  - Evidence: `deno task check` ends with 0 failed — 866 and 192 passed, 0 failed (2026-10-07).

## Solution

1. Plan atom rule 8 and its three cross-references: no FR-ID whose text is recorded nowhere; the agent asks the user or records the text in an existing document such as the README; with no record, `implements: []`.
2. Template Plan line: the same.
3. `plan-no-srs-no-coined-fr` → `plan-no-srs-no-dead-fr-ref`: one critical item, every FR the agent wrote has its text in a sandbox file; the "no requirements document" item is gone; the persona answers "up to you" when asked where to record.
4. `review-missing-srs-not-blocking`: no code marker; the fixture README carries the `FR-TRIM` text.
5. `ship-full-cycle-success` persona: the same "up to you" answer.
6. SRS FR-DOC-NO-SRS and SDS §3.16 restated.
