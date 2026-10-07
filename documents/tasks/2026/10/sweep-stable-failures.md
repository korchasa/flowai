---
date: 2026-10-08
status: done
implements:
  - FR-DOC-NO-SRS
  - FR-AI-CODE-REVIEW
  - FR-JIT-REVIEW
  - FR-PLAN-OUTCOME-COMPLETENESS
  - FR-ACCEPT
tags: [acceptance, plan, review]
related_tasks: [no-dead-fr-ref, no-srs-plan-review]
---
# Fix the four scenarios that failed stably in the plan/review/ship sweep

## Goal

The sweep of 2026-10-07 over `plan`, `review` and `ship` passed 66 of 77 scenarios. Seven failures were flaky; four failed on every run. A scenario that is red on every run hides the next regression in the same primitive, so each of the four gets a diagnosis and a fix in the layer that is actually broken — the primitive, the scenario, or the runner.

## Overview

### Context

- Only one of the four failures came from this session's own change: `plan-db` run B halted on the "where does the requirement text live" question that [no-dead-fr-ref](no-dead-fr-ref.md) introduced. The other three predate the session.
- `plan-surface-degradation` simulates an environment with no subagents, but the runner installed codex roles into `CODEX_HOME/agents/` after `setup()` had run, so the scenario could not remove them (behaviour since `ebcf1e56`, 2026-09-05).
- `review-decision-level-verdict`: the review atom's verdict line allowed a blocking finding to stand in for the design answer, so the report never said whether the design was sound (wording unchanged since 2026-06-05).
- `review-catches-regression-via-jittests`: the review atom told the agent that the save/discard prompt "does not pause you", so a standalone review deleted the scratch directory before the user could answer (since `69774772`, 2026-08-15). Inside a composite that is the right behaviour; in a standalone review it is not.
- `plan-db` run A: the scenario was non-interactive while the plan skill waits for a variant choice, so the Solution checklist could never be met.

### Current State

- Runner: `scripts/acceptance-tests/lib/runner.ts` passes `resolveAllowedPacks(...)` to `installCodexAgents` for every scenario.
- Review atom: `framework/atoms/review.md` — verdict line, step 11, rule 12, and the `REPORT_ROLE` branches `FINAL` / `INTERMEDIATE`.
- Plan atom: `framework/atoms/plan.md` rule 8; template `framework/core/assets/AGENTS.template.md` line 131.

### Constraints

- No test-fitting: personas stay neutral, queries carry no hints.
- Composite `SKILL.md` files are generated; edit atoms and regenerate.
- The full sweep stays with the user; only the four scenarios (and the siblings of the JiT fix) are re-run here.

## Definition of Done

- [x] FR-ACCEPT: a scenario marked `noSubagents` gets no codex roles.
  - Test: `scripts/acceptance-tests/lib/runner_packs_test.ts::codexRolePacks: noSubagents scenario → no packs`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/runner_packs_test.ts` passes; the test failed with a type error before `codexRolePacks` existed (2026-10-07; 7 passed after).
- [x] FR-PLAN-OUTCOME-COMPLETENESS: `plan-surface-degradation` passes.
  - Benchmark: `plan-surface-degradation`
  - Evidence: `deno task acceptance-tests -f plan-surface-degradation --no-cache` passes and logs `Codex roles installed: none (scenario.noSubagents)`. 2026-10-08: 3/4 runs passed — the first run (`2026-10-07T23-16-05`) listed only the email module and missed `slack_notifier.ts`; the resumed agent called that its own omitted step, not the rule's wording, and the next three runs (`-n 3`) all enumerated the Slack site and passed.
- [x] FR-AI-CODE-REVIEW: the verdict answers all four questions, the design one included, even when a finding blocks the merge.
  - Benchmark: `review-decision-level-verdict`
  - Evidence: `deno task acceptance-tests -f review-decision-level-verdict -n 2 --no-cache` passed 2/2 on 2026-10-08.
- [x] FR-JIT-REVIEW: a standalone review asks save/discard and ends its turn without deleting the scratch directory; a composite review discards without waiting.
  - Benchmark: `review-catches-regression-via-jittests`, `review-runs-existing-suite`, `review-doc-drift-is-warning`, `review-no-change-no-alarm`, `review-and-commit-approve`
  - Evidence: `deno task acceptance-tests -f <id> --no-cache` passed for each of the five on 2026-10-08; in the JiT scenario the scratch directory was removed only after the user's `discard all`.
- [x] FR-DOC-NO-SRS: the question of where a requirement's text lives never halts planning; the task file is written first.
  - Benchmark: `plan-db`
  - Evidence: `deno task acceptance-tests -f plan-db --no-cache` passed on 2026-10-08, item `task_file_before_questions` included.
- [x] The project check stays green.
  - Evidence: `deno task check` ended with 870 passed | 0 failed and 193 passed | 0 failed (2026-10-08).

## Solution

1. Runner: add `BenchmarkScenario.noSubagents` and `codexRolePacks()`; the surface-degradation scenario sets the flag. Tests RED → GREEN.
2. Review atom: the verdict line requires each of the four answers in words of its own; the `FINAL` branch ends the turn on the save/discard question and deletes nothing before the reply; the `INTERMEDIATE` branch discards without waiting and says so.
3. Plan atom rule 8 and the template: the "where does the text live" question never stops the task file from being written — write it with `implements: []`, record a follow-up, ask together with the variant question.
4. `plan-db` scenario: interactive, neutral persona, and a critical checklist item that the task file is written before any answer.
5. Regenerate composites, re-run the four scenarios, then the JiT siblings (`review-runs-existing-suite`, `review-doc-drift-is-warning`, `review-no-change-no-alarm`) and one `review-and-commit` scenario.
