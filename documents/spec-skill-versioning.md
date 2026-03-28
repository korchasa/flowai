# Spec: Skill Versioning

| Field   | Value               |
|---------|---------------------|
| Status  | Ready               |
| Created | 2026-03-27          |
| Updated | 2026-03-27          |

## Goal

Enable skill authors to declare semver versions in SKILL.md frontmatter and allow
users to pin version constraints in `.flowai.yaml`, preventing unintended breaking
upgrades during `flowai sync`. Provides a clear contract between framework authors
and framework users about change magnitude.

## Overview

Currently, `flowai sync` replaces installed skills whenever content differs from the
bundle (conflict detection is byte-for-byte). There is no semantic versioning at the
skill level — users cannot distinguish a typo fix from a breaking behavioural change.
Pack-level `version` in `pack.yaml` exists but is not wired into sync logic.

This feature adds skill-level semver (`version: "1.2.3"` in SKILL.md frontmatter),
a version constraint syntax in `.flowai.yaml` (`skills.versions`), and version-aware
sync logic that skips updates when the installed version satisfies the user's
constraint.

## Non-Goals

- No remote registry or historical version fetching — version comes from the bundled
  snapshot only (current CLI version).
- No per-agent versioning in this spec (only skills).
- No automatic version bump tooling (authors bump manually following convention).
- No UI/TUI changes beyond CLI text output.
- No migration of existing installed skills to populate version metadata retroactively.
- No version constraint on pack level (only skill level).
- No `.flowai.yaml` config version bump — `skills.versions` is additive and optional,
  fully backwards-compatible with v1/v1.1 configs.

## Architecture & Boundaries

### Always (agent autonomy)

- Read any file in `framework/`, `cli/src/`, `cli/src/**/*_test.ts`.
- Write `framework/*/skills/*/SKILL.md` to add/update `version:` frontmatter field.
- Write `cli/src/frontmatter.ts`, `cli/src/types.ts`, `cli/src/config.ts`,
  `cli/src/plan.ts`, `cli/src/sync.ts`, `cli/src/cli.ts`, test files.
- Run `deno task check` to verify.

### Ask First

- Any change to `.flowai.yaml` schema that breaks v1/v1.1 backwards compatibility.
- Adding a Deno third-party semver library (prefer `@std/semver` from Deno std).
- Changing bump convention rules after they are documented.

### Never

- Delete or rename existing frontmatter fields in SKILL.md.
- Introduce a remote fetch path for historical skill versions.
- Skip or bypass `deno task check` verification.
- Modify `cli/src/bundled.json` directly (it is generated).

## Definition of Done

- [ ] All 38 SKILL.md files have a valid semver `version:` field in frontmatter.
- [ ] `parseFrontmatter()` correctly extracts `version` from SKILL.md content.
- [ ] `.flowai.yaml` `skills.versions` map is parsed and validated.
- [ ] `computePlan` skips update when installed version satisfies constraint.
- [ ] `computePlan` marks action as `"update"` when installed version is below constraint min or above constraint max.
- [ ] `renderSyncOutput` displays `1.2.0 → 2.0.0` for updated skills and `pinned at 1.x` for skipped-by-constraint skills.
- [ ] Unit tests pass for frontmatter parsing and version-aware plan logic.
- [ ] Benchmark scenario for version-aware sync passes.
- [ ] `deno task check` exits 0 with no errors or warnings.

---

## Phase 1: SKILL.md Frontmatter Versioning

**Status:** not-started | **Prerequisites:** none

### Goal

Add `version: "X.Y.Z"` semver field to every SKILL.md frontmatter. Establish and
document the version bump convention. This is the data foundation all later phases
depend on.

### Scope

- All 38 `framework/*/skills/*/SKILL.md` files
- `documents/design.md` (version convention documentation)

### Tasks

1. Establish initial version assignment: all existing skills start at `1.0.0` (they
   are stable and in production use).
2. Add `version: "1.0.0"` to the YAML frontmatter block of every SKILL.md. With 38
   files, prefer a bulk approach: a short Deno script or targeted multi-file edit
   rather than editing each file individually.
3. Document version bump convention in `documents/design.md`:
   - PATCH (`1.0.x`): typos, clarifications, wording improvements — no behaviour change.
   - MINOR (`1.x.0`): new capabilities, new optional steps — backwards-compatible.
   - MAJOR (`x.0.0`): breaking workflow changes, removed steps, changed outputs.
4. Verify all SKILL.md files have valid frontmatter by grep: `grep -L "^version:" framework/*/skills/*/SKILL.md` must return empty.

### Verification

- [ ] `grep -rL "^version:" framework/*/skills/*/SKILL.md` returns no files.
- [ ] Every `version:` value matches semver pattern `^\d+\.\d+\.\d+$`.

### Notes

- Frontmatter block is delimited by `---` lines. Parser in Phase 2 must handle
  multi-line YAML values (existing fields use `description: >-` block syntax).
