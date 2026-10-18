---
date: 2026-10-18
status: done
implements:
  - FR-ACCEPT
tags: [acceptance-tests, runner, update, adapt]
---
# Arm-neutral scenario setup

## Goal

Acceptance scenarios must run on every arm of the runner. The default arm moved
from codex to claude on 2026-10-17, and scenarios written for codex either abort
in setup or test a file no agent reads.

## Overview

### Context

The runner copies the framework into the arm's config dir: `.claude/` on claude,
`.codex/` on codex. The layout inside is the same. Before this task `setup()`
received only the sandbox path, so scenarios hard-coded `.codex/`.

Observed on 2026-10-18 (run dirs `acceptance-tests/runs/2026-10-18T11-32-51/`,
`acceptance-tests/runs/2026-10-18T11-27-28/`):

- `update-basic` and `update-template-vs-artifact` aborted in `setup()` with
  `NotFound ... sandbox/.codex/assets/AGENTS.template.md`.
- `adapt-agents-basic` failed 2 items: the target was planted in
  `.codex/agents/`, the agent adapted `.claude/agents/`.
- `update-asset-drift-no-sync` passed, but its checklist named the codex path.

### Current State

Scenarios with an arm-dependent `.codex/` path: `update-basic`,
`update-template-vs-artifact`, `update-asset-drift-no-sync`,
`update-plugin-user-scope`, `adapt-skills-basic`, `adapt-agents-basic`,
`adapt-all`, `assets-plugin-local-template`, `commit-agent-type`,
`plan-surface-degradation`, `ship-task-rejects-on-changes-requested`. The
`.codex/` mentions in `diagnose-benchmark-failure-md-prior-bullets` describe a
codex run dir as data and stay.

### Constraints

- The user chose the variant "the runner passes the dir" over "the scenario
  probes for it" (2026-10-18).
- Old one-parameter `setup()` overrides must keep working.

## Definition of Done

- [x] FR-ACCEPT: the runner hands `setup()` the arm's IDE name and config dir.
  - Test: `scripts/acceptance-tests/lib/runner_setup_test.ts::initSandboxGit: setup() receives the claude arm's IDE and configDir`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/runner_setup_test.ts`
- [x] FR-ACCEPT: no scenario hard-codes `.codex/` where the framework location depends on the arm.
  - Evidence: `find framework -name mod.ts -path '*acceptance-tests*' -exec grep -nE '"\.codex(/[a-z]|",?$)' {} +` prints nothing (25 matches on the parent commit). The pattern spares `".codex/"` in a list of every arm's dir.
- [x] FR-ACCEPT: the four reported scenarios pass on the claude arm.
  - Benchmark: `update-basic`, `update-template-vs-artifact`, `update-asset-drift-no-sync`, `adapt-agents-basic`
  - Evidence: `deno task acceptance-tests -f <id>` for each id reports PASS. 2026-10-18 on claude/claude-sonnet-5-5: all four PASSED, every checklist item `[x]`; reports under `acceptance-tests/runs/2026-10-18T12-08-43/` … `2026-10-18T12-11-18/`.
- [x] `deno task check` is green.
  - Evidence: `deno task check > check.log 2>&1; grep -E 'passed \| [0-9]+ failed' check.log` — 2026-10-18: exit 0, `915 passed | 0 failed`, `213 passed | 0 failed`.

## Solution

1. Add `SandboxContext { ide, configDir }` to `scripts/acceptance-tests/lib/types.ts`;
   `initSandboxGit` (`runner.ts`) passes `{ ide: adapter.ide, configDir: adapter.configDir }`.
2. In each listed scenario, build setup paths from `ctx.configDir`, write
   `ctx.ide` into `.flowai.yaml`, describe paths in `sandboxState` as
   `<configDir>/...`, and word checklist items relative to the IDE config dir.
3. `ship-task-rejects-on-changes-requested`: exclude every arm's config dir from
   the sandbox fmt/lint/test, as the `ship` fixture already does.
4. SDS §3.4: document the setup contract.
5. Run the four scenarios on the default arm, then `deno task check`.
