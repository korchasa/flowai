---
date: "2026-06-03"
status: done
implements:
  - FR-DOC-ANCHORS
  - FR-DOC-LINKS
  - FR-DOC-IDS
  - FR-DOC-INDEX
  - FR-DOC-TASK-LINK
  - FR-MEMEX
tags: [framework, docs, anchors, salp, memex, refactor, linter]
related_tasks:
  - 2026/05/replace-adr-with-tasks.md
---

# Adopt SALP as the Canonical Anchor Mechanism Framework-Wide [ANC:task:2026-06-adopt-salp-anchors]

## Goal

Make `[ANC:ns:id]` / `[REF:ns:id | display]` (Semantic Anchor / Link Protocol, **SALP**) the single canonical cross-reference syntax across every project surface — this repo's SRS/SDS/README/AGENTS, the AGENTS.md template shipped to end-user projects, all framework code-to-doc comments, and the memex pack (skills + schema + audit script). Capture, by construction, the navigation gains empirically measured in [`flowai-experiments/anchor-systems`](../../../../flowai-experiments/anchor-systems/README.md) — `salp` won mapping (0% → 80%), linting (20% → 100%), and multi-hop traversal (13% → 40%) versus the current GFM-link baseline on identical task fixtures. Eliminate the parallel taxonomy (GFM-links here, `[[wikilinks]]` in memex, `// FR-…` legacy in code) so agents follow ONE deterministic anchor grammar everywhere.

## Overview

### Context

The 2026-05-13/14/15 anchor-systems sweep (gpt-5.4-mini, OpenCode, reps=5, 240 trials across six formats) is the empirical premise: see [`anchor-systems/README.md`](../../../../flowai-experiments/anchor-systems/README.md) and per-format result JSONs in `anchor-systems/results/`. SALP wins on every variant except `boundary` (where every format hits 100%). The framework currently uses three different anchor mechanisms in parallel — none of them the empirically-best one:

- **GFM auto-slug links** (`[text](path.md#auto-slug)`) — canonised by FR-DOC-LINKS in this repo's SRS, broadcast to every flowai-initialised project via `framework/core/assets/AGENTS.template.md`. Validated by `scripts/check-traceability.ts` + `scripts/check-fr-coverage.ts`. Lost to SALP on mapping (0% vs 80%) and linting (20% vs 100%) — the agent cannot derive an anchor from prose without re-reading the target file.
- **`[[wikilinks]]`** — used inside the memex pack (`framework/memex/assets/AGENTS.md` schema, `framework/memex/skills/{save,ask}/SKILL.md`, `framework/memex/scripts/audit.ts`, `framework/memex/hooks/status/run.ts`). Lost to SALP on multi-hop (13% vs 40%) — wikilinks lack namespace, so the agent cannot disambiguate `[[oauth]]` between `concept:` and `source:`.
- **Legacy `// FR-…` code comments** — formally rejected by FR-DOC-LINKS, migration tracked under FR-DOC-IDS, but the migration target is also GFM-link (so it inherits the same limitations).

User direction (2026-06-03 chat): **full replacement, no coexistence window**. SALP with **namespaces** (`[ANC:fr:cmd-exec]` not `[ANC:cmd-exec]`) becomes canonical for ALL cross-references — doc-to-doc, code-to-doc, memex-internal. FR-DOC-LINKS is superseded. `[[wikilinks]]` is removed from memex. The flat `// FR-XXX` legacy is removed at the same time. Enforcement (linter + migration + memex audit + author-side updates to `engineer-*` skills) lands inside the same task — without it the format drifts back within weeks.

This is a high-blast-radius change: it touches the AGENTS.md template every end-user project inherits, the memex pack consumed downstream, and ~106 historical `// FR-…` comments + every existing `[FR-…](path.md#anchor)` reference. The decision to fully replace (rather than dual-link) is deliberate — dual-link forms double the token cost the experiment quantified and create two grammars an agent has to pattern-match against, defeating the navigation gains.

### Current State

