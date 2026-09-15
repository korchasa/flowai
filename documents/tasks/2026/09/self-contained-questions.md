---
date: 2026-09-15
status: done
implements:
  - FR-UNIVERSAL.QA-FORMAT
  - FR-PLAN-VARIANT-ARCHETYPES
tags:
  - qa-format
  - plan
  - epic
  - maintenance
related_tasks: []
---

# Self-Contained Questions and Options Inside the Question

## Goal

A user reading only the question must be able to answer it. Today the agent
writes questions that reference material the reader has not seen, and the `plan`
skill states each variant twice — once as a `### Variant N` block, once again in
the selection prompt. Both cost the reader a scroll-back and cost the agent a
duplicated description that can drift between the two copies.

## Overview

### Context

Two rules collide today.

`FR-UNIVERSAL.QA-FORMAT` (`documents/requirements.md`) demands only two things:
numbered questions and `agent's choice` resolution semantics. Nothing in it says
a question must stand on its own, so a question that opens with "which of the
above" satisfies the FR while failing the reader.

The same FR carries an explicit **Out** scope that exempts three call sites from
the format: variant selection in `plan` Step 4, phase decomposition in `epic`
Step 4, and the post-findings "how to proceed" prompt in `maintenance` Step 5.
The exemption was written because Claude Sonnet 4.6's layout prior for
rich-content alternatives could not be overridden through skill text — but it is
also what licenses the duplication the user is complaining about.

The user's own private instruction file (`~/.claude/CLAUDE.md`, section
"Questions to me — chat text only") currently says the opposite of the chosen
direction: item 4 reads "Put rich content (diffs, findings, option breakdowns)
before the question; numbering does not cover it."

### Current State

- `documents/requirements.md` — `FR-UNIVERSAL.QA-FORMAT`: two format rules, an
  Out scope exempting `plan` / `epic` / `maintenance`, a Deferred note.
- `framework/atoms/plan.md` — "Question Format" block declares Step 4 exempt;
  Step 4 presents `### Variant N` blocks with Pros / Cons / Risks / Best For,
  then asks a separate selection question.
- `framework/core/skills/plan/SKILL.md` and
  `framework/core/commands/ship/SKILL.md` are generated from that atom
  (`framework/composites.yaml`) — never hand-edited.
- `framework/core/skills/epic/SKILL.md` — Step 4 presents the phase breakdown,
  then "Present to user. STOP and wait for approval/adjustments" with no
  question text at all.
- `framework/core/skills/maintenance/SKILL.md` — Step 5 asks which findings to
  fix; reply modes are already listed inside the prompt, but the question does
  not restate the finding counts it refers to.
- `framework/engineering/skills/write-prd/SKILL.md`,
  `framework/devtools/skills/engineer-skill/SKILL.md`,
  `framework/devtools/skills/engineer-command/SKILL.md` — each carries the same
  two-bullet Question Format block.
- `framework/core/assets/AGENTS.template.md` line 144 — the shipped
  `Variant Analysis` canon: "Present each candidate as a labeled option with
  Pros / Cons / Risks / Best-for".
- `AGENTS.md` (this repo) — `Variant Analysis` and `User Decision Gate` bullets
  under `## Planning Rules`.
- Existing `plan` scenarios (`variants-complex`, `variants-obvious`,
  `interactive`) judge content, not layout — they survive the change unchanged.

### Constraints

- Two distinct rules, applied to different call sites. Rule A (self-contained
  question) applies everywhere. Rule B (options carry their own analysis inside
  the question, no separate presentation) applies only where the rich blocks
  ARE mutually exclusive options — `plan` Step 4. In `epic` Step 4 the phases
  are a sequence, not alternatives, and in `maintenance` Step 5 the findings
  list is not an option set; there the rich content stays before the question
  and only Rule A binds.
- `plan/SKILL.md` and `ship/SKILL.md` are build artefacts — edit
  `framework/atoms/plan.md` and regenerate.
- Acceptance Test TDD: every changed primitive needs a scenario written first
  and observed failing.
- The shipped `AGENTS.template.md` `Variant Analysis` canon must stay abstract
  and domain-agnostic (no plan-specific or archetype-specific tokens) — SRS
  `FR-PLAN-VARIANT-ARCHETYPES` scope.

## Definition of Done

- [x] FR-UNIVERSAL.QA-FORMAT: the FR states Rule A (a question restates the
      context it needs and is answerable without the text above it) and Rule B
      (when the rich blocks are mutually exclusive options, they appear as the
      question's own labelled options with their analysis nested under each —
      no separate presentation before the question), and the Out scope no
      longer exempts `plan` / `epic` / `maintenance` from Rule A.
  - Test: `Benchmark: plan-variants-complex` (checklist items `variants_are_options_of_one_question`, `selection_question_self_contained`)
  - Evidence: `grep -c "Self-contained question" documents/requirements.md`
    returns ≥1, and `grep -n "Rule 3 — out" documents/requirements.md` shows the
    exemption narrowed to `epic` / `maintenance` rich content only
