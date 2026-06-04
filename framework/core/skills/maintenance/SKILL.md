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
This command is the "Garbage Collector" and "Building Inspector" for the project. It ensures the codebase remains maintainable, documented, and aligned with architectural standards.

Categories checked:
1.  **Structure**: Files in wrong places.
2.  **Consistency**: Docs vs. Code truth.
3.  **Hygiene**: Dead code, unused imports, weak tests.
4.  **Complexity**: "God objects" and massive functions.
5.  **Debt**: Accumulated TODOs.
6.  **Language**: Inconsistent terminology.
7.  **Doc Coverage**: Missing explanations in code.
8.  **Instruction Coherence**: Contradictions and ambiguities across project instructions.
9.  **Tooling Relevance**: Skills, agents, rules, and hooks that don't match the project.
10. **Documentation Health**: Broken GFM cross-links, stale `[x]` FRs, orphan FRs, SRS↔SDS contradictions, resolved `index` drift.
11. **Architectural Integrity**: Dependency direction, import cycles, layer leakage, reverse dependencies.
12. **Conceptual Duplication**: Parallel implementations of one decision; untyped path beside a typed sibling; diverging schema clones.
13. **API Contract Review**: Capability-vs-implementation mismatch; sentinel-vs-missing conflation; defaults-toward-bug; dead enum values; type-level vs runtime invariant divergence.
14. **Cross-Implementation Symmetry**: Capability / error-class / reserved-set / warning-latch parity across N implementations of one interface.
15. **Defensive-Programming Smell**: Silent swallows of consumer-callback errors; wholesale failure swallowing; fallback-on-zero; error-as-decision coupling.
16. **Invariant ↔ Test Pairing**: Documented architectural invariants without matching tests; stub-only contract tests where the real-binary path is gated/absent.
17. **Public-Surface Quality**: Synonym duplication; free-function-and-method duplicates; barrel re-exports of internal-only symbols; reserved lists mixing positionals and flags.
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
8.  **Findings are first-hand or verified**: every finding MUST be ground-truthed against the source before the summary. Subagent-supplied findings (`Explore`, `Task`, `Agent`) are leads, not conclusions. See Step 12 (Verify Findings + Severity gate) and [references/verification-gate.md](references/verification-gate.md).
9.  **Severity calibration**: every finding gets one tier per [references/severity-rubric.md](references/severity-rubric.md). In doubt between two tiers, pick the lower (anti-inflation). Critical share ≤ 35 % of total findings.
</rules>

## Question Format (FR-UNIVERSAL.QA-FORMAT)

For the per-finding **Apply / Skip / Edit** verdict in Step 15 (Interactive Resolution Loop):

- The question MUST be a numbered list item (`1.`, `2.`, …) — not a heading, bold-only line, or paragraph.
- The post-summary "how to proceed" prompt in Step 14 is exempt: it follows a long rich-content findings list and falls under the "rich-content alternatives" exemption in `FR-UNIVERSAL.QA-FORMAT`.

## Instructions

<step_by_step>

### SCAN PHASE

Collect all findings into an internal list. Each finding has: category, file/symbol, problem description, proposed fix, severity (`Critical | High | Medium | Low` — pick per [references/severity-rubric.md](references/severity-rubric.md); when in doubt between two tiers, pick the lower one).

1. **Initialize & Plan**
   - Use a task management tool (e.g., `todo_write`, `todowrite`) to create a plan covering all scan categories below.
   - Identify project's primary language and source directories.

2. **Category 1: Structural Integrity**
   - **File placement**: Check that all source files reside in expected directories per project conventions (e.g., `src/`, `lib/`, `scripts/`). Flag files at wrong levels.
   - **Dead directories**: Identify empty or orphaned directories with no purpose.
   - **Naming conventions**: Verify file and directory names follow project conventions (case, separators).
   - **Config files**: Ensure project config files (`deno.json`, `package.json`, etc.) are at expected locations.

3. **Category 2: Code Hygiene & Dependencies**
   - **Dead Code**: Identify exported/public symbols in source directories that
     are never imported/called elsewhere.
   - **Unused Imports**: Scan source files for imports/includes that are not
     used in the file body.
   - **Test Quality**: Read test files (e.g., `*.test.*`, `*_test.*`,
     `test_*.py`). Flag tests that:
     - Have no assertions.
     - Use trivial assertions (e.g., `expect(true).toBe(true)`, `assert True`).
     - Are commented out.
   - **Invariant ↔ test pairing (lightweight)**: Resolve `SDS` from AGENTS.md, then extract SHOULD/MUST clauses from `AGENTS.md`, `CLAUDE.md`, and the resolved `SDS`. Grep test descriptors (`it`, `Deno.test`, `def test_`, `func Test`) for matching coverage; flag invariants with zero matching test names. (Deeper analysis — stub-only tests, hand-curated lists without cross-reference tests — lives in Category 15.)