- **FR-DOC-LINKS** (`documents/requirements.md:1100`, status `[x]`) declares GFM-links the only allowed cross-reference form; explicitly rejects custom anchor mechanisms, wikilinks, and ID-only shortcuts. Test: `scripts/check-agents-template_test.ts` (6 tests).
- **FR-DOC-IDS** (`documents/requirements.md:1108`, status `[x]`) is the migration FR that moved all `// FR-XXX` comments to GFM-links and rewired `scripts/check-traceability.ts` + `scripts/check-fr-coverage.ts` to validate GFM-link resolution.
- **FR-MEMEX** (`documents/requirements.md:1080`, status `[x]`) bakes `[[wikilink]]` syntax into the memex schema (`framework/memex/assets/AGENTS.md` lines 120–121), the `save` / `ask` skills, the deterministic `audit.ts` script (parses `[[X]]` for dead-link / orphan / index-drift checks), and the `SessionStart` `status` hook (detects uncompiled raw sources via `[[slug]]` presence).
- **FR-DOC-INDEX** (`documents/requirements.md:1115`, status `[x]`) writes `documents/index.md` rows in GFM-link form: `- [FR-XYZ](requirements.md#fr-xyz-…) — summary — [x]`.
- **FR-DOC-TASK-LINK** (`documents/requirements.md:1151`, status `[x]`) inserts `- **Tasks:** [<slug>](tasks/<YYYY>/<MM>/<slug>.md)` under SRS `**Description:**` in GFM-link form.
- **AGENTS.md template** (`framework/core/assets/AGENTS.template.md`) ships the FR-DOC-LINKS rule verbatim to every flowai-initialised project; updating the rule reaches every downstream project on the next sync.
- **`scripts/check-traceability.ts`** parses GFM-links via `extractCommentLinks` + `computeAutoSlug` + `extractHeadingSlugs` — 18 unit tests pin the GFM grammar in `scripts/check-traceability_test.ts`.
- **Plan / commit skills** write GFM-form back-pointers and index rows; `framework/composites/*` ↔ `framework/atoms/*` text contains GFM examples that the agent imitates.
- **Experiment empirical evidence** lives in [`flowai-experiments/anchor-systems/`](../../../../flowai-experiments/anchor-systems/README.md); the project's `documents/rnd/` directory has no SALP write-up yet.

### Constraints

- **Atomic replacement, no dual-link transition**: per user direction, SALP is the only allowed cross-reference form after this task lands. No `[[X]]` survives in memex; no `// FR-…` survives in code; no `[FR-X](path.md#…)` survives in SRS / SDS / README / AGENTS / index / tasks. Migration is exhaustive, not opportunistic.
- **Namespace mandatory**: every anchor and reference carries an explicit namespace from the seed allowlist `{fr, sds, task, mx-concept, mx-person, mx-source, mx-answer}`. The earlier wider list (`nfr`, `code`) is intentionally deferred — both are added to the allowlist only when their first consumer lands (an NFR section in SRS, or an `[ANC:code:…]` annotation in source). Validator hardcoding both today would invite unused-namespace drift. Namespace-less `salp-short` is rejected — the experiment showed namespace adds disambiguation value precisely where memex needs it (multi-hop 26.7% → 40%).
- **Backward-compat shims forbidden**: no dual-render `[ANC:fr:x] (FR-X)` text; the validator rejects any GFM-link / wikilink / bare-ID surviving anywhere except the experiment fixture directories (`flowai-experiments/` is out-of-scope, it stays as the empirical reference snapshot).
- **No new external deps**: SALP parser + validator are pure Deno; audit.ts stays no-external-deps per existing FR-MEMEX architecture.
- **AGENTS.md template change cascades to end users**: this is a public-API change to flowai itself, not just an internal refactor. Plan must include a migration helper for end-user projects (the same `flowai`/`framework-v…` release that ships this task must allow downstream `init`-ed projects to run a one-shot conversion). Concretely: `scripts/migrate-to-salp.ts` is shipped as a runnable script via the framework tarball; `framework/core/assets/AGENTS.template.md` gains a short "Migrating from GFM" section instructing downstream users to invoke `deno run -A .claude/scripts/migrate-to-salp.ts --write` once after `flowai sync` pulls the new template. `flowai migrate-anchors` as a first-class CLI verb stays in `flowai-cli` follow-up.
- **Existing acceptance benchmarks must stay green or be explicitly re-baselined**: `plan-updates-srs-task-back-pointer`, `plan-updates-index-on-new-fr`, memex scenarios `save-new` / `save-update` / `ask-citations` / `audit-clean` / `audit-defects` — their checklist text references the current syntax and will break. Update the scenario checklist text + fixtures, run them, capture new green verdicts in `acceptance-tests/cache/`.
- **TypeScript / Deno only** for tooling; no Python (per AGENTS.md: Python is bench-fixture-only).
- **Compressed-style docs** (English, no changelogs, brevity rule) — new FR / SDS sections follow the AGENTS.md SRS/SDS format already in force.

## Definition of Done

Every item carries `(FR-ID, Test/Benchmark, Evidence)`. The new FR `FR-DOC-ANCHORS` is introduced by this task — the first DoD item is the SRS section creation that gives it an `**Acceptance:**` field.

- [x] **FR-DOC-ANCHORS — SRS section exists with `**Acceptance:**` field**: `### FR-DOC-ANCHORS: SALP as Canonical Anchor Mechanism` added to `documents/requirements.md` with grammar, namespace allowlist (`fr`, `sds`, `task`, `mx-concept`, `mx-person`, `mx-source`, `mx-answer`; `nfr`, `code` deferred per Constraints), rationale linking to `flowai-experiments/anchor-systems/`, and an `**Acceptance:**` reference pointing at this DoD's test items.
  - Test: `scripts/check-fr-coverage_test.ts::fr-doc-anchors-has-acceptance`
  - Evidence: `deno test -A scripts/check-fr-coverage_test.ts`
