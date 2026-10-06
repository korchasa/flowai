---
date: 2026-10-06
status: done
implements:
  - FR-PACKS.AGENT-COMMIT
---
# Open every command to the agent and remove the user-only category

## Goal

The user asked (2026-10-06) to open the seven remaining commands to the agent
and, given the choice, to remove the user-only category altogether. A plain
request such as "push my branch" or "reconcile AGENTS.md with the templates"
never reaches the primitive today: the agent does the work by hand and skips
the safety contract (`push`) or the template reconciliation (`update`) the
primitive carries.

## Overview

### Context

- The user-only classification is placement: everything under
  `framework/<pack>/commands/` gets `disable-model-invocation: true` injected by
  `scripts/build-plugins.ts` (FR-PACKS.CMD-INVARIANT). The acceptance runner
  mirrors it in `copyFrameworkToIdeDir` (`scripts/acceptance-tests/lib/utils.ts`).
- On 2026-10-02 `commit`, `review-and-commit` and `reflect-gate` moved to
  `skills/` (task `agent-invocable-commit`). Measured then: on the Claude arm
  the three positive triggers failed 3/3 while the primitives were commands;
  codex ignores the flag (a flagged `commit` was read 2/2), so on the default
  arm the category never worked.
- Remaining commands, all in `core`: `push`, `review-commit-push`, `ship`,
  `ship-task` (generated: targets in `framework/composites.yaml`, text in
  `framework/atoms/push.md` and `framework/composites/*.md`), and `init`,
  `update`, `adapt` (hand-written `SKILL.md`).
- The SRS still names a CLI writer `cli/src/sync.ts`; no `cli/` exists in this
  repo. The plugin builder is the only writer.

### Current State

- Scenario counts: `push` 8, `init` 7, `update` 4, `adapt` 4, `ship-task` 4,
  `ship` 3, `review-commit-push` 1. None has trigger scenarios.
- Code that knows about `commands/`: `build-plugins.ts`, `check-skills.ts`,
  `check-naming-prefix.ts`, `check-pack-refs.ts`, `check-trigger-coverage.ts`,
  `task-check.ts` (`--ignore`), `deno.json` (lint/fmt exclude),
  `scripts/acceptance-tests/lib/{utils,cli-internals,acceptance_discovery,types,runner}.ts`,
  `scripts/task-acceptance-tests.ts`, `scripts/benchmark/agents_md.ts` (imports
  `framework/core/commands/init/scripts/generate_agents.ts`).

### Constraints

- `framework/atoms/plan.md`, parts of `AGENTS.md`, `documents/requirements.md`,
  `documents/design.md`, `framework/core/assets/AGENTS.template.md` and
  `scripts/acceptance-tests/lib/{skill_invocation.ts,skill_invocation_test.ts,acp/registry.ts}`
  carry another session's uncommitted edits. The commit is built from HEAD plus
  this task's hunks only.
- Composite wrappers keep their "do NOT invoke other skills" line.
- A pack that still carries a `commands/` directory must fail the build
  loudly, not be skipped silently.

## Definition of Done

- [x] FR-PACKS.AGENT-COMMIT: no `commands/` directory is left under `framework/`, and the seven primitives live under `framework/core/skills/`.
  - Evidence: `test -z "$(find framework -type d -name commands -path 'framework/*/commands')" && for n in push review-commit-push ship ship-task init update adapt; do test -d framework/core/skills/$n || echo MISSING $n; done` prints nothing
  - Evidence result (2026-10-06): empty output.
- [x] FR-PACKS.AGENT-COMMIT: the builder and the checks no longer know a command kind, and a stray `commands/` directory fails the build with its path.
  - Test: `scripts/build-plugins_test.ts` (stray commands directory fails the build)
  - Evidence: `grep -rn -E '"command"|CMD-INVARIANT|userInvokedCommandOf|injectDisableModelInvocation' scripts --include='*.ts' | grep -v -E 'type: "command"|benchmark/runs|z\.literal\("command"\)|\.type, "command"\)|addEvent\(scenarioId, "command"'` prints nothing (the last three exclusions are the hook entry type `"command"` and the trace event of that name; all three were in HEAD before this task and are not the primitive kind)
  - Evidence result (2026-10-06): empty output; the same pipeline on `git show HEAD:scripts/build-plugins.ts` finds 1 `CMD-INVARIANT` / `injectDisableModelInvocation` line, so the command fails on the pre-task state.
- [x] FR-PACKS.AGENT-COMMIT: every one of the seven descriptions carries a WHEN-trigger and fits 250 characters; the gate passes.
  - Evidence: `deno task check` ends with `0 failed`
  - Evidence result (2026-10-06): run in a clean worktree on this commit's tree: `861 passed | 0 failed` and `187 passed | 0 failed`, no failed step besides the three intentional `Deno.exit` fixtures.
- [x] FR-PACKS.AGENT-COMMIT: the agent routes to each of the seven on its own request and stands down on adjacent and false-use requests.
  - Benchmark: `<name>-trigger-{pos,adj,false}-1` for the seven names
  - Evidence: `deno task acceptance-tests -f <scenario-id>` passes for each of the 21; each `trigger-pos-1` failed on the Claude arm before the move
  - Evidence result (2026-10-06): all 21 PASSED on the Claude arm (`-i claude --no-cache`) — `push-*` and `review-commit-push-*` in one sweep, the other 15 (`ship`, `ship-task`, `init`, `update`, `adapt`) in a second; the seven `trigger-pos-1` had failed there while the primitives were commands.
- [x] FR-PACKS.AGENT-COMMIT: SRS, SDS, README, `AGENTS.md` and `framework/AGENTS.md` describe one primitive kind; FR-PACKS.CMD-INVARIANT is retired.
  - Evidence: `grep -n -E 'framework/<pack>/commands|CMD-INVARIANT|user-only' documents/requirements.md documents/design.md README.md AGENTS.md framework/AGENTS.md` prints only lines stating the removal
  - Evidence result (2026-10-06): 10 lines — `AGENTS.md:62`, `documents/design.md:154,392`, `documents/requirements.md:717,1406,1421,1428,1429,1432`, `framework/AGENTS.md:8`; each one states the removal, explains it, or links this task.

## Solution

1. RED: write `trigger-pos-1` for the seven in their current `commands/`
   directories; run each on the Claude arm (`-i claude`). Each must fail
   because the injected flag hides the primitive.
2. `git mv framework/core/commands/<n> framework/core/skills/<n>` for all
   seven; repoint `framework/composites.yaml`, `.gitignore`, and every path
   reference (`scripts/benchmark/agents_md.ts`, scripts inside the moved
   primitives, tests).
3. Rewrite the seven descriptions with a WHEN-trigger and a stand-down clause
   (atoms/wrappers for the four generated ones); regenerate composites.
4. Remove the command kind: builder (`commands` source, flag injection,
   CMD-INVARIANT; add the stray-directory failure), `check-skills.ts`
   (`SkillKind`, WHEN-trigger exemption), `check-naming-prefix.ts`,
   `check-pack-refs.ts`, `check-trigger-coverage.ts`, runner utilities, the
   three ignore lists.
5. Add `trigger-adj-1` and `trigger-false-1` for the seven; run all 21 (GREEN).
6. SRS/SDS/README/AGENTS: one primitive kind; retire FR-PACKS.CMD-INVARIANT,
   widen FR-PACKS.AGENT-COMMIT.
7. `deno task check`; hand off the full sweep of the seven primitives.