4. **Category 3: Complexity & Hotspots**
   - **Project-context normalization**: Read project vision in `AGENTS.md` / `CLAUDE.md` and pick the LOC bucket BEFORE flagging files. Buckets: **thin wrapper / facade** (declared "wrapper", "adapter", "bindings", "SDK") → 300 lines; **service / framework / tool** (default) → 500 lines; **monolithic app / migration target** → 800 lines. State the bucket and quote the source phrase in the finding.
   - **Files**: Flag any source file exceeding the bucket's threshold.
   - **Functions**: Scan for functions/methods exceeding **50 lines**.
   - **God Objects**: Classes/modules with mixed concerns (logic + UI + DB in one file).
   - **Mixed-concerns detection (beyond LOC)**: Flag a single file holding 2+ unrelated top-level concerns (e.g., parsing + lifecycle + formatting + protocol detection). Signals: cross-domain export verbs, heterogeneous imports, section comments naming distinct phases. Trips even when file is under the LOC threshold.

5. **Category 4: Technical Debt Aggregation**
   - **Scan**: Search for `TODO`, `FIXME`, `HACK`, `XXX` tags in the codebase.
   - **Group**: Organize by file/module.
   - **Analysis**: Flag any that look critical or like "temporary" fixes that
     became permanent.

6. **Category 5: Consistency (Docs vs. Code)**
   - **Terminology**: Extract key terms from `README.md` and `documents/`. Check
     if code uses different synonyms (e.g., "User" in docs vs "Customer" in
     code).
   - **Drift**: Pick 3 major claims from `documents/*.md` (e.g., "The system
     handles X asynchronously"). Verify if the code actually does that.

7. **Category 6: Code Documentation Coverage**
   - **Rule**: Every file, class, method, and exported function MUST have
     documentation (JSDoc, Docstring, Rustdoc, etc.).
   - **Check**:
     - **Responsibility**: Does the comment explain _what_ it does?
     - **Nuances**: For complex logic (cyclomatic complexity > 5 or > 20 lines),
       are there examples or edge case warnings?
   - **Scan**: primary source directories.
   - **Report**: List undocumented symbols.

8. **Category 7: Instruction Coherence**
   - **Scope**: Read all instruction files that guide agent/developer behavior:
     `CLAUDE.md` (root and nested), `AGENTS.md` files, resolved `SRS`,
     resolved `SDS`, and any rules/conventions files.
   - **Contradictions**: Identify mutually exclusive rules across or within files
     (e.g., "use tabs" in one section vs. "use 2 spaces" in another; "never mock"
     vs. "mock freely").
   - **Ambiguities**: Flag vague or open-ended instructions that could be
     interpreted in conflicting ways by different agents or sessions.
   - **Redundancy**: Note duplicated rules across files that may diverge over time.
   - **Scope conflicts**: Check that nested instruction files (`subdir/CLAUDE.md`)
     don't silently override root-level rules without explicit justification.
   - **Coherence verdict**: For each issue, state which files/sections conflict and
     propose a resolution (keep one, merge, or clarify).

9. **Category 8: Tooling Relevance**
   - **Scope**: Inventory all installed skills (`.claude/skills/`, `.cursor/skills/`),
     agents/subagents (`.claude/agents/`, `.cursor/agents/`), hooks (`.claude/hooks/`,
     `.cursor/hooks/`, `.husky/`), and rules files.
   - **Stack match**: Compare each item against the project's declared tooling stack
     (from `AGENTS.md` or `CLAUDE.md`) and actual source files. Flag items designed
     for a different tech stack (e.g., Django skill in a TypeScript project, Python
     linting hook in a Deno project).
   - **Domain match**: Flag agents/skills targeting a domain absent from the project
     (e.g., Kubernetes deployer agent in a project with no K8s manifests or Dockerfiles).
   - **Stale tooling**: Identify skills/agents/hooks that reference tools, commands,
     or frameworks not present in the project (e.g., hook calling `flake8` when no
     Python files exist).
   - **Verdict**: For each mismatch, state what the item expects vs. what the project
     actually uses, and propose a fix (remove, replace with stack-appropriate
     alternative, or add justification).

10. **Category 9: Documentation Health (FR-DOC-LINT)**
   Audit the project's documentation system for broken or stale cross-references. This category is **DISTINCT** from Category 6 "Documentation Coverage" — coverage is about JSDoc / comments per code symbol; health is about cross-link integrity, FR-status freshness, and SRS↔SDS alignment.
   In the Resolution Phase summary (step 10), findings from THIS category MUST appear under their OWN dedicated header. The header text MUST literally contain the English token `Documentation Health` (case-insensitive, may be followed by a translation in parentheses if the rest of the report is in another language — e.g. `Documentation Health (Здоровье документации)`). Do NOT translate the header outright; do NOT fold these findings into `Documentation Coverage`, `Consistency`, or any other existing category — the dedicated header is what makes the audit's doc-system focus visible to FR-DOC-LINT consumers.
   - **Broken GFM cross-links**: scan project markdown (`documents/*.md`, `README.md`, `AGENTS.md`) and source-code comments for links of the form `[text](path.md#anchor)`. Flag any link where (a) the target file does not exist or (b) the anchor does not match a heading's GFM auto-slug in the target file.
   - **Stale `[x]` FRs**: read the resolved `SRS`. For each `### FR-<ID>` block whose `**Status:**` is `[x]`, verify the `**Acceptance:**` reference resolves — test path / benchmark id / command exists. Flag mismatches.
   - **Orphan FRs**: for each `[x]` FR in SRS, search source code for any GFM-link reference of the form `[FR-<ID>](.../requirements.md#…)`. Flag FRs with zero references in code.
   - **SRS ↔ SDS contradictions**: skim the resolved `SRS` and `SDS` for paired statements about the same component or behavior with mutually exclusive constraints (e.g., SRS says required, SDS says removed). Flag concrete pairs.
   - **Resolved `index` drift**: if the resolved `index` exists, compare its FR rows against the resolved `SRS` — flag rows whose status, summary, or anchor disagree with the SRS, and SRS FRs missing a row.
   - **Verdict**: each finding must reference the exact file (and line if applicable) and propose a concrete fix.

11. **Categories 10–16: Architectural Review** — Architectural Integrity (cycles, layer leakage), Conceptual Duplication, API Contract Review, Cross-Implementation Symmetry, Defensive-Programming Smell, Invariant ↔ Test Pairing, Public-Surface Quality. Full sub-check details, patterns, thresholds, and verdict shape live in [references/architectural-categories.md](references/architectural-categories.md). READ THAT FILE before running these checks. Each finding follows the same line shape as Cats 1–9.

12. **Verify Findings + Severity (mandatory gate)**
    - Before presenting the summary, walk the collected findings list and confirm each ONE-BY-ONE against the source — whether the scan was inline or delegated.
    - For each finding, perform ONE targeted verification matched to its shape (numeric metric / symbol behavior / undocumented claim / cross-implementation claim / architectural claim). Full per-shape checklist + rationale: [references/verification-gate.md](references/verification-gate.md).
    - Drop findings the verification falsifies. Refine findings the verification corrects. Note falsified ones inline as `[verified false] <site>: <original claim> — actually <observed>` so the user can see the gate ran and what it caught. `[verified false]` lines do NOT receive a severity tag — they are dropped findings, not graded ones.
    - **Severity check**: for every surviving finding, name the rubric anchor in [references/severity-rubric.md](references/severity-rubric.md) that justifies the chosen tier (e.g. `severity-rubric.md#cat-14-silent-swallow`). If you cannot point at the anchor, drop one tier (anti-inflation tie-breaker) or refine the finding so it matches a row.

### RESOLUTION PHASE

13. **Present Summary**
    - Output the full findings list, grouped by category. Plain-text category labels (not `#` headings). Skip empty categories.
    - **Category labels** — use the 16 English names from the Context block above (`Structural Integrity`, `Code Hygiene`, `Complexity & Hotspots`, `Technical Debt`, `Consistency (Docs vs Code)`, `Documentation Coverage`, `Instruction Coherence`, `Tooling Relevance`, `Documentation Health`, then Cats 10–16 per their Context names). In non-English reports every label MUST be a unique tag for that category — do not collapse two categories to one word and do not omit Documentation Health (FR-DOC-LINT: required dedicated header whenever step 10 produced any finding; DOC-to-DOC integrity, distinct from #5 and #6). When in doubt, keep the English label.
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

14. **Ask User How to Proceed**
    - Ask which findings to resolve (this prompt is exempt from FR-UNIVERSAL.QA-FORMAT — see scope). Accepted reply modes:
      - **numbers** (e.g. `1, 3, 4`) — only those findings
      - **category name** (e.g. `Hygiene`) — that category
      - **severity name** (`critical`, `high`, `medium`, `low` — case-insensitive) — that tier
      - **compound severity** (plus-separated, e.g. `critical+high`) — union of listed tiers
      - **`all`** — every finding one by one
      - **`agent's choice`** — pick the most impactful subset yourself with a one-line justification, proceed without re-asking
      - **`done`** — stop, no fixes

15. **Interactive Resolution Loop**
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
