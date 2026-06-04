---
date: "2026-06-05"
status: in progress
implements:
  - FR-MAINT-SEVERITY
tags:
  - maintenance
  - skill
  - severity
  - acceptance-tdd
related_tasks: []
---

# Maintenance Skill: Severity Scoring for Findings

## Goal

Make the `maintenance` audit actionable: every finding must carry an explicit
severity (`Critical | High | Medium | Low`) calibrated per category, surfaced in
the numbered summary, and usable as a filter in the Resolution Phase. Today
findings are flat — the user cannot tell a silent error swallow from a TODO
without re-reading each line.

## Overview

### Context

`framework/core/skills/maintenance/SKILL.md` already declares an internal
`severity (critical/warning)` field on each finding (Scan Phase intro, line 65),
but the field never reaches the summary. The `- [N] <site>: <problem>. (Fix: …)`
shape carries no severity. `references/example-findings.md` (22 examples) and
all acceptance scenarios (`basic`, `doc-health`, `instruction-coherence`,
`tooling-relevance`, `trigger-*`, `no-spurious-invocation`) ignore severity.
Result: in a 25-finding sweep the user cannot quickly answer "what kills
production vs. what is cosmetic?"

User request (Russian): «доработать скил maintenance, чтобы он не просто
находил проблемы, но и оценивал их уровень».

Industry precedent: SAST tools (Semgrep, CodeQL), linters (ESLint
`error/warn/info`), and SRE incident grades all use 3–4 severity tiers with
category-specific rubrics. Four tiers (`Critical / High / Medium / Low`) is the
sweet spot between binary (loses signal) and 5+ tiers (calibration drift).

### Current State

- Source of truth: `framework/core/skills/maintenance/SKILL.md` (256 lines,
  hand-edited, NOT a composite — confirmed absent from
  `framework/composites.yaml`).
- Reference files: `references/example-findings.md`,
  `references/architectural-categories.md`, `references/verification-gate.md`.
- 8 existing acceptance scenarios under `acceptance-tests/`. None assert
  severity.
- No FR in SRS covers maintenance-skill output formatting. `FR-MAINT` is about
  `deno task check`. `FR-DOC-LINT` is about the Documentation Health category
  only.
- Finding line shape: `- [N] <site>: <problem>. (Fix: <fix>)`.
- Summary closes with category + total counts only.
- Resolution Phase accepts: numbers, category-name, `all`, `agent's choice`,
  `done`.

### Constraints

- Skill change with existing benchmark coverage → Acceptance Test TDD flow
  is mandatory (RED → GREEN → REFACTOR → CHECK), per AGENTS.md.
- New FR (`FR-MAINT-SEVERITY`) must be added to SRS with a runnable
  `**Acceptance:**` reference (acceptance scenario id).
- Severity labels MUST stay English (`Critical / High / Medium / Low`) even in
  non-English reports — same reasoning as the existing `Documentation Health`
  category-label rule: labels are downstream identifiers and must not collapse
  via translation.
- No backwards-compatibility shims for the current shape — change the format
  outright (per CLAUDE.md "no half-finished implementations").
- Token budget: `SKILL.md` stays under `SKILL_MAX_LINES = 700`. Rubric goes
  into a new reference file to avoid bloating the skill body.
- Anti-inflation rule must be enforced through (a) explicit "tie → lower" text
  in the rubric and (b) an acceptance assertion on Critical proportion of a
  standard fixture.
- The 16 audit categories and their definitions stay byte-identical except for
  added severity guidance. Do NOT renumber or rename categories.

## Definition of Done

- [x] FR-MAINT-SEVERITY: Every finding in the Resolution Phase summary carries
      a severity tag `[Critical] | [High] | [Medium] | [Low]` in its line.
  - Benchmark: `maintenance-surfaces-severity-tags`
  - Evidence:
    `deno task acceptance-tests -f maintenance-surfaces-severity-tags`
    passes with the new checklist item `severity_tag_present_on_every_finding`
    rated `pass`.
- [x] FR-MAINT-SEVERITY: Severity rubric file
      `framework/core/skills/maintenance/references/severity-rubric.md` exists,
      lists per-category mapping (Cats 1–16) of finding shape → severity, and
      states the anti-inflation tie-breaker rule literally as
      "When in doubt between two tiers, pick the lower one."
  - Benchmark: `n/a` (file-existence + grep)
  - Evidence:
    `test -f framework/core/skills/maintenance/references/severity-rubric.md
    && grep -q 'When in doubt between two tiers, pick the lower one'
    framework/core/skills/maintenance/references/severity-rubric.md`
