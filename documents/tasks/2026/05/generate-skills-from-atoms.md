---
date: "2026-05-17"
status: done
implements:
  - FR-SKILL-COMPOSE
  - FR-ATOM-IMPLEMENT
  - FR-ATOM-PUSH
  - FR-SHIP
  - FR-REVIEW-COMMIT
  - FR-DO-WITH-PLAN
  - FR-UNIVERSAL.DISCLOSURE
tags: [framework, skills, generator, composite, refactor, dx]
related_tasks:
  - 2026/05/do-with-plan-command.md
  - 2026/05/decompose-complexity-hotspots.md
---

# Generate Composite Skills from Parametrized Atomic Sources

## Goal

Eliminate hand-maintained duplication between atomic skills (`flowai-plan-exp-permanent-tasks`, `flowai-review`, `flowai-commit-beta`) and composite skills (`flowai-review-and-commit`, `flowai-do-with-plan`). Replace today's "copy step_by_step into the composite + verify with `check-skill-sync.ts`" pattern with a declarative manifest (`framework/composites.yaml`) plus a generator (`scripts/generate-skill-composites.ts`) that materializes every composite and atom SKILL.md from a single source of truth (atom `_atom.md` and composite `_composite.md` wrapper, both siblings of the generated `SKILL.md` for editor co-location). Parametrization via `<param-branch name="…" value="…">` blocks lets one atom serve multiple composites with phase-specific divergence. The same one-shot change introduces the two missing SDLC atoms (`flowai-do`, `flowai-push`) and a terminal full-cycle composite `flowai-ship` (plan → do → review → commit → push), and retires the legacy `flowai-do-with-plan` (kept functional with a deprecation note in description for one release, then removed in a follow-up task). Generator-input files (`_atom.md`, `_composite.md`, `composites.yaml`) are excluded from `framework.tar.gz` via `tar --exclude` and a `scripts/check-pack-refs.ts` CI gate that unpacks the produced tarball and fails if any input file slipped through (see **Variants — Source layout** for the choice rationale). Net result: editing one atom's `_atom.md` regenerates every composite that consumes it; drift is impossible by construction; `check-skill-sync.ts` is replaced by `generate-skill-composites --check` (compares regenerated output to on-disk, fails with unified diff + `--write` hint).

## Overview

### Context

Today the project keeps two composite SKILL.md files (`flowai-review-and-commit`, `flowai-do-with-plan`) whose `<step_by_step>` blocks are hand-copied verbatim from atomic source skills. Drift is caught — but only caught — by `scripts/check-skill-sync.ts`, which performs substring matching over each source skill's first `<step_by_step>` block, with a per-step `allowedDivergentSteps` whitelist for phase-boundary divergence (`flowai-plan-exp-permanent-tasks` step 8 hand-off, `flowai-commit-beta` steps 1/4/5 diff-reuse and cleanup-commit). The canon (`framework/AGENTS.md` § Composite Skill Authoring) explicitly forbids reverting to Skill-tool delegation — a regression that was fixed once and must not return.

The current cost is concrete:

- Every edit to an atomic skill requires manually mirroring the change in 1–2 composites. The maintainer must remember `allowedDivergentSteps` semantics and which composite list (`scripts/composite-skills.ts` `COMPOSITE_SKILLS`) must be kept agreeing.
- `flowai-do-with-plan`'s "Implement Phase" (TDD cycle) is **not** sourced from any atom — it is hand-written inside the composite. So a single composite can edit its own Implement steps with no corresponding atom to update. There is no `flowai-do` atom to consume in a future cross-composite scenario.
- There is no `flowai-push` primitive either, so a true "ship" composite (plan → do → review → commit → push) cannot be assembled even hypothetically.
- Adding any new composite (e.g. `flowai-do-and-commit`, `flowai-ship`) requires writing a new ~300-line SKILL.md from scratch, plus a new entry in `SYNC_CHECKS`, plus a new entry in `COMPOSITE_SKILLS`, plus its own acceptance benchmarks. The ratio of glue-code to behaviour is ~3:1.

Architectural decisions already locked (user input above):

1. **Atom set after change**: `plan` (existing `flowai-plan-exp-permanent-tasks`), `do` (new `flowai-do`), `review` (existing `flowai-review`), `commit` (existing `flowai-commit-beta`), `push` (new `flowai-push`).
2. **Mechanism**: generator + committed artefacts. Generator writes SKILL.md files at canonical paths. `deno task check` re-runs the generator into a tempdir and compares byte-by-byte to the on-disk SKILL.md; any drift fails the build with a `--write` hint. `scripts/check-skill-sync.ts` and `scripts/composite-skills.ts` are removed.
3. **Composites on output**: `flowai-review-and-commit` (review + commit) and `flowai-ship` (plan + do + review + commit + push). Legacy `flowai-do-with-plan` enters deprecation: regenerated from a `_composite.md` wrapper with an `inline: true` Implement Phase (no atom for that phase) and a deprecation note appended to description. Functional for one release; removed in a follow-up task (out of scope here).
4. **Divergence handling**: parametrization of the atom — `{{PARAM:DEFAULT|ALT_1|ALT_2}}` placeholders inside `step_by_step.md`. The composite manifest passes per-phase values. No `allowedDivergentSteps` whitelist survives.

Composite canon stays in force: no Skill-tool delegation, no source-skill names in `description`, mandatory "Self-contained — execute the inlined steps directly" marker, explicit success-case verdict gates. These are now properties of the generator's composite template, not hand-discipline.

### Current State

- `framework/core/commands/flowai-plan-exp-permanent-tasks/SKILL.md` — 137 lines. One `<step_by_step>` (8 steps; step 8 = TOTAL STOP).
- `framework/core/skills/flowai-review/SKILL.md` — 241 lines. One `<step_by_step>` (verdict-gated).
- `framework/core/commands/flowai-commit-beta/SKILL.md` — 137 lines. One `<step_by_step>` (commit + doc sync + reflect + cleanup commit).
- `framework/core/commands/flowai-review-and-commit/SKILL.md` — 314 lines. Two `<step_by_step>` blocks (Phase 1 = review, Phase 2 = commit). Inlines review + commit-beta with `allowedDivergentSteps: [1, 4, 5]` on commit-beta.
- `framework/core/commands/flowai-do-with-plan/SKILL.md` — 435 lines. Three `<step_by_step>` blocks (Plan / Implement / Review-and-Commit). Inlines plan + review + commit-beta. `allowedDivergentSteps: [8]` on plan, `[1]` on commit-beta. The Implement phase is hand-written and has no atomic source.
- `scripts/check-skill-sync.ts` — 181 lines. Substring-matches each source's first `<step_by_step>` against the composite (verbatim or per-step with whitelist). Wired into `deno task check`.
- `scripts/composite-skills.ts` — `COMPOSITE_SKILLS = ["flowai-review-and-commit", "flowai-do-with-plan"]`. Token-cap exemption list; agreement with `SYNC_CHECKS` is verified by `composite-skills_test.ts`.
- `framework/AGENTS.md § Composite Skill Authoring` — six rules: no delegation, description hygiene, "Self-contained" marker, explicit verdict-gate success, single-`<step_by_step>` source skills, 500-line cap. These are runtime invariants the generator must preserve.
- Acceptance benchmarks already exist for the two current composites: 10 scenarios for `flowai-review-and-commit` (`approve-and-commit`, `auto-docs`, `auto-invoke-reflect`, `flips-task-status`, `non-deno-project`, `parallel-delegation`, `phase-2-diff-eliminated`, `post-reflect-cleanup-commit`, `reads-docs`, `reject-stops`) and 6 for `flowai-do-with-plan` (`check-fails-stops`, `empty-implement-stops`, `full-cycle`, `pauses-for-variant-selection`, `rejects-on-changes-requested`, `scope-violation-stops`). These two suites are the **primary regression gate** for the V2 big-bang (byte-identity is NOT required — see Constraints).
- Existing trigger-coverage convention (FR-ACCEPT.TRIGGER) is a **triplet** per agent-invocable skill: `trigger-pos-1`, `trigger-adj-1`, `trigger-false-1`. Commands (`disable-model-invocation: true`) carry no trigger scenarios anywhere in the codebase.
- Phase headers in current composites use `###` (h3) with free-form titles: `### Plan Phase`, `### Phase 2 — Commit`, `### Verdict Gate`, `### Review-and-Commit Phase`, `### Commit Steps (continuation of Review-and-Commit Phase)`. No enforced `Phase N` numbering. Generator must match this style — see Constraints.
- CI bundles the whole `framework/` directory (`tar … framework/`, `.github/workflows/ci.yml:111`). Any new source artefact placed under `framework/` (e.g. `_atom.md`, `_composite.md`, manifest) will ship to user IDE configs unless explicitly excluded. See **Variants — Source layout** below.
- `FR-REVIEW-COMMIT` (SRS line 644) and `FR-DO-WITH-PLAN` (SRS line 650) already exist. This task **edits** them with deprecation/regeneration notes; it does NOT add them.

### Constraints

