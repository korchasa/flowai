---
date: "2026-07-05"
status: done
implements: [FR-PLAN-OUTCOME-COMPLETENESS]
tags: [plan, agents, surface, critique, benchmark-loop]
related_tasks: [2026/07/bench-judge-gate.md, 2026/07/bench-sandbox-isolation.md]
---
# Plan atom: surface-scout blind second pass + plan-critic fresh-context critique

## Goal

Close the dominant surviving SWE-bench failure class — in-repo surface
under-enumeration at plan time (parallel file / sibling layer missed: sphinx-7462
`pycode/ast.py`, pylint-4551 writer layer F2P 0/10) — and the documented weakness
of author self-critique, by converting two behavioral disciplines in the `plan`
atom into structural steps backed by two shipped read-only agents.

## Overview

### Context

- Loop5 decision log: `scripts/benchmark/runs/2026-07-04-loop5/_decision-log.md`
  — 3 critic rounds (28 objections total), hard stop at round 3, user decision
  (2026-07-05) accepting the critic's minimal-fix direction: the scout's RAW
  output persists VERBATIM in the task file; plan-critic recomputes the set-diff
  from the raw block; dispatch trigger = artifact presence, not planner judgment.
- Precedent for atom→agent delegation with fallback: `framework/atoms/review.md`
  Rule 14 (`diff-specialist`). Agent format convention:
  `framework/core/agents/diff-specialist.md`.
- All 4 target IDEs support pre-declared subagents (documents/ides-difference.md).
- Residual risk (declared): every inter-agent channel is mediated by the
  orchestrating agent — active falsification of the verbatim block is possible
  and accepted as the trust class carried by every existing primitive; the human
  and `review` are downstream checkers.

### Current State

`plan.md` Step 2 has an inline "Affected-surface enumeration" bullet (behavioral,
scores ~0 under context pressure); Step 6 is author self-critique; Step 7 triages
with per-item labels. No agents involved; no durable surface artifact.

### Constraints

- Scout input = the user's verbatim request text (+ quoted user answer turns);
  NEVER the planner's restatement, enumeration, or suspected fix site.
- `### Affected Surface` lives under `## Overview` (NOT under DoD — checkbox-free
  plain bullets; verified against `deriveStatusFromDoD`'s scan window).
- plan-critic dispatch: scout block present in the task file OR multiple variants
  presented. Recorded Follow-ups deferrals are legitimate; objections only for
  UNRECORDED cuts. DoD-tuple checks excluded (Step 5a owns them).
- No-subagent environments: inline behavior + one degradation line under
  `## Follow-ups`.
- Agent frontmatter per diff-specialist convention; scout maxTurns 15 with a
  mandatory "not examined (budget)" section.
- Source SKILL.md files are build artefacts — edit `framework/atoms/plan.md`,
  regenerate composites.

## Definition of Done

- [x] FR-PLAN-OUTCOME-COMPLETENESS: plan skill dispatches the scout on a
      definite-outcome request (parent-side dispatch visible in trace), persists
      the verbatim block + disposition table in `### Affected Surface` under
      `## Overview`. Subagents are testable ONLY through the wrapping skill
      (write-agent-benchmarks §standalone-agent caveat) — no standalone agent
      scenarios.
  - Benchmark: `plan-affected-surface-scout`
  - Evidence: `deno task acceptance-tests -f plan-affected-surface-scout`
- [x] FR-PLAN-OUTCOME-COMPLETENESS: same discipline on a non-code (process/docs)
      request — scout dispatched, table uses non-code evidence forms.
  - Benchmark: `plan-surface-non-code`
  - Evidence: `deno task acceptance-tests -f plan-surface-non-code`
- [x] FR-PLAN-OUTCOME-COMPLETENESS: plan skill without subagent support degrades
      to inline enumeration + a visible degradation line under `## Follow-ups`.
  - Benchmark: `plan-surface-degradation`
  - Evidence: `deno task acceptance-tests -f plan-surface-degradation`
- [x] FR-PLAN-OUTCOME-COMPLETENESS: plan skill dispatches `plan-critic` on
      multi-variant plans; objections surface verbatim; triage labels unchanged.
  - Benchmark: `plan-auto-critique` (extended with `plan_critic_dispatched`)
  - Evidence: `deno task acceptance-tests -f plan-auto-critique`
- [x] Composites regenerated; full plan sweep green; `deno task check` green.
  - Test: full primitive sweep
  - Evidence: `deno task acceptance-tests -f plan- && deno task check`

## Solution

1. `framework/core/agents/surface-scout.md` — read-only (Read/Grep/Glob/Bash),
   mode subagent, maxTurns 15. Protocol: parse the verbatim request; derive own
   search terms; for each hit probe (a) parallel implementations by naming/
   directory symmetry, (b) consumers/producers of the hit's data or artifact
   (code: same-package readers/writers; infra: services reading the changed
   config/output; process: steps consuming the deliverable). Output: evidence-
   backed list (per-domain evidence forms) + queries used + "not examined
   (budget)" + "could not rule out". MUST NOT propose fixes or rank sites.
2. `framework/core/agents/plan-critic.md` — read-only, fresh-context adversarial
   reviewer of a plan task file. Recomputes scout-vs-table diff from the verbatim
   block; attacks missing stated outcomes, un-inspected risk claims,
   over-engineering, UNRECORDED scope cuts, missing/dangling dispositions.
   At most 8 objections, BLOCKING/ADVISORY + evidence. No fixes, no rewrites.
3. `framework/atoms/plan.md`:
   - Step 2: after the inline enumeration bullet — dispatch scout (verbatim
     input; hold result), where the environment provides it.
   - Step 3: task file gains `### Affected Surface` under `## Overview`: the
     scout's verbatim block + disposition table (plain bullets: covered-by /
     not affected + inspected per-domain evidence / deferred — human choice).
     Uncertain items default to deferred, surfaced at variant selection.
     No scout → one degradation line under `## Follow-ups`.
   - Step 5: update dispositions to the selected variant's Solution steps.
   - Step 6: dispatch plan-critic (task file path) when the scout block exists
     OR multiple variants were presented; objections verbatim in chat; else
     self-critique text unchanged (+ degradation line when subagents missing).
   - Step 7: completeness check extended — no dangling covered-by pointers.
4. Regenerate composites; run scenarios; full sweep; `deno task check`.

## Follow-ups

- Implement/review-side surface gate (intra-function branch class, django-11820)
  — future loop candidate (decision log r1#6, r2#2).
- Non-code universality claim rests on one fixture — broaden if the mechanism
  earns its keep on the next bench run (r3#6).
