---
date: 2026-09-17
status: done
implements:
  - FR-UNIVERSAL.QA-FORMAT
  - FR-PLAN-VARIANT-ARCHETYPES
tags: []
related_tasks: []
---

# Variant properties must be separately labelled, in every option set

## Goal

A reader picks an option by comparing the same four properties across the
alternatives. When an agent writes an option as one prose paragraph that mixes
pros, cons and risks, the comparison has to be reconstructed sentence by
sentence, and a missing property is invisible. The goal is to make the
four-part shape observable and enforced — in every option set of a reply, not
only in the first one.

## Overview

### Context

Observed by the user across several sessions: the agent presented a variant as
a single paragraph, with pros, cons and risks merged into running text.

Measured on 2026-09-17 with six sandboxed subagent runs on one planning
request (the acceptance runner was unavailable — the codex arm's quota is
exhausted until 19 Sep 12:00):

- 3 runs with `AGENTS.md` + the `plan` skill, query prefixed `/plan`:
  judge verdict 3/3 PASS on all three layout items.
- 3 runs with `AGENTS.md` only, no skill, natural-language question:
  `variant_properties_separately_labelled` 1/3,
  `all_four_properties_present_per_variant` 1/3.
- 3 more runs with the same setup plus terse-reply pressure: 2/3, 2/3.

**The finding that moves the diagnosis**: in all six runs the PRIMARY option
set is laid out correctly. Every failure sits in a SECONDARY option set later
in the same reply — the Redis-failure policy, the limiter key, the rollout
order. Examples the judge quoted: `A. Пропускать все запросы. Платящие
клиенты не замечают аварию, но абузер в этот момент не ограничен ничем.`
(one merged sentence), an option set that keeps Pros/Cons and drops Risks and
Best-for, and a set of bare one-line options.

The defect therefore lives in the rule text, not in the `plan` skill: the rule
describes the main variant question and says nothing about the other choices a
reply opens. The assistant reproduced the same defect live in this very
session, in a question with three options — which is the sixth data point.

**The request has to leave the secondary decisions unnamed.** A second round of
sandboxed runs, same day, measured the two rule texts against each other by
counting labelled properties in the answers:

- Request that ENUMERATES the later decisions and their candidate answers:
  old rule text and new one both score a full set of four labels on every
  option — 4 runs on the rule alone, 4 with the `plan` skill, and 4 more with
  terse-reply pressure added. The enumeration hands over the structure of the
  reply, so the rule text stops mattering and the scenario separates nothing.
- Request that names ONE goal and leaves the rest open: on the old text the
  reply labels the first set and degrades afterwards — 4 runs with only the
  first set labelled, one that drops best-for from all nine options, one that
  keeps three sets but thins the last. On the new text, 3 runs × 3 option sets
  × 3 options, four labels on every one.

Both scenarios therefore ask an open question, and the checklist scores the
sets the agent opens by itself. Terse-reply pressure changes nothing and is
not used.

### Current State

- `framework/atoms/plan.md:68` and `:101` say the option's **Pros**, **Cons**,
  **Risks** and **Best For** are "nested under it". "Nested" also reads as
  "mentioned inside the option", which one paragraph satisfies. Both sentences
  speak about the variant question of Step 4 only.
- `AGENTS.md:161` (§Variant Presentation) and
  `framework/core/assets/AGENTS.template.md:144` (§Variant Analysis) state the
  same rule for any comparison, again with no layout requirement and no reach
  beyond the first option set.
- Acceptance coverage: `plan-variants-complex` checks `tradeoffs_discussed` —
  presence of content, not layout. One paragraph passes it.
- `documents/requirements.md:706` carries an OPEN item
  `agents-rules-variant-analysis` — the rule has no scenario of its own.

### Constraints

- Acceptance Test TDD: the scenarios are written before the rule text changes.
- `framework/core/skills/plan/SKILL.md` and
  `framework/core/commands/ship/SKILL.md` are generated build artefacts — edit
  `framework/atoms/plan.md` and regenerate.
- The shipped `AGENTS.template.md` canon stays domain-agnostic: no plan- or
  archetype-specific tokens.
- The codex acceptance arm is out of quota until 19 Sep 12:00. Scenario
  verification runs through sandboxed subagents plus a judge subagent; the
  runner sweep is handed to the user.

## Definition of Done

- [x] FR-UNIVERSAL.QA-FORMAT: the rule text forbids writing an option as a
      paragraph and requires pros, cons, risks and best-for each on its own
      labelled line, in both canons and in the `plan` atom.
  - Test: `manual — korchasa` (contrast measured over sandboxed Claude runs,
    2026-09-17; see "Why the runner does not gate this" below)
  - Evidence: `grep -c "own labelled line" framework/atoms/plan.md AGENTS.md framework/core/assets/AGENTS.template.md`
