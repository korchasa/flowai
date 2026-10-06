---
date: 2026-10-07
status: done
implements:
  - FR-DOC-NO-SRS
tags: [plan, review, template, acceptance-tests]
related_tasks: [detector-search-ship-fixture]
---
# A missing requirements document never blocks plan, review or commit

## Goal

`ship-full-cycle-success` stops at the review in every project that installed the template but has no requirements document yet. The cycle should plan, review and commit there, and leave creating the document to `init`.

## Overview

### Context

- Run `2026-10-06T20-36-38` of `ship-full-cycle-success`: the Plan Phase coined `FR-STRING-TRIM`, put it in `implements:` and wrote an index row whose reference resolves nowhere. The review's FR Coverage Audit then issued `[critical] documents/requirements.md is absent, so FR-STRING-TRIM has no SRS acceptance reference`, verdict `Request Changes`, so nothing was committed or pushed.
- The commit atom (rule 6) and the template's Commit lifecycle line already say a missing document is reported in one line and never blocks (`d9a6f9b7`). The review atom 4a and the template's Review line had no such exception; the plan atom said "prefer naming an FR".
- The same run presented one Plan-Phase variant. The plan atom allows that for an obvious path; the scenario's checklist demanded at least 2.

### Current State

- `framework/atoms/review.md` 4a skips only when the project declares no lifecycle at all.
- `framework/atoms/plan.md` rule 8, the `implements:` bullet and step 5a assume an SRS file to add FRs to.
- `framework/core/assets/AGENTS.template.md` Lifecycle: Plan adds new FRs, Review blocks on any gap.

### Constraints

- `plan.md`, `AGENTS.template.md`, `documents/requirements.md` and `documents/design.md` carry other sessions' uncommitted edits; the commit is built from HEAD with these edits only.
- A user-named FR in a project without an SRS still goes into `implements:` (`plan-updates-index-on-new-fr`).

## Definition of Done

- [x] FR-DOC-NO-SRS: the review approves a finished change whose task names an FR when the SRS file is absent, and records the absence in one line.
  - Test: `Benchmark: review-missing-srs-not-blocking`
  - Evidence: `deno task acceptance-tests -f review-missing-srs-not-blocking --no-cache` passes; it failed on the pre-fix rules. FAILED in run `2026-10-06T21-15-45` (`verdict_approve`, `missing_srs_not_critical`), PASSED 5/5 in `2026-10-06T21-19-46`.
- [x] FR-DOC-NO-SRS: the plan coins no FR and writes no index row when the SRS file is absent.
  - Test: `Benchmark: plan-no-srs-no-coined-fr`
  - Evidence: `deno task acceptance-tests -f plan-no-srs-no-coined-fr --no-cache` passes; it failed on the pre-fix rules. FAILED in run `2026-10-06T21-15-45` (`implements_empty`, `no_index_fr_row`), PASSED 6/6 in `2026-10-06T21-19-46`; `plan-updates-index-on-new-fr` still PASSED 9/9 in `2026-10-06T21-24-05`.
- [x] FR-DOC-NO-SRS: the full cycle commits and pushes in that project, and a justified single variant satisfies the plan gate.
  - Test: `Benchmark: ship-full-cycle-success`
  - Evidence: `deno task acceptance-tests -f ship-full-cycle-success --no-cache` passes. PASSED 7/7 in run `2026-10-06T21-36-56`.
- [x] FR-DOC-NO-SRS: SRS and SDS state the rule.
  - Evidence: `grep -cF 'ANC:fr:doc-no-srs' documents/requirements.md` and `grep -cF '(FR-DOC-NO-SRS)' documents/design.md` both print 1 (checked 2026-10-07).
- [x] The project check stays green.
  - Evidence: `deno task check` ends with 0 failed — 866 and 192 passed, 0 failed (2026-10-07).

## Solution

1. Review atom 4a: a resolved `SRS` role whose file does not exist skips the audit with a Degradation Notes line, never a `[critical]`.
2. Plan atom rule 8, the `implements:` bullet, step 5a: with no SRS file, `implements: []` unless the user named an FR, and DoD tuples without an FR-ID.
3. Template Lifecycle Plan and Review lines: the same exception, matching the Commit line.
4. `ship-full-cycle-success` checklist `plan_to_implement_gate`: one variant passes when the agent said why the path is obvious.
5. New scenarios `review-missing-srs-not-blocking` and `plan-no-srs-no-coined-fr`, run RED on the pre-fix rules, GREEN after.