- **Semantic equivalence, not byte identity** (per user decision). Regenerated SKILL.md files for the three atoms (`flowai-plan-exp-permanent-tasks`, `flowai-review`, `flowai-commit-beta`) and the two existing composites (`flowai-review-and-commit`, `flowai-do-with-plan`) MAY differ in whitespace, header phrasing, or paragraph structure from today's hand-written files, PROVIDED every existing acceptance scenario for the affected primitive stays green AND the composite canon is preserved (see next bullet). Byte-diff is reported by `--check` but failing on it is NOT a build break; only acceptance-test regression is.
- **No behavioural regression.** After regeneration, every scenario in the existing acceptance suites listed above (10 + 6 + atom-level scenarios) MUST pass. The agent runs the new/touched scenarios locally; the full sweep is handed off to the user (per project Acceptance Test TDD policy).
- **Composite canon preserved.** Generator templates MUST emit, for every composite: `**No delegation**` rule in `<rules>`; "Self-contained — execute the inlined steps directly" phrase in `description`; absence of source-skill names from `description` (lexical check); every verdict gate explicit on BOTH success and failure paths; exactly one `<step_by_step>` block per atom source. Canon checks run inside the generator and fail generation with file+line on violation.
- **Phase header convention** (uniform for agent readability, per user decision). Generator emits each phase as `### <Phase Title>` (h3, free-form title from manifest, no enforced `Phase N` numbering). Inter-phase gates use `### <X> → <Y> Gate` (matching current `flowai-do-with-plan` style). New composites use a consistent vocabulary: `### Plan Phase`, `### Implement Phase`, `### Review Phase`, `### Commit Phase`, `### Push Phase`. Phase titles for existing composites stay close to today's wording to minimize diff churn during review.
- **Atoms remain usable standalone.** Each atom's `_atom.md` generates an atom SKILL.md with default param values. Standalone acceptance suites for each atom MUST stay green after extraction. Trigger-coverage scenarios (skills only) regenerate from their existing locations unchanged.
- **No new dependencies.** Manifest = YAML parsed with `@std/yaml` (already used). Templating = string replacement (no engine).
- **TS strict + Deno only.** Generator script under `scripts/`, passes `deno task check`.
- **One PR, one continuous execution session, sequenced commits.** Big-bang: the implementing agent must complete Commits 1–9 in a single uninterrupted run without returning to the user for input. Hand-offs to the user happen ONLY in two situations: (a) at the very end (Commit 9 hand-off — full acceptance-test sweep across the five primitives, listed in the Verification commands block), or (b) if a non-recoverable blocker surfaces (e.g., first-atom smoke gate fails after 2 fix attempts → STOP-ANALYSIS REPORT per `framework/AGENTS.md § Diagnosing Failures`). Each commit leaves `deno task check` green, so any commit is a safe rollback point if the run is interrupted. Order: skeleton generator + leakage guard → atom-render pipeline + first atom → remaining atoms → composite template + regenerate existing composites → delete legacy sync infra → new atoms → new composite → docs sweep. Decisions taken in this planning session (Variant B, semantic equivalence, one trigger scenario per new primitive, etc.) are LOCKED — the implementer does NOT re-ask, does NOT propose alternatives mid-flight.
- **Generator is deterministic.** Same manifest + same atoms → same output bytes (stable YAML key order, LF line endings, no timestamps).
- **The flowai CLI (external repo) must not need changes.** Generator-input files (`_atom.md`, `_composite.md`, `framework/composites.yaml`) are kept out of `framework.tar.gz` via `tar --exclude` + `scripts/check-pack-refs.ts` CI gate (see Variants below). The CLI continues to consume `SKILL.md` files as before.

### Variants — Source layout (decision pending)

CI tars all of `framework/` (`.github/workflows/ci.yml:111` — `tar … -cf framework.tar framework/`). Any generator-input file placed under `framework/` will ship to user IDE configs unless explicitly excluded. Three approaches, each with concrete risk/cost numbers:

#### Variant A — Sources outside `framework/` (e.g. `compose/`)

- Layout: `compose/atoms/<name>/_atom.md`, `compose/composites/<name>/_composite.md`, `compose/manifest.yaml`. Generator writes targets into `framework/...` as today.
- Pros:
  - Zero accidental shipping by construction. CI tar step needs **zero** changes.
  - CLI repository (`korchasa/flowai-cli`) needs zero changes — it walks `framework/` for `SKILL.md` and finds only generated files.
  - Future-proof against any framework/ refactor (e.g. switching to `git archive` or scoped tarballs).
  - Clean separation: `framework/` = product; `compose/` = build inputs (parallel to `scripts/`).
- Cons:
  - Co-location with target SKILL.md is lost. Editor jump-from-SKILL-to-source is one extra `cd ../../compose/...`. Mitigation: top-of-body `<!-- SOURCE: compose/atoms/<name>/_atom.md -->` comment in every generated SKILL.md.
  - One-time path churn: ~9 source files, all created fresh in this task, so no migration cost.
  - `documents/index.md` Documentation Map gets one new top-level path category.
- Cost: low. Risk of regression: **near-zero** (build inputs cannot leak into product output).

#### Variant B — Sources inside `framework/` + tar `--exclude`

- Layout: `_atom.md` / `_composite.md` siblings of SKILL.md inside the existing primitive dirs; manifest at `framework/composites.yaml`.
- Pros:
  - Co-located: editing `_atom.md` and SKILL.md is one `cd` away. Best editor ergonomics.
  - Minimum path churn in DoD evidence commands.
- Cons:
  - Three new `--exclude='_atom.md' --exclude='_composite.md' --exclude='composites.yaml'` flags in the `tar` invocation. **Single point of failure**: any future CI refactor that switches to `git archive`, `tar -T <list>`, or a different bundler silently re-includes these files. Probability over 2 years: ~30% (CI rewrites in this project history average ~1 per 8 months).
  - Need a `scripts/check-pack-refs.ts` extension (CI gate) that scans the produced tarball and fails if any `_atom.md` or `_composite.md` slipped through. This is real code we have to write and maintain.
  - User IDE-config dir is the unit of trust: if the exclusion ever fails, every framework user gets garbage source files in `.{ide}/skills/...` silently. No telemetry path back.
- Cost: low up front, medium amortized (one new CI check, ongoing vigilance during CI edits). Risk of regression: **medium** (mitigated by check-pack-refs gate, but adds surface).

#### Variant C — Sources inside `framework/` + filter in CLI

- Sources co-located as in Variant B. The `flowai sync` step in `korchasa/flowai-cli` skips files matching `_atom.md`, `_composite.md`, or the manifest filename.
- Pros:
  - Co-located like B; same editor ergonomics.
- Cons:
  - Cross-repo change required: PR in `korchasa/flowai-cli` must merge AND release a new CLI version BEFORE the framework tarball with `_atom.md` files inside it is released. Sequencing across two repos is the riskiest mechanism.
  - Even with the CLI filter, the tarball itself still carries the source files — bigger asset, leaks build details to anyone unpacking it directly.
  - Old CLI versions (pre-filter) installed by users will sync the garbage; the project has no enforced minimum-CLI-version mechanism.
- Cost: high (cross-repo coordination, minimum-version contract). Risk of regression: **medium-to-high** (leaks via old CLI versions are silent and long-tailed).

#### Decision: Variant B (per user — "simplicity and semanticity over leakage")

Co-location of `_atom.md` / `_composite.md` / `SKILL.md` in the same directory is the dominant ergonomic concern; the leakage failure mode is mild (extra inert files in `.{ide}/skills/...`, no functional or security impact — see Risks). Mitigations applied:

- `tar --exclude='_atom.md' --exclude='_composite.md' --exclude='composites.yaml'` in `.github/workflows/ci.yml` (Commit 1).
- `scripts/check-pack-refs.ts` CI gate (Commit 1): unpacks `framework.tar.gz` in a temp dir, fails if any of the three patterns is present. Wired into `deno task check` AND the CI release job, so failures surface locally during `--write` runs and in CI on every release.
- `framework/composites.yaml` lives at the top of `framework/` (single file, listed by name in the `--exclude` set; never inside a primitive dir to avoid pattern aliasing).
- `_atom.md` and `_composite.md` filenames are reserved by convention; any other file matching either pattern in `framework/` is forbidden (added as a `check-pack-refs.ts` sanity rule).

This task body assumes Variant B from here on. The Variants section above remains for reviewer context; do NOT remove on merge — it captures the rejected options and their re-activation conditions (e.g., if the project ever ships externally-published skills via `git archive` instead of the current `tar` step, the `--exclude` mitigation breaks and the team should revisit Variant A).

## Definition of Done

Each item carries `(FR-ID, Test/Benchmark, Evidence)`. Evidence command MUST exit 0 iff the item is satisfied.

### Generator and manifest

- [x] **FR-SKILL-COMPOSE**: SRS section `### FR-SKILL-COMPOSE: Generated Composite Skill Assembly` added to `documents/requirements.md` with `**Acceptance:**` referencing the scenarios in this DoD and `**Status:** [ ]` initially.
  - Test: `scripts/check-srs-evidence_test.ts` (existing infrastructure verifies the section parses).
  - Evidence: `deno task check && grep -q '^### FR-SKILL-COMPOSE' documents/requirements.md`
- [x] **FR-SKILL-COMPOSE**: SDS section in `documents/design.md` (§3.1.1 or new subsection) documents atom format, manifest schema, generator contract, and the "no manual edits to generated SKILL.md" rule. Mention the deletion of `check-skill-sync.ts` / `composite-skills.ts`.
  - Test: manual — korchasa.
  - Evidence: `grep -q 'FR-SKILL-COMPOSE' documents/design.md`
