---
date: 2026-11-18
status: done
implements:
  - FR-DOCS.RATIONALE
tags: [docs, sds, srs, init, templates]
related_tasks:
  - 2026-10-fr-rationale-field
---
# Rationale field for design decisions in the shipped SDS template [ANC:task:2026-11-rationale-in-sds-template]

## Goal

Every design decision a project records states why it was made this way, not only every requirement. A design entry that says what without why leaves a later session two bad options: keep a choice it cannot defend, or undo one whose reason it never saw. Projects set up or re-adapted from the flowai templates should get the field from the template, not by hand.

## Overview

### Context

User decision 2026-11-18: every requirement in an SRS and every design decision in an SDS carries a short written reason, at least one sentence on why it was decided this way, filled in the same edit as the entry. The field keeps the existing name `**Rationale:**` (decision of the same day, chosen over renaming it to `Why`, so the review gate recognises it unchanged).

### Current State

- `framework/core/assets/SRS.template.md` carries `**Rationale:**` in the FR block only; section 4 (Non-Functional) has none.
- `framework/core/assets/SDS.template.md` has no reason field anywhere.
- `framework/core/assets/AGENTS.template.md` declares `Rationale-as-gate` for FRs only and does not describe what a good rationale says. Its "Workflow for changes" rule does not mention the field.
- `framework/core/skills/init/SKILL.md` step 9 names the per-component SDS fields `Purpose` / `Interfaces` / `Deps`.
- The review FR Coverage Audit (check 5) covers FR sections only.

### Constraints

- Shipped template and skill changes go through Acceptance Test TDD: a RED scenario first, then only the affected scenarios; the full sweep is handed to the user.
- The SRS/SDS schema blocks stay out of `AGENTS.template.md` (`scripts/check-agents-template_test.ts`); the field description is a rule, not a schema block.
- The review gate is not widened to SDS: what counts as a "decision" in a design section is a judgement, and a gate firing on every SDS edit (a renamed path, a new interface name) would block routine doc sync. The rule binds by instruction; the FR gate stays as it is.
- Other sessions work in this checkout: commit by explicit paths.

## Definition of Done

- [x] FR-DOCS.RATIONALE: the shipped SDS template carries `**Rationale:**` in Arch, in each component after `**Deps:**`, in Data, Logic and Constraints, plus one sentence that any other decision entry carries its own; the shipped SRS template carries it in the Non-Functional section.
  - Test: `Benchmark: init-greenfield` (checklist item `sds_rationale_field`)
  - Evidence: `grep -c -F '**Rationale:**' framework/core/assets/SDS.template.md` prints at least 6, and `sed -n '/## 4. Non-Functional/,/## 5/p' framework/core/assets/SRS.template.md | grep -c -F '**Rationale:**'` prints 1
- [x] FR-DOCS.RATIONALE: `init` writes a `**Rationale:**` into every SDS component and the Arch section it generates.
  - Test: `Benchmark: init-greenfield` (checklist item `sds_rationale_field`)
  - Evidence: `deno task acceptance-tests -f init-greenfield` passes; `grep -c -F '**Rationale:**' framework/core/skills/init/SKILL.md` prints at least 2
- [x] FR-DOCS.RATIONALE: the shipped AGENTS template widens `Rationale-as-gate` to SDS decisions, describes what the field says (alternative beaten, measurement, or owner instruction with date; current state, not history; a commit message or task file does not replace it; `not decided; kept as found` for an unchosen choice), and its "Workflow for changes" rule says the field is filled in the same edit.
  - Test: `scripts/check-agents-template_test.ts`
  - Evidence: `grep -c -F 'not decided; kept as found' framework/core/assets/AGENTS.template.md` prints 1, and `grep -n -F 'Workflow for changes' framework/core/assets/AGENTS.template.md` shows the word `Rationale`
- [x] FR-DOCS.RATIONALE: the SRS clause and the SDS section describe the widened field; `deno task check` is green.
  - Test: `scripts/task-check.ts`
  - Evidence: `deno task check` ends with `0 failed`

## Solution

1. SRS: widen `FR-DOCS.RATIONALE` to SDS decisions and NFRs, extend its Rationale with today's decision. SDS: update the "FR rationale" bullet in the documentation-system section.
2. RED: add checklist item `sds_rationale_field` to `init-greenfield` (Arch section and every component entry carry a non-empty `**Rationale:**`). Run it on HEAD; it must fail on that item.
3. GREEN: add the lines to `SDS.template.md` and the NFR section of `SRS.template.md`; widen `Rationale-as-gate` and add the field description and the same-edit clause to `AGENTS.template.md`; name the SDS fields in `init/SKILL.md` step 9. Rerun `init-greenfield`.
4. CHECK: `deno task check`; hand the full `init` sweep to the user.

## Results

- RED on the unchanged templates: `init-greenfield` failed on `sds_rationale_field` (the generated SDS had no `**Rationale:**` in Arch or in its one component). The judge also failed `srs_sds_structure` on the same missing field.
- GREEN after the edits: `init-greenfield` passed all 10 items, one run. `review-missing-rationale-blocks` passed on the edited `AGENTS.template.md`, so the review gate still recognises the widened `Rationale-as-gate` rule.
- `deno task check`: exit 0, 0 failed.
- Not run: the full sweep of every `init` and `review` scenario, handed to the user (`deno task acceptance-tests -f init`, `deno task acceptance-tests -f review`).
- Not changed: the `commit` doc-sync step names the SDS section it updates but no fields, so the same-edit rule reaches it through the project's AGENTS.md. This project's own SDS format in `documents/AGENTS.md` keeps no Rationale field.