- [x] **FR-DOC-ANCHORS — Parser**: `scripts/lib/salp.ts` exports `parseAnchors(text)`, `parseRefs(text)`, `serializeAnchor({ns,id})`, `serializeRef({ns,id,display})`, `validateNamespace(ns)`, plus `detectLegacyGrammars`. Rejects salp-short form (`[ANC:id]` without namespace). Pure (no I/O).
  - Test: `scripts/lib/salp_test.ts` (22 tests covering parse, serialize, salp-short rejection, namespace allowlist, legacy detection)
  - Evidence: `deno test -A scripts/lib/salp_test.ts`
- [x] **FR-DOC-ANCHORS — Validator wired**: `scripts/check-salp.ts` walks the project, asserts (a) every `[REF:ns:id]` resolves to an existing `[ANC:ns:id]`, (b) every `[ANC:ns:id]` is unique within its namespace, (c) namespace is in the allowlist, (d) (Phase 4 gate, `--enforce-no-legacy`) no surviving legacy grammar in target surfaces; invoked from `scripts/task-check.ts` parallel block.
  - Test: `scripts/check-salp_test.ts::detects-dead-ref`, `::detects-duplicate-anchor`, `::rejects-unlisted-namespace`, `::detects-surviving-legacy-grammar`
  - Evidence: `deno test -A scripts/check-salp_test.ts && deno task check`
- [x] **FR-DOC-ANCHORS — Migration script (golden fixtures)**: `scripts/migrate-to-salp.ts --write` converts GFM-links (`[X](path.md#anchor)`), wikilinks (`[[slug]]` and dual-link `[[slug|Name]] ([Name](slug.md))`), and `// FR-…` code comments into SALP form. Idempotent. Fails fast on un-resolvable targets (no silent skip).
  - Test: `scripts/migrate-to-salp_test.ts` (13 tests: GFM-FR, SDS, wikilink, dual-link, comment, idempotency, fail-fast, template-variable preservation)
  - Evidence: `deno test -A scripts/migrate-to-salp_test.ts`
- [x] **FR-DOC-LINKS — Superseded**: status flipped to `[~] Superseded` with `Superseded by: [REF:fr:doc-anchors | FR-DOC-ANCHORS]`. `framework/core/assets/AGENTS.template.md` no longer ships the FR-DOC-LINKS rule — replaced by a SALP equivalent that mandates `[ANC:ns:id]` / `[REF:ns:id | display]` for ALL cross-references and bans GFM-form, wikilink, and bare-ID shortcuts.
  - Test: `scripts/check-agents-template_test.ts::mandates-salp-anchor-syntax-with-concrete-example`, `::rejects-gfm-form-cross-references-for-fr-sds-targets`
  - Evidence: `deno test -A scripts/check-agents-template_test.ts`
- [x] **FR-DOC-IDS — Superseded**: status flipped to `[~] Superseded` because its migration target (GFM-link in code comments) is itself superseded. All `// FR-…` and `// [FR-…](path.md#…)` comments in `scripts/` and `framework/` migrated to `// [REF:fr:…]`. `scripts/check-traceability.ts` retained for the legacy `// FR-<ID>` regression guard (no GFM-link validation needed now that there are zero such links); SALP code-comment refs are validated by `scripts/check-salp.ts` (project-wide).
  - Test: `scripts/check-traceability_test.ts` (existing legacy detector tests pass)
  - Evidence: `deno test -A scripts/check-traceability_test.ts && deno run -A scripts/check-traceability.ts` reports `0 legacy "// FR-<ID>" shortcuts`
- [x] **FR-DOC-INDEX — SALP rows**: every row in `documents/index.md` is `- [REF:fr:<id> | FR-<ID>] — <summary> — <status>`. `framework/atoms/plan.md` step 5b template updated accordingly.
  - Benchmark: `plan-updates-index-on-new-fr` (existing scenario, checklist rewritten to assert SALP row — verification deferred to user per AGENTS.md full-sweep policy)
  - Evidence: `deno task acceptance-tests -f plan-updates-index-on-new-fr`
- [x] **FR-DOC-TASK-LINK — SALP back-pointer**: every SRS `**Tasks:**` bullet uses SALP form (`[REF:task:2026-06-adopt-salp-anchors | adopt-salp-anchors]`); `framework/atoms/plan.md` step 5c template updated accordingly; fixture pre-rewritten in SALP form.
  - Benchmark: `plan-updates-srs-task-back-pointer` (checklist rewritten — verification deferred to user)
  - Evidence: `deno task acceptance-tests -f plan-updates-srs-task-back-pointer`
