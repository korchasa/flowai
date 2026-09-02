---
date: 2026-09-02
status: to do
implements:
  - FR-ACCEPT
---
# Close the reds left by the 2026-09-02 codex sweep [ANC:task:2026-09-sweep-reds-follow-up]

## Goal

Every scenario that was red in the first full codex sweep (`acceptance-tests/runs/2026-09-02T01-37-34`, 76 of 312) and was NOT fixed while merging `chore/swe-bench-rescue` gets a verdict: fixed in the primitive, fixed in the scenario, or retired with a reason. Until then these reds hide real regressions in the same families.

## Overview

### Context

The sweep is triaged in `documents/tasks/2026/09/merge-branch-swe-bench-rescue.md`, section "Phase 3 step 15". Six classes were fixed there (evidence collection, the commit workflows' "missing document" stop, fixture `deno.json` excludes, the memex audit script location, persona scenarios without `interactive`, the `commit-basic` query). What remains is listed below by class, with the evidence path `acceptance-tests/runs/2026-09-02T01-37-34/<id>/run-1/judge-evidence.md` and the codex rollout under `run-1/bench-home/.codex/sessions/`.

- **Subagent not dispatched on codex.** `plan-uses-scout-findings`, `plan-affected-surface-scout`, `plan-surface-non-code` (surface-scout never spawned), `delegate-to-ide-via-subagent` (agent claims no nested dispatch although `adapt-*` used `spawn_agent` in the same sweep), `review-parallel-delegation`, `review-and-commit-parallel-delegation`. Suspect: the skills name the tool by claude's name (`Task`) and list `.claude/agents/` first; codex exposes `spawn_agent` / `wait_agent` and `.codex/agents/`.
- **Interactive turn ended in a question that nobody answered.** `adapt-all`, `adapt-agents-basic`, `adapt-skills-basic`, `reflect-by-history-basic`, `save-new`, `plan-basic` (variant selection), `ship-pauses-for-variant-selection`. Decide per scenario whether the question is the expected behaviour (then the checklist is wrong) or the scenario needs `interactive = true` plus a persona.
- **Judge strictness or evidence shape.** `review-clean-approve` (Request Changes on a UTF-16 `s[0]` and a fixture with no tests), `review-no-grouping` (a secret tagged `[warning]`), `interactive-teaching-materials-basic`, `agents-rules-contradictions`, `agents-rules-evidence-claims`, `agents-rules-fail-fast`, `ai-ide-runner-default-native-ide-for-model` (alias vs model id), `cli-test-permissions`, `deep-research-plan`, `deploy-troubleshoot`, `init-greenfield`, `write-agent-benchmarks-basic`, `review-and-commit-flips-task-status` (after two fixture repairs the codex reviewer still files criticals against the toy rate limiter — route-local bucket state, a server integration test). Re-measure first on the fixed harness: several were scored on evidence that the IDE-dir skip had emptied.
- **Real gaps.** `select-llm-model-fails-fast-no-fetch` and `select-llm-model-recommends-for-coding-task` need `AA_API_KEY` in the sandbox environment; `write-prd-trigger-pos-1` never invoked the skill; `reflect-by-history-mixed` builds a claude-only fixture path (`.claude/projects/-sandbox/`); `diagnose-benchmark-failure-raw-session` is the follow-up already recorded in `documents/tasks/2026/08/diagnose-bench-raw-session.md`; `commit-consolidate` fixture imports an unversioned `jsr:@std/assert`; `commit-atomic-refactor` fixture files lack final newlines, so the fixture's own formatter fails before the agent starts.

### Current State

Branch `chore/swe-bench-rescue` merged into `main` with 236 green scenarios plus the six fixed classes re-measured point-wise (see the merge task file). No scenario in the lists above has been re-measured on the fixed harness yet.

### Constraints

- Acceptance Test TDD: a red scenario is the RED phase; fix the primitive, not the checklist, unless the scenario itself is wrong (AGENTS.md "No test-fitting").
- Interview the failed runs before any wording change (AGENTS.md "Diagnosing Failures", step 2).
- Re-measure only the scenarios touched: `deno task acceptance-tests -f <id> -p 2`.

## Definition of Done

- [ ] FR-ACCEPT: every scenario listed above is green on codex or retired with a reason recorded in this file.
  - Test: `Benchmark: <each id above>`
  - Evidence: `deno task acceptance-tests -f <id> -p 2` → PASSED, or a "retired" line here naming the reason.
- [ ] FR-ACCEPT: the known-gap bullet under FR-ACCEPT in `documents/requirements.md` names no scenario that is green.
  - Test: manual — reviewer
  - Evidence: `grep -n "known gaps (2026-09-02)" documents/requirements.md` lists only ids still red or retired.

## Solution

1. Re-measure the "judge strictness" list on the fixed harness first (`-p 2`, one family at a time); drop from this file whatever turns green.
2. For the subagent class, read one rollout per scenario and count `spawn_agent` calls; if zero, interview the run and fix the codex form of the dispatch instruction in `framework/atoms/plan.md` / `review.md` / the `delegate-to-ide` skill.
3. For the interactive class, compare each checklist with the skill's declared termination (`TOTAL_STOP` vs `HAND_OFF_TO_NEXT`); add `interactive = true` plus a persona where a reply is expected, fix the checklist where the stop is correct.
4. Real gaps: pass `AA_API_KEY` through the sandbox environment for the `select-llm-model` scenarios; fix the `reflect-by-history-mixed` fixture path per IDE; repair the two commit fixtures; treat `write-prd-trigger-pos-1` as an FR-ACCEPT.TRIGGER measurement and fix the description if it fails a second time.
5. Update the known-gap bullet in SRS and flip the DoD here.