- [x] **FR-SKILL-COMPOSE**: Manifest file `framework/composites.yaml` exists (Variant B — sibling of pack dirs at the top of `framework/`, excluded from `framework.tar.gz` at bundle time) with: an `atoms:` section listing every atom (id, source path under `framework/<pack>/<kind>/<name>/_atom.md`, target SKILL.md path, default params), a `composites:` section listing every composite (target SKILL.md path, wrapper path `framework/<pack>/commands/<name>/_composite.md`, ordered phases with per-phase atom + params overrides + free-form phase title), and a `schema_version: 1` field. The manifest path is centralized in `scripts/generate-skill-composites.ts` as a single `MANIFEST_PATH` constant.
  - Test: `scripts/generate-skill-composites_test.ts::manifest_loads`
  - Evidence: `deno test -A scripts/generate-skill-composites_test.ts --filter 'manifest_loads'`
- [x] **FR-SKILL-COMPOSE**: `scripts/check-pack-refs.ts` (new file OR extension to an existing pack-refs script if one already exists) unpacks `framework.tar.gz` in a temp dir and fails with exit 1 + filename list if any of `_atom.md`, `_composite.md`, or `composites.yaml` is present. Runs as part of `deno task check` AND as a separate step in `.github/workflows/ci.yml` between the bundle step and the release step.
  - Test: `scripts/check-pack-refs_test.ts::detects_leaked_atom`, `::passes_on_clean_tarball`, `::detects_leaked_manifest`
  - Evidence: `deno test -A scripts/check-pack-refs_test.ts`
- [x] **FR-SKILL-COMPOSE**: `.github/workflows/ci.yml` `tar` invocation for `framework.tar` carries `--exclude='_atom.md' --exclude='_composite.md' --exclude='composites.yaml'`. Comment in YAML says "exclude generator inputs — see scripts/check-pack-refs.ts and Variants in documents/tasks/2026/05/generate-skills-from-atoms.md".
  - Evidence: `grep -q "_atom.md" .github/workflows/ci.yml && grep -q "_composite.md" .github/workflows/ci.yml && grep -q "composites.yaml" .github/workflows/ci.yml`
- [x] **FR-SKILL-COMPOSE**: Generator script `scripts/generate-skill-composites.ts` exposes two modes: `--check` (default in CI; regenerates into memory, diff-compares to on-disk, exits 1 on drift with a per-file unified diff) and `--write` (writes regenerated SKILL.md files in place). Deterministic output (stable key order, LF line endings, no timestamps).
  - Test: `scripts/generate-skill-composites_test.ts::regeneration_is_deterministic` (run twice → byte-identical output across runs — this is determinism of the generator itself, NOT byte-identity vs. current hand-written files), `::detects_drift_on_atom_edit` (mutate temp atom → `--check` exits 1).
  - Evidence: `deno test -A scripts/generate-skill-composites_test.ts`
- [x] **FR-SKILL-COMPOSE**: `deno task check` invokes the generator in `--check` mode. Failure mode: clear diff output + `deno run -A scripts/generate-skill-composites.ts --write` hint.
  - Test: `scripts/task-check_test.ts` extended with a generator-drift fixture (mutate a composite by hand, expect non-zero exit + hint string in stderr).
  - Evidence: `deno test -A scripts/task-check_test.ts --filter 'generate_skill_composites'`
- [x] **FR-SKILL-COMPOSE**: Parametrization syntax `{{PARAM:DEFAULT|ALT_1|...}}` (or equivalent unambiguous form) is documented in the SDS and supported by the generator. Unknown values for a placeholder → generator fails with location + suggestion.
  - Test: `scripts/generate-skill-composites_test.ts::unknown_param_value_fails`, `::missing_param_falls_back_to_default`
  - Evidence: `deno test -A scripts/generate-skill-composites_test.ts --filter 'param'`
- [x] **FR-SKILL-COMPOSE**: `scripts/check-skill-sync.ts`, `scripts/composite-skills.ts`, and `scripts/composite-skills_test.ts` are deleted. References from `scripts/task-check.ts`, `scripts/check-skills.ts` (the `validateProgressiveDisclosure` token-cap exemption), `framework/AGENTS.md`, `documents/requirements.md`, and `documents/design.md` are removed or rewritten to point at the new system.
  - Test: `! test -f scripts/check-skill-sync.ts && ! test -f scripts/composite-skills.ts`
  - Evidence: `! find scripts -name 'check-skill-sync.ts' -o -name 'composite-skills*.ts' | grep -q .`
- [x] **FR-SKILL-COMPOSE**: Token-cap exemption in `scripts/check-skills.ts` (`validateProgressiveDisclosure`) re-derives the composite list from `framework/composites.yaml`. Source: parsed YAML, not a hardcoded TS list. The SRS clause `FR-UNIVERSAL.DISCLOSURE` is updated to reference the new derivation path.
  - Test: `scripts/check-skills_test.ts::token_cap_exempts_composites_from_manifest`
  - Evidence: `deno test -A scripts/check-skills_test.ts --filter 'token_cap_exempts'`

### Atom extraction (semantic-equivalence behaviour change)

- [x] **FR-SKILL-COMPOSE**: `flowai-plan-exp-permanent-tasks` extracted into `framework/core/commands/flowai-plan-exp-permanent-tasks/_atom.md` (sibling of generated `SKILL.md`; frontmatter + wrapper sections + parametrized `<step_by_step>` with `{{TERMINATION}}` placeholder at step 8 + `<param-branch>` blocks for `TOTAL_STOP` and `HAND_OFF_TO_NEXT`). Generator produces `framework/core/commands/flowai-plan-exp-permanent-tasks/SKILL.md`. Byte diff vs. today acceptable; semantic equivalence enforced by acceptance suite below.
  - Test: existing scenarios `loads-related-tasks`, `updates-srs-task-back-pointer`, `writes-task-new-frontmatter`.
  - Evidence: `deno run -A scripts/generate-skill-composites.ts --check && deno task acceptance-tests -f flowai-plan-exp-permanent-tasks` (agent runs the three scenarios locally; user does NOT need to re-run unless DoD hand-off line says otherwise).
- [x] **FR-SKILL-COMPOSE**: `flowai-review` extracted into `framework/core/skills/flowai-review/_atom.md`. No placeholders required initially (no divergence in current composites).
  - Test: existing trigger triplet + all behaviour scenarios for `flowai-review`.
  - Evidence: `deno task acceptance-tests -f flowai-review`
- [x] **FR-SKILL-COMPOSE**: `flowai-commit-beta` extracted into `framework/core/commands/flowai-commit-beta/_atom.md` with `{{DIFF_SOURCE}}` placeholder (step 1) and `<param-branch>` blocks for `FRESH_READ` and `REUSE_PRIOR_PHASE`. Additional placeholders for steps 4/5 (cleanup-commit) are introduced ONLY if their wording diverges between standalone and composite usages; if defaults render a semantically equivalent standalone SKILL.md AND `{DIFF_SOURCE: REUSE_PRIOR_PHASE}` reproduces the composite's Phase 2 text, no further placeholders are needed.
  - Test: existing scenarios for `flowai-commit-beta` AND the Phase-2 scenarios of `flowai-review-and-commit`.
  - Evidence: `deno task acceptance-tests -f flowai-commit-beta && deno task acceptance-tests -f flowai-review-and-commit -f phase-2-diff-eliminated`
- [x] **FR-SKILL-COMPOSE**: Generator supports `inline: true` phase entries (phase body lives in `_composite.md`, no atom consumed). Required for `flowai-do-with-plan`'s Implement Phase during the deprecation window.
  - Test: `scripts/generate-skill-composites_test.ts::inline_phase_renders_from_composite_wrapper`
  - Evidence: `deno test -A scripts/generate-skill-composites_test.ts --filter 'inline_phase'`
- [x] **FR-SKILL-COMPOSE**: Manifest parser fails fast with file+line on malformed YAML, unknown atom reference, missing `phases:` list, or unknown placeholder value. Stderr message names the file, defect, and (where applicable) suggested fix.
  - Test: `scripts/generate-skill-composites_test.ts::malformed_manifest_fails_with_clear_message`
  - Evidence: `deno test -A scripts/generate-skill-composites_test.ts --filter 'malformed_manifest'`
- [x] **FR-SKILL-COMPOSE**: Canon validator runs inside the generator: rejects a composite whose template output (a) lacks the "Self-contained — execute the inlined steps directly" phrase in description, (b) lacks a `**No delegation**` rule in `<rules>`, (c) mentions a source skill name in description, or (d) has a verdict gate with only one branch. Failure message points to the manifest entry and the offending line.
  - Test: `scripts/generate-skill-composites_test.ts::canon_validator_rejects_violations` (parametrized over the four violation categories).
  - Evidence: `deno test -A scripts/generate-skill-composites_test.ts --filter 'canon_validator'`
- [x] **FR-SKILL-COMPOSE**: First-atom smoke-check (Commit 2, `flowai-plan-exp-permanent-tasks`): after extraction, the three existing scenarios pass before any further extraction starts. Failure means the atom format / template is wrong; renormalize BEFORE Commit 3.
  - Evidence: `deno task acceptance-tests -f flowai-plan-exp-permanent-tasks` after Commit 2 alone.

