---
date: 2026-08-20
status: to do
implements: [FR-ACCEPT.TRIGGER, FR-UNIVERSAL.DISCLOSURE]
tags: [skills, triggers, framework-scope]
related_tasks: [2026/08/fix-ship-gates-exposed-by-timeout.md]
---

# Five skills the model does without them

## Goal

Five positive triggers stay red for one reason, and it is not their wording.
Decide, per skill, what it gives that the model will not produce unaided — then
keep it, merge it into the AGENTS.md template, or delete it. A skill nothing
routes to is cost with no return: it occupies the catalog the classifier reads
on every turn.

## Overview

### Context

The trigger suite measures description quality: a positive query must reach the
skill. Through 2026-08-19/20 a batch of red positives was worked through, and
the failures split cleanly by cause.

Fixed by fixing the **scenario** — the query referenced material that did not
exist, or collided with a host built-in:

- `ai-ide-runner`, `write-in-informational-style`, `interactive-teaching-materials` → 3/3
- `write-gods-tasks-trigger-pos-1`, `delegate-to-ide-trigger-adj-1`, `ai-ide-runner-trigger-adj-1` → scenario repaired

Fixed by fixing the **description** — exactly once, and the skill carried
knowledge the model does not have (Deno permission flags, `deno task`, unstable
opt-ins):

- `cli` 0/3 → 3/3

Not fixed by anything tried, all five with the same shape — the agent does the
skill's own work with generic tools and never opens the catalog:

- `fix-tests` 0/3 — 3, 8 and 15 tool calls; reads the failing test, finds the
  cause, fixes the source. That IS the skill's procedure.
- `setup-agent-code-style-strict` 1/3 — reads AGENTS.md, writes its own rules,
  reports done in ~50 s. Its old description matched the query almost verbatim.
- `manage-github-tickets` 0/3 — drafts the issue body itself, stops to ask
  whether to post.
- `delegate-to-ide` 0/3 — pipes the task into `codex exec` from bash. Its
  description already carried the query's phrase verbatim.
- `write-gods-tasks` 0/3 — 13, 16 and 27 tool calls; writes the GODS file
  itself. The GODS format is in the AGENTS.md template every sandbox mounts.

Two description rewrites were measured against this group (action-first phrasing;
the "producing it IS the work" clause that moved `engineer-prompts-for-instant`
from 1/3 to 2/3). Neither moved any of the five past 1/3.

### Current State

All five scenarios are well-formed and red on `main`, with the measurement and
the raw-session evidence recorded in each `trigger-pos-1/mod.ts`. The
`noPositiveTrigger` hatch (FR-ACCEPT.TRIGGER) exists and is guarded, but it
records a decision about a TEST — it says nothing about whether the skill should
exist. Applying it here would close the tests and leave the real question shut.

### Constraints

- A verdict per skill must cite what the skill contains that the model lacks —
  not an argument that it "documents good practice".
- Deleting or merging a skill touches the pack manifest, the README catalog, the
  trigger-coverage count and any composite that inlines it. Check
  `framework/composites.yaml` before removing anything.
- `write-gods-tasks` overlaps the AGENTS.md template by construction; compare
  the two texts before deciding, not the skill alone.
- Do NOT resolve this by marking the tests `noPositiveTrigger`. That is the
  fallback if a skill is deliberately kept despite being unreachable, and it
  needs its own evidence (raw session showing `review_ready`, not `blocked`).

## Definition of Done

- [ ] FR-ACCEPT.TRIGGER: each of the five skills has a written verdict — keep,
      merge into the AGENTS.md template, or delete — naming the knowledge or
      procedure the model does not supply unaided.
  - Evidence: `grep -c '^## Verdict' documents/tasks/2026/08/skills-the-model-does-unaided.md`
    returns 5
- [ ] FR-ACCEPT.TRIGGER: every skill kept has a green positive trigger, or a
      `noPositiveTrigger` marker whose evidence cites a raw session ending
      `review_ready`.
  - Test: `deno task acceptance-tests -f <skill>-trigger-pos -n 3`
  - Evidence: `deno run -A scripts/check-trigger-coverage.ts` exits 0 and no
    kept skill's positive is red
- [ ] FR-UNIVERSAL.DISCLOSURE: every skill deleted or merged is gone from its
      pack, the README catalog, and any composite that referenced it.
  - Evidence: `deno task check` exits 0 and
    `grep -rn '<deleted-skill>' framework/ README.md documents/` returns nothing
    outside this task file

## Solution

Not filled — the variants are the per-skill verdicts, and they are the work
itself. Fill after the first pass over the five.