- [x] FR-MAINT-SEVERITY: `SKILL.md` Scan Phase requires each finding to record
      severity per rubric; summary line shape is documented as
      `- [N] [Severity] <site>: <problem>. (Fix: <fix>)`; counters in the
      summary list per-severity totals as well as per-category totals.
  - Test: `framework/core/skills/maintenance/SKILL.md` carries the documented
    line shape literally and references `references/severity-rubric.md`.
  - Evidence:
    `grep -q '\[Severity\] <site>' framework/core/skills/maintenance/SKILL.md
    && grep -q 'severity-rubric.md' framework/core/skills/maintenance/SKILL.md`
- [x] FR-MAINT-SEVERITY: Resolution Phase accepts severity filters: at minimum
      the literal reply tokens `critical`, `high`, `medium`, `low`,
      and compound `critical+high`, in addition to existing modes
      (`all`, numbers, category-name, `agent's choice`, `done`).
  - Benchmark: `maintenance-severity-filter-critical-high`
  - Evidence:
    `deno task acceptance-tests
    -f maintenance-severity-filter-critical-high` passes — the persona replies
    `critical+high` and the agent enters the resolution loop on the subset of
    findings tagged Critical or High only.
- [x] FR-MAINT-SEVERITY: Anti-inflation calibration is verified on a fixture
      that includes 10+ findings spanning the rubric — Critical proportion
      MUST NOT exceed 35 % of total findings; fixture is seeded so the
      rubric-correct share lands near 15 % (headroom for judge variance).
  - Benchmark: `maintenance-severity-calibration-no-inflation`
  - Evidence:
    `deno task acceptance-tests
    -f maintenance-severity-calibration-no-inflation` passes — the checklist
    item `critical_share_within_thirty_five_percent` rates `pass`.
- [x] FR-MAINT-SEVERITY: New FR section appears in
      `documents/requirements.md` under `## 3. Functional Reqs` with anchor
      `[ANC:fr:maint-severity]`, populated Description / Scope /
      `**Acceptance verified by acceptance tests:**` /
      `**Status:**` fields, and `documents/index.md` carries the matching
      `## FR` row.
  - Test: `deno task check` runs `check-fr-coverage.ts`,
    `check-salp.ts`, and `check-srs-evidence.ts`.
  - Evidence:
    `deno task check` returns `0 failed` on the summary line
    AND
    `grep -q 'ANC:fr:maint-severity' documents/requirements.md`
    AND
    `grep -q 'REF:fr:maint-severity' documents/index.md`.
- [ ] FR-MAINT-SEVERITY: Pre-existing acceptance scenarios for the
      `maintenance` primitive (`maintenance-basic`,
      `maintenance-detects-doc-health-issues`,
      `maintenance-detects-instruction-coherence-issues`,
      `maintenance-detects-tooling-relevance-issues`) still pass after the
      SKILL.md edit — no regression to prior categories or interactive UX.
  - Benchmark: existing scenario ids above.
  - Evidence: `deno task acceptance-tests -f maintenance-` (developer-side
    full sweep per CHECK step) reports `0 failed` across the four scenarios.
    Defer to user per AGENTS.md "Who runs acceptance tests".
- [x] FR-MAINT-SEVERITY: Before the RED phase, stale cache entries for the
      affected scenarios are invalidated so previous summary-format verdicts
      do not mask regressions.
  - Test: `n/a` (filesystem state)
  - Evidence:
    `rm -rf acceptance-tests/cache/maintenance-basic
    acceptance-tests/cache/maintenance-detects-doc-health-issues
    acceptance-tests/cache/maintenance-detects-instruction-coherence-issues
    acceptance-tests/cache/maintenance-detects-tooling-relevance-issues
    acceptance-tests/cache/maintenance-surfaces-severity-tags
    acceptance-tests/cache/maintenance-severity-filter-critical-high
    acceptance-tests/cache/maintenance-severity-calibration-no-inflation`
    runs cleanly (any non-existent dir is fine — `rm -rf` is idempotent).
- [x] FR-MAINT-SEVERITY: Each new scenario's `fixture/deno.json` carries the
      `fmt` / `lint` / `test` excludes required by the
      `framework/CLAUDE.md` "Benchmark Fixture deno.json Contract"
      (`.claude/`, `documents/`, `acceptance-tests/`).
  - Test: `n/a` (grep)
  - Evidence:
    `for d in severity-tags severity-filter
    severity-calibration-no-inflation; do
      grep -q '"\\.claude/"'
      framework/core/skills/maintenance/acceptance-tests/$d/fixture/deno.json
    done` exits 0.

## Solution

### Files touched