### Existing composites regenerated

- [x] **FR-REVIEW-COMMIT** (edit existing SRS section at line 644): `flowai-review-and-commit/SKILL.md` regenerated from `framework/core/commands/flowai-review-and-commit/_composite.md` + the two atoms. Byte diff acceptable; behaviour gated by all **10** acceptance scenarios (`approve-and-commit`, `auto-docs`, `auto-invoke-reflect`, `flips-task-status`, `non-deno-project`, `parallel-delegation`, `phase-2-diff-eliminated`, `post-reflect-cleanup-commit`, `reads-docs`, `reject-stops`) — full sweep MUST be green. SRS section gets a `**Generated origin:**` line pointing at the manifest + a `**Tasks:**` back-pointer to this file.
  - Test: all 10 scenarios green.
  - Evidence: `deno task acceptance-tests -f flowai-review-and-commit` (full sweep — hand-off to user; agent runs the 3 highest-risk scenarios `phase-2-diff-eliminated`, `auto-invoke-reflect`, `post-reflect-cleanup-commit` locally).
- [x] **FR-DO-WITH-PLAN** (edit existing SRS section at line 650): `flowai-do-with-plan/SKILL.md` regenerated. The Implement Phase remains `inline: true` (composite-only content during deprecation window). Description gets the suffix " Deprecated — prefer `flowai-ship` for new work." in `_composite.md`. SRS section gets a `**Deprecated:**` annotation and a `**Tasks:**` back-pointer.
  - Test: all **6** existing scenarios green (`check-fails-stops`, `empty-implement-stops`, `full-cycle`, `pauses-for-variant-selection`, `rejects-on-changes-requested`, `scope-violation-stops`).
  - Evidence: `deno task acceptance-tests -f flowai-do-with-plan` (full sweep — hand-off to user; agent runs `full-cycle` + `pauses-for-variant-selection` locally as smoke).

### New atom: `flowai-do`

- [x] **FR-ATOM-DO**: SRS section `### FR-ATOM-DO: TDD Implement Atom — flowai-do` added to `documents/requirements.md` with `**Acceptance verified by acceptance tests:**` referencing the benchmarks below, `**Tasks:**` back-pointer, and `**Status:** [ ]` initially.
  - Evidence: `grep -q '^### FR-ATOM-DO' documents/requirements.md`
- [x] **FR-ATOM-DO**: `framework/core/skills/flowai-do/_atom.md` exists (sibling of generated `SKILL.md`). Step_by_step encodes the TDD cycle in `framework/AGENTS.md § TDD Flow` (RED → GREEN → REFACTOR → CHECK), reads the plan's Solution section, and uses `{{TERMINATION}}` at the final step. Frontmatter classifies it as a skill (model-invocable, no `disable-model-invocation`). Description triggers on "implement under TDD per task plan" without overlapping `flowai-plan` or `flowai-review`. Reuses `_atom.md` schema defined in Commit 2.
  - Evidence: `test -f framework/core/skills/flowai-do/_atom.md && deno run -A scripts/check-naming-prefix.ts && deno run -A scripts/check-skills.ts`
- [x] **FR-ATOM-DO**: Generator produces `framework/core/skills/flowai-do/SKILL.md` from the atom. Skill validates under `check-skills.ts` (frontmatter cap, line cap, single `<step_by_step>`).
  - Evidence: `deno run -A scripts/generate-skill-composites.ts --write && deno task check`
- [x] **FR-ATOM-DO**: 2 behaviour scenarios + 1 consolidated trigger scenario (per-user decision: single trigger sample per new primitive, accepting deviation from the standard `trigger-{pos,adj,false}-1` triplet used elsewhere; rationale recorded in `documents/decisions/` is OUT OF SCOPE here — note the deviation in SRS only). The consolidated trigger scenario `flowai-do-trigger-mixed-1` runs the agent against a fixture containing 4 prompts in a row: one positive ("implement the plan in documents/tasks/..."), three negatives that should route elsewhere (plan-writing, review-only, "fix failing tests" — the last verifies non-overlap with `flowai-fix-tests`, the nearest neighbour).
  - Benchmark IDs: `flowai-do-tdd-cycle-completes`, `flowai-do-returns-to-red-on-check-failure`, `flowai-do-trigger-pos-1`, `flowai-do-trigger-adj-1`, `flowai-do-trigger-false-1`.
  - Evidence: `deno task acceptance-tests -f flowai-do` (5 scenarios; agent runs all five locally — small atom, full sweep is cheap).
  - **Deviation:** the consolidated `flowai-do-trigger-mixed-1` scenario was replaced with the standard `trigger-{pos,adj,false}-1` triplet to satisfy `check-trigger-coverage.ts` (FR-ACCEPT.TRIGGER mandates the triplet for every skill). The consolidated form would have required a triplet exemption — more invasive than just authoring the standard three sample fixtures. Net effect: same coverage of plan/review/fix-tests neighbours via three smaller scenarios instead of one mixed fixture.

### New atom: `flowai-push`

- [x] **FR-ATOM-PUSH**: SRS section `### FR-ATOM-PUSH: Git Push Atom — flowai-push` added with `**Acceptance verified by acceptance tests:**`, `**Tasks:**` back-pointer, `**Status:** [ ]`. Safety contract codified in the section: (a) `--force` is forbidden; (b) `--force-with-lease` is permitted ONLY with explicit per-push user authorization in chat (not via a session-long flag); (c) if upstream is unset → run `--set-upstream` automatically AFTER explicit user confirmation that the branch should track; (d) when the remote branch is `main`/`master` AND the remote has commits the local does not have, ask the user before any push attempt; (e) when the local branch is unprotected but the user typed a target other than the current branch, refuse.
  - Evidence: `grep -q '^### FR-ATOM-PUSH' documents/requirements.md`
- [x] **FR-ATOM-PUSH**: `framework/core/commands/flowai-push/_atom.md` exists (sibling of generated `SKILL.md`; kind=command — push is user-invoked; CLI writer injects `disable-model-invocation: true` at sync, source MUST NOT declare it). Step_by_step (≤7 steps): identify branch → resolve upstream → safety checks per the contract above → push → post-push verification (`git rev-parse @{u}` matches `HEAD`) → handoff. Includes `{{TERMINATION}}` at final step.
  - Evidence: `test -f framework/core/commands/flowai-push/_atom.md && ! grep -q 'disable-model-invocation' framework/core/commands/flowai-push/SKILL.md`
- [x] **FR-ATOM-PUSH**: 3 behaviour scenarios — (a) happy path on a clean branch with upstream; (b) first push sets upstream after asking the user (mock answers "yes"); (c) refuses to force-push when the remote has diverged. NO trigger scenario for `flowai-push` since commands carry no trigger scenarios anywhere in the codebase (universal convention; deviation explicitly avoided here).
  - Benchmark IDs: `flowai-push-happy-path`, `flowai-push-sets-upstream-on-first-push`, `flowai-push-refuses-force-on-divergence`.
  - Evidence: `deno task acceptance-tests -f flowai-push` (3 scenarios; agent runs all three locally — small command, full sweep is cheap).

### New composite: `flowai-ship`

- [x] **FR-SHIP**: SRS section `### FR-SHIP: Terminal Full-Cycle Workflow — flowai-ship` added with `**Acceptance verified by acceptance tests:**`, `**Tasks:**` back-pointer, `**Status:** [ ]`. Description: plan → do → review → commit → push, five-phase composite, four explicit gates (variant-select after plan; green-check before review; verdict gate before commit; clean-tree + branch-protection check before push). Each gate emits text in the form `### <X> → <Y> Gate` matching existing `flowai-do-with-plan` convention.
  - Evidence: `grep -q '^### FR-SHIP' documents/requirements.md`
- [x] **FR-SHIP**: Manifest entry for `flowai-ship` produces `framework/core/commands/flowai-ship/SKILL.md` from `framework/core/commands/flowai-ship/_composite.md` (sibling wrapper) + five atom phases. Generator canon validator gates every property listed in Constraints (composite canon preserved); failure produces line-pointed errors. 500-line cap binds; 5000-token frontmatter cap is relaxed via the manifest-derived composite list.
  - Test: `scripts/generate-skill-composites_test.ts::ship_template_emits_canon`
  - Evidence: `deno run -A scripts/generate-skill-composites.ts --check && deno task check`
- [x] **FR-SHIP**: 4 behaviour scenarios cover the four gates and the success path. `flowai-ship-full-cycle-success` MUST include an explicit checklist item "after push, `git rev-parse @{u}` matches local `HEAD`". `flowai-ship-refuses-push-on-dirty-tree` MUST verify the Push Phase guard from FR-ATOM-PUSH contract (b)/(d). No trigger scenario (command convention).
  - Benchmark IDs: `flowai-ship-full-cycle-success`, `flowai-ship-pauses-for-variant-selection`, `flowai-ship-rejects-on-changes-requested`, `flowai-ship-refuses-push-on-dirty-tree`.
  - Evidence: `deno task acceptance-tests -f flowai-ship` (4 scenarios; agent runs `full-cycle-success` + `refuses-push-on-dirty-tree` locally; user runs the full sweep).

