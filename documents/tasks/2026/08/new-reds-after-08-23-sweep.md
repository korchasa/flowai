---
date: 2026-08-24
implements:
  - FR-ACCEPT-CACHE
  - FR-ACCEPT.TRIGGER
status: done
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

- [x] FR-ACCEPT.TRIGGER: both trigger scenarios among the new reds measure green
  - Benchmark: `cli-trigger-pos-1`, `browser-automation-trigger-pos-1`
  - Evidence: `deno task acceptance-tests -f cli-trigger-pos-1 -n 3`
- [x] FR-ACCEPT-CACHE: the five independent scenario/fixture defects measure green
  - Benchmark: `setup-ai-ide-devcontainer-deno-flowai`, `commit-dynamic-doc-list`,
    `agents-rules-traceability-placement`, `select-llm-model-cites-sources`,
    `select-llm-model-recommends-for-coding-task`
  - Evidence: `deno task acceptance-tests -f <id> -n 3` per id
- [x] FR-ACCEPT-CACHE: the two product defects measure green
  - Benchmark: `select-llm-model-source-parse-failure-becomes-gap`, `adapt-all`
  - Evidence: `deno task acceptance-tests -f <id> -n 3` per id
- [x] FR-ACCEPT-CACHE: the six `review`/`plan` scenarios are settled as variance
      or regression and, if regression, measure green after the fix
  - Benchmark: `review-clean-approve`, `review-doc-schema-discovery`,
    `review-no-grouping`, `review-and-commit-parallel-delegation`,
    `plan-refactor`, `plan-variants-complex`
  - Evidence: `deno task acceptance-tests -f <id> -n 3` per id
- [x] `deno task check` green before the commit
  - Evidence: `deno task check`

## Solution

Fix each in the layer its cause lives in, then re-measure each at `-n 3`.

## Results (2026-08-24)

All 14 measured at `-n 3` after the fixes; every one 3/3, plus the sibling
`select-llm-model-recommends-for-coding-task` whose mock changed with it.

Two findings outrank the individual fixes.

**The `review`/`plan` cluster was load noise, not a regression.** Seven of the 14
sat on primitives that `f352ac30` had touched, which read as one cause. Measured
on an unchanged tree, `review-clean-approve`, `review-no-grouping`,
`plan-refactor` and `plan-variants-complex` came back 3/3 — the 2026-08-23 sweep
ran with the swap file 94-98 % full. Only `review-and-commit-parallel-delegation`
and `review-doc-schema-discovery` held real defects.

**One failure shape appeared in three unrelated primitives on the same day.** In
`adapt-all`, `review-no-grouping` and `review-clean-approve` the agent dispatched
a subagent in the background, waited for a notification and ended its turn with
the work uncollected — producing no verdict, no report and no summary, which is
strictly worse than the inline run the delegation was meant to improve on. Both
`adapt` and `review` now say that collecting is an action, not an event, and that
a turn may not end while a dispatch is outstanding.

Fixes not in the original diagnosis, found by re-measuring:

- `review-clean-approve` shipped a new exported function with NO test, and
  `review`'s own testing gate calls that `[critical]` — the scenario asked the
  skill to approve what its rules require it to reject. Fixture now ships
  `strings_test.ts` and a `deno.json`.
- `review-and-commit-parallel-delegation`'s fixture did not escape CSV or XML
  output; one run correctly found both and returned `Request Changes`. Escaping
  added, 14 fixture tests pass.
- The commit phase re-ran the test suite after adding a traceability marker. The
  checklist forbade it and the atom never said so; the ban now sits next to the
  `git diff` ban, with the reason (a comment cannot change behaviour).
- `agents-rules-traceability-placement` failed 0/3 on the FIRST fix: the item
  forbade every path in SRS, including the `**Acceptance:**` field the project's
  own lifecycle requires, and my own "any other notation" wording rejected a
  correct reference carried in a JSDoc block.
- The `browser-automation-trigger-pos-1` query fix did not land at all — the edit
  script computed the new text and never applied it, so the file carried a
  comment describing a change that was not there.

Closed since: `process_watchdog_test.ts` "rss-bloat trip". The diagnosis above —
"the allocation itself can outlast the 8 s budget, raise the budget" — was wrong,
and a longer wait would have fixed nothing. Polling `ps -o rss` on the real
bloater at 94 % swap: 90 MB at one second, 3 872 KB from the second second
onward, flat for the rest of its life. CPython zero-fills the buffer once,
nothing reads it again, and the memory compressor reclaims the pages; the 10 MiB
ceiling was unreachable after that first moment. The test passed only when the
first 200 ms sample landed inside the window, which is exactly what a load flake
looks like. `scripts/acceptance-tests/lib/rss_bloat.py` now touches every page in
a loop: RSS holds at ~86 MB, the trip fires in 370-450 ms across five standalone
runs and inside a full `deno task check`, and the 8 s budget stays as 20x
headroom (commit `6a182c8e`).

## The 11 infrastructure failures of 2026-08-23, re-measured (2026-08-24)

Ten of the eleven were host pressure and nothing else. Re-run at `-n 1
--refresh-cache -p 2` with the swap file still 94 % full but ~2.5 GB of effective
headroom, they all passed:

- Health-abort, 6 of 6 green: `diagnose-benchmark-failure-md-prior-bullets`,
  `-trigger-pos-1`, `-trigger-false-1`, `engineer-prompts-for-instant-basic`,
  `-trigger-adj-1`, `-trigger-false-1`.
- Guard-kill, 4 of 5 green: `engineer-plugin-marketplace-trigger-adj-1`,
  `-trigger-false-1`, `draw-mermaid-diagrams-trigger-adj-1`,
  `engineer-ai-ide-plugin-codex-subagents-as-skills`.
- Three neighbours swept in by the filters passed too:
  `diagnose-benchmark-failure-trigger-adj-1`,
  `engineer-prompts-for-instant-trigger-pos-1`,
  `engineer-plugin-marketplace-trigger-pos-1`.

The eleventh, `diagnose-benchmark-failure-raw-session`, failed 5 items and is NOT
this task's to fix: the scenario is untracked (`git ls-files` does not list it)
and belongs to a parallel session writing an "interview the failed agent" step
into that skill. The failing item is `names_interview_step`, and the skill's
`SKILL.md` still contains no mention of an interview or `--resume` — a correct
RED phase for work in progress, not a regression.
