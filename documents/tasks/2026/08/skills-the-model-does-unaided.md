---
date: 2026-08-20
status: in progress
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

- [x] FR-ACCEPT.TRIGGER: each of the five skills has a written verdict — keep,
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


---

# Verdicts (2026-08-25)

Written after the 2026-08-24 full sweep (318 scenarios, `-p 3`, zero health
aborts) and a read of every failing raw session. The set has shifted since this
file was opened: `setup-agent-code-style-strict` is green on all five of its
scenarios and leaves the list, and `draw-mermaid-diagrams-trigger-pos-1` joins it
with the same surface shape.

The headline is a correction. This file's premise — five skills the model does
unaided — holds for exactly ONE of the five. The other four are ordinary
scenario defects that looked alike because they all end with "the agent answered
without the skill".

## Verdict — fix-tests: the model fixes a real red test unaided

The 2026-08-24 sandbox held two files, `AGENTS.md` and `CLAUDE.md`. The scenario
declared no `fixturePath`, so there was no failing test for "one of my tests
started failing" to refer to. The agent said so and asked which project was
meant. That is a correct answer to an impossible request, and the earlier finding
("8, 3 and 15 tool calls — it does the skill's procedure without the skill") was
measured against a sandbox this scenario never described. Retracted in the
scenario file. A fixture now ships a real red: `slugify` leaves a trailing hyphen
on `"Release notes!"`. The routing question was then answerable, and it was measured on 2026-08-27:
`fix-tests-trigger-pos-1` scored 0/3 with 7, 8 and 10 tool calls, the deterministic
check reporting no `Skill` call for `fix-tests` in any run. The two neighbours of the
triple stayed green, so the miss is not a classifier failure — the agent sees a real
project with a real failing test and repairs it by hand. The original finding therefore
holds after all, on evidence the old runs could not supply. The fixture stays: without
it the scenario measured nothing.

## Verdict — draw-mermaid-diagrams: KEEP; the query never asked for a diagram

"Sketch out the order of calls between the API gateway, the auth service, and the
database when a user logs in" does not ask for a diagram. The model answered with
a numbered prose sequence and closed with "Want me to turn this into a Mermaid
sequence diagram?" — the right answer to what was asked, and evidence the skill's
subject was recognised. A positive trigger has to name the deliverable; the query
now asks for a sequence diagram to paste into a README.

## Verdict — delegate-to-ide: KEEP; the scenario asked for the neighbour

The query ended "and show me its answer", which makes it a one-shot relay — and
this skill's own description says "For one-shot relay or fan-out use
`ai-ide-runner`". The agent invoked `ai-ide-runner` and was obeying the catalog
boundary as written. Two further facts from the session: it did reach Codex
(`OpenAI Codex v0.144.6` started in the sandbox), and Codex answered
`401 Unauthorized` on every attempt because no credentials are mounted. The query
now describes a delegation — work handed over and done in its own context.

## Verdict — write-gods-tasks: MERGE into the template, pending the owner's call

This is a catalog collision, not an unaided-model case. GODS is taught in three
places: the `### GODS Format` section of `AGENTS.template.md`, which every
sandbox mounts; `plan`, whose description promises "produce a GODS-format
breakdown"; and this skill. The agent picked `plan` and produced a full task file
with variant analysis, then asked which variant to take — a better answer than
the skill would have given. The skill's own body is "What is GODS?" plus
examples, and it names nothing the template lacks.

Recommendation: delete the skill and keep the template section as the single
source. Consumers to repoint first — `manage-github-tickets/SKILL.md` (two
references), `engineer-plugin-marketplace/references/related-skills.md`, the
README catalog line, `documents/design.md`, and the trigger-coverage count.
Not executed: removing a shipped skill is the owner's decision, not a fix.

## Verdict — manage-github-tickets: the one real case, and it needs a decision

The model produced a complete, correctly structured issue — title, repro,
expected, actual, environment — and stopped before posting because the action is
irreversible. It did that with no tool calls and no skill. What the skill carries
that the answer lacked: the house convention that tickets are written in GODS
rather than the standard bug-report template, English-only, and a tool-detection
order (MCP `create_issue`, then `gh issue create`, then show the body to the
user).

So the skill is not empty — but it is unreachable on its own core request, which
means the convention never fires in practice either. Its description already
names the trigger almost verbatim ("Use when creating, updating, or triaging
GitHub issues") and still loses, and two description rewrites were measured
across this family without moving anything. Two honest options, both the owner's
call:

- Keep the skill and mark the positive `noPositiveTrigger`, with the raw session
  as evidence that the turn ended in a produced artefact rather than a block.
  This closes the test and leaves the convention unreachable.
- Move the GODS-issue convention and the tool-detection order into the
  `AGENTS.md` template, where they bind without routing, and delete the skill.

# Decisions and re-measurement (2026-08-27)

## Owner's decisions

The two verdicts that needed the owner's call were answered.

**`manage-github-tickets` — delete.** Nothing in it is unique: three quarters of
the file restated GODS, which `write-gods-tasks` already carries, and the agent
drafts a GitHub issue unaided. Removed: `SKILL.md`, four scenarios, the README
catalog line, the `engineering` entry in SDS (count 18 → 17). `CHANGELOG.md`
mentions survive as history. `check-trigger-coverage.ts` stays green.

**`write-gods-tasks` — keep, and make it the only source of the format.** The
name "GODS" may now appear in two places only: a project's `AGENTS.md` and the
skill itself. Everything else calls it *the accepted task format*.

- The `### GODS Format` block left `framework/core/assets/AGENTS.template.md`
  and this repo's own `AGENTS.md`; both keep a pointer to the skill.
- The block, the path convention and the frontmatter contract moved into the
  skill, with the path expressed through the `tasks` role rather than a literal
  directory (FR-UNIVERSAL.DOC-SCHEMA forbids the literal).
- The skill moved from the `engineering` pack to `core`, because `plan` and
  `ship` — both `core` — depend on the format. Without the move a `packs: []`
  install would have pointed at a skill that is not on disk.
- Seven references in `framework/atoms/plan.md`, plus `plan-critic.md` and
  `init/SKILL.md`, were reworded to *the accepted task format*. `ship` and
  `plan` regenerated from the atom.
- `plan`'s description lost the words "GODS-format breakdown". That was one leg
  of the three-way collision that kept `write-gods-tasks-trigger-pos-1` red.

## What is still unmeasured

Two of the three re-measurements did not produce a verdict, for two different
instrument faults.

- `draw-mermaid-diagrams-trigger` — five of nine runs returned exit 75, the
  `system_health` pre-flight abort in `scripts/acceptance-tests/lib/acp/acp_agent.ts`.
  Such a run lasts 0.0 s and makes no tool call, so it reads in the summary table
  as "skill not invoked". Host at the time: available 2159 MB against a 2048 MB
  floor, swap 20054/21504 MB. The one valid run of the positive PASSED — the
  rewritten query does reach the skill — but one run is not three.
- `delegate-to-ide-trigger` — all nine runs died with
  `ReferenceError: formatJudgeEvidence is not defined`. A parallel session was
  mid-refactor of the harness: `runner.ts` already imported the function while
  `scripts/acceptance-tests/lib/evidence.ts` did not yet exist. Nothing about the
  skill was measured.

Both need a re-run once the host has memory free and the harness is committed.
