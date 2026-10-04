---
date: 2026-10-03
status: done
implements:
  - FR-AI-CODE-REVIEW.EXISTING-SUITE
  - FR-AI-CODE-REVIEW.SEVERITY
  - FR-AI-CODE-REVIEW.PHASE-REPORT
  - FR-ATOM-REFLECT-GATE.STALE-FACTS
  - FR-ACCEPT.ACP
---
# Review: manifest scope, critical boundary, report hand-off

## Goal

Three `review-and-commit` scenarios failed in the sweep `2026-10-03T15-34-45`
because of the `review` atom's own text, not because of the scenarios. Each
failure stopped a clean change from being committed. Fix the text so the review
approves what is clean and the composite run reaches its commit.

## Overview

### Context

The failures were diagnosed by reading the rollouts and resuming every failed
session to ask it why (interviews kept in the session scratchpad,
`diag-review-and-commit-*`).

- `review-and-commit-phase-2-diff-eliminated` — Request Changes. The review read
  "MUST NOT run a stack-specific command without its manifest" as forbidding
  `deno test` on the tracked `utils_test.ts` (the fixture has no `deno.json`),
  then treated the unrun module as an unsatisfied existing-suite gate. The same
  sentence claimed that any `deno *` creates `deno.lock`; Deno 2.9.7 creates no
  lock file without a `deno.json`.
- `review-and-commit-non-deno-project` — Request Changes. The review rated an
  unhandled `\r` in `char_count(include_whitespace=False)` critical, and rated a
  `check` that exited 127 a failed check: AGENTS.md lists `check` under
  "Standard Interface" while "Detected Commands" is empty. Claude rated the
  same `\r` gap a warning.
- `review-and-commit-post-reflect-cleanup-commit` (and `reads-docs`, whose
  checklist does not ask for a commit) — Approve, then the turn ended on the
  review report, so nothing was committed. 2 of 6 approving runs. Both agents
  named the step title "Final Report" and "MUST close the report".

### Current State

- `framework/atoms/review.md` Rule 6 reserved `[critical]` for "wrong
  behaviour", which covers any inferred edge case.
- Step 2 forbade stack-specific commands without a manifest, unscoped.
- Step 4b said nothing about the verdict when a module cannot run.
- The atom had no parameter; its report read the same standalone and inside a
  composite.
- The four wrappers' verdict gates asked to "re-plan the todo list" (codex has
  no todo tool in the sandbox), and `review-and-commit` pointed at "Phase 2 step
  6 (Reflect)", which is Phase 3.

### Constraints

- Acceptance Test TDD: the three scenarios are the RED evidence (failed on the
  unchanged atom text in `2026-10-03T15-34-45`).
- Do not touch the fixtures to make them pass: no `\r` fix in `main.py`, no
  commands added to the fixture AGENTS.md, no `deno.json` added.
- Wrapper-level `_params:` is forbidden; parametrise the atom.

## Definition of Done

- [x] FR-AI-CODE-REVIEW.EXISTING-SUITE: the manifest rule picks the project
  check only; a located module runs with its own runner; an unrunnable module
  yields `Needs Discussion`.
  - Test: `Benchmark: review-and-commit-phase-2-diff-eliminated`
  - Evidence: `deno task acceptance-tests -f review-and-commit-phase-2-diff-eliminated --no-cache` → PASSED
- [x] FR-AI-CODE-REVIEW.SEVERITY: an inferred edge case is a warning; a command
  that never ran is `[skipped]`, not critical.
  - Test: `Benchmark: review-and-commit-non-deno-project`
  - Evidence: `deno task acceptance-tests -f review-and-commit-non-deno-project --no-cache` → PASSED
- [x] FR-AI-CODE-REVIEW.PHASE-REPORT: inside a composite the review report does
  not end the turn.
  - Test: `Benchmark: review-and-commit-post-reflect-cleanup-commit`
  - Evidence: `deno task acceptance-tests -f review-and-commit-post-reflect-cleanup-commit --no-cache -n 3` → 3/3 PASSED