- Use Deno std `@std/yaml` for parsing (already a dependency in cli/src).

---

## Phase 2: CLI Type System — Frontmatter Parsing and Config Extension

**Status:** not-started | **Prerequisites:** Phase 1

### Goal

Parse `version` from SKILL.md frontmatter in the CLI, add `SkillFrontmatter`
interface, and extend `FlowConfig` with `skills.versions` version constraint map.

### Scope

- `cli/src/frontmatter.ts` (new file)
- `cli/src/types.ts`
- `cli/src/config.ts`

### Tasks

1. Create `cli/src/frontmatter.ts`:
   - Export `interface SkillFrontmatter { name: string; version: string; description: string; disableModelInvocation?: boolean; }`.
   - Export `parseFrontmatter(content: string): SkillFrontmatter` — extracts and parses the leading `---...---` YAML block; throws on missing `name`; returns `version: "0.0.0"` if field absent (backward compat with unversioned skills).
2. Extend `FlowConfig` in `cli/src/types.ts`:
   - Add `skills.versions?: Record<string, string>` (skill-name → semver range string, e.g. `"^1.0.0"`, `">=1.2.0 <2.0.0"`).
3. Update `parseConfigData` in `cli/src/config.ts`:
   - Parse `skills.versions` from YAML (optional, default `{}`).
   - Validate: each value must be a non-empty string (further semver validation in Phase 3).
4. Update `saveConfig` in `cli/src/config.ts` to serialize `skills.versions` when present.
5. Write unit tests in `cli/src/frontmatter_test.ts`:
   - Parse valid frontmatter with all fields.
   - Parse frontmatter without `version` → returns `"0.0.0"`.
   - Throw on missing `---` block.
   - Throw on missing `name` field.

### Verification

- [ ] `deno test cli/src/frontmatter_test.ts` passes.
- [ ] `FlowConfig` type includes `skills.versions`.
- [ ] `parseConfigData` handles missing `skills.versions` gracefully (no throw).
- [ ] `deno task check` exits 0.

### Notes

- Semver range parsing deferred to Phase 3 (use `@std/semver` from Deno std).
- `disableModelInvocation` maps to YAML key `disable-model-invocation` (kebab-case).
- Do not break existing config parsing — `skills.versions` is optional.

---

## Phase 3: Version-Aware Plan Computation

**Status:** not-started | **Prerequisites:** Phase 2

### Goal

Modify `computePlan` to compare installed skill version against upstream version and
user version constraints, producing correct plan actions without overwriting pinned
skills.

### Scope

- `cli/src/plan.ts`
- `cli/src/sync.ts`
- `cli/src/types.ts` (extend `PlanItem` with version fields)

### Tasks

1. Check `deno.json` imports — if `@std/semver` is absent, add via
   `deno add jsr:@std/semver`.
2. Add `fromVersion?: string` and `toVersion?: string` to `PlanItem` in
   `cli/src/types.ts`.
3. Add `pinnedBy?: string` (constraint string) to `PlanItem` to mark constraint-skipped items.
4. Change `computePlan` signature to accept optional `versionConstraints: Record<string, string>` parameter.
5. In `computePlan`, for each upstream skill file where `path.endsWith("SKILL.md")`
   (other files in the skill directory are content-diffed as before):
   - Parse upstream `version` via `parseFrontmatter`.
   - If local file exists: parse installed `version` via `parseFrontmatter`.
   - If constraint exists for skill name:
     - Use `@std/semver` `satisfies(installedVersion, constraint)` to check.
     - If installed satisfies constraint → set `action = "ok"`, populate `pinnedBy`.
     - If installed does not satisfy → proceed with normal content diff logic (`"conflict"` or `"update"`).
   - If no constraint: preserve existing content-diff logic unchanged.
   - Populate `fromVersion` (installed) and `toVersion` (upstream) on item.
6. Pass `config.skills.versions` through `sync()` → `computePlan()` call chain in
   `cli/src/sync.ts` (update `readPackSkillFiles` call site).
7. Write/extend unit tests in `cli/src/plan_test.ts`:
   - Installed `1.0.0`, upstream `1.1.0`, constraint `"^1.0.0"` → action `"ok"` (satisfies).
   - Installed `1.0.0`, upstream `2.0.0`, constraint `"^1.0.0"` → action `"ok"` (satisfies).
   - Installed `1.0.0`, upstream `2.0.0`, no constraint → action `"conflict"` (content changed).
   - Installed `0.9.0`, upstream `1.0.0`, constraint `">=1.0.0"` → action `"conflict"`.

### Verification

- [ ] `deno test cli/src/plan_test.ts` passes (all version-aware cases).
- [ ] `deno task check` exits 0.
- [ ] `deno test cli/src/plan_test.ts` covers all four version-constraint cases listed in Task 7.

### Notes

