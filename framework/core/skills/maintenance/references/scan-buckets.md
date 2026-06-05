# Scan buckets — parallel read-only delegation (FR-MAINT-SCAN)

Reference for the Scan Phase in [SKILL.md](../SKILL.md). The 16 audit categories
are partitioned into **5 thematic buckets** by data-source + technique affinity.

**This file is the single source of the per-category check detail.** Each bucket
block below is the COMPLETE spec for its categories — consumed both by a
delegated read-only `maintenance-scan-worker` (the parent passes the block as
`{categories}`) and by the parent's own inline fallback. SKILL.md carries only
the category index + orchestration; the executable detail lives HERE (and, for
the architectural categories, in
[architectural-categories.md](./architectural-categories.md)).

How the parent uses this file:

- Delegation is **optional**. For each bucket the parent MAY spawn one
  `maintenance-scan-worker` (via `Task` / `Agent` / `Explore` / a background
  task), passing that bucket's block — plus, for W2/W3 and W5/Cat 15, the matching
  §§ of `architectural-categories.md` inline (the worker cannot resolve
  skill-relative paths itself).
- **Inline fallback**: if subagents are unavailable, or a worker fails / times
  out, the parent scans that bucket inline by reading the SAME bucket block here.
- Workers return **raw leads, no severity**. The parent consolidates the union,
  then runs the Verify gate ([verification-gate.md](./verification-gate.md)) and
  severity calibration ([severity-rubric.md](./severity-rubric.md)) **once, over
  the union** — never per worker. Workers never read those two files.

Bucket → category coverage is exhaustive and disjoint: every category 1–16
appears in exactly one bucket. Each finding line shape:
`<category> | <site (file:line or symbol)> | <problem> | (Fix: <proposed fix>)`.

## W1 — Mechanical hygiene & structure (Cats 1, 2, 3, 4)

Shallow lexical pass over the source tree; mechanical greps + metrics.

### Cat 1 — Structural Integrity

- **File placement**: Check that all source files reside in expected directories per project conventions (e.g., `src/`, `lib/`, `scripts/`). Flag files at wrong levels.
- **Dead directories**: Identify empty or orphaned directories with no purpose.
- **Naming conventions**: Verify file and directory names follow project conventions (case, separators).
- **Config files**: Ensure project config files (`deno.json`, `package.json`, etc.) are at expected locations.

### Cat 2 — Code Hygiene & Dependencies

- **Dead Code**: Identify exported/public symbols in source directories that are never imported/called elsewhere.
- **Unused Imports**: Scan source files for imports/includes that are not used in the file body.
- **Test Quality**: Read test files (e.g., `*.test.*`, `*_test.*`, `test_*.py`). Flag tests that: have no assertions; use trivial assertions (e.g., `expect(true).toBe(true)`, `assert True`); are commented out.
- (Invariant ↔ test pairing is NOT here — it lives in W5 / Cat 15.)

### Cat 3 — Complexity & Hotspots

- **Project-context normalization**: Read project vision in `AGENTS.md` / `CLAUDE.md` and pick the LOC bucket BEFORE flagging files. Buckets: **thin wrapper / facade** (declared "wrapper", "adapter", "bindings", "SDK") → 300 lines; **service / framework / tool** (default) → 500 lines; **monolithic app / migration target** → 800 lines. State the bucket and quote the source phrase in the finding.
- **Files**: Flag any source file exceeding the bucket's threshold.
- **Functions**: Scan for functions/methods exceeding **50 lines**.
- **God Objects**: Classes/modules with mixed concerns (logic + UI + DB in one file).
- **Mixed-concerns detection (beyond LOC)**: Flag a single file holding 2+ unrelated top-level concerns (e.g., parsing + lifecycle + formatting + protocol detection). Signals: cross-domain export verbs, heterogeneous imports, section comments naming distinct phases. Trips even when file is under the LOC threshold.

### Cat 4 — Technical Debt Aggregation

- **Scan**: Search for `TODO`, `FIXME`, `HACK`, `XXX` tags in the codebase.
- **Group**: Organize by file/module.
- **Analysis**: Flag any that look critical or like "temporary" fixes that became permanent.

## W2 — Structure & dependency graph (Cats 10, 11, 16)

Import/export graph and module boundaries; structural multi-file reading. The
detail lives in [architectural-categories.md](./architectural-categories.md)
§§ Category 10, 11, 16 — the parent inlines those §§ as `{reference_excerpts}`
when spawning this worker (or reads them directly on inline fallback).

- **Cat 10 Architectural Integrity** — cyclic imports through barrels, layer leakage, reverse dependencies.
- **Cat 11 Conceptual Duplication** — parallel implementations of one decision, untyped path beside a typed sibling, diverging schema clones.
- **Cat 16 Public-Surface Quality** — synonym duplication, free-function-and-method duplicates, barrel re-exports of internal-only symbols, reserved lists mixing positionals and flags.

## W3 — Type & behaviour contracts (Cats 12, 13, 14)

Read implementation bodies + type declarations; reason about contracts. Detail in
[architectural-categories.md](./architectural-categories.md) §§ Category 12, 13, 14
— inlined as `{reference_excerpts}` when spawning this worker.

