---
date: 2026-05-03
status: done
implements:
  - FR-ACCEPT.TRIGGER
tags:
  - benchmarks
  - skills
  - quality-gate
related_tasks: []
migrated_from: "ADR-0002 (status: accepted)"
---

# Skill description-matching verified by 3+3+3 trigger scenarios per skill

## Context

Skills under `framework/<pack>/skills/` are auto-invoked by the model based on frontmatter `description` matching user intent. A bad description silently breaks routing — there is no error surface until a user reports the skill "doesn't work". Existing execution benchmarks (`framework/<pack>/skills/<name>/benchmarks/<scenario>/mod.ts`) prove "when skill X runs it works", but they typically open with explicit `/skill-name` or over-detailed context that bypasses description matching, so they are useless as positives. Commands (`framework/<pack>/commands/`) carry `disable-model-invocation: true` and are out of scope — only `skills/` need verification.

## Alternatives

- **3+3+3 trigger scenarios per skill, regular `AcceptanceTestScenario`** (CHOSEN) — for each skill, 3 positive + 3 adjacent-negative + 3 false-use queries, each a sibling folder under the skill's existing `benchmarks/` dir. One critical checklist item evaluated by LLM judge against the trace.
  - Pros: zero new infrastructure; reuses runner, cache, judge; coverage check is a directory walk; filterable via `deno task bench -f trigger-`.
  - Cons: 9 × N runs at full sweep cost; adjacent-negative set rots when sibling skills evolve; LLM-judge has variance on "was X invoked" signal (low but non-zero).

- **Dedicated trigger-only scenario type and runner** — separate base class, separate benchmark phase, custom assertion API.
  - Pros: cleaner conceptual separation; could short-circuit at first SKILL.md read.
  - Cons: parallel infrastructure to maintain; new failure mode (trigger runner vs execution runner divergence); no judge-replacement obvious for the "should NOT activate" case.
  - Rejected because: the existing scenario shape already supports the assertion; doubling the infra buys nothing the directory walk + trace inspection cannot.

- **Manual description review at PR time, no benchmark coverage** — rely on reviewer discipline.
  - Pros: zero runtime cost.
  - Cons: not enforced; description regressions land routinely under time pressure; the "false negative" problem is exactly what review consistently misses.
  - Rejected because: silent routing breakage is the failure mode this ADR exists to prevent.

## Decision