- `@std/semver` is part of Deno standard library. Add via `deno add jsr:@std/semver`
  if not already in `deno.json`. Check existing imports first.
- Only `SKILL.md` files carry version metadata. Other skill files (scripts,
  benchmarks) are compared by content as before.
- `computePlan` receives upstream files as `UpstreamFile[]` — the `SKILL.md` file
  path is identifiable by `path.endsWith("SKILL.md")`.
- The constraint is keyed by skill directory name (e.g., `flowai-commit`), which is
  already available as `extractName(path, "skill")`.

---

## Phase 4: CLI Output and UX

**Status:** not-started | **Prerequisites:** Phase 3

### Goal

Surface version information in `flowai sync` output: show `1.0.0 → 2.0.0` for
updated skills and `pinned at ^1.x` for constraint-skipped skills.

### Scope

- `cli/src/types.ts` (extend `ResourceAction`)
- `cli/src/sync.ts` (`extractResourceActions`)
- `cli/src/cli.ts` (`renderSyncOutput`)

### Tasks

1. Extend `ResourceAction` in `cli/src/types.ts`:
   - Add `fromVersion?: string`, `toVersion?: string`, `pinnedBy?: string`.
2. Update `extractResourceActions` in `cli/src/sync.ts`:
   - Aggregate `fromVersion`/`toVersion`/`pinnedBy` from `PlanItem` (take from
     SKILL.md item when multiple files exist per skill).
3. Update `renderSyncOutput` in `cli/src/cli.ts`:
   - For updated skills: append `(${fromVersion} → ${toVersion})` to skill name in
     output when both versions present.
   - Add a new `SKILLS PINNED` section for skills where `action === "ok"` due to
     constraint: list them as `skill-name (pinned at ${pinnedBy}, current: ${fromVersion})`.
   - Do not show version info for skills without `version` in frontmatter (`"0.0.0"`).
4. Update `cli/src/cli.ts` unit test if `renderSyncOutput` is directly tested.

### Verification

- [ ] `deno task check` exits 0.
- [ ] `deno test cli/src/cli_test.ts` (or equivalent): `renderSyncOutput` with a
  pinned skill produces output containing `"pinned at"` and the constraint string.
- [ ] `deno test cli/src/cli_test.ts`: `renderSyncOutput` with an updated versioned
  skill produces output matching `\d+\.\d+\.\d+ → \d+\.\d+\.\d+`.

### Notes

- Keep output concise — version info is supplementary, not primary signal.
- `"0.0.0"` is the sentinel for "no version declared" — suppress version display for
  these to avoid confusing users with unversioned legacy skills.

---

## Phase 5: Tests and Benchmarks

**Status:** not-started | **Prerequisites:** Phases 1–4

### Goal

Full test coverage for the new frontmatter parsing and version-aware sync, plus a
benchmark scenario proving correct agent behaviour when a skill has a version
constraint.

### Scope

- `cli/src/frontmatter_test.ts` (finalize, may already exist from Phase 2)
- `cli/src/plan_test.ts` (finalize, may already exist from Phase 3)
- `framework/devtools/skills/flowai-skill-engineer-subagent/benchmarks/skill-versioning/mod.ts` (new benchmark)

### Tasks

1. Run `deno test` — fix any failing tests before proceeding.
2. Confirm coverage for these edge cases (add tests if missing):
   - Frontmatter with no `version` field → `parseFrontmatter` returns `"0.0.0"`.
   - Constraint that is an invalid semver range → parse-time error.
   - Skills with no constraint: content-diff logic unchanged end-to-end.
3. Create benchmark scenario `framework/devtools/skills/flowai-skill-engineer-skill/benchmarks/skill-versioning/mod.ts`
   (host: `flowai-skill-engineer-skill` — closest skill for SKILL.md authoring tasks):
   - Scenario: user asks to add `version: "1.0.0"` to a SKILL.md that lacks it.
   - Checklist items:
     - Agent adds `version: "1.0.0"` to the YAML frontmatter block.
     - No other frontmatter fields are modified.
     - Version value matches semver pattern `^\d+\.\d+\.\d+$`.
4. Verify benchmark host path: `ls framework/devtools/skills/flowai-skill-engineer-skill/`
   must exist; adjust path if structure differs.
5. Run benchmark: `deno task bench skill-versioning` — must pass.
6. Run `deno task check` — must exit 0 with no errors or warnings.

### Verification

- [ ] `deno test` exits 0 (all tests pass).
- [ ] Benchmark `skill-versioning` passes.
- [ ] `deno task check` exits 0.

### Notes

- Benchmark scenarios live co-located with skills, discovered via `walk()` in
  `scripts/task-bench.ts`. Check `benchmarks/CLAUDE.md` for scenario file format.
- Benchmark host `flowai-skill-engineer-skill` is for SKILL.md authoring — it is the
  closest match. If absent, fall back to `flowai-skill-engineer-subagent`.