- **Cat 12 API Contract Review** — capability-vs-implementation mismatch, sentinel-vs-missing conflation, default-toward-bug, dead enum values, type-level vs runtime invariant divergence.
- **Cat 13 Cross-Implementation Symmetry** — capability / error-class / reserved-set / warning-latch parity across N implementations of one interface.
- **Cat 14 Defensive-Programming Smell** — silent consumer-callback swallows, wholesale failure swallowing, fallback-on-zero (`||` where `??` is meant), error-as-decision coupling.

## W4 — Docs & instruction coherence (Cats 5, 7, 9)

Truth and consistency of prose; read docs + instruction files, cross-compare.

### Cat 5 — Consistency (Docs vs. Code)

- **Terminology**: Extract key terms from `README.md` and `documents/`. Check if code uses different synonyms (e.g., "User" in docs vs "Customer" in code).
- **Drift**: Pick 3 major claims from `documents/*.md` (e.g., "The system handles X asynchronously"). Verify if the code actually does that.

### Cat 7 — Instruction Coherence

- **Scope**: Read all instruction files that guide agent/developer behavior: `CLAUDE.md` (root and nested), `AGENTS.md` files, resolved `SRS`, resolved `SDS`, and any rules/conventions files.
- **Contradictions**: Identify mutually exclusive rules across or within files (e.g., "use tabs" vs. "use 2 spaces"; "never mock" vs. "mock freely").
- **Ambiguities**: Flag vague or open-ended instructions that could be interpreted in conflicting ways by different agents or sessions.
- **Redundancy**: Note duplicated rules across files that may diverge over time.
- **Scope conflicts**: Check that nested instruction files (`subdir/CLAUDE.md`) don't silently override root-level rules without explicit justification.
- **Coherence verdict**: For each issue, state which files/sections conflict and propose a resolution (keep one, merge, or clarify).

### Cat 9 — Documentation Health (FR-DOC-LINT)

Audit the project's documentation system for broken or stale cross-references.
DISTINCT from Cat 6 Documentation Coverage (JSDoc per symbol) — this is cross-link
integrity, FR-status freshness, and SRS↔SDS alignment. **Summary requirement**:
these findings MUST appear under their own dedicated header whose text literally
contains the English token `Documentation Health` (see SKILL.md Present Summary).

- **Broken GFM cross-links**: scan project markdown (`documents/*.md`, `README.md`, `AGENTS.md`) and source-code comments for links of the form `[text](path.md#anchor)`. Flag any link where (a) the target file does not exist or (b) the anchor does not match a heading's GFM auto-slug in the target file.
- **Stale `[x]` FRs**: read the resolved `SRS`. For each `### FR-<ID>` block whose `**Status:**` is `[x]`, verify the `**Acceptance:**` reference resolves — test path / benchmark id / command exists. Flag mismatches.
- **Orphan FRs**: for each `[x]` FR in SRS, search source code for any GFM-link reference of the form `[FR-<ID>](.../requirements.md#…)`. Flag FRs with zero references in code.
- **SRS ↔ SDS contradictions**: skim the resolved `SRS` and `SDS` for paired statements about the same component or behavior with mutually exclusive constraints. Flag concrete pairs.
- **Resolved `index` drift**: if the resolved `index` exists, compare its FR rows against the resolved `SRS` — flag rows whose status, summary, or anchor disagree with the SRS, and SRS FRs missing a row.
- **Verdict**: each finding must reference the exact file (and line if applicable) and propose a concrete fix.

## W5 — Coverage & pairing "X↔Y" (Cats 6, 8, 15)

Single technique: enumerate, then cross-reference each item against its expected pair.

### Cat 6 — Documentation Coverage

- **Rule**: Every file, class, method, and exported function MUST have documentation (JSDoc, Docstring, Rustdoc, etc.).
- **Check**: **Responsibility** — does the comment explain _what_ it does? **Nuances** — for complex logic (cyclomatic complexity > 5 or > 20 lines), are there examples or edge-case warnings?
- **Scan**: primary source directories. **Report**: list undocumented symbols.

### Cat 8 — Tooling Relevance

- **Scope**: Inventory all installed skills (`.claude/skills/`, `.cursor/skills/`), agents/subagents (`.claude/agents/`, `.cursor/agents/`), hooks (`.claude/hooks/`, `.cursor/hooks/`, `.husky/`), and rules files.
- **Stack match**: Compare each item against the project's declared tooling stack (from `AGENTS.md` or `CLAUDE.md`) and actual source files. Flag items designed for a different tech stack (e.g., Django skill in a TypeScript project, Python linting hook in a Deno project).
- **Domain match**: Flag agents/skills targeting a domain absent from the project (e.g., Kubernetes deployer agent in a project with no K8s manifests or Dockerfiles).
- **Stale tooling**: Identify skills/agents/hooks that reference tools, commands, or frameworks not present in the project (e.g., hook calling `flake8` when no Python files exist).
- **Verdict**: For each mismatch, state what the item expects vs. what the project actually uses, and propose a fix (remove, replace with stack-appropriate alternative, or add justification).

### Cat 15 — Invariant ↔ Test Pairing

Deeper than Cat 2's lightweight pairing — inventory all invariants systematically.
Detail in [architectural-categories.md](./architectural-categories.md) § Category 15
(inlined as `{reference_excerpts}` when spawning this worker):

- Documented architectural invariants (SHOULD / MUST clauses) with no matching test descriptor.
- Stub-only contract tests whose real-binary / real-backend path is gated behind manual triggers.
- Hand-curated allowlists / blocklists with no cross-reference test.
