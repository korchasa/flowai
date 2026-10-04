---
date: 2026-10-02
status: done
implements:
  - FR-PACKS.AGENT-COMMIT
---
# Let the agent invoke `commit`, `review-and-commit` and `reflect-gate`

## Goal

The user asked (2026-10-02) to open three primitives to the agent: `commit`,
`review-and-commit` and `reflect-gate`. Today a request such as "commit this"
never reaches them unless the user types `/commit`; the agent commits with raw
`git` instead and skips the doc sync, the grouping into atomic commits and the
review gate those primitives carry.

## Overview

### Context

- The user-only classification is placement: everything under
  `framework/<pack>/commands/` gets `disable-model-invocation: true` injected by
  `scripts/build-plugins.ts` and the CLI writer (FR-PACKS.CMD-INVARIANT). Moving
  a primitive to `framework/<pack>/skills/` is the whole switch.
- The three were kept user-only on 2026-04-19 (commit `7b23b041`) with one line
  of rationale: "High-risk commands stay as user-only". No measurement backed it.
- All three `SKILL.md` files are generated (FR-SKILL-COMPOSE) and gitignored;
  their targets live in `framework/composites.yaml`, their text in
  `framework/atoms/commit.md`, `framework/atoms/reflect-gate.md` and
  `framework/composites/review-and-commit.md`.
- A skill must carry a WHEN-trigger phrase in `description` (FR-DESC-QUALITY,
  `scripts/check-skills.ts`) and three trigger scenarios
  `trigger-{pos,adj,false}-1` (FR-ACCEPT.TRIGGER,
  `scripts/check-trigger-coverage.ts`). Commands are exempt from both.
- `reflect-gate` overlaps the existing skill `reflect`. The split: `reflect`
  analyses and reports; `reflect-gate` also applies the edits to instruction
  files and commits them.

### Current State

- `framework/core/commands/commit/` — 18 scenarios.
- `framework/core/commands/review-and-commit/` — 10 scenarios.
- `framework/core/commands/reflect-gate/` — no scenarios.
- Descriptions of all three carry no WHEN-trigger phrase.
- The acceptance runner exempts `scenario.skill` from the injected flag
  unconditionally (`copyFrameworkToIdeDir`), so a trigger scenario for a
  command can never go red: the first RED run of `commit-trigger-pos-1` passed
  on codex for that reason.
- Codex ignores `disable-model-invocation`: with the flag forced onto `commit`,
  the codex agent still read the skill 2/2. On codex the "user-only" commands
  were never closed.

### Constraints

- Only these three move. `push`, `review-commit-push`, `ship`, `ship-task`,
  `init`, `update`, `adapt` stay user-only.
- Composite wrappers keep their "do NOT invoke other skills via the Skill tool"
  line: opening the atoms to the agent does not license nesting them.
- Docs `documents/requirements.md`, `documents/design.md` and `AGENTS.md` carry
  another session's uncommitted edits; a commit of this task must build its
  index from HEAD plus this task's edits only.

## Definition of Done

- [x] FR-PACKS.AGENT-COMMIT: the three primitives live under `framework/core/skills/` and no longer under `commands/`.
  - Test: `scripts/build-plugins_test.ts` (kind classification by directory)
  - Evidence: `test -d framework/core/skills/commit && test -d framework/core/skills/review-and-commit && test -d framework/core/skills/reflect-gate && ! test -e framework/core/commands/commit && ! test -e framework/core/commands/review-and-commit && ! test -e framework/core/commands/reflect-gate`
- [x] FR-PACKS.AGENT-COMMIT: every generated `SKILL.md` of the three carries a WHEN-trigger and passes the skill gates.
  - Test: `scripts/check-skills_test.ts`, `scripts/check-trigger-coverage.ts`
  - Evidence: `deno task check` ends with `0 failed` (2026-10-02: EXIT 0, 869 + 187 passed, 0 failed)
- [x] FR-PACKS.AGENT-COMMIT: the runner exempts a scenario's own command from the flag only when the query types `/<name>`, so a trigger scenario for a command can fail.
  - Test: `scripts/acceptance-tests/lib/utils_test.ts` (test "userInvokedCommandOf exempts the skill only when the query types /name")
  - Evidence: `deno test -A scripts/acceptance-tests/lib/utils_test.ts` (2026-10-02: 10 passed, 0 failed)
- [x] FR-PACKS.AGENT-COMMIT: the agent routes to each primitive on its own request and stands down on adjacent and false-use requests.
  - Benchmark: `commit-trigger-pos-1`, `commit-trigger-adj-1`, `commit-trigger-false-1`, `review-and-commit-trigger-pos-1`, `review-and-commit-trigger-adj-1`, `review-and-commit-trigger-false-1`, `reflect-gate-trigger-pos-1`, `reflect-gate-trigger-adj-1`, `reflect-gate-trigger-false-1`
  - Evidence: `deno task acceptance-tests -f <scenario-id>` passes for each of the nine
    (2026-10-02: codex 9/9; Claude 9/9 on the final descriptions. Earlier, before the descriptions were cut to 250 characters, `reflect-gate-trigger-pos-1` passed 2/3 on Claude with `-n 3`.)
- [x] FR-PACKS.AGENT-COMMIT: SRS, SDS, README and both `AGENTS.md` no longer cite the three as user-only examples.
  - Evidence: `grep -n -E 'commands/(commit|review-and-commit|reflect-gate)' documents/requirements.md documents/design.md README.md AGENTS.md framework/AGENTS.md` prints nothing

## Solution

1. RED: write the three `trigger-pos-1` scenarios in the current `commands/`
   directories and run them; the injected flag hides the primitive, so each
   must fail. Before that, narrow the runner's exemption to `/<name>` queries
   (`userInvokedCommandOf`, unit-tested), or RED cannot happen. Run RED on the
   Claude arm (`-i claude`): codex ignores the flag.
2. `git mv` the three directories into `framework/core/skills/`; repoint the
   targets in `framework/composites.yaml` and the `.gitignore` entries.
3. Rewrite the three `description` lines in the atom/wrapper sources with a
   WHEN-trigger and a stand-down clause; regenerate with
   `deno run -A scripts/generate-skill-composites.ts --write`.
4. Add the `trigger-adj-1` and `trigger-false-1` scenarios; run all nine
   (GREEN).
5. SRS: add FR-PACKS.AGENT-COMMIT; fix the "User-invoked command" wording of
   FR-ATOM-REFLECT-GATE and the examples in FR-PACKS / terminology. SDS: paths
   in §3.0 inventory and §3.1.1. README §Packs, `AGENTS.md`,
   `framework/AGENTS.md`: examples of user-only commands.
6. `deno task check`; hand off the full sweep
   `deno task acceptance-tests -f commit`, `-f review-and-commit` to the user.