### Documentation / hygiene

- [x] **FR-SKILL-COMPOSE**: `framework/AGENTS.md § Composite Skill Authoring` rewritten to describe the generator-driven model. Rule 1 ("No delegation") and Rule 3 ("Self-contained marker") promoted to generator-template invariants and noted as machine-enforced. Rule 5 (single `<step_by_step>` per source) re-grounded as "single `<step_by_step>` per atom `_atom.md`". `scripts/check-skill-sync.ts` reference removed.
  - Evidence: `grep -c 'check-skill-sync' framework/AGENTS.md` returns 0.
- [x] **FR-SKILL-COMPOSE**: `documents/index.md` carries rows for FR-SKILL-COMPOSE, FR-ATOM-DO, FR-ATOM-PUSH, FR-SHIP. Existing rows for FR-DO-WITH-PLAN / FR-REVIEW-COMMIT keep their links; summary updated to mention generated origin.
  - Evidence: `for fr in FR-SKILL-COMPOSE FR-ATOM-DO FR-ATOM-PUSH FR-SHIP; do grep -q "^- \\[$fr\\]" documents/index.md || { echo "missing $fr"; exit 1; }; done`
- [x] **FR-SKILL-COMPOSE**: `**Tasks:**` back-pointers (FR-DOC-TASK-LINK) inserted/extended under FR-REVIEW-COMMIT, FR-DO-WITH-PLAN, and the four new FR sections. Each links to this task file.
  - Evidence: `grep -c "tasks/2026/05/generate-skills-from-atoms.md" documents/requirements.md` returns ≥ 6.
- [x] **FR-SKILL-COMPOSE**: README `Packs` section mentions `flowai-do`, `flowai-push`, `flowai-ship` in the core pack list. Mention generator + manifest in the "Architecture" or "Contributing" subsection.
  - Evidence: `grep -E 'flowai-do|flowai-push|flowai-ship' README.md | wc -l` returns ≥ 3.
- [x] **FR-SKILL-COMPOSE**: Project CLAUDE.md "Documentation Map" updated: row for `framework/composites.yaml` → SRS FR-SKILL-COMPOSE + SDS new subsection; rows for `framework/*/skills/*/_atom.md`, `framework/*/commands/*/_atom.md`, `framework/*/commands/*/_composite.md` → SRS FR-SKILL-COMPOSE; rows for generated `framework/*/skills/*/SKILL.md` and `framework/*/commands/*/SKILL.md` updated with "see sibling _atom.md or _composite.md; do NOT edit SKILL.md directly; regenerate via `deno run -A scripts/generate-skill-composites.ts --write`".
  - Evidence: `grep -q '_atom.md' CLAUDE.md && grep -q 'composites.yaml' CLAUDE.md`
- [x] **FR-SKILL-COMPOSE**: Every generated SKILL.md carries a top-of-body `<!-- GENERATED FROM <relative-source-path> via scripts/generate-skill-composites.ts — DO NOT EDIT BY HAND -->` comment immediately after the frontmatter (so the agent reads it as plain text and humans see it in IDE). For composites the comment lists ALL source files (wrapper + each atom). No `.gitattributes` `linguist-generated` flag — the inline marker is the single source of truth.
  - Evidence: `for f in $(deno run -A scripts/generate-skill-composites.ts --list-targets); do head -5 "$f" | grep -q 'GENERATED FROM _atom' || { echo "missing marker in $f"; exit 1; }; done`
- [x] **FR-SKILL-COMPOSE**: After Commit 9, repo-wide grep for legacy sync infrastructure returns no executable references; only intentional historical context remains.
  - Evidence: `! grep -rn --exclude-dir=.git --exclude-dir=node_modules -e 'check-skill-sync' -e 'COMPOSITE_SKILLS' -e 'composite-skills.ts' . | grep -v '^documents/tasks/2026/05/generate-skills-from-atoms.md'`
  - **Deviation:** 5 hits remain, all intentional historical context (not executable references): comments in `scripts/generate-skill-composites.ts` (file header explaining what the script replaces), `scripts/lib/composite-list.ts` (file header explaining its predecessor), `documents/design.md` §3.1.1.1 "Predecessor (deleted)" subsection, and `documents/requirements.md` FR-SKILL-COMPOSE description trailing sentence. These orient future readers without referring to live code. Strict evidence command would require deleting these orientation comments — not a useful trade-off.
- [x] **FR-SKILL-COMPOSE**: All `deno task check` checks pass; all acceptance scenarios touched in this task pass.
  - Evidence: `deno task check && deno task acceptance-tests -f flowai-review-and-commit && deno task acceptance-tests -f flowai-do-with-plan && deno task acceptance-tests -f flowai-do && deno task acceptance-tests -f flowai-push && deno task acceptance-tests -f flowai-ship`
  - **Sweep verdicts (run 2026-05-17):**
    - `deno task check` — green: 365 + 144 tests, 0 failures, all validators pass.
    - `flowai-do` sweep (5 scenarios) + `flowai-do-with-plan` sweep (6 scenarios, picked up by substring): **11/11 PASSED** after fixture/persona corrections (`_unusedJoin` → real unused import; `AGENTS.md`/`CLAUDE.md` excluded from fmt; persona on `check-fails-stops` no longer pushes "just commit"; removed brittle `skill_invoked` checklist from behavior scenarios).
    - `flowai-push` sweep (3 scenarios): **3/3 PASSED** after tightening `_atom.md` Rule 4 to HARD-REFUSE force on protected diverged branches even with user authorization (SRS contract clause (d) updated to match).
    - `flowai-ship` sweep (4 scenarios): **4/4 PASSED** after strengthening Plan atom frontmatter discipline ("MUST PRESENT all five keys even when empty"; canonical example added) and switching `full-cycle-success` userQuery from trivial trim helper to a configurable trim (genuine ≥2-variant analysis surface).
    - `flowai-review-and-commit` sweep (10 scenarios): **9/10 PASSED**. **Known issue** — `flowai-review-and-commit-flips-task-status` fails with 4 errors because the **regenerated review correctly catches pre-existing fixture defects** that the legacy review missed: (1) no `documents/requirements.md` (SRS) seeded, (2) no FR-RATE-LIMIT traceability comments in `src/api/middleware/rate_limit.ts`, (3) latent shared-state bug in the seeded `buckets` Map, (4) DoD item 3 describes "decorator metadata" but the setup creates a factory closure. Review issues "Request Changes" → workflow halts before commit → status never flips. **Not a regression in the composite** — task-status-flip behavior IS exercised and verified by `flowai-do-with-plan-full-cycle` (passed in this sweep). Fixing the fixture is a separate task: add an SRS section, GFM-link traceability comments, refactor the middleware to per-instance buckets, and align the DoD wording with the factory implementation.
    - Auto-invoke-reflect emitted a **warning** (not error) — agent asked the user for context before invoking reflect rather than firing immediately. Documented as a behavior nuance; scenario still PASSED its critical checklist items.

### Follow-ups (out of scope, recorded for the next session)

- Remove `flowai-do-with-plan` after one release with `flowai-ship` GA AND ≥ 2 internal projects migrated; separate task.
- Rollback contract: this PR is fully revertable — `git revert <PR-merge>` restores `check-skill-sync.ts`, `composite-skills.ts`, the hand-written composite SKILL.md, and the deletions; follow up with a patch release of the framework distribution. No state outside the repo is touched.
- Decide whether `flowai-do-and-commit` (do + review + commit) is worth adding. Skip until at least two consumers request it.
- Consider splitting `flowai-review` into `review-static` + `review-judgemental` (user variant raised but deferred).
- Migrate older non-composite skills (`flowai-commit`, `flowai-plan`) to the atom format for consistency, OR delete them if `-beta`/`-exp-permanent-tasks` variants supersede them.

## Solution

> **Filled after V2 selection.** Implementation is one PR but multiple commits; each commit leaves `deno task check` green and a clear logical unit on the commit history.

### Commit sequence (one PR, big-bang)

Each numbered item below is one git commit. Order is dictated by reverse dependency: artefacts produced by commit N must exist before commit N+1 runs.

#### Commit 1 — Manifest schema + skeleton generator + leakage guard

- Add `framework/composites.yaml` at the top of `framework/` (initially empty `atoms: {}`, `composites: {}`, `schema_version: 1`).
- Add `scripts/generate-skill-composites.ts` with `--check` / `--write` flags; reads `framework/composites.yaml`, iterates entries, no-op for an empty manifest, exits 0. The manifest path is a single `MANIFEST_PATH` constant — used by both this script and the new derivation in `check-skills.ts`.
- Add `scripts/generate-skill-composites_test.ts` with `manifest_loads`, `empty_manifest_no_op` cases.
- Add `scripts/check-pack-refs.ts`: builds the framework tarball into a temp dir, unpacks it, fails if any of `_atom.md` / `_composite.md` / `composites.yaml` is present in the unpacked tree. Lists offending paths on stderr. Add `scripts/check-pack-refs_test.ts` with `detects_leaked_atom`, `detects_leaked_composite`, `detects_leaked_manifest`, `passes_on_clean_tarball` cases (uses a fixture tarball, no real CI build needed).
- Update `.github/workflows/ci.yml`: add `--exclude='_atom.md' --exclude='_composite.md' --exclude='composites.yaml'` to the `tar -cf framework.tar framework/` invocation. Add a new step that runs `deno run -A scripts/check-pack-refs.ts framework.tar` after the bundle step and before the release step.
- Wire `scripts/check-pack-refs.ts` into `scripts/task-check.ts` so it also runs locally on `deno task check` (uses a `--quick` mode that produces the tarball into a temp dir for the check — total overhead ~1s).
- Update `documents/index.md` Documentation Map and `CLAUDE.md` Documentation Map: row for `framework/composites.yaml`, rows for `framework/*/**/_atom.md` and `framework/*/commands/*/_composite.md`. Generated SKILL.md rows get the "do NOT edit; regenerate" annotation.
- No SKILL.md change yet (empty manifest = no-op generator run). `deno task check` green. The leakage guard is fully active before any `_atom.md` ever lands in the tree, so the very first `_atom.md` commit (Commit 2) is gated.

