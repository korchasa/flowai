---
date: 2026-08-24
implements:
  - FR-ACCEPT-CACHE
  - FR-ACCEPT.TRIGGER
status: to do
---
# Close the 14 new behavioural reds of the 2026-08-23 sweep

## Goal

The full sweep of 2026-08-23 (318 scenarios, `-p 4`, 5 h 04 m) closed 23 of the
reds carried over from 2026-08-20 and opened 14 that had been green. A batch of
new reds that appears right after a batch of fixes is the signal that the fixes
traded one failure for another, and that is what has to be settled before the
branch can merge.

## Overview

### Context

The previous session committed `f352ac30` (ten behavioural reds) and `2f9db02a`
(the cache key). Seven of the 14 new reds sit on primitives that commit touched:
four on `review`, two on `plan`, one on `setup-ai-ide-devcontainer`. The other
seven are independent and were diagnosed from the raw sessions.

### Current State

Diagnosed from the raw agent sessions in
`acceptance-tests/runs/2026-08-23T14-22-38/` plus the judge verdicts extracted
from `report.html` (the run directories keep only `bench-home` and `sandbox`
symlinks for the scenarios that ran late in the sweep).

Cause per scenario:

- `setup-ai-ide-devcontainer-deno-flowai` — scenario carried a `userPersona`
  without `interactive = true`, so `UserEmulator` was never built and the
  agent's questions went unanswered. Green only while the skill skipped them.
- `cli-trigger-pos-1` — query overlapped the description of a different
  installed skill (`configure-deno-commands` owns "deno.json task").
- `browser-automation-trigger-pos-1` — query named no URL; the agent identified
  the right skill in its own reasoning and stopped to ask instead of guessing.
- `commit-dynamic-doc-list` — `setup()` runs after the harness's `init` commit,
  so the injected Documentation Hierarchy was an uncommitted change and landed
  in the agent's own diff.
- `agents-rules-traceability-placement` — `AGENTS.template.md` taught the SALP
  REF form in two sections and the retired `// FR-<ID>` form in four others; the
  agent obeyed the SALP sections and the checklist demanded the retired one.
- `select-llm-model-cites-sources` — the `curl` mock is a PATH stub, so its text
  is the parser's INPUT; it held already-parsed `BenchRow` JSON, and the agent
  took the documented `curl … | … --stdin` pipe.
- `select-llm-model-source-parse-failure-becomes-gap` — the skill forbids
  producing a ranking when every source fails; the agent produced one under
  "from my training knowledge".
- `adapt-all` — the agent dispatched two adapters in the background, acted on
  the first notification and ended the turn with the second still running.
- `review-*` (4) and `plan-*` (2) — under measurement, see DoD.

### Constraints

- Fix the layer the cause is in; never quiet a red by editing the reachable file.
- Never flip a checklist into its opposite; scope it and record the dead version.
- Re-measure with `-n 3`; one run does not separate variance from regression.

## Definition of Done

- [ ] FR-ACCEPT.TRIGGER: both trigger scenarios among the new reds measure green
  - Benchmark: `cli-trigger-pos-1`, `browser-automation-trigger-pos-1`
  - Evidence: `deno task acceptance-tests -f cli-trigger-pos-1 -n 3`
- [ ] FR-ACCEPT-CACHE: the five independent scenario/fixture defects measure green
  - Benchmark: `setup-ai-ide-devcontainer-deno-flowai`, `commit-dynamic-doc-list`,
    `agents-rules-traceability-placement`, `select-llm-model-cites-sources`,
    `select-llm-model-recommends-for-coding-task`
  - Evidence: `deno task acceptance-tests -f <id> -n 3` per id
- [ ] FR-ACCEPT-CACHE: the two product defects measure green
  - Benchmark: `select-llm-model-source-parse-failure-becomes-gap`, `adapt-all`
  - Evidence: `deno task acceptance-tests -f <id> -n 3` per id
- [ ] FR-ACCEPT-CACHE: the six `review`/`plan` scenarios are settled as variance
      or regression and, if regression, measure green after the fix
  - Benchmark: `review-clean-approve`, `review-doc-schema-discovery`,
    `review-no-grouping`, `review-and-commit-parallel-delegation`,
    `plan-refactor`, `plan-variants-complex`
  - Evidence: `deno task acceptance-tests -f <id> -n 3` per id
- [ ] `deno task check` green before the commit
  - Evidence: `deno task check`

## Solution

Fix each in the layer its cause lives in, then re-measure each at `-n 3`.
