---
name: maintenance
description: Use when the user asks for a project health audit, maintenance sweep, or multi-category lead-engineer scan followed by interactive issue-by-issue resolution with user approval. Do NOT trigger on routine lint/test runs, single-file cleanups, or standard "check project" requests.
---

# Task: Project Maintenance & Health Audit

## Overview

Execute a rigorous multi-category maintenance sweep, then walk the user through each finding interactively. The process has two distinct phases:

- **Scan Phase**: Run all checks silently, collecting findings into an internal list. No fixes during this phase.
- **Resolution Phase**: Present the summary, then iterate through each finding — show details, propose a fix, ask the user for a decision, apply if approved.

## Context

<context>
The "Garbage Collector" / "Building Inspector": keeps the codebase maintainable, documented, and architecturally sound.

Categories checked (full sub-check detail in [references/scan-buckets.md](references/scan-buckets.md) — Cats 1–9 — and [references/architectural-categories.md](references/architectural-categories.md) — Cats 10–16):
1.  **Structure**: Files in wrong places.
2.  **Consistency**: Docs vs. Code truth.
3.  **Hygiene**: Dead code, unused imports, weak tests.
4.  **Complexity**: God objects and massive functions.
5.  **Debt**: Accumulated TODOs.
6.  **Language**: Inconsistent terminology.
7.  **Doc Coverage**: Missing explanations in code.
8.  **Instruction Coherence**: Contradictions across project instructions.
9.  **Tooling Relevance**: Skills/agents/rules/hooks that don't match the project.
10. **Documentation Health**: Broken cross-links, stale `[x]` FRs, SRS↔SDS / `index` drift.
11. **Architectural Integrity**: Import cycles, layer leakage, reverse dependencies.
12. **Conceptual Duplication**: Parallel impls of one decision; untyped beside typed; schema clones.
13. **API Contract Review**: Capability-vs-impl, sentinel-vs-missing, dead enums, type-vs-runtime divergence.
14. **Cross-Implementation Symmetry**: Capability / error / reserved-set / warning-latch parity across impls.
15. **Defensive-Programming Smell**: Silent swallows, fallback-on-zero, error-as-decision coupling.
16. **Invariant ↔ Test Pairing**: Documented invariants without tests; stub-only contract tests.
17. **Public-Surface Quality**: Synonym/method dupes; internal-only barrel re-exports; mixed reserved lists.
</context>

## Rules & Constraints

<rules>
1.  **Precision**: Use specific thresholds (e.g., File > 500 lines).
2.  **Constructive**: Every issue must have a proposed fix.
3.  **Holistic**: Scan `documents/`, `.cursor/`, and source code directories.
4.  **Mandatory**: Use a task management tool (e.g., `todo_write`, `todowrite`) to track progress through the phases.
5.  **Language Agnostic**: Adapt checks (imports, syntax, test patterns) to the primary language of the project (TS, JS, Py, Go, etc.).
6.  **No premature fixes**: Do NOT apply any changes during the Scan Phase. Only collect findings.
7.  **User decides**: Every fix requires explicit user approval. Never apply fixes silently.
8.  **Findings are first-hand or verified**: every finding MUST be ground-truthed against the source before the summary. Subagent-supplied findings (`Explore`, `Task`, `Agent`, or a `maintenance-scan-worker` bucket) are leads, not conclusions, and carry no severity until the parent assigns it. See Step 3 (Verify Findings + Severity gate) and [references/verification-gate.md](references/verification-gate.md).
9.  **Severity calibration**: every finding gets one tier per [references/severity-rubric.md](references/severity-rubric.md). In doubt between two tiers, pick the lower (anti-inflation). Critical share ≤ 35 % of total findings.
</rules>

## Question Format (FR-UNIVERSAL.QA-FORMAT)

For the per-finding **Apply / Skip / Edit** verdict in Step 6 (Interactive Resolution Loop):

- The question MUST be a numbered list item (`1.`, `2.`, …) — not a heading, bold-only line, or paragraph.
- The post-summary "how to proceed" prompt in Step 5 is exempt: it follows a long rich-content findings list and falls under the "rich-content alternatives" exemption in `FR-UNIVERSAL.QA-FORMAT`.

## Instructions

<step_by_step>

### SCAN PHASE

Collect findings into an internal list. Each: category, site, problem, proposed fix, severity (`Critical | High | Medium | Low` per [references/severity-rubric.md](references/severity-rubric.md); ties → lower).

