---
date: 2026-10-06
status: done
implements:
  - FR-ACCEPT.TRIGGER
tags: [acceptance-tests, detector, fixture]
related_tasks: [sweep-followups-update-push]
---
# Stop counting a skill search as a skill load; give ship-full-cycle-success a deno.json

## Goal

Two of the four failures in the 2026-10-06 sweep of `update-`, `investigate-`, `push-` and `ship-` came from the test system, not from the primitives. Removing them makes those scenarios measure the skills again.

## Overview

### Context

- `update-trigger-adj-1` failed its `skill_not_invoked` item. The agent ran one `rg -n -i '<pattern>'` over 11 installed `SKILL.md` files, and `shellReadsSkill` (`scripts/acceptance-tests/lib/skill_invocation.ts`) counted any command naming `skills/update/SKILL.md` as loading `update`.
- `ship-full-cycle-success` failed at the agent's `deno fmt --check`: the scenario had no `fixture/`, so the sandbox had no `deno.json` and fmt/lint walked the installed `.codex/` tree. Its four sibling scenarios ship a `deno.json` that excludes it (`framework/AGENTS.md` §Benchmark Fixture deno.json Contract).

### Current State

The detector accepted any shell command that named the skill's `SKILL.md` path. The ship scenario wrote only `strings.ts` in `setup()`.

### Constraints

- `skill_invocation.ts` and its test carry another session's uncommitted codex-acp 2.x branch; the commit is built from HEAD with these edits only.
- The codex-acp parsed-read branch passes a bare path through the same helper and must keep working.

## Definition of Done

- [x] FR-ACCEPT.TRIGGER: a search, or a command naming several `SKILL.md` files, does not count as loading a skill; a one-file read still does.
  - Test: `scripts/acceptance-tests/lib/skill_invocation_test.ts::detectSkillInvocation: a search across many SKILL.md files is not invocation` and the three cases next to it
  - Evidence: `deno test -A scripts/acceptance-tests/lib/skill_invocation_test.ts` — 19 passed. Re-scoring the captured calls of the 2026-10-06 `update-trigger-adj-1` run gives `false` with the new detector and `true` with the HEAD one; the four `*-trigger-pos-1` runs of the same sweep stay `true`.
- [x] FR-ACCEPT.TRIGGER: SRS and SDS state the one-file rule.
  - Evidence: `grep -cF 'reads that one file' documents/requirements.md` and `grep -cF 'reads exactly one skill file' documents/design.md` both print 1.
- [x] `ship-full-cycle-success` ships `fixture/deno.json` matching its siblings, and the agent's project check passes in the sandbox.
  - Test: `Benchmark: ship-full-cycle-success`
  - Evidence: `diff framework/core/skills/ship/acceptance-tests/full-cycle-success/fixture/deno.json framework/core/skills/ship-task/acceptance-tests/full-cycle-success/fixture/deno.json` prints nothing; run `2026-10-06T20-36-38` scored `implement_observable_tdd` as passed with `deno task check` green.

## Solution

1. `shellReadsSkill` collects the distinct skill names a command names; it returns true only when there is exactly one and no stage of the command line starts `rg`, `grep`, `egrep`, `fgrep`, `ag` or `ack`.
2. Copy the sibling `deno.json` into `ship/acceptance-tests/full-cycle-success/fixture/`; the runner copies a fixture before the init commit.

## Follow-up found on the re-run

`ship-full-cycle-success` still fails, one layer later: the agent invented `FR-STRING-TRIM`, the fixture has no SRS, and the review's FR Coverage Audit returned Request Changes, so no commit or push happened. The Plan Phase also presented one variant instead of two. Both are outside this task.