- **EDIT** `framework/core/skills/maintenance/SKILL.md`
  - Scan Phase intro (around current line 65): require severity assignment per
    rubric, replace `(critical/warning)` with
    `(Critical | High | Medium | Low — per references/severity-rubric.md)`.
  - Step 17.5 "Verify Findings (mandatory gate)": add a third bullet — gate
    also validates severity assignment ("if you cannot point at the rubric
    anchor that justifies the tier, drop the finding to one tier lower or
    re-justify"). Findings the gate falsifies are emitted as
    `[verified false] <site>: <claim> — actually <observed>` WITHOUT a
    severity tag — they are no longer findings.
  - Step 18 "Present Summary": replace the `- [N] <file/symbol>: <problem>.
    (Fix: …)` shape with
    `- [N] [Severity] <file/symbol>: <problem>. (Fix: …)`.
    State the grammar EXPLICITLY: severity tag goes IMMEDIATELY after the `[N]`
    number, BEFORE the site path; severity tag NEVER appears in the
    plain-text category header (the header stays as-is — `Documentation
    Health`, `Code Hygiene`, etc.). `[verified false]` lines from Step 17.5
    are emitted WITHOUT a severity tag — they are dropped findings, not graded
    ones.
    Add sort order: within each category, sort Critical → High → Medium → Low,
    ties stable by number.
    Add closing counter shape:
    `Total: N findings — Critical: a, High: b, Medium: c, Low: d (per category:
    …)`.
  - Step 19 "Ask User How to Proceed": extend the accepted reply list with
    `critical`, `high`, `medium`, `low`, and compound replies using `+` as
    separator (e.g., `critical+high`, `high+medium`). Specify the grammar
    inline: case-insensitive token, plus-separated. Keep the
    rich-content-prompt exemption note unchanged.
  - Rules block: add a new rule "**Severity calibration**: every finding gets
    exactly one severity per `references/severity-rubric.md`; in doubt between
    two tiers, pick the lower one (anti-inflation)."
  - Verification block: add three checkboxes — severity on every finding,
    rubric file referenced, calibration tie-breaker honored.
- **CREATE** `framework/core/skills/maintenance/references/severity-rubric.md`
  - Header explaining purpose + the tie-breaker rule (literal phrase needed
    for the file-grep DoD evidence).
  - Per-category table (lists, not Markdown tables — AGENTS.md rule) mapping
    finding shape → tier, covering all 16 categories. Anchors per row so the
    Verify Findings gate can quote `severity-rubric.md#cat-14-silent-swallow`.
  - Cross-category meta-rules:
    1. Runtime fatality / silent data corruption / security exposure →
       Critical regardless of category.
    2. Stub-only coverage of a documented invariant → High (Cat 15).
    3. Single TODO without urgency marker → Low (Cat 4); cluster of 5+
       TODOs in one file with `XXX|HACK|FIXME` markers → Medium.
    4. Threshold-exceed-by ≤ 1.5× → Medium, > 2× → High (Cat 3).
  - Example calibration table mirroring `references/example-findings.md` so a
    maintainer can diff the two side-by-side.
- **EDIT** `framework/core/skills/maintenance/references/example-findings.md`
  - Re-render each of the 22 example lines in the new shape with severity tag
    and proper sort order. Add a closing per-severity counter to the example.
- **EDIT** `documents/requirements.md`
  - Insert new FR section `FR-MAINT-SEVERITY: Severity Scoring for
    Maintenance Findings` (with a SALP `ANC` token of id `fr:maint-severity`
    next to the heading) under `## 3. Functional Reqs`, placed after
    `FR-MAINT` so all FR-MAINT-* live together.
  - Body: Description (what + why), Scope (3 + new sentence on filter input),
    `**Acceptance verified by acceptance tests:**` listing all three new
    scenario ids, `**Status:** [ ]`.
- **EDIT** `documents/index.md`
  - Insert a new row inside `## FR`, alphabetically by FR id (between
    `REF:fr:maint` and the next FR-MAINT-* / FR-MAPPING entry):
    `- [REF:fr:maint-severity | FR-MAINT-SEVERITY] — Severity scoring for
    maintenance findings — [ ]`.
- **CREATE** acceptance scenarios — RED phase, all three scenarios MUST fail
  on current `SKILL.md` before any source edit:
  1. `framework/core/skills/maintenance/acceptance-tests/severity-tags/mod.ts`
     — id `maintenance-surfaces-severity-tags`. Fixture: a small project with
     one Critical-shape finding (silent catch in a TS file), one High-shape
     (file at wrong path), one Medium-shape (unused export), one Low-shape
     (single TODO). Checklist:
     - `severity_tag_present_on_every_finding` — every numbered line carries
       one of `[Critical] [High] [Medium] [Low]`.
     - `per_severity_counters_in_summary` — closing line lists totals per
       severity.
     - `findings_sorted_within_category` — Critical lines come before High
       within the same category header.
  2. `acceptance-tests/severity-filter/mod.ts` — id
     `maintenance-severity-filter-critical-high`. Persona replies
     `critical+high`. Checklist:
     - `enters_resolution_loop_on_subset` — agent enters per-finding loop only
       on findings tagged Critical or High.
     - `ignores_medium_and_low` — Medium / Low findings are NOT opened.
  3. `acceptance-tests/severity-calibration-no-inflation/mod.ts` — id
     `maintenance-severity-calibration-no-inflation`. Fixture seeded so the
     rubric-correct Critical share is near 15 % of 10–14 findings spanning
     all four tiers. Persona replies `done`. Checklist:
     - `critical_share_within_thirty_five_percent` — count of `[Critical]`
       lines divided by total finding count ≤ 0.35.
     - `at_least_one_each_tier_present` — every tier represented at least once
       (proves the agent is not collapsing tiers).
  Each fixture follows the existing `acceptance-tests/<scenario>/fixture/`
  pattern with a `deno.json` carrying the standard fmt/lint/test excludes per
  `framework/CLAUDE.md` "Benchmark Fixture deno.json Contract".

### TDD sequencing (Acceptance Test TDD)

1. **RED** (per new scenario, one at a time):
   - Write scenario `mod.ts` + fixture.
   - Run `deno task acceptance-tests -f <new-scenario-id>` — MUST fail
     (current SKILL.md does not emit severity).
2. **GREEN** (after all three RED runs are confirmed failing):
   - Apply `SKILL.md` edits (Scan Phase, Step 17.5, Step 18, Step 19, Rules,
     Verification).
   - Write `references/severity-rubric.md`.
   - Update `references/example-findings.md`.
   - Run each new scenario individually until each passes. Order:
     `severity-tags` → `severity-filter` → `severity-calibration-no-inflation`.
3. **REFACTOR**:
   - Trim duplicate guidance between SKILL.md and severity-rubric.md.
   - Verify `wc -l framework/core/skills/maintenance/SKILL.md` stays under
     `SKILL_MAX_LINES = 700` (read live value via
     `scripts/lib/skill-limits.ts`).
   - Re-run the three new scenarios + cached prior scenarios. No behavior
     drift expected.
4. **CHECK** (deferred to user per AGENTS.md):
   - `deno task acceptance-tests -f maintenance-` covers all eight existing +
     three new scenarios. Hand off with that command.
5. **SRS / index updates** alongside RED writes (this skill writes them now;
   the develop phase only edits SKILL.md + rubric + example).
6. **Documentation sync** — Documentation Map already covers the touched
   paths: `framework/<pack>/skills/<name>/SKILL.md` →
   `[REF:fr:howto | FR-HOWTO] / any FR-*<NAME>*`. Adding `FR-MAINT-SEVERITY`
   satisfies the mapping; no AGENTS.md edit needed.

### Verification commands

- Per-scenario RED proof:
  `deno task acceptance-tests -f maintenance-surfaces-severity-tags`
  (then `-filter-critical-high`, then `-calibration-no-inflation`) — each MUST
  fail before SKILL.md is touched.
- After GREEN, the same three commands MUST pass.
- Project-wide gate: `deno task check` returns `0 failed` summary — covers
  SRS evidence checker, SALP anchor linker, FR coverage check.
- `wc -l framework/core/skills/maintenance/SKILL.md` < 700.
- `grep -c '\[Critical\]\|\[High\]\|\[Medium\]\|\[Low\]'
  framework/core/skills/maintenance/references/example-findings.md` ≥ 22 (one
  tag per example line).

### Risks & mitigations

- **Severity inflation** ("everything is Critical"): mitigated by (a) explicit
  tie-breaker phrase, (b) calibration scenario asserting Critical ≤ 30 %,
  (c) rubric anchors quoted in Verify Findings gate.
- **Non-English reports collapse labels**: mitigated by mirroring the
  `Documentation Health` rule — labels stay literal English; documented in
  the same paragraph of Step 18 that already enforces the English label
  contract.
- **Acceptance scenario flakiness on Critical share boundary**: mitigated by
  seeding fixture so the rubric-correct Critical share is well below 30 %
  (target ~ 15 %), leaving headroom.
- **SKILL.md size creep**: rubric lives in `references/severity-rubric.md`,
  not in the skill body; line count delta on SKILL.md target ≤ 35 lines.

## Follow-ups

- README §Packs / §Skills mentions of `maintenance`: consider a one-line
  callout that the audit now grades findings by severity. Deferred — not in
  the FR contract, cosmetic doc polish, do after GREEN ships.