1. **Initialize & Plan**
   - Use a task management tool (e.g., `todo_write`, `todowrite`) to create a plan covering all scan categories below.
   - Identify project's primary language and source directories.
   - **Optional read-only fan-out (FR-MAINT-SCAN)**: you MAY scan the 16 categories via 5 parallel read-only `maintenance-scan-worker` subagents (one per bucket) — see [references/scan-buckets.md](references/scan-buckets.md). Inline fallback if a worker is unavailable/fails (no lead lost). Workers return raw leads, no severity; the Verify gate (Step 3), severity calibration, and Resolution (Steps 4–6) stay parent-only over the union.

2. **Run the 16 Category Checks** (partitioned into 5 thematic buckets W1–W5)
   - The COMPLETE per-category sub-check detail lives in [references/scan-buckets.md](references/scan-buckets.md) — Cats 1–9 inline there; Cats 10–16 in [references/architectural-categories.md](references/architectural-categories.md), referenced from W2/W3/W5. **READ scan-buckets.md before scanning** — SKILL.md carries only the index below, not the executable detail.
   - **Category index** (Cat → bucket):
     - **W1** — 1 Structural Integrity · 2 Code Hygiene · 3 Complexity & Hotspots · 4 Technical Debt
     - **W2** — 10 Architectural Integrity · 11 Conceptual Duplication · 16 Public-Surface Quality
     - **W3** — 12 API Contract Review · 13 Cross-Implementation Symmetry · 14 Defensive-Programming Smell
     - **W4** — 5 Consistency (Docs vs Code) · 7 Instruction Coherence · 9 Documentation Health
     - **W5** — 6 Documentation Coverage · 8 Tooling Relevance · 15 Invariant ↔ Test Pairing
   - **Delegate (optional)**: for each bucket you MAY spawn one read-only `maintenance-scan-worker`, passing that bucket's block from scan-buckets.md as `{categories}` plus — for W2/W3 and W5/Cat 15 — the matching §§ of architectural-categories.md as `{reference_excerpts}` (the worker cannot resolve skill-relative paths). Workers return raw leads, no severity.
   - **Inline fallback**: if subagents are unavailable, or a worker fails / times out, scan that bucket yourself by reading the SAME bucket block in scan-buckets.md (no lead lost).
   - Collect every lead into the internal findings list. Consolidate the union before the gate; do NOT assign severity yet — that happens once, parent-side, in Step 3.

3. **Verify Findings + Severity (mandatory gate)**
    - Before presenting the summary, walk the collected findings list and confirm each ONE-BY-ONE against the source — whether the scan was inline or delegated.
    - For each finding, perform ONE targeted verification matched to its shape (numeric metric / symbol behavior / undocumented claim / cross-implementation claim / architectural claim). Full per-shape checklist + rationale: [references/verification-gate.md](references/verification-gate.md).
    - Drop findings the verification falsifies. Refine findings the verification corrects. Note falsified ones inline as `[verified false] <site>: <original claim> — actually <observed>` so the user can see the gate ran and what it caught. `[verified false]` lines do NOT receive a severity tag — they are dropped findings, not graded ones.
    - **Severity check**: for every surviving finding, name the rubric anchor in [references/severity-rubric.md](references/severity-rubric.md) that justifies the chosen tier (e.g. `severity-rubric.md#cat-14-silent-swallow`). If you cannot point at the anchor, drop one tier (anti-inflation tie-breaker) or refine the finding so it matches a row.

### RESOLUTION PHASE