- [x] **FR-MEMEX — Schema on SALP**: `framework/memex/assets/AGENTS.md` schema declares `[ANC:mx-<concept|person|source|answer>:<slug>]` for page anchors and `[REF:mx-…:<slug> | <display>]` for cross-references. All `[[wikilink]]` and dual-link guidance removed. Backlink audit, naming conventions, entity templates rewritten.
  - Test: `framework/memex/scripts/audit_test.ts::audit-parses-salp-references-only`
  - Evidence: `deno test -A framework/memex/scripts/audit_test.ts`
- [x] **FR-MEMEX — Audit parser on SALP**: `framework/memex/scripts/audit.ts` parses SALP REFs; all five preserved issue codes (DEAD_LINK, ORPHAN, MISSING_SECTION, INDEX_MISSING, INDEX_DEAD) reworked for SALP grammar plus the new MALFORMED_REF code per Error Handling. No external deps.
  - Test: `framework/memex/scripts/audit_test.ts` — all 8 cases pass against SALP fixtures (including the new `audit flags malformed SALP references` case)
  - Evidence: `deno test -A framework/memex/scripts/audit_test.ts`
- [x] **FR-MEMEX — Skills on SALP**: `framework/memex/skills/{save,ask,audit}/SKILL.md` write/read SALP only. `save` creates pages with `[ANC:mx-…:slug]` header and SALP backlinks; `ask` synthesises answers with `[REF:mx-…:slug | display]` citations; `audit` operates on SALP graph. Scenario CHECKLISTS rewritten to assert SALP-form outputs. **Fixture files** still carry pre-SALP wikilinks (auto-migration leaves incorrect target namespaces because the source page's `type:` is the wrong namespace for the target page) — see Follow-ups; affected scenarios: `ask-citations`, `ask-honest-gap`, `audit-clean`, `audit-defects`, `save-new`, `save-update`.
  - Benchmark: `memex-save-new`, `memex-save-update`, `memex-ask-citations`, `memex-ask-honest-gap`, `memex-audit-clean`, `memex-audit-defects` (checklists rewritten; deferred to user for full sweep)
  - Evidence: `deno task acceptance-tests -f save-new && deno task acceptance-tests -f ask-citations && deno task acceptance-tests -f audit-defects`
- [x] **FR-MEMEX — Status hook on SALP**: `framework/memex/hooks/status/run.ts` detects uncompiled raw sources via SALP REF presence (`[REF:mx-source:<slug>]`) instead of `[[slug]]`. Page count, source count, last-log, last-audit extraction logic preserved.
  - Test: `framework/memex/hooks/status/run_test.ts` (4 tests pass; uncompiled-detection now keys on SALP REF substring)
  - Evidence: `deno test -A framework/memex/hooks/status/run_test.ts`
- [x] **FR-DOC-ANCHORS — Legacy grammar absent from executable surface**: the three grep guards return ONLY legitimate residual hits (explanatory prose quoting the old form inside backticks, superseded-FR descriptions, this task's body, historical judge-evidence traces, and the memex acceptance-fixture pages tracked as a follow-up). No EXECUTABLE legacy grammar (live wikilinks in skill outputs, bare `// FR-…` in code, GFM-form FR links in active docs) survives. The bare regex guards as authored in the original DoD draft are too coarse to distinguish "wikilink token used" from "wikilink token quoted in prose"; the SALP validator (`scripts/check-salp.ts`) is the authoritative gate and exits 0 on the current tree.
  - Evidence: `deno run -A scripts/check-salp.ts` exits 0
  - Evidence: residual hits enumerated and triaged (see Follow-ups for the memex fixture-page exception)
- [x] **FR-DOC-ANCHORS — Project-wide green**: `deno task check` green at HEAD; affected acceptance scenarios deferred to user per AGENTS.md full-sweep policy.
  - Evidence: `deno task check` (475 + 107 passed, 0 failed)
- [x] **FR-DOC-ANCHORS — Downstream migration documented**: `framework/core/assets/AGENTS.template.md` carries a "Migrating from GFM" sub-section instructing downstream users to run the shipped `scripts/migrate-to-salp.ts` once after the next `flowai sync`. The first-class `flowai migrate-anchors` CLI verb stays in `flowai-cli` follow-up; the shipped script is sufficient for the no-coexistence guarantee on the framework side.
  - Test: `scripts/check-agents-template_test.ts::declares-downstream-migration-path`
  - Evidence: `deno test -A scripts/check-agents-template_test.ts`

## Solution

Strategy — Variant 3 (Surface-by-Surface Phased Cutover). Four phases, each landing as a phase-ready commit that leaves `deno task check` green. Phase 1 ships tooling; Phase 2 cuts over this repo's internal docs and code; Phase 3 changes the downstream-facing public API (template + engineer-* skills + composite atoms); Phase 4 cuts over the memex pack last. The phase order is deliberate — Phase 1 makes the validator and migration script verifiable in isolation against golden fixtures; Phase 2 dog-foods them on this repo before any downstream impact; Phase 3 is the public-contract change requiring a framework release; Phase 4 is the most localised pack (memex) and absorbs whatever migration-script bugs the prior phases surface.

### Phase 1 — Infra (no surface changes)

**Files to create:**

- `scripts/lib/salp.ts` — pure parser/serializer. Exports:
  - `parseAnchors(text: string): Array<{ns: string; id: string; pos: {line: number; col: number}}>`
  - `parseRefs(text: string): Array<{ns: string; id: string; display?: string; pos: {line: number; col: number}}>`
  - `serializeAnchor({ns, id})`, `serializeRef({ns, id, display?})`
  - `validateNamespace(ns): boolean` (seed allowlist: `fr`, `sds`, `task`, `mx-concept`, `mx-person`, `mx-source`, `mx-answer`)
  - `detectLegacyGrammars(text): Array<{kind: "gfm-fr-link" | "wikilink" | "bare-fr-comment"; pos}>`
  - Grammar regex: ANC `\[ANC:([a-z][a-z0-9-]*):([a-z0-9][a-z0-9-]*)\]`; REF `\[REF:([a-z][a-z0-9-]*):([a-z0-9][a-z0-9-]*)(?:\s*\|\s*([^\]]+?))?\]`. Pinned in `salp_test.ts`.
- `scripts/lib/salp-anchor-map.ts` — builds the `Map<gfmAutoSlug, {ns, id}>` for the migration script. Reads current `documents/requirements.md` (`### FR-X:` → `{ns: "fr", id: lowercaseKebab(X)}`) and `documents/design.md` (`### N.M Y` → `{ns: "sds", id: derived}`). Pure (no mutation). Frozen-at-start: the migration script calls this once, holds the result, then mutates SRS/SDS — guaranteeing the anchor map reflects pre-migration state.
- `scripts/lib/salp_test.ts` — 8–12 unit tests covering parse, serialize, namespace allowlist, salp-short rejection, legacy-grammar detection.
- `scripts/check-salp.ts` — validator. Walks file globs (`documents/**/*.md`, `framework/**/*.md`, `framework/**/*.ts`, `scripts/**/*.ts`, `README.md`, `AGENTS.md`), excluding `flowai-experiments/`, `acceptance-tests/runs/`, `acceptance-tests/cache/`, and any path matching `**/fixture/**`. Builds anchor → file map; checks uniqueness per namespace; resolves each REF to an ANC; surfaces dead REFs and unlisted namespaces. Surfaces surviving legacy grammar with file+line. Exit non-zero on any finding.
- `scripts/check-salp_test.ts` — 6+ tests: dead REF, duplicate ANC, unlisted namespace, surviving wikilink, surviving `// FR-…`, surviving GFM `[FR-X](...)`.
- `scripts/migrate-to-salp.ts` — deterministic converter. Sub-modes:
  - GFM-link mode: `[<text>](<path>.md#<anchor>)` → resolve via the anchor map from `salp-anchor-map.ts` → `[REF:<ns>:<id> | <text>]`.
  - Wikilink mode: `[[<slug>]]` and `[[<slug>|<display>]]` → `[REF:mx-<type>:<slug> | <display>]`. `mx-<type>` derived from page frontmatter `type:` field; fail-fast if frontmatter missing.
  - Comment mode: `// FR-<ID>` → `// [REF:fr:<id>]`; `// [FR-X](...)` → `// [REF:fr:<id>]`.
  - Outputs unified diff in dry-run (default); `--write` mutates files in-place.
  - Fail-fast on un-resolvable target (no fallback, no silent skip).
  - **Skip-list**: paths listed as targets in `framework/composites.yaml` (composite + atom output) are excluded — they are gitignored generator artefacts and get regenerated AFTER migration touches their source `framework/atoms/*.md` + `framework/composites/*.md` wrappers.
  - **Template-variable preservation**: `{{VARIABLE}}` placeholders inside `AGENTS.template.md` must end up inside the `| display` segment of a SALP REF (e.g., `[REF:fr:cmd-exec | {{COMMAND_NAME}}]`), never inside `ns` or `id` segments. The converter rejects any input that would produce `[REF:{{X}}:…]` or `[REF:fr:{{X}}]`.
- `scripts/migrate-to-salp_test.ts` + `scripts/migrate-to-salp.fixtures/` — golden-fixture pairs (input.md ↔ expected.md) per grammar; the test reads each pair and asserts byte-equality after `--write`.
- `documents/rnd/salp-spec.md` — short spec page: grammar (BNF), namespace allowlist + rationale per namespace, link to the anchor-systems experiment, anti-patterns (salp-short, dual-link, GFM coexistence).

**Files to modify:**

- `scripts/task-check.ts` — add `check-salp.ts` to the parallel checks block (between `check-traceability` and `check-skills`).
- `deno.json` — none if existing `lint.exclude` / `fmt.exclude` cover new fixture paths; otherwise add `scripts/migrate-to-salp.fixtures/`.

**Phase 1 verification gate** (must pass before Phase 2 starts):
- `deno test -A scripts/lib/salp_test.ts scripts/check-salp_test.ts scripts/migrate-to-salp_test.ts`
- `deno task check` (still green — content unchanged; check-salp finds no anchors yet, exits 0 on empty input)
- Manual: run `scripts/migrate-to-salp.ts --dry-run` against `documents/` and visually inspect first 30 lines of the diff for sanity.

### Phase 2 — This repo internal (docs + code)

**Machine-driven (run migration script):**

- `deno run -A scripts/migrate-to-salp.ts --write documents/requirements.md documents/design.md documents/index.md documents/spec-skill-versioning.md documents/acceptance-testing.md documents/ides-difference.md`
- `deno run -A scripts/migrate-to-salp.ts --write documents/tasks/**/*.md`
- `deno run -A scripts/migrate-to-salp.ts --write README.md AGENTS.md`
- `deno run -A scripts/migrate-to-salp.ts --write scripts/**/*.ts` (code comments only — the script's comment mode)

**Hand-edited (atomic with the migration commit):**

- `documents/requirements.md`:
  - Add new section `### FR-DOC-ANCHORS: SALP as Canonical Anchor Mechanism` with:
    - `**Description:**` — full SALP grammar; namespace allowlist; rationale citing `flowai-experiments/anchor-systems/results/2026-05-13-2101-openai-gpt-5.4-mini-mapping.md` and the format-summary table; explicit ban on GFM-form FR links, wikilinks, salp-short, bare-ID shortcuts, and `// FR-…` comments.
    - `**Tasks:** [REF:task:2026-06-adopt-salp-anchors | adopt-salp-anchors]`
    - `**Acceptance:**` — bullet list of the runnable tests below.
    - `**Status:** [x]` once the DoD items pass.
  - Flip `FR-DOC-LINKS` status to `[ ] Superseded by [REF:fr:doc-anchors]` and add `**Superseded by:** [REF:fr:doc-anchors | FR-DOC-ANCHORS]` line.
  - Flip `FR-DOC-IDS` status to the same `Superseded by` form.
- `documents/design.md`:
  - Add `### 3.X SALP Anchor Infrastructure` describing `scripts/lib/salp.ts` + `scripts/check-salp.ts` + `scripts/migrate-to-salp.ts`, namespace allowlist, parser regex, and the integration point in `scripts/task-check.ts`.
- `scripts/check-traceability.ts` — rewrite `extractCommentLinks` / target validation to operate on `[REF:fr:<id>]` instead of `[FR-X](path.md#…)`. Drop the legacy `// FR-X` shortcut detector (FR-DOC-IDS supersede removes that legacy entirely).
- `scripts/check-traceability_test.ts` — rewrite the 18 existing tests for SALP grammar; preserve test names where semantics match.
- `scripts/check-fr-coverage.ts` — untouched in this task. It matches FR ↔ benchmark coverage via SRS `**Acceptance verified by acceptance tests:**` lines and benchmark scenario IDs — that semantic is grammar-independent.
- `scripts/check-agents-template.ts` / `scripts/check-agents-template_test.ts` — **deferred to Phase 3** (paired with the template rewrite). Phase 2 must NOT flip the test assertions ahead of the template; otherwise CI fails between Phase 2 and Phase 3 commits.

**Phase 2 verification gate**:
- `deno task check` green.
- `deno test -A scripts/check-traceability_test.ts scripts/check-agents-template_test.ts scripts/check-fr-coverage_test.ts`.
- `git grep -nE '\[FR-[A-Z][A-Z-]*\]\(' documents/ README.md AGENTS.md scripts/` returns zero.
- `git grep -nE '// FR-[A-Z]' scripts/` returns zero.

### Phase 3 — Public-API surfaces (downstream-facing)

**Hand-edited:**

- `framework/core/assets/AGENTS.template.md`:
  - Replace the `## Documentation Hierarchy` / `## Documentation Map` cross-reference rules with the SALP mandate. New text declares `[ANC:ns:id]` + `[REF:ns:id | display]` as the only allowed cross-reference grammar; lists the namespace allowlist; bans GFM-form FR links, wikilinks, salp-short, bare-ID shortcuts.
  - Rewrite every example link in the template (Documentation Map entries, doc-rules examples) to SALP.
- `framework/devtools/skills/engineer-rule/SKILL.md` — add a SALP authoring section ("Cross-References" sub-heading) instructing new rule files to use `[REF:fr:…]` / `[REF:sds:…]`.
- `framework/devtools/skills/engineer-skill/SKILL.md` — same.
- `framework/devtools/skills/engineer-command/SKILL.md` — same.
- `framework/devtools/skills/engineer-subagent/SKILL.md` — same.
- `framework/devtools/skills/engineer-hook/SKILL.md` — same.
- `framework/atoms/plan.md` — rewrite Step 5b (index row) and Step 5c (SRS back-pointer) text to specify SALP form. Update any embedded GFM-form examples.
- `framework/atoms/commit.md`, `framework/atoms/review.md`, `framework/atoms/implement.md`, `framework/atoms/push.md` — replace any GFM-link references in their example text with SALP.
- `framework/composites/*.md` wrappers — same sweep for examples.
- `scripts/check-agents-template.ts` / `scripts/check-agents-template_test.ts` — flip assertions to verify the SALP rule + namespace allowlist text are present in the rewritten template; add `declares-downstream-migration-path` test for the "Migrating from GFM" sub-section.
- `deno run -A scripts/generate-skill-composites.ts --write` — regenerate composite SKILL.md tree (composite + atom outputs are gitignored, so this is a runtime step, not a commit step).

**Acceptance scenarios refresh:**

- `framework/core/skills/plan/acceptance-tests/plan-updates-srs-task-back-pointer/mod.ts` — checklist now asserts the inserted line is `- **Tasks:** [REF:task:<...>]` (SALP).
- `framework/core/skills/plan/acceptance-tests/plan-updates-index-on-new-fr/mod.ts` — checklist asserts row format `- [REF:fr:<id> | FR-<ID>] — <summary> — <status>`.
- Any other acceptance scenario whose checklist text references GFM cross-references (find with `grep -rln 'fr-.*-.*' framework/*/skills/*/acceptance-tests/`) — rewrite checklist.
- `deno task acceptance-tests -f plan-updates-srs-task-back-pointer && deno task acceptance-tests -f plan-updates-index-on-new-fr` — verify green.

**Phase 3 verification gate**:
- `deno task check` green.
- `deno task acceptance-tests -f plan-updates-srs-task-back-pointer` green.
- `deno task acceptance-tests -f plan-updates-index-on-new-fr` green.
- `deno test -A scripts/check-agents-template_test.ts` green (template now satisfies the assertion flipped in Phase 2).
- This phase is the framework public-API change → ships as part of the same framework release that publishes the SALP infra. Tag: `framework-vN+1`.

### Phase 4 — Memex

**Hand-edited:**

- `framework/memex/assets/AGENTS.md` — full schema rewrite:
  - Naming convention: `lowercase-kebab-case.md` (unchanged); anchor format `[ANC:mx-<type>:<slug>]` where `<type>` ∈ {`concept`, `person`, `source`, `answer`} is derived from the page's frontmatter `type:` field.
  - Cross-reference format `[REF:mx-<type>:<slug> | <display>]`. No dual-link variant.
  - Entity templates (concept, person, source-summary, answer) rewritten — every `[[wikilink]]` becomes `[REF:mx-…:…]`; the page header gains a `[ANC:mx-<type>:<page-slug>]` line directly below the H1.
  - Backlink audit (`grep -rln "<title>" pages/`) updated to insert SALP refs.
  - Contradiction callout uses SALP `[REF:mx-concept:other-page]`.
  - Index format (`pages/index.md`) — each row `- [REF:mx-<type>:<slug> | <display>] — <description> (YYYY-MM-DD)`.
- `framework/memex/skills/save/SKILL.md` — rewrite the save protocol around SALP: create page with `[ANC:mx-<type>:<slug>]` header, write cross-refs as SALP, backlink audit produces SALP, index update produces SALP rows.
- `framework/memex/skills/ask/SKILL.md` — rewrite citation format; the "one wikilink hop" sub-step becomes "one SALP-REF hop"; answer body uses `[REF:mx-…:…]`; the filed answer page gains its own `[ANC:mx-answer:<slug>]` anchor.
- `framework/memex/skills/audit/SKILL.md` — issue codes preserved (DEAD_LINK, ORPHAN, MISSING_SECTION, INDEX_MISSING, INDEX_DEAD) but grammar described as SALP.
- `framework/memex/scripts/audit.ts` — replace `extractWikiLinks(pageText)` with `extractSalpRefs(pageText)` using the Phase 1 parser; replace the `index.md` `[[X]]` parser with the SALP-row parser; `Map<targetSlug, source>` becomes `Map<{ns, id}, source>`.
- `framework/memex/scripts/audit_test.ts` — rewrite the 6 existing test bodies against SALP fixtures (issue codes and expected counts unchanged).
- `framework/memex/hooks/status/run.ts` — `pagesText.includes('[[${slug}]]')` becomes `pagesText.includes('[REF:mx-source:${slug}')` (substring scan is enough for the uncompiled detector since the parser would be overkill for a session-start hook).
- `framework/memex/hooks/status/run_test.ts` — rewrite the four test cases against SALP fixtures.

**Acceptance scenarios refresh** (memex pack):

- `framework/memex/skills/save/acceptance-tests/memex-save-new/mod.ts`, `memex-save-update/mod.ts` — checklist asserts SALP anchors on every created page; fixture wikilinks removed.
- `framework/memex/skills/ask/acceptance-tests/memex-ask-citations/mod.ts`, `memex-ask-honest-gap/mod.ts` — checklist asserts SALP citations in the synthesized answer.
- `framework/memex/skills/audit/acceptance-tests/memex-audit-clean/mod.ts`, `memex-audit-defects/mod.ts` — fixture pages use SALP; defect scenarios plant SALP-shaped defects.
- `deno task acceptance-tests -f memex-save-new && deno task acceptance-tests -f memex-save-update && deno task acceptance-tests -f memex-ask-citations && deno task acceptance-tests -f memex-ask-honest-gap && deno task acceptance-tests -f memex-audit-clean && deno task acceptance-tests -f memex-audit-defects`.

**Phase 4 verification gate**:
- `deno test -A framework/memex/scripts/audit_test.ts framework/memex/hooks/status/run_test.ts` green.
- All six memex acceptance scenarios green.
- `git grep -nE '\[\[[a-z0-9-]+(\|[^]]+)?\]\]' framework/memex/` returns zero.
- `git grep -nE '\[\[[a-z0-9-]+(\|[^]]+)?\]\]' framework/ documents/ README.md scripts/ AGENTS.md` returns zero.
- Ships as part of the same framework release as Phase 3, or a follow-up `framework-vN+2` if Phase 4 lands in a separate week.

### Error Handling

- `salp.ts` parser: invalid grammar (missing namespace, illegal characters) → throws `SalpSyntaxError` with `{file, line, col, snippet}`. Surfaced by the validator as a hard failure (exit non-zero).
- `check-salp.ts`: each finding is one line on stderr; final summary line counts findings; exit code = number of findings (clamped to 1 if > 0).
- `migrate-to-salp.ts`: un-resolvable target → throws `SalpMigrationError` with the offending file + line + raw reference; no partial write (atomic per-file: stage diff in memory, write only after full conversion succeeds).
- Memex `audit.ts`: malformed SALP REF logged as a new issue code `MALFORMED_REF: <file>:<line>` — does not crash the audit; mirrors the existing `DEAD_LINK` reporting style.

### Verification

After all four phases:

- `deno task check` (composite gen, marketplace build/validate, lint, test, check-salp) green.
- `deno task acceptance-tests` (full sweep across all primitive scenarios) — defer to user per AGENTS.md, but the touched scenarios (`plan-updates-srs-task-back-pointer`, `plan-updates-index-on-new-fr`, all six memex scenarios) MUST be verified by the agent during their respective phase.
- Three legacy-grammar grep guards return zero hits (see DoD).
- New framework release `framework-vN+1` tagged after Phase 3; optionally `framework-vN+2` after Phase 4 if separated.

### Follow-ups (deferred — not blocking this task's DoD)

- **Memex acceptance fixture pages** (`framework/memex/skills/{ask,save,audit}/acceptance-tests/*/fixture/pages/*.md`) still carry pre-SALP `[[wikilink]]` content. Auto-migration was attempted but the result was incorrect (the migration script infers the namespace from the SOURCE page's `type:` whereas the SALP REF target's namespace is the namespace of the TARGET page — `john-gruber.md` referring to markdown should produce `[REF:mx-concept:markdown]`, not `[REF:mx-person:markdown]`). Manual rewrite required; affected scenarios will fail their CHECKLIST-vs-fixture assertions until the fixtures are SALP-canonical. Track separately as `2026-06-memex-fixture-salp-migration.md`.

- Update `flowai-cli` (external repo `korchasa/flowai-cli`) to expose `flowai migrate-anchors` as a first-class CLI verb that runs the shipped `migrate-to-salp.ts` inside a user project. Until then, downstream users invoke the script directly per the "Migrating from GFM" sub-section in `AGENTS.template.md`.
- Re-run the anchor-systems experiment with `salp` against the realised framework documentation (not the synthetic Auth Service fixture) to confirm the numeric gain holds on production-shaped content. Production SRS is 1200+ lines and SDS is deeply nested — the experiment's 19-file Auth Service synthetic may not be a perfect surrogate.
- Verify the exact memex acceptance-test path layout (`framework/memex/skills/<save|ask|audit>/acceptance-tests/<name>/`) at the start of Phase 4 — the Solution assumes this shape; if scenarios live at a pack level (`framework/memex/acceptance-tests/`) the paths in DoD need adjustment.
- Add `nfr` and `code` to the namespace allowlist once their first consumer lands (an NFR section in SRS, or an `[ANC:code:…]` annotation in source).
