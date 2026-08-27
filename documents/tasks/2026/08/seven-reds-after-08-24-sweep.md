---
date: "2026-08-25"
status: in progress
implements:
  - FR-PLAN-VARIANT-ARCHETYPES
  - FR-ACCEPT
  - FR-ACCEPT-GUARDS
---

# Seven remaining reds from the full sweep of 2026-08-24

## Goal

Close the seven red scenarios left to this session after the sweep of
2026-08-24 (318 scenarios, 299 green, 19 red). Five of the nineteen went to a
parallel session, four `agents-rules` reds and two trigger reds were already
closed, and one red belongs to another session's untracked work.

## Overview

### Context

Run: `acceptance-tests/runs/2026-08-24T18-45-43` (`-p 3`, 5 h 57 m wall,
16.56 h agent time, zero health aborts, one guard kill).

Mine: `init-brownfield`, `init-brownfield-idempotent`, `init-vision-integration`,
`select-llm-model-cites-sources`, `cli-test-permissions`, `plan-variants-complex`,
`adapt-skills-basic`.

### Current State

Diagnosed and fixed, awaiting measurement:

- **`select-llm-model-cites-sources`** — guard kill. `maxDescendants` was 5 on
  the claim that "a healthy agent run keeps 2-3 group members"; the skill
  documents a `curl … | … --stdin` pipeline, the group reached 6 and was
  SIGKILLed with zero output in two consecutive sweeps. Default raised to 16.
  Re-measured 3/3.
- **`init` trio** — the command the scenario drives was mounted with
  `disable-model-invocation: true`, so `/init` could not be entered. The runner
  now exempts `scenario.skill` from the injection.
- **`cli-test-permissions`** — fixture/checklist contradiction. The fixture's
  `test` task is `deno test --allow-read --allow-env` and `fixture/src/server.ts`
  calls `Deno.openKv()`, so the task as written cannot run these tests. The agent
  answered correctly — raw command now, task updated to add `--unstable-kv` — and
  the critical item demanded `deno task test` as the preferred command. Item
  rescoped; the dead version is recorded in `mod.ts`.
- **`plan-variants-complex`** — product defect in `framework/atoms/plan.md`. Two
  rules in step 4 pull against each other: the Quick-fix archetype ("minimal
  change within the current scope, may incur tech debt") and Scope-cut
  transparency, which names a silent drop a planning defect and so makes the
  `— partial` marker read as something to avoid. All three variants came out
  `— full scope` and the fast one disappeared. The agent, interviewed in its own
  sandbox, named the mechanism itself: *"I noticed the scope-cut transparency
  rule required a `— partial: drops <X>` marker … I didn't want to present what
  felt like a deliberately broken option, so I upgraded it to full scope."* Its
  own reasoning trace corroborates this independently — it planned "a quick fix
  using opaque sessions stored in PostgreSQL, no Redis needed initially" and
  wrote "Redis-backed Sessions — full scope". The atom now says "minimal" is
  measured against the core problem rather than the full constraint set, that a
  `partial` marker is the rule working, and that the debt must be named in Cons.
- **`adapt-skills-basic`** — instrument defect, not product. The judge reported
  that the main agent had overwritten the adapted skill with `deno test`. The raw
  session shows the main agent never wrote that file (10 Bash calls, two of them
  `git diff`), the skill-adapter subagent wrote `poetry run pytest`, and the file
  on disk holds the poetry version. The judge's evidence carried only
  `git diff <init>..HEAD`, which for this scenario is the SETUP's own commit
  downgrading the framework skill to a generic `deno test` stub — the `+deno test`
  lines it read as the final state. A workflow that stops to ask before
  committing leaves its whole product uncommitted, and nothing in the evidence
  showed it.

### Constraints

- Framework `SKILL.md` files under `framework/*/skills/` and `framework/*/commands/`
  listed in `composites.yaml` are gitignored build artefacts — edit the atom.
- The bench lock is shared with a parallel session; wait for it, never `--lock`.

## Definition of Done

- [x] FR-ACCEPT-GUARDS: the default fork threshold tolerates a shell pipeline
  - Test: `scripts/acceptance-tests/lib/process_watchdog_test.ts::watchdog: the DEFAULT fork threshold tolerates a pipeline-sized group`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/process_watchdog_test.ts`
- [x] FR-ACCEPT: the command a scenario drives stays model-invocable in the sandbox
  - Test: `scripts/acceptance-tests/lib/utils_test.ts::copyFrameworkToIdeDir exempts the command the scenario drives`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/utils_test.ts`
- [x] FR-ACCEPT: the judge sees the agent's uncommitted work
  - Test: `scripts/acceptance-tests/lib/evidence_test.ts::formatJudgeEvidence surfaces the uncommitted working tree diff`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/evidence_test.ts`
- [x] FR-PLAN-VARIANT-ARCHETYPES: the quick-fix archetype may be partial and names its debt
  - Test: `Benchmark: plan-variants-complex`
  - Evidence: `grep -q "not the bill" framework/atoms/plan.md`
- [ ] FR-ACCEPT: every fixed scenario measured green at `-n 3`
  - Test: `Benchmark: init-brownfield, init-brownfield-idempotent, init-vision-integration, cli-test-permissions, plan-variants-complex, adapt-skills-basic`
  - Evidence: `deno task acceptance-tests -f <id> -n 3`
- [ ] FR-ACCEPT: a green command sibling stays green after the injection change
  - Test: `Benchmark: commit-* / review-*`
  - Evidence: `deno task acceptance-tests -f commit- -n 3`

## Solution

1. Instrument: `process_watchdog.ts` (`maxDescendants` 5 → 16), `utils.ts` +
   `runner.ts` (`userInvokedCommand` exemption), new `evidence.ts` +
   `evidence_test.ts` (working-tree diff in the judge evidence).
2. Product: `framework/atoms/plan.md`, regenerated into `plan` and `ship`.
3. Contract: `cli/acceptance-tests/test-with-permissions/mod.ts` item rescoped.
4. Measure each fixed scenario at `-n 3`, plus one green command sibling.
