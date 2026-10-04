---
date: 2026-10-04
status: done
implements:
  - FR-ACCEPT
  - FR-ATOM-REFLECT-GATE
related_tasks:
  - documents/tasks/2026/10/review-severity-and-handoff.md
---
# Acceptance sweep: three test-environment defects

## Goal

The sweep of `review`, `review-and-commit`, `review-commit-push`, `ship` and
`ship-task` after `review-severity-and-handoff` had failures whose cause was the
test environment, not the primitives. Remove those causes so the next sweep
measures the primitives only.

## Overview

### Context

Each failure was diagnosed from the rollout and an interview of the failed
session (scratchpad `int-catches.txt`, `int-drift.txt`).

1. The runner copied the primitives' own unit tests into the sandbox IDE dir.
   The fixture project's `deno test` picked them up; the `tasks-overview`
   tests spawn Python and fail there, so the review saw a red baseline and
   refused to approve (`review-no-change-no-alarm`,
   `review-catches-regression-via-jittests`).
2. `review-doc-drift-is-warning` wrote `cli.ts` in `setup()` after the
   runner's init commit and never committed a parent revision. The agent saw
   an untracked file, diffed it against `/dev/null`, and there was no removal
   to review. Its interview: "Git showed `cli.ts` as untracked, so I compared
   the entire file against `/dev/null`."
3. `review-and-commit-auto-invoke-reflect`, `ship-task-reflect-after-push` and
   `ship-task-reflect-push-declined` claimed a rough session in the query that
   the run never contained. The reflection drops what it cannot quote, so it
   found nothing to edit, and every edit-dependent item failed. The sibling
   `review-and-commit-post-reflect-cleanup-commit` was fixed the same way in
   `review-severity-and-handoff`.

### Current State

- `copyFrameworkToIdeDir` (`scripts/acceptance-tests/lib/utils.ts`) copied
  every file of a skill, command or hook directory.
- The three reflect scenarios had no `DEVELOPMENT_COMMANDS` and a query with
  invented history.

### Constraints

- No test-fitting: the query names the stale check the way a developer who
  trusts the instruction file would, and says nothing about the fix.
- Scenarios run one at a time (the runner holds a process lock).

## Definition of Done

- [x] FR-ACCEPT: primitive unit tests stay out of the sandbox.
  - Test: `scripts/acceptance-tests/lib/utils_test.ts::copyFrameworkToIdeDir leaves primitive unit tests out of the sandbox`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/utils_test.ts` → `0 failed`; `deno task acceptance-tests -f review-no-change-no-alarm --no-cache` and `-f review-catches-regression-via-jittests --no-cache` → PASSED
- [x] FR-ACCEPT: the doc-drift fixture reviews a real removal.
  - Test: `Benchmark: review-doc-drift-is-warning`
  - Evidence: `deno task acceptance-tests -f review-doc-drift-is-warning --no-cache` → PASSED
- [x] FR-ACCEPT: the three reflect scenarios carry a real stale instruction.
  - Test: `Benchmark: review-and-commit-auto-invoke-reflect`, `Benchmark: ship-task-reflect-after-push`, `Benchmark: ship-task-reflect-push-declined`
  - Evidence: `deno task acceptance-tests -f <id> --no-cache -n 3` for each id → at or above the runner's 2/3 threshold. Measured: `review-and-commit-auto-invoke-reflect` 3/3 (`2026-10-04T20-01-58`), `ship-task-reflect-push-declined` 3/3 (`2026-10-04T20-14-42`), `ship-task-reflect-after-push` 2/3 (`2026-10-04T19-48-51`; run-2 corrected the stale line during the Commit Phase's documentation sync and folded it into the `feat:` commit, so the Reflect Phase had nothing left to commit)
- [x] FR-ATOM-REFLECT-GATE: `review-and-commit` does not send the agent to the standalone `reflect` skill.
  - Test: `Benchmark: review-and-commit-auto-invoke-reflect`
  - Evidence: `grep -cF 'invokes on purpose' framework/composites/review-and-commit.md` → 0; the three runs of `2026-10-04T20-01-58` read `skills/reflect/SKILL.md` 0 times (before the fix: 4 and 2 reads in the two failed runs of `2026-10-04T19-08-45`)
- [x] Project gate stays green.
  - Evidence: `deno task check` → `0 failed`

## Solution

1. `copyRecursive` takes a `skipFile` predicate; `copyFrameworkToIdeDir`
   passes `isPrimitiveUnitTest` (`*_test.ts`, `*.test.ts`) for skills,
   commands and hooks. SDS §3.4 "Skill Integration" records it.
2. `review-doc-drift-is-warning` setup writes the parent `cli.ts` with both
   subcommands and the SRS, commits them, then writes `cli.ts` without
   `export`.
3. The three reflect scenarios: `DEVELOPMENT_COMMANDS` names `deno task
   verify`, which the fixture `deno.json` does not define; the query names the
   same check; the invented history and the persona lines backing it are gone.
   `reflect_auto_invoked` checks the inlined reflection and requires it to
   name the failed `verify` call; the ship-task edit and commit items fail
   when no corrective edit was made.
4. The two ship-task fixtures get `"lock": false` and an `@std/assert` import
   map: without it the agent's test imported `jsr:@std/assert` inline, `deno
   lint` rejected it, and two runs stopped after the second failed fix. The
   persona answers the question about the missing check with the fact that
   `verify` was renamed to `check`; without the answer the Implement gate
   stopped on the missing check in two runs of three.
5. `review-and-commit` wrapper: the no-re-entry rule forbids review, commit and
   reflect skills alike, and the checklist names the inline Phase 3 instead of
   `/reflect`. Both failed runs, interviewed, quoted "The one exception on the
   skill side is `reflect`, which Phase 3 invokes on purpose" and "`/reflect`
   auto-invoked" as why they opened the standalone skill, whose "do not make
   changes to the agent's instructions" then stopped the edit.
6. Out of scope, flagged as a separate task: `build-plugins` ships the same
   unit tests to users in `dist/claude-plugins`.
