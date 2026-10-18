---
date: 2026-10-18
status: done
implements:
  - FR-DOCS.RATIONALE
tags: [docs, srs, review, init]
related_tasks: []
---
# Mandatory Rationale field in the SRS requirement template [ANC:task:2026-10-fr-rationale-field]

## Goal

Every functional requirement states why it exists. A requirement without its reason cannot be weighed when it conflicts with another one, and a later session cannot tell a load-bearing constraint from a historical accident. The user asked for one mandatory field that carries the reason.

## Overview

### Context

The user's request, verbatim: «Нужно добавить обязательное поле причины в шаблон требования в SRS.» Decisions taken with the user on 2026-10-18:

- Both templates get the field: the project's own SRS format (`documents/AGENTS.md`, section "SRS Format") and the template shipped to users (`framework/core/assets/SRS.template.md`, read by `init`).
- The field is named `**Rationale:**` (the ISO/IEC/IEEE 29148 term; already used twice in `documents/requirements.md`).
- "Mandatory" is enforced the same way as `**Acceptance:**`: the review FR Coverage Audit flags it, there is no check script. The audit flags only FR sections the diff adds or modifies. Existing FRs are backfilled when someone edits them — no bulk backfill now.

### Current State

- `documents/AGENTS.md` and `SRS.template.md` define the FR block as `Desc` / `Scenario` / `Acceptance` / `Status`.
- `framework/core/skills/init/SKILL.md` step 9 names those four fields when it scaffolds an SRS.
- `framework/core/assets/AGENTS.template.md` carries `Acceptance-as-gate` and a Requirements Lifecycle whose Review line lists what the audit verifies; this project's own `AGENTS.md` carries the same `Acceptance-as-gate` rule.
- `framework/atoms/review.md` step 4a "FR Coverage Audit" checks four things per FR in scope. No check covers the reason.
- No script validates the field set of an FR block (`check-fr-coverage.ts` is not part of `deno task check`).
- Of 130 FR headings in `documents/requirements.md`, 3 state a reason in a labelled field (`Rationale` ×2, `Why` ×1).

### Constraints

- Shipped skill and template changes go through Acceptance Test TDD: RED scenario first, run only the affected scenarios, the full sweep is handed to the user.
- The audit check binds only when the project's AGENTS.md declares the Rationale rule, so projects on an older template are not suddenly blocked.
- Other sessions edit acceptance scenarios in this checkout: commit by explicit paths.

## Definition of Done

- [x] FR-DOCS.RATIONALE: the project SRS format and the shipped SRS template carry a mandatory `**Rationale:**` field in the FR block, and `init` names it among the per-FR fields.
  - Test: `Benchmark: init-greenfield` (checklist item `fr_rationale_field`)
  - Evidence: `grep -c -F -- '- **Rationale:**' framework/core/assets/SRS.template.md documents/AGENTS.md` prints 1 for each file, and `grep -c -F '**Rationale:**' framework/core/skills/init/SKILL.md` prints at least 1
- [x] FR-DOCS.RATIONALE: the review FR Coverage Audit reports an FR section added or modified in the diff without a non-empty `**Rationale:**` as `[critical] no rationale`, and the verdict is not `Approve`.
  - Test: `Benchmark: review-missing-rationale-blocks`
  - Evidence: `deno task acceptance-tests -f review-missing-rationale-blocks` passes
- [x] FR-DOCS.RATIONALE: the shipped AGENTS template and this project's AGENTS.md declare the rule (Rationale-as-gate plus the Plan and Review lifecycle lines).
  - Test: `Benchmark: review-missing-rationale-blocks` (the sandbox AGENTS.md is rendered from the shipped template)
  - Evidence: `grep -c -F 'Rationale-as-gate' framework/core/assets/AGENTS.template.md AGENTS.md` prints 1 for each file
- [x] FR-DOCS.RATIONALE: the audit does not fire on FR sections the diff leaves untouched.
  - Test: `Benchmark: review-doc-drift-is-warning` (its committed SRS has no Rationale and the diff does not touch it; verdict stays `Approve`)
  - Evidence: `deno task acceptance-tests -f review-doc-drift-is-warning` passes
- [x] FR-DOCS.RATIONALE: the SRS clause and the SDS section describe the field and the gate; `deno task check` is green.
  - Test: `scripts/task-check.ts`
  - Evidence: `deno task check` ends with `0 failed`

## Solution

1. SRS: add `#### FR-DOCS.RATIONALE` under FR-DOCS with its own `**Rationale:**`. SDS §3 documentation-system section: one bullet "FR rationale (FR-DOCS.RATIONALE)".
2. RED: add checklist item `fr_rationale_field` to `init-greenfield` and give the persona one concrete first feature so the SRS has at least one FR entry. Write the scenario `review-missing-rationale-blocks`: a committed parent with `capitalize`, an uncommitted diff adding `trim`, its tests, a `[REF:fr:trim]` marker and a new SRS section FR-TRIM with Description, Acceptance and Status but no Rationale. Run both on HEAD; both must fail on the new item.
3. GREEN: add `- **Rationale:**` to both templates, name it in `init/SKILL.md` step 9, add `Rationale-as-gate` and the Plan/Review lifecycle wording to `AGENTS.template.md` and to the project `AGENTS.md`, add check (5) to `framework/atoms/review.md` step 4a. Regenerate composites, rerun both scenarios, then `review-doc-drift-is-warning` as the untouched-FR control.
4. CHECK: `deno task check`; hand the full sweep of `init` and `review` to the user.

## Results

- RED on HEAD `db27f24c`: `review-missing-rationale-blocks` failed on `missing_rationale_flagged` (the review graded the missing field as a `[nit]`) and `verdict_not_approve` (verdict `Approve`); `init-greenfield` failed on `fr_rationale_field` (FR-FUN-FACT written without the field).
- GREEN after the edits: `review-missing-rationale-blocks`, `init-greenfield` and the control `review-doc-drift-is-warning` passed, one run each.
- `deno task check`: exit 0, 0 failed.
- Not run: the full sweep of every `init` and `review` scenario, handed to the user.