4. **Present Summary**
    - Output the full findings list, grouped by category. Plain-text category labels (not `#` headings). Skip empty categories.
    - **Category labels** — use the 16 English names from the Context block above (`Structural Integrity`, `Code Hygiene`, `Complexity & Hotspots`, `Technical Debt`, `Consistency (Docs vs Code)`, `Documentation Coverage`, `Instruction Coherence`, `Tooling Relevance`, `Documentation Health`, then Cats 10–16 per their Context names). In non-English reports every label MUST be a unique tag for that category — do not collapse two categories to one word and do not omit Documentation Health (FR-DOC-LINT: required dedicated header whenever the Documentation Health check (Cat 9) produced any finding; DOC-to-DOC integrity, distinct from #5 and #6). When in doubt, keep the English label.
    - Each issue line follows the shape: `- [N] [Severity] <file/symbol>: <problem>. (Fix: <proposed fix>)`. **Grammar**: severity is one of the four literal English strings `[Critical]`, `[High]`, `[Medium]`, `[Low]` (stays English regardless of report language), placed IMMEDIATELY after the bracketed number and BEFORE the site path; never in the category header. `[verified false]` drop lines from the gate are emitted WITHOUT a severity tag.
    - **Sort within each category**: Critical → High → Medium → Low, ties stable by issue number. Numbering runs sequentially across all categories.
    - Closing line carries BOTH severity totals and category totals: `Total: N findings — Critical: a, High: b, Medium: c, Low: d (per category: <Cat>: x, <Cat>: y, …)`.
    - Brief example (covers Categories 1, 2, 9):
      ```
      Structural Integrity
      - [1] [Medium] src/oldfile.ts: in root, should be in src/utils/. (Fix: move)

      Code Hygiene
      - [2] [Medium] utils.ts: unused export `myFunc`. (Fix: delete)

      Documentation Health
      - [3] [High] FR-AUTH marked [x] in SRS, acceptance test path does not exist. (Fix: create the test file or revert to [ ])

      Total: 3 findings — Critical: 0, High: 1, Medium: 2, Low: 0 (per category: Structural Integrity: 1, Code Hygiene: 1, Documentation Health: 1).
      ```
    - One representative finding per category (all 16), in the same shape, lives in [references/example-findings.md](references/example-findings.md). The full per-category rubric for choosing the tier lives in [references/severity-rubric.md](references/severity-rubric.md).

5. **Ask User How to Proceed**
    - Ask which findings to resolve (this prompt is exempt from FR-UNIVERSAL.QA-FORMAT — see scope). Accepted reply modes:
      - **numbers** (e.g. `1, 3, 4`) — only those findings
      - **category name** (e.g. `Hygiene`) — that category
      - **severity name** (`critical`, `high`, `medium`, `low` — case-insensitive) — that tier
      - **compound severity** (plus-separated, e.g. `critical+high`) — union of listed tiers
      - **`all`** — every finding one by one
      - **`agent's choice`** — pick the most impactful subset yourself with a one-line justification, proceed without re-asking
      - **`done`** — stop, no fixes

6. **Interactive Resolution Loop**
    - For each selected finding (in order):
      1. Show file, problem, proposed fix.
      2. Ask (numbered question per FR-UNIVERSAL.QA-FORMAT): **Apply** | **Skip** | **Edit** (user supplies alternative fix).
      3. After applying, briefly confirm.
    - After all selected findings, show counts: N applied, M skipped, K edited.

</step_by_step>

## Verification

<verification>
[ ] Checked structural integrity (file placement, naming, configs).
[ ] Scanned for dead code and unused imports.
[ ] Checked file/function length limits (500/50 lines).
[ ] Aggregated all TODO/FIXME tags.
[ ] Verified documentation terminology vs code usage.
[ ] Checked for missing code documentation (File/Class/Method).
[ ] Checked instruction coherence across CLAUDE.md, AGENTS.md, and docs (contradictions, ambiguities, redundancy).
[ ] Checked tooling relevance (skills, agents, hooks vs. project stack and domain).
[ ] Checked Documentation Health (FR-DOC-LINT) — findings grouped under the dedicated `Documentation Health` header.
[ ] Checked Cats 10-16 (architectural review): integrity, conceptual duplication, API contract, cross-impl symmetry, defensive smell, invariant↔test, public surface.
[ ] Verified Findings gate ran: each finding was ground-truthed against the source (subagent-supplied findings re-read by the executor) before the summary; falsified findings dropped with a `[verified false]` line.
[ ] Every surviving finding carries one of `[Critical] | [High] | [Medium] | [Low]` per `references/severity-rubric.md`; the anti-inflation tie-breaker was honored (Critical share ≤ 35 %).
[ ] Closing total line reports per-severity counters in addition to per-category counters.
[ ] Presented numbered summary of all findings, grouped by category, sorted within each category Critical → High → Medium → Low.
[ ] Asked the user how to proceed with resolution, accepting numbers, category, severity name, compound severity, `all`, `agent's choice`, or `done`.
[ ] Resolved selected findings interactively (apply/skip/edit per finding).
[ ] Showed final resolution summary (applied/skipped/edited counts).
</verification>