- [x] FR-PLAN-VARIANT-ARCHETYPES: `plan` Step 4 presents the archetype variants
      as labelled options of one numbered question, each option carrying its own
      Pros / Cons / Risks / Best For, with no separate `### Variant N` blocks.
  - Test: `Benchmark: plan-variants-complex` (checklist items `variants_are_options_of_one_question`, `selection_question_self_contained`)
  - Evidence: `deno task acceptance-tests -f plan-variants-complex`
- [x] FR-UNIVERSAL.QA-FORMAT: `epic` Step 4 ends with an explicit numbered
      question that names what is being approved and lists the reply options,
      instead of a bare "STOP and wait for approval".
  - Test: `Benchmark: epic-basic` (checklist item `phase_approval_question_self_contained`)
  - Evidence: `deno task acceptance-tests -f epic-basic`
- [x] FR-UNIVERSAL.QA-FORMAT: `maintenance` Step 5's "how to proceed" question
      restates the finding counts it refers to, so it answers without scrolling
      back to the findings list.
  - Test: `Benchmark: maintenance-basic` (checklist item `proceed_question_self_contained`)
  - Evidence: `deno task acceptance-tests -f maintenance-basic`
- [x] FR-UNIVERSAL.QA-FORMAT: the Question Format block in `write-prd`,
      `engineer-skill` and `engineer-command` carries Rule A.
  - Test: `manual — korchasa`
  - Evidence: `grep -l "answerable from itself and its options alone" framework/engineering/skills/write-prd/SKILL.md framework/devtools/skills/engineer-skill/SKILL.md framework/devtools/skills/engineer-command/SKILL.md` lists all three
- [x] FR-UNIVERSAL.QA-FORMAT: the user's private instruction file carries the
      same two rules, and its item 4 no longer orders rich content to sit before
      the question.
  - Test: `manual — korchasa`
  - Evidence: `grep -n "Put rich content" "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/CLAUDE.md"` returns nothing
- [x] FR-UNIVERSAL.QA-FORMAT: repo `AGENTS.md` and the shipped
      `AGENTS.template.md` describe the option-inside-question format, and the
      generated `plan/SKILL.md` / `ship/SKILL.md` match their atom.
  - Test: `deno task check`
  - Evidence: `env -u AUTO_INSTALL_PLUGINS deno task check`

## Solution

1. **SRS first.** In `documents/requirements.md`, `FR-UNIVERSAL.QA-FORMAT`:
   add Rule A and Rule B to the Desc; rewrite the Scope so the In list covers
   every question the framework asks, and the Out list keeps only the narrow
   case Rule B does not reach (rich content that is not an option set stays
   before the question, Rule A still binds); update the Acceptance list with
   the three new scenario ids. Touch `FR-PLAN-VARIANT-ARCHETYPES` scope to say
   the archetypes are presented as options of the selection question.
2. **RED — extend three existing scenarios and observe them fail.** No new
   scenario files: the three questions already sit on covered execution paths,
   and AGENTS.md forbids a near-duplicate scenario when the path is the same.
   - `plan-variants-complex` gains `variants_are_options_of_one_question` and
     `selection_question_self_contained`.
   - `epic-basic` gains `phase_approval_question_self_contained`.
   - `maintenance-basic` gains `proceed_question_self_contained`.
   Run each with `deno task acceptance-tests -f <id>` and record the failure.
   The runner holds a global lock — one run at a time, so these are sequential.
3. **GREEN — edit the primitives.**
   - `framework/atoms/plan.md`: replace the "Variant selection in Step 4 is
     exempt" paragraph with Rules A and B; rewrite Step 4 so the variants are
     the options of one numbered question, dropping the `### Variant N`
     presentation and the trailing exemption note.
   - `framework/core/skills/epic/SKILL.md`: Question Format block gains Rule A;
     Step 4 ends with an explicit numbered approval question.
   - `framework/core/skills/maintenance/SKILL.md`: Question Format block gains
     Rule A; Step 5's prompt restates the counts.
   - `write-prd`, `engineer-skill`, `engineer-command`: add Rule A to the block.
4. **Regenerate** the composites:
   `deno run -A scripts/generate-skill-composites.ts --write`, then confirm
   `plan/SKILL.md` and `ship/SKILL.md` carry the new Step 4.
5. **Canon files.** Update `AGENTS.md` (`Variant Analysis`, `User Decision
   Gate`) and `framework/core/assets/AGENTS.template.md` line 144 to describe
   options-inside-the-question, keeping the template abstract.
6. **Private instructions.** In `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/CLAUDE.md`,
   section "Questions to me — chat text only": add the self-containment rule to
   item 1, and rewrite item 4 from "rich content before the question" to "rich
   content belongs inside the option it describes; present it separately only
   when it is not an option set".
7. **Re-run** the three scenarios, then `env -u AUTO_INSTALL_PLUGINS deno task
   check` and report.