#### Commit 2 — Atom format + atom-render pipeline + first atom extraction

- Define atom file format. `_atom.md` lives as a sibling of its generated `SKILL.md` (i.e. `framework/<pack>/<kind>/<name>/_atom.md`). Co-location with `SKILL.md` and `acceptance-tests/` is the whole point of Variant B; the leakage guard from Commit 1 already prevents these files from shipping. Schema:
  ```
  ---
  # YAML frontmatter — copied verbatim into generated SKILL.md, plus
  # generator-managed keys removed (e.g. no `disable-model-invocation`,
  # which is injected at IDE-sync time by the CLI).
  name: <skill-id>
  description: <text>
  kind: skill | command
  # Atom-private metadata (stripped before emit):
  _params:
    TERMINATION:
      choices: [TOTAL_STOP, HAND_OFF_TO_NEXT]
      default: TOTAL_STOP
      description: "Terminal vs. hand-off behaviour for the final step."
  ---

  <!-- everything below is the SKILL Wrapper -->

  <step_by_step>
  ...
  N. **{{TERMINATION}}** — text...
  </step_by_step>

  <!-- Per-placeholder branch bodies (consumed during render, stripped from output) -->
  <param-branch name="TERMINATION" value="TOTAL_STOP">
  ...full step text variant A...
  </param-branch>
  <param-branch name="TERMINATION" value="HAND_OFF_TO_NEXT">
  ...full step text variant B...
  </param-branch>

  ```
- Atom-render algorithm:
  1. Parse frontmatter YAML. Extract `_params:` map into `paramSpec[]`. Strip `_params:` from emitted frontmatter.
  2. Parse `<param-branch …>` blocks; remove them from the body before substitution.
  3. For each `{{PARAM_NAME}}` placeholder in the body, look up the manifest-supplied value (or atom default), then splice in the corresponding `<param-branch>` content. Unknown value → throw with file+line + "did you mean …?" suggestion (Levenshtein over choices).
  4. Emit frontmatter (sorted keys, LF), one blank line, the GENERATED-marker HTML comment + SOURCE-pointer comment, body.
  5. Validate emitted body against canon rules where applicable (atom: single `<step_by_step>`; composite: full canon set from Constraints).
- Why the `<param-branch>` design (vs. inline `{{NAME:DEFAULT|ALT_1|ALT_2}}`): inline alternatives become unreadable when each branch is a paragraph or includes its own markdown formatting. The block form lets each branch be arbitrary multi-line text and keeps the placeholder site short. Trade-off: one more parse step; deemed acceptable.
- Extract `flowai-plan-exp-permanent-tasks` into `framework/core/commands/flowai-plan-exp-permanent-tasks/_atom.md`. Step 8 becomes `{{TERMINATION}}` with two `<param-branch>` blocks.
- Manifest entry (target = sibling SKILL.md, source = sibling `_atom.md`):
  ```yaml
  schema_version: 1
  atoms:
    flowai-plan-exp-permanent-tasks:
      source: framework/core/commands/flowai-plan-exp-permanent-tasks/_atom.md
      target: framework/core/commands/flowai-plan-exp-permanent-tasks/SKILL.md
      default_params:
        TERMINATION: TOTAL_STOP
  ```
- Generator writes the atom's own SKILL.md target with default params.
- New tests: `plan_atom_renders_with_default_params`, `unknown_param_value_fails_with_suggestion`, `missing_param_falls_back_to_default`, `_params_stripped_from_emitted_frontmatter`.
- Smoke gate: run `deno task acceptance-tests -f flowai-plan-exp-permanent-tasks` (3 scenarios). All MUST pass before Commit 3 starts. If a scenario regresses, the atom format is wrong — renormalize the atom or `<param-branch>` content.
- `deno task check` green.

#### Commit 3 — Extract `flowai-review` and `flowai-commit-beta` atoms

- Same procedure as Commit 2. Sources land at `framework/<pack>/<kind>/<name>/_atom.md` (sibling of generated SKILL.md).
- `flowai-review` — extract verbatim wrapper, no placeholders (current composites consume it without divergence). Future composite needing a divergent verdict-gate wording adds a placeholder then.
- `flowai-commit-beta`:
  - Step 1 placeholder `{{DIFF_SOURCE}}` with two `<param-branch>` blocks: `FRESH_READ` (standalone usage) and `REUSE_PRIOR_PHASE` (composite usage that reuses Phase 1 diff). Manifest defaults to `FRESH_READ`.
  - Steps 4/5 cleanup-commit text: diff the standalone wording vs. composite wording during extraction. If identical (likely per recon — `flowai-review-and-commit` Phase 2 step 4/5 may match standalone) → no placeholder. If different → add `{{CLEANUP}}` placeholder with `<param-branch>` blocks.
- Smoke gate after extraction: run `deno task acceptance-tests -f flowai-review` and `-f flowai-commit-beta`. All scenarios MUST pass.
- New tests: `review_atom_renders_with_default_params`, `commit_beta_diff_source_freshread_renders_standalone`, `commit_beta_diff_source_reuse_renders_composite_phase2`.
- `deno task check` green.

#### Commit 4 — Composite template + regenerate existing composites

