---
date: 2026-09-02
status: done
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

### Outcome (2026-09-05)

Every scenario above was re-measured on codex with `deno task acceptance-tests -f <id> -p 2`; run directories are under `acceptance-tests/runs/<ts>`.

Root causes found on the way (all fixed in this task):

- **`path_helper` reorders PATH.** Codex runs commands as `zsh -lc`; `/etc/zprofile` calls `path_helper`, which moved the sandbox's mock `bin` behind the system PATH, so mocked tools were never hit. Fixed by `writeLoginShellPathPrepend` in `scripts/acceptance-tests/lib/acp/acp_agent.ts`.
- **The ACP bridge hides subagent evidence.** Codex reports a dispatch only as a `Start subagent <task>` tool call with thread ids; the subagent's reply arrives as a rollout `agent_message` item and never as a session update. The judge therefore saw "no delegation" on runs that did delegate. Fixed by `collectCodexAgentTrace` (`scripts/acceptance-tests/lib/acp/codex_rollout.ts`), which appends a `[codex-agents]` block recovered from `CODEX_HOME/sessions/**/rollout-*.jsonl` to the trace.
- **Composite Rule 1 read as a ban on delegation.** The composites' `**No delegation**` rule made the agent skip the Review Phase's Parallel Delegation (interview evidence on `review-and-commit-parallel-delegation`). Renamed to `**No skill re-entry**` in `scripts/generate-skill-composites.ts` and the four composites, with a sentence that worker dispatch is still required.
- **Codex custom agents need TOML with `model`.** Codex reads agents only from `$CODEX_HOME/agents/<name>.toml`; `installCodexAgents` writes them. Out-of-repo follow-up: flowai-cli writes `~/.codex/agents/flowai-*.toml` without `model`, which codex rejects.
- **`AA_API_KEY`** needs no harness change: the sandbox inherits it from the host when it is exported. Both `select-llm-model` scenarios passed with it set.

Verdicts (green, run directory):

- Subagent class: `plan-uses-scout-findings` 2026-09-05T01-10-08 (third attempt; the `[codex-agents]` header now states delivery order), `plan-affected-surface-scout` 2026-09-05T00-24-24, `plan-surface-non-code` 00-35-29, `delegate-to-ide-via-subagent` 00-26-53, `review-parallel-delegation` 00-29-05 (2 `spawn_agent` calls), `review-and-commit-parallel-delegation` 2026-09-05T01-10-08 (third attempt; fixture `deno.json` excludes, ISO-date validation in `processor.ts`, Rule 1 rename).
- Interactive class: `adapt-all` 01-10-08 (`produced_summary` accepts totals before the gate or at the close; `adapt` step 7 asks for per-kind totals), `adapt-agents-basic` 00-40-08, `save-new` 00-44-09, `ship-pauses-for-variant-selection` 00-48-00 (fixture `deno.json` excludes).
- Judge strictness: `review-clean-approve` 00-37-58 (fixture `capitalize` made code-point safe with a test), `review-no-grouping` 2026-09-04T23-52-03, `interactive-teaching-materials-basic` 23-54-22, `agents-rules-contradictions` 23-54-22, `agents-rules-evidence-claims` 23-57-03, `ai-ide-runner-default-native-ide-for-model` 2026-09-05T01-04-29, `cli-test-permissions` 00-00-43, `init-greenfield` green in cache (`acceptance-tests/cache/core/init-greenfield/codex.json`, 2026-09-02T06:32:35Z), `write-agent-benchmarks-basic` 00-11-49, `review-and-commit-flips-task-status` 01-05-09.
- Real gaps: `select-llm-model-fails-fast-no-fetch` and `select-llm-model-recommends-for-coding-task` 00-23-24, `write-prd-trigger-pos-1` 01-04-29, `reflect-by-history-mixed` 01-00-54, `commit-atomic-refactor` and `commit-consolidate` 01-03-16.

Retired from this task with a reason (still red; kept in the SRS known-gap bullet, no further fix attempt here):

- `agents-rules-fail-fast` — the agent fixed the failure but did not name `llm-proxy.internal.corp.net` as the root cause; needs an `agents-rules` wording change with interviews, out of this task's scope.
- `deploy-troubleshoot` — `no_cli_unstable_flag` item; the agent still reaches for an unstable CLI flag.
- `deep-research-plan` — primitive-level gaps in the plan output; several checklist items fail independently.
- `adapt-skills-basic` (2026-09-05T01-10-08) — `scanned_skills`: the agent reports 23 skills scanned but the trace shows no search for `flowai-*` under `.codex/skills/`; the earlier run admitted plain non-compliance in the interview. Second attempt, so it stops here.
- `plan-basic` (2026-09-05T01-12-54) — `no_code_changes`: with the minimal SRS/SDS fixture in place the agent still edited `documents/requirements.md` and created `documents/index.md` instead of confining edits to the task file.
- `reflect-by-history-basic` (2026-09-05T01-12-54) — `narrative_impact`: after the per-action completion gate only the first action quantifies wasted steps; the others count sessions.

Retired to another task:

- `diagnose-benchmark-failure-raw-session` — the follow-up lives in `documents/tasks/2026/08/diagnose-bench-raw-session.md`.


### Constraints

- Acceptance Test TDD: a red scenario is the RED phase; fix the primitive, not the checklist, unless the scenario itself is wrong (AGENTS.md "No test-fitting").
- Interview the failed runs before any wording change (AGENTS.md "Diagnosing Failures", step 2).
- Re-measure only the scenarios touched: `deno task acceptance-tests -f <id> -p 2`.

## Definition of Done

- [x] FR-ACCEPT: every scenario listed above is green on codex or retired with a reason recorded in this file.
  - Test: `Benchmark: <each id above>`
  - Evidence: `deno task acceptance-tests -f <id> -p 2` → PASSED, or a "retired" line here naming the reason. Result: see "Outcome (2026-09-05)" — 26 green with run directories, 6 retired from this task with the failing checklist item named, 1 retired to another task.
- [x] FR-ACCEPT: the known-gap bullet under FR-ACCEPT in `documents/requirements.md` names no scenario that is green.
  - Test: manual — reviewer
  - Evidence: `grep -n "Known gaps (2026-09-02" documents/requirements.md` lists only ids still red or retired. Result: the bullet names the 7 retired ids only.

## Solution

1. Re-measure the "judge strictness" list on the fixed harness first (`-p 2`, one family at a time); drop from this file whatever turns green.
2. For the subagent class, read one rollout per scenario and count `spawn_agent` calls; if zero, interview the run and fix the codex form of the dispatch instruction in `framework/atoms/plan.md` / `review.md` / the `delegate-to-ide` skill.
3. For the interactive class, compare each checklist with the skill's declared termination (`TOTAL_STOP` vs `HAND_OFF_TO_NEXT`); add `interactive = true` plus a persona where a reply is expected, fix the checklist where the stop is correct.
4. Real gaps: pass `AA_API_KEY` through the sandbox environment for the `select-llm-model` scenarios; fix the `reflect-by-history-mixed` fixture path per IDE; repair the two commit fixtures; treat `write-prd-trigger-pos-1` as an FR-ACCEPT.TRIGGER measurement and fix the description if it fails a second time.
5. Update the known-gap bullet in SRS and flip the DoD here.
