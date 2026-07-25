---
date: 2026-07-26
implements:
  - FR-DIST.MAPPING
status: done
---

# Model tier carries both model and effort

## Goal

Make the abstract model tier the single source of truth for BOTH the concrete
model and the reasoning effort, so a primitive's quality/cost intent cannot
silently drift apart across the twelve agent files that declare it.

## Overview

### Context

Today `model:` (tier) and `effort:` are independent frontmatter fields. The tier
resolves to a model at install time; `effort` is copied through untouched for
Claude and dropped for every other IDE. Consequence: the same tier ships with
different efforts (`smart`+medium eight times, `smart`+high once, `fast`+low
once), and nothing detects the drift.

User decisions in this session:

- Tier fixes the pair. Claude: `max → opus/max`, `smart → opus/high`,
  `fast → sonnet/medium`, `cheap → sonnet/low`.
- `plan-critic` moves to `inherit` (session model, session effort).
- Other IDEs (cursor, codex, opencode) keep their current model values; effort
  is not part of their frontmatter and stays dropped.
- `.flowai.yaml` `models:` grows an object form; the string form stays valid.
- The reverse map (IDE model → tier, used by cross-IDE sync) is rewritten to
  key off the pair for Claude — a bare `opus` can no longer tell `max` from
  `smart`.
- Both repos are edited: this one and `korchasa/flowai-cli` (local clone at
  `../flowai-cli`).

### Current State

- `scripts/build-plugins.ts:100` — `resolveModelTier`, Claude-only, returns a
  model string. Applied to skills (`:541`) and agents (`:711`).
- `scripts/acceptance-tests/lib/cli-internals.ts:15` — `DEFAULT_MODEL_MAPS`
  mirror of the CLI, used by `transformAgent` and `resolveSkillModel`.
- `flowai-cli/src/transform.ts:10` — the production map; `:25`
  `REVERSE_MODEL_MAPS`; `mergeModelMap` in `sync_kinds.ts:395` types the user
  override as `Record<string, string>`, threaded through `migrate.ts` and
  `resource_reader.ts`.
- Tier-carrying sources: 12 agents under `framework/*/agents/`, 2 skills
  (`deep-research` smart+high, `analyze-context` cheap+low). Eight further
  skills declare `effort:` with no tier — those keep it as a standalone field.

### Constraints

- Deno + TypeScript, no new dependencies.
- Code TDD for both repos: failing test first.
- The CLI mirror in `cli-internals.ts` must keep matching `flowai-cli` — both
  change together in this task.
- Skills reach the IDE through a surgical single-line edit (`resolveSkillModel`
  / `transformSkillModel`), not a frontmatter rewrite; effort insertion must
  preserve the rest of the file byte-for-byte.

## Definition of Done

- [x] FR-DIST.MAPPING: a tier resolves to `{model, effort}` for Claude; agents
      and skills carrying a tier receive both fields at install time.
  - Test: `scripts/build-plugins_test.ts::model-tier-resolution`,
    `scripts/acceptance-tests/lib/cli-internals_test.ts::resolveSkillModel resolves abstract tier to concrete model (claude)`
  - Evidence: `deno test -A scripts/build-plugins_test.ts scripts/acceptance-tests/lib/cli-internals_test.ts` — 33 + 12 green
- [x] FR-DIST.MAPPING: no framework source carries `effort:` next to a tier, and
      the drift is now a build-time error rather than a convention.
  - Test: `scripts/check-agents_test.ts::AG: effort beside a model tier is a drift error`
  - Evidence: `deno run -A scripts/check-agents.ts && deno run -A scripts/check-skills.ts`
- [x] FR-DIST.MAPPING: `plan-critic` inherits the session model.
  - Evidence: `grep -q '^model: inherit$' framework/core/agents/plan-critic.md && ! grep -q '^effort:' framework/core/agents/plan-critic.md`
- [x] FR-DIST.MAPPING: `.flowai.yaml` `models:` accepts both the string and the
      object form; the reverse map recovers a tier from the Claude pair.
  - Test: `flowai-cli/src/transform_test.ts` (tier pair + reverse), `config_test.ts::parseConfigData - models accepts both the string and the object form`
  - Evidence: `cd ../flowai-cli && deno task check` — exit 0, 408 tests.
    That gate was RED on arrival for an unrelated pre-existing reason
    (`src/loop.ts:272`, `TS2322 Timeout is not assignable to number`, confirmed
    on a clean tree via git stash); fixed here as `ReturnType<typeof setTimeout>`
    so the gate could run at all.
- [x] Project baseline stays green and the local plugin build reflects the new
      pairs.
  - Evidence: `deno task check` (627 + 173 tests, exit 0), `deno task build-plugins`
    (validation OK), `deno task sync-plugins-local` — installed agents read
    `opus/high`, `sonnet/medium`, `sonnet/low`; `plan-critic` carries neither field.

## Solution

1. SRS `FR-DIST.MAPPING` — tier table becomes pair-valued; document the
   `.flowai.yaml` object form and the pair-keyed reverse map.
2. SDS §3.2 Model Tiers, §3.5 transformation rules, `ides-difference.md:404`.
3. RED then GREEN in this repo: `build-plugins.ts` + `cli-internals.ts`.
4. Frontmatter sweep: drop `effort:` beside tiers, `plan-critic` → `inherit`.
5. RED then GREEN in `flowai-cli`: `transform.ts`, `modelMap` type, config merge.
6. `deno task check` in both repos, then `deno task build-plugins`.