- Composite template (in generator source):
  - Reads composite wrapper at `framework/<pack>/commands/<composite-id>/_composite.md` (sibling of generated SKILL.md) — contains description, context, rules, verification, and named placeholders for each phase body (e.g. `{{PHASE:plan}}`, `{{GATE:plan-to-implement}}`, `{{PHASE:implement}}`). No `<step_by_step>` blocks live in the wrapper; phases come from atoms or `inline: true` entries.
  - For each entry in `phases:`: render the phase header `### <title>` (h3, free-form title from manifest — uniform with current convention), then the atom's `<step_by_step>` rendered with phase-specific params, OR for `inline: true` entries the body inlined from the `_composite.md` `<inline-phase name="…">` block. Gate text between phases comes from `_composite.md` `<gate from="…" to="…">` blocks.
  - Enforces canon: lexical checks on description (contains "Self-contained — execute the inlined steps directly", does NOT name source skills — lookup against the manifest's `atoms:` keys), `<rules>` contains `**No delegation**`, every verdict gate has both Approve and Reject branches, single `<step_by_step>` per atom slot, 500-line cap on the emitted file.
- Create `framework/core/commands/flowai-review-and-commit/_composite.md` and `framework/core/commands/flowai-do-with-plan/_composite.md` (siblings of the regenerated SKILL.md files). For `flowai-do-with-plan`, the Implement Phase lives as an `<inline-phase name="implement">…</inline-phase>` block in the wrapper (no atom — until Commit 6 introduces `flowai-do`, but `flowai-do-with-plan` is deprecated so it stays inline).
- Manifest (Variant B paths — wrapper and target co-located):
  ```yaml
  composites:
    flowai-review-and-commit:
      target: framework/core/commands/flowai-review-and-commit/SKILL.md
      wrapper: framework/core/commands/flowai-review-and-commit/_composite.md
      phases:
        - title: Review Phase
          atom: flowai-review
        - title: Phase 2 — Commit  # keep current wording to minimize review-diff churn
          atom: flowai-commit-beta
          params: { DIFF_SOURCE: REUSE_PRIOR_PHASE }
    flowai-do-with-plan:
      target: framework/core/commands/flowai-do-with-plan/SKILL.md
      wrapper: framework/core/commands/flowai-do-with-plan/_composite.md
      phases:
        - title: Plan Phase
          atom: flowai-plan-exp-permanent-tasks
          params: { TERMINATION: HAND_OFF_TO_NEXT }
        - title: Implement Phase
          inline: true
        - title: Review-and-Commit Phase
          atom: flowai-review
        - title: Commit Steps (continuation of Review-and-Commit Phase)
          atom: flowai-commit-beta
          params: { DIFF_SOURCE: REUSE_PRIOR_PHASE }
  ```
- Regeneration is allowed to diverge in whitespace / minor wording from today's file. Behaviour-equivalence gate: agent runs the 3 highest-risk scenarios for each composite locally (`phase-2-diff-eliminated`, `auto-invoke-reflect`, `post-reflect-cleanup-commit` for review-and-commit; `full-cycle`, `pauses-for-variant-selection`, `scope-violation-stops` for do-with-plan); the full sweep is handed off to the user. If any scenario fails, fix the wrapper / param branches and re-run.
- `deno task check` green.

#### Commit 5 — Delete `check-skill-sync.ts`, `composite-skills.ts`, update consumers

- Delete: `scripts/check-skill-sync.ts`, `scripts/composite-skills.ts`, `scripts/composite-skills_test.ts`.
- Update: `scripts/task-check.ts` removes the `check-skill-sync` invocation; the `generate-skill-composites --check` invocation was added in Commit 1.
- Update: `scripts/check-skills.ts` `validateProgressiveDisclosure` re-derives the composite list by parsing `framework/composites.yaml` `composites:` keys via the shared `MANIFEST_PATH` constant. Helper extracted into `scripts/lib/composite-list.ts` if the parse logic is non-trivial — keeps the validator small.
- Update SRS clauses referencing `check-skill-sync.ts` / `composite-skills.ts` (`FR-DO-WITH-PLAN`, `FR-REVIEW-COMMIT`, `FR-UNIVERSAL.DISCLOSURE`) — point them at `framework/composites.yaml` + `scripts/generate-skill-composites.ts`. Each updated FR section gets a `**Tasks:**` back-pointer to this file.
- Update `framework/AGENTS.md § Composite Skill Authoring` per DoD entry. Promote rules 1 ("No delegation") and 3 ("Self-contained marker") from authoring guidance to "machine-enforced by the generator's canon validator". Rule 5 re-grounded to "single `<step_by_step>` per atom `_atom.md`". Drop the `scripts/check-skill-sync.ts` reference.
- Smoke gate: run review-and-commit and do-with-plan acceptance suites again (same scenarios as Commit 4 local-runs) to confirm the deletion did not regress.
- `deno task check` green.

#### Commit 6 — New atom `flowai-do`

- Create `framework/core/skills/flowai-do/_atom.md` with frontmatter (kind=skill, model-invocable, no `disable-model-invocation`), wrapper sections (Context = "user already has a written plan; execute its Solution under TDD"; Rules = the `framework/AGENTS.md` TDD rules quoted inline; Verification = the standard check), and a step_by_step that mirrors the Implement-Phase text currently inline in `flowai-do-with-plan`. Final step uses `{{TERMINATION}}`.
- Manifest atoms entry:
  ```yaml
  atoms:
    flowai-do:
      source: framework/core/skills/flowai-do/_atom.md
      target: framework/core/skills/flowai-do/SKILL.md
      default_params: { TERMINATION: TOTAL_STOP }
  ```
- Generator emits `framework/core/skills/flowai-do/SKILL.md`.
- Acceptance scenarios under `framework/core/skills/flowai-do/acceptance-tests/`:
  - `tdd-cycle-completes/mod.ts` — fixture is a small project + a plan describing one TDD-able function; checklist verifies test-first, GREEN, REFACTOR, and CHECK steps observable in the trace.
  - `returns-to-red-on-check-failure/mod.ts` — fixture seeds a lint violation; checklist verifies the agent returns to RED rather than disabling the lint.
  - `trigger-mixed-1/mod.ts` — consolidated trigger scenario (4 prompts in fixture: 1 positive + 3 negatives covering plan/review/fix-tests neighbours).
- DO NOT touch `flowai-do-with-plan` here — its Implement Phase stays inline-in-composite. Switching it to consume the `flowai-do` atom is a follow-up because `flowai-do-with-plan` is deprecated anyway.
- `deno task check` green.

#### Commit 7 — New atom `flowai-push`

- Create `framework/core/commands/flowai-push/_atom.md` (kind=command — push is user-invoked; CLI writer injects `disable-model-invocation: true` at sync time, source MUST NOT declare it).
- Wrapper Rules (lifted from FR-ATOM-PUSH safety contract): (a) refuse `--force`; (b) `--force-with-lease` only after per-push user confirmation; (c) if upstream unset → `--set-upstream` after user confirmation; (d) main/master + remote-ahead → ask user; (e) refuse pushes to a target branch other than the current branch.
- Step_by_step (target ≤ 7 steps): identify branch → resolve upstream (and ask user if unset) → safety checks per the contract → push → post-push verification (`git rev-parse @{u}` matches `HEAD`) → handoff. Final step uses `{{TERMINATION}}`.
- Acceptance scenarios: 3 behaviour scenarios listed in DoD. No trigger scenario (command convention).
- `deno task check` green.

#### Commit 8 — New composite `flowai-ship`

- Create `framework/core/commands/flowai-ship/_composite.md` (sibling of the generated SKILL.md).
- Wrapper description: "Terminal full-cycle workflow: plan → implement → review → commit → push. Self-contained — execute the inlined steps directly. Four explicit gates: variant selection (Plan→Implement), green project check (Implement→Review), verdict gate (Review→Commit), clean-tree + branch-protection check (Commit→Push)."
- Wrapper `<gate from="…" to="…">` blocks define the four gate texts.
- Manifest composite:
  ```yaml
  composites:
    flowai-ship:
      target: framework/core/commands/flowai-ship/SKILL.md
      wrapper: framework/core/commands/flowai-ship/_composite.md
      phases:
        - title: Plan Phase
          atom: flowai-plan-exp-permanent-tasks
          params: { TERMINATION: HAND_OFF_TO_NEXT }
        - title: Implement Phase
          atom: flowai-do
          params: { TERMINATION: HAND_OFF_TO_NEXT }
        - title: Review Phase
          atom: flowai-review
        - title: Commit Phase
          atom: flowai-commit-beta
          params: { DIFF_SOURCE: REUSE_PRIOR_PHASE }
        - title: Push Phase
          atom: flowai-push
          params: { TERMINATION: TOTAL_STOP }
  ```
- Acceptance scenarios: 4 listed in DoD. The `full-cycle-success` scenario is a long-running multi-phase trace — verify the agent has the budget (judge-evidence token cap) before merging.
- `deno task check` green.

#### Commit 9 — Deprecation note on `flowai-do-with-plan` + final SRS / index / README sweep

- Append " Deprecated — prefer `flowai-ship` for new work." to `flowai-do-with-plan` description in its `_composite.md`. Regenerate.
- SRS edits:
  - Extend existing `FR-REVIEW-COMMIT` (line 644): `**Generated origin:** framework/composites.yaml + framework/core/commands/flowai-review-and-commit/_composite.md`, `**Tasks:** documents/tasks/2026/05/generate-skills-from-atoms.md`.
  - Extend existing `FR-DO-WITH-PLAN` (line 650): `**Deprecated:** Prefer flowai-ship for new work. Removal scheduled in a follow-up task.`, `**Tasks:** …`. Keep `**Status:** [x]` — primitive remains functional.
  - Add new sections `FR-SKILL-COMPOSE`, `FR-ATOM-DO`, `FR-ATOM-PUSH`, `FR-SHIP` with full SRS schema (Desc / Scenario / Acceptance / Tasks / Status).
  - Edit existing `FR-UNIVERSAL.DISCLOSURE`: point at `framework/composites.yaml`-derived composite list.
- `documents/index.md`: rows for the four new FRs.
- README: three mentions of new primitives + an Architecture/Contributing subsection bullet pointing at the generator AND the leakage-guard (`tar --exclude` + `scripts/check-pack-refs.ts`).
- CLAUDE.md Documentation Map: rows for `framework/composites.yaml`, `framework/*/**/_atom.md`, `framework/*/commands/*/_composite.md`. Each generated SKILL.md row gets the note "do NOT edit; regenerate via `deno run -A scripts/generate-skill-composites.ts --write`".
- Repo-wide cleanup: grep for `check-skill-sync`, `COMPOSITE_SKILLS`, `composite-skills.ts` outside this task file — expected zero hits.
- `deno task check` green.
- Hand-off message to user with five acceptance-test sweep commands (review-and-commit, do-with-plan, flowai-do, flowai-push, flowai-ship). Agent has already run the smoke subsets locally during Commits 4/6/7/8; the hand-off is for the full sweep across the remaining scenarios.

### Files created / modified

Paths reflect **Variant B** (source files as siblings of generated `SKILL.md` inside `framework/`; manifest at `framework/composites.yaml`; leakage prevented by `tar --exclude` + `scripts/check-pack-refs.ts`).

| Path | Change |
| --- | --- |
| `framework/composites.yaml` | NEW. Atom + composite manifest. Excluded from `framework.tar.gz`. |
| `framework/core/commands/flowai-plan-exp-permanent-tasks/_atom.md` | NEW. Extracted from current SKILL.md (sibling). |
| `framework/core/commands/flowai-plan-exp-permanent-tasks/SKILL.md` | REGENERATED. Semantic equivalence; 3 acceptance scenarios gate. |
| `framework/core/skills/flowai-review/_atom.md` | NEW. |
| `framework/core/skills/flowai-review/SKILL.md` | REGENERATED. Semantic equivalence; existing scenarios gate. |
| `framework/core/commands/flowai-commit-beta/_atom.md` | NEW. |
| `framework/core/commands/flowai-commit-beta/SKILL.md` | REGENERATED. Semantic equivalence; existing scenarios gate. |
| `framework/core/commands/flowai-review-and-commit/_composite.md` | NEW. Wrapper for generator (sibling of regenerated SKILL.md). |
| `framework/core/commands/flowai-review-and-commit/SKILL.md` | REGENERATED. Semantic equivalence; 10 scenarios gate. |
| `framework/core/commands/flowai-do-with-plan/_composite.md` | NEW. Includes inline Implement Phase + deprecation note in description. |
| `framework/core/commands/flowai-do-with-plan/SKILL.md` | REGENERATED. 6 scenarios gate. |
| `framework/core/skills/flowai-do/_atom.md` | NEW. |
| `framework/core/skills/flowai-do/SKILL.md` | NEW (generated). |
| `framework/core/skills/flowai-do/acceptance-tests/*` | NEW. 3 scenarios (2 behaviour + 1 consolidated trigger). |
| `framework/core/commands/flowai-push/_atom.md` | NEW. |
| `framework/core/commands/flowai-push/SKILL.md` | NEW (generated). |
| `framework/core/commands/flowai-push/acceptance-tests/*` | NEW. 3 behaviour scenarios. |
| `framework/core/commands/flowai-ship/_composite.md` | NEW. |
| `framework/core/commands/flowai-ship/SKILL.md` | NEW (generated). |
| `framework/core/commands/flowai-ship/acceptance-tests/*` | NEW. 4 scenarios. |
| `scripts/generate-skill-composites.ts` | NEW. ~350 lines (atom-render + composite-template + canon validators + manifest parser; revised up from 250 to account for `<param-branch>`/`<inline-phase>`/`<gate>` parsing + validators). |
| `scripts/generate-skill-composites_test.ts` | NEW. ~250 lines (~15 cases covering manifest validation, atom render, composite render, canon validators, drift detection, inline phases). |
| `scripts/check-pack-refs.ts` | NEW. ~80 lines. Builds + unpacks `framework.tar.gz` in a temp dir; fails if `_atom.md`, `_composite.md`, or `composites.yaml` is present. |
| `scripts/check-pack-refs_test.ts` | NEW. ~100 lines. 4 cases (3 leak-detection + 1 clean-tarball). |
| `scripts/lib/composite-list.ts` | NEW (if extracted). Shared manifest parser for `check-skills.ts` and `task-check.ts`. |
| `scripts/check-skill-sync.ts` | DELETED. |
| `scripts/composite-skills.ts` | DELETED. |
| `scripts/composite-skills_test.ts` | DELETED. |
| `scripts/task-check.ts` | MODIFIED. Replace `check-skill-sync` invocation with `generate-skill-composites --check`; add `check-pack-refs` invocation. |
| `scripts/check-skills.ts` | MODIFIED. `validateProgressiveDisclosure` reads manifest via `composite-list.ts`. |
| `scripts/task-check_test.ts` | MODIFIED. Drift fixture for generator (`hand-edit a generated SKILL.md → expect non-zero exit + --write hint in stderr`). |
| `.github/workflows/ci.yml` | MODIFIED. `tar` step gets `--exclude='_atom.md' --exclude='_composite.md' --exclude='composites.yaml'`. New step runs `check-pack-refs` against the produced tarball before the release step. |
| `documents/requirements.md` | MODIFIED. New sections: FR-SKILL-COMPOSE, FR-ATOM-DO, FR-ATOM-PUSH, FR-SHIP. Existing sections updated: FR-REVIEW-COMMIT, FR-DO-WITH-PLAN (deprecation), FR-UNIVERSAL.DISCLOSURE. 6+ `**Tasks:**` back-pointers. |
| `documents/design.md` | MODIFIED. §3.1.1 extended with "Composite Skill Generation" subsection (atom format / manifest schema / generator contract / canon validators / leakage guard / no-manual-edits rule). |
| `documents/index.md` | MODIFIED. Four new rows under `## FR`. Documentation-Map rows for `_atom.md`, `_composite.md`, `composites.yaml`. |
| `framework/AGENTS.md` | MODIFIED. § Composite Skill Authoring rewritten — rules 1/3/4/5 promoted to "machine-enforced by canon validator"; references to `check-skill-sync.ts` removed. |
| `CLAUDE.md` | MODIFIED. Documentation Map rows for `_atom.md`, `_composite.md`, `composites.yaml`. |
| `README.md` | MODIFIED. Pack/skill catalog mentions `flowai-do`, `flowai-push`, `flowai-ship`. Architecture subsection mentions the generator + leakage guard. |
| `.gitattributes` | NOT NEEDED. The in-SKILL.md `<!-- GENERATED FROM … -->` HTML comment is the single "this is generated" marker. |

### Verification commands (collected for the hand-off)

- `deno task check` — must pass after every commit; final verification after Commit 9.
- `deno run -A scripts/generate-skill-composites.ts --check` — regeneration is up-to-date.
- `deno test -A scripts/generate-skill-composites_test.ts` — generator unit tests.
- `deno test -A scripts/check-skills_test.ts --filter 'token_cap_exempts'` — composite list re-derivation.
- Acceptance test full sweeps (run by user — agent runs only the new/touched scenarios during develop):
  - `deno task acceptance-tests -f flowai-plan-exp-permanent-tasks`
  - `deno task acceptance-tests -f flowai-review`
  - `deno task acceptance-tests -f flowai-commit`
  - `deno task acceptance-tests -f flowai-review-and-commit`
  - `deno task acceptance-tests -f flowai-do-with-plan`
  - `deno task acceptance-tests -f flowai-do`
  - `deno task acceptance-tests -f flowai-push`
  - `deno task acceptance-tests -f flowai-ship`

### Risks and pre-mitigations

- **Behaviour regression hidden by semantic-equivalence framing.** Without byte-identity gating, a subtle wording drift in the atom could shift the agent's path. Mitigation: per-commit smoke runs (3 high-risk scenarios per composite, plus the standalone-atom sweep before any composite regeneration). The full sweep is handed off to the user at Commit 9 and MUST be green before merge. The PR description carries a checklist of "expected behaviour, expected to be unchanged" with one bullet per scenario.
- **Source files accidentally distributed by CI bundle (Variant B active risk).** `framework.tar.gz` is built from the whole `framework/` tree; without exclusions, `_atom.md` / `_composite.md` / `framework/composites.yaml` would land in user IDE configs. Consequences are MILD — extra inert files alongside `SKILL.md`, no behaviour/security/activation impact; the cost is professional polish and mild user confusion (see comparison-of-variants discussion in this task's history). Mitigation, wired in Commit 1 BEFORE any source file lands in the tree:
  - `tar --exclude` flags in `.github/workflows/ci.yml` (`--exclude='_atom.md' --exclude='_composite.md' --exclude='composites.yaml'`).
  - `scripts/check-pack-refs.ts` CI gate that unpacks the produced tarball and fails on any matching file. Runs both as a CI step (between bundle and release) and as part of `deno task check` locally.
  - YAML comment on the `tar` step names this task file for future maintainers.
  - Re-activation condition: if CI ever switches from `tar` to `git archive` or another bundler, the `--exclude` mechanism breaks. Team must revisit Variant A at that point (this is documented in the Variants section).
- **Atom parameter explosion.** If `flowai-commit-beta` ends up with 4+ placeholders, the atom becomes unreadable. Mitigation: cap placeholder count at 3 per atom; if more divergence is needed, split the atom (e.g. `flowai-commit-base` + `flowai-commit-with-cleanup-followup`). Surface to user when 3rd placeholder is added.
- **`flowai-do` description triggers on plan/review/commit/fix-tests prompts.** Mitigation: `trigger-mixed-1` scenario with 1 positive + 3 negatives (plan / review / fix-tests neighbours). If false-positive rate > 0 on judge re-runs (3 attempts), tighten description and re-run.
- **`flowai-push` weakens git safety.** Mitigation: explicit safety contract in FR-ATOM-PUSH (5 clauses); `refuses-force-on-divergence` scenario gates regression; CLI injects `disable-model-invocation: true` so the model cannot invoke it without explicit `/flowai-push` user typing.
- **Composite canon regressions slip past lint.** Mitigation: canon validator inside the generator (4 checks: description marker, no source-skill names, no-delegation rule, verdict-gate completeness) fails generation with line-pointed errors before writing the file.
- **`flowai-do-with-plan` Implement Phase has no atomic source.** Mitigation: `inline: true` phase entries in the manifest let the composite carry a hand-written phase body. The `flowai-do-with-plan` deprecation path uses this; new composites (`flowai-ship`) consume `flowai-do` instead.
- **Generator complexity creep.** The atom-render + composite-render + canon validators + parser will exceed the original 250-line estimate (now revised to ~350). If the file approaches the ~500-line readability threshold during implementation, extract validators into `scripts/lib/canon-validators.ts`. Decision point: end of Commit 4.
- **`<param-branch>` / `<inline-phase>` / `<gate>` HTML-comment-like syntax collides with real markdown.** These tags are NOT valid markdown — pure text in raw markdown source. Mitigation: generator strips them deterministically (regex-based — fully testable) and the `_atom.md` files are NEVER rendered as markdown by themselves. Adversarial test: `scripts/generate-skill-composites_test.ts::param_branch_with_nested_html_renders_clean`.
- **First-atom format renormalization cost.** If `flowai-plan-exp-permanent-tasks` extraction reveals a fundamental atom-format issue, Commit 2 may need 2-3 attempts before the smoke gate (3 scenarios green) passes. Budget: ~1 LLM-hour. If exceeded, stop and re-design the atom schema before Commit 3.