Every skill under `framework/<pack>/skills/<name>/` carries 9 trigger scenarios at `benchmarks/trigger-{pos,adj,false}-{1,2,3}/mod.ts`. Each is a regular [AcceptanceTestScenario](../../scripts/acceptance-tests/lib/types.ts) with one critical checklist item (`skill_invoked` for positives, `skill_not_invoked` for negatives) evaluated by the LLM judge against the trace. Coverage enforced by [scripts/check-trigger-coverage.ts](../../scripts/check-trigger-coverage.ts), wired into `deno task check`. The contract is anchored by [FR-ACCEPT.TRIGGER](../requirements.md#fr-benchtrigger-skill-description-matching-verification).

## Consequences

- 360 trigger scenarios at present (40 skills × 9). Cost amortized by [FR-ACCEPT-CACHE](../requirements.md#fr-bench-cache-benchmark-result-cache) — only skill-description edits force refresh.
- No new runner code. Failure surface unchanged; one filter substring (`trigger-`) selects the cohort.
- Adjacent-negative drift: when a new skill is added, sibling skills' adjacent-negative scenarios may become stale. Coverage check catches missing files, NOT semantic drift — relies on author discipline at skill-add time.
- SRS gained `FR-ACCEPT.TRIGGER`; SDS gained naming/placement subsection; authoring guide [flowai-skill-write-agent-benchmarks](../../framework/devtools/skills/flowai-skill-write-agent-benchmarks/SKILL.md) documents the pattern.
- `deno task bench` full sweep is dominated by trigger scenarios — keep the cache warm in CI or filter by skill prefix for local edits.

## Definition of Done

All items below are evidenced as currently satisfied (this ADR is retrospective).

- [x] FR-ACCEPT.TRIGGER: SRS section declares the requirement, scope, layout, enforcement.
  - Test: manual — korchasa
  - Evidence: `grep -c "FR-ACCEPT.TRIGGER" documents/requirements.md` ≥ 1
- [x] FR-ACCEPT.TRIGGER: SDS describes naming convention and enforcement location.
  - Test: manual — korchasa
  - Evidence: `grep -cE "trigger-pos|trigger-adj|trigger-false" documents/design.md` ≥ 1
- [x] FR-ACCEPT.TRIGGER: 9 scenarios per skill mounted under `benchmarks/trigger-*/`, naming valid.
  - Benchmark: trigger-* (cohort)
  - Evidence: `deno run -A scripts/check-trigger-coverage.ts` exits 0 (the canonical enforcer; counts and names verified in one pass)
- [x] FR-ACCEPT.TRIGGER: coverage enforcer wired into the project gate.
  - Test: `deno task check`
  - Evidence: removing one trigger folder causes `deno task check` to exit non-zero
- [x] FR-ACCEPT.TRIGGER: authoring guide documents the pattern.
  - Test: manual — korchasa
  - Evidence: `grep -c trigger framework/devtools/skills/flowai-skill-write-agent-benchmarks/SKILL.md` ≥ 1
- [x] FR-ACCEPT.TRIGGER: framework contract mentions trigger scenarios.
  - Test: manual — korchasa
  - Evidence: `grep -c trigger framework/CLAUDE.md` ≥ 1

## Solution

1. **Layout** — sibling folders inside each skill's existing `benchmarks/`:
   `framework/<pack>/skills/<name>/benchmarks/trigger-{pos,adj,false}-{1,2,3}/mod.ts`.
2. **Scenario shape** — regular `AcceptanceTestScenario` (no new base class). Fields: `id = "<skill-id>-trigger-<type>-<n>"`, `skill = "<skill-id>"`, `userQuery = <natural-language query>`, `checklist = [<single critical item>]`.
3. **Checklist templates**:
   - Positive: `{ id: "skill_invoked", description: "Did the agent load and act on `<skill-id>/SKILL.md` in response to this query? Check the trace for SKILL.md read or Skill-tool call referencing this skill.", critical: true }`.
   - Negative: `{ id: "skill_not_invoked", description: "Did the agent AVOID loading `<skill-id>/SKILL.md`? For this query, the skill is not appropriate; the agent should either invoke a different skill or respond directly without loading this one.", critical: true }`.
4. **Query authoring per skill** — read the skill's `SKILL.md` description, enumerate adjacent skills (most likely confusion candidates), write 3 positive / 3 adjacent-negative / 3 false-use queries.
5. **Coverage enforcement** — [scripts/check-trigger-coverage.ts](../../scripts/check-trigger-coverage.ts) walks `framework/*/skills/*/`, asserts 9 scenarios per skill matching the naming convention. Wired into `scripts/task-check.ts`.
6. **SRS update** — add `### FR-ACCEPT.TRIGGER` under `### FR-ACCEPT: Benchmarking` in [documents/requirements.md](../requirements.md).
7. **SDS update** — naming + enforcement subsection in [documents/design.md](../design.md).
8. **Authoring guide** — extend [flowai-skill-write-agent-benchmarks/SKILL.md](../../framework/devtools/skills/flowai-skill-write-agent-benchmarks/SKILL.md) with a "Trigger scenarios" section pointing to FR-ACCEPT.TRIGGER.
9. **RED verification** — pick one skill, mangle its `description` temporarily, confirm the matching `trigger-pos-1` scenario fails. Revert. (Performed once during initial rollout; not a recurring requirement.)
10. **Filtering** — `deno task bench -f trigger-` runs the cohort; per-skill substring (`-f <skill-id>-trigger-`) for targeted refresh.

## Follow-ups

- Adjacent-negative drift detection: explore a check that flags trigger-adj scenarios pointing at skills that no longer exist or whose descriptions changed materially. Currently relies on author discipline.
- Adapter coverage: trigger benchmarks are validated on Claude adapter; Cursor / OpenCode / Codex behavior under description-matching is not yet exercised.
- CI cost gating: today the cohort runs unconditionally, with cache as the only mitigation. Consider gating the trigger sweep on description-edit detection (path filter on changed `SKILL.md` `description:` keys) so unrelated PRs skip 360 scenarios entirely.