- [x] FR-ATOM-REFLECT-GATE.STALE-FACTS: reflect corrects a command that the
  instructions name and the manifest does not define, and does not wave it off
  as a one-off.
  - Test: `Benchmark: review-and-commit-post-reflect-cleanup-commit`, `Benchmark: reflect-stale-command-fact`
  - Evidence: same run as PHASE-REPORT → `push_gate_awaited` and
    `cleanup_commit_correct` met with a non-vacuous `agent:` commit editing
    `AGENTS.md`
- [x] FR-ACCEPT.ACP: a turn's trace keeps reasoning, reply and tool calls in
  arrival order.
  - Test: `scripts/acceptance-tests/lib/acp/client_test.ts::a turn's timeline keeps reasoning, reply and tool calls in arrival order`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/` → `0 failed`
- [x] Generator canon and project gate stay green.
  - Test: `scripts/generate-skill-composites.ts --check`
  - Evidence: `deno task check` → `0 failed`

## Solution

1. `framework/atoms/review.md`:
   - Rule 6: `[critical]` means established (failed check or test, surviving
     catching test, security hole, broken contract, contradiction with an
     explicit statement, wrong result on ordinary input); an unstated boundary
     is a `[warning]`. Step 7 "Edge cases" points at Rule 6.
   - Step 2: "declares it" means a recorded invocation; the manifest rule picks
     the project check only; clean up every artefact a run creates; a command
     that never ran (127, not found) is `[skipped]`, never critical. The false
     `deno.lock` claim is gone.
   - Step 4b + Rule 13 + verdict selection: run a located module with its own
     runner; an unrunnable module → `Needs Discussion`.
   - Step 10 renamed "Review Report"; the closing line says "MUST be the
     report's last section"; a `{{REPORT_ROLE}}` placeholder follows the
     template. New `_params: REPORT_ROLE` (`FINAL` default, `INTERMEDIATE`).
2. `framework/composites.yaml`: `REPORT_ROLE: INTERMEDIATE` on the review phase
   of `review-and-commit`, `review-commit-push`, `ship`, `ship-task`.
3. Four wrappers: the Approve branch of the verdict gate says the report does
   not end the run and drops the todo-list and "Phase 2 step 6" wording.
4. SRS: EXISTING-SUITE extended; SEVERITY and PHASE-REPORT added. SDS §3.1.1
   lists the new atom parameter.
5. Trace order (FR-ACCEPT.ACP): `AcpClient` records a per-turn timeline from
   the raw message tap, and `renderTurnTrace` prints each tool call between
   the sentences it ran between. The phase-2 failure was the judge reading a
   `git diff --stat` made before the report as one made after the verdict.
6. Post-reflect scenario: the query used to claim a rough session that never
   happened, and reflect drops what it cannot quote, so it found nothing in 3
   of 3 runs. `AGENTS.md` now names `deno task verify`, which `deno.json` does
   not define. With that in place reflect still left the line alone in 3 of 3
   runs; all 3 interviews quoted the proportionality sentence. The
   `reflect-gate` atom now says proportionality limits new rules only, and the
   audit gains a "stale instructions" item. That still gave 1 of 3: 1 run in 3
   read `deno.json` first and never hit the error, and the stale
   `reflect_executed` item looked for a /reflect skill the composite forbids.
   The query now names the same stale check, and the item checks the inlined
   reflection. Then 2 of 3 runs named the error and left the line alone; both
   interviews quoted the template line "AGENTS.md … READ-ONLY reference". The
   shipped template (`framework/core/assets/AGENTS.template.md`) now states
   the rule that label stood for, and the commit and push checklist items fail
   when no corrective edit was made instead of passing as not applicable.
   That gave 2 of 3; the run that missed it had opened the standalone `reflect`
   skill and quoted its proportionality sentence. That skill now carries the
   same limit and a "stale instructions" item (new scenario
   `reflect-stale-command-fact`: 1/3 before, 3/3 after). The cleanup-commit item
   also accepted only `agent:`; it now accepts `agent(<scope>):`, as the atom
   allows. Final: 3/3 in `2026-10-04T16-50-36`.
7. Regenerate, re-run the three scenarios, run `deno task check`, hand the full
   sweep of `review`, `review-and-commit`, `review-commit-push`, `ship`,
   `ship-task` to the user.