- [x] FR-PLAN-VARIANT-ARCHETYPES: the generated `plan` and `ship` SKILL.md
      carry the same layout rule, regenerated from the atom.
  - Test: `deno task check` (generator check mode)
  - Evidence: `grep -c "own labelled line" framework/core/skills/plan/SKILL.md framework/core/commands/ship/SKILL.md`
- [x] Both scenarios exist and pass on the codex arm as a layout-regression
      guard, with checklists that fail on the first option written as prose.
  - Test: `Benchmark: agents-rules-variant-analysis`, `Benchmark: plan-variant-properties-labelled`
  - Evidence: `deno task acceptance-tests -f agents-rules-variant-analysis` and `deno task acceptance-tests -f plan-variant-properties-labelled` both report 0 errors
- [x] The SRS records that the two scenarios are a guard, not the rule's
      acceptance, and states what the manual evidence is.
  - Test: `Benchmark: agents-rules-variant-analysis`
  - Evidence: `grep -n "not as this rule's acceptance" documents/requirements.md`
- [x] Project stays green.
  - Test: `deno task check`
  - Evidence: `deno task check` ends with `0 failed` on every summary line

## Solution

Chosen variant (user, 2026-09-17): **C** — write both scenarios, and codify the
exact layout the assistant used in its corrected question.

The canonical layout, as approved:

```markdown
**A. <option title> — <scope marker>**

- **Pros:** …
- **Cons:** …
- **Risks:** …
- **Best for:** …
```

followed by a separate **Trade-offs** block across the options and a one-line
recommendation. It binds on every option set in a reply.

1. **RED — rule-level scenario.** Add
   `framework/core/acceptance-tests/agents-rules-variant-analysis/mod.ts`
   (plain `BenchmarkScenario`, the shared `agents-rules/fixture`, no skill in
   the query). The request states one goal — cache the fetcher responses — and
   forbids writing code; every decision the reply opens, the agent has to raise
   itself. The checklist binds the layout on EVERY such set and fails a merged
   paragraph, a bare one-liner, or a missing best-for.
2. **RED — `plan` scenario.** Rework
   `framework/core/skills/plan/acceptance-tests/variant-properties-labelled/mod.ts`:
   the query asks for a rate-limiting plan and names the approach candidates
   only. The failure policy, the limiter key and the rollout order are left for
   the run to raise, and the checklist scores the last option set as strictly
   as the first. Neither query enumerates its secondary decisions — that
   enumeration is what made the first draft of both scenarios pass on the
   pre-fix rule text.
3. **GREEN.** State the layout and its reach in `framework/atoms/plan.md`
   (Question Format block and Step 4), then
   `deno run -A scripts/generate-skill-composites.ts --write`. Mirror it into
   `AGENTS.md` §Variant Presentation and
   `framework/core/assets/AGENTS.template.md` §Variant Analysis, keeping the
   shipped template domain-agnostic.
4. **SRS.** Extend `FR-UNIVERSAL.QA-FORMAT` rule 3 and its acceptance list with
   both scenario ids, extend the `FR-PLAN-VARIANT-ARCHETYPES` scope bullet, and
   close the open `agents-rules-variant-analysis` item once the scenario exists.
5. **CHECK.** Re-verify both scenarios through sandboxed subagents (the codex
   arm is out of quota), then `deno task check`. The runner sweeps
   `-f plan` and `-f agents-rules-variant-analysis` are handed to the user.

### Why the runner does not gate this

Decided with the user on 2026-09-19 after the red phase failed twice.

The defect is a Claude one. Codex `gpt-5.6-terra`, which the acceptance runner
drives by default, writes options as labelled lists under the PRE-FIX rule text
as well: both scenarios were run on HEAD with the old text and both passed —
`plan-variant-properties-labelled` 4/4 in 152 s, `agents-rules-variant-analysis`
4/4 in 57 s. A scenario that passes before the change measures nothing, so
neither can serve as this rule's acceptance.

Running them on the claude arm (`-i claude`), where the defect does reproduce,
was tried and blocked: the repo's `CLAUDE_CODE_OAUTH_TOKEN` has expired, and the
agent never started.

The user chose to accept the rule on the manual evidence instead: the sandboxed
Claude runs of 2026-09-17 recorded above, where the pre-fix text produced bare
one-liners with merged properties and the fixed text produced four labelled
lines on every option. The two scenarios stay in the tree as a guard against a
layout regression on the codex arm.

A correction that belongs here: the first drafts of both scenarios were built
around "secondary option sets", on the theory that the defect lives in the
later sets of a reply. The user corrected that twice — the paragraphs appeared
in every option, the first one included. The checklists now fail on the first
option written as prose and give the first set no exemption.
