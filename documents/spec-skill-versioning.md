# Spec: Skill Versioning

| Field   | Value               |
|---------|---------------------|
| Status  | Ready               |
| Created | 2026-03-27          |
| Updated | 2026-09-16          |

## Goal

Let a skill author declare a semver version in SKILL.md frontmatter, carry that
version through the plugin build into the rendered marketplace, and give users a
version signal when their IDE updates an installed plugin. The version is the
contract between framework authors and framework users about the magnitude of a
change.

## Overview

Every plugin in `dist/claude-plugins/` is stamped today with ONE version — the
repository version read from `deno.json` `.version` and injected into every
`plugin.json` and every marketplace entry (`scripts/build-plugins.ts`, transform
pass (f), `readUpstreamVersion`). A typo fix in one skill and a breaking rewrite
of another therefore ship under the same number, and nothing in the rendered
tree says which skill actually moved.

Update itself is no longer the framework's job: the IDE owns it. A Claude Code
or Codex user runs `/plugin update`, and the IDE replaces the installed plugin
with the marketplace copy. A Cursor or OpenCode user re-runs
`deno task build-plugins` and re-copies `dist/claude-plugins/plugins/<pack>/skills/*`
into `.claude/skills/`. Neither path can pin, diff or skip a single skill, and
neither path reads any per-skill metadata.

This spec adds skill-level semver (`version: "1.2.3"` in SKILL.md frontmatter),
carries it into the rendered plugin so the metadata survives the build, and
surfaces it in `scripts/validate-plugins.ts`. A monotonic-version gate is
PROPOSED as a future phase, not implemented here — no such check exists today
(`grep -n monoton scripts/validate-plugins.ts` is empty).

## Non-Goals

- No pinning and no version constraints. The framework does not install
  anything, so there is no install-time place to enforce a constraint; the IDE's
  own `/plugin update` decides what is replaced.
- No remote registry and no historical version fetching — the version comes from
  the rendered tree only.
- No per-agent versioning (skills and commands only).
- No automatic bump tooling; authors bump by hand, following the convention
  below.
- No change to the plugin-level version. `plugin.json` `version` stays the
  repository version from `deno.json`, because the IDE keys the installed plugin
  on it.
- No retroactive version metadata for already-installed copies.

## Architecture & Boundaries

### Always (agent autonomy)

- Read any file in `framework/`, `scripts/`, and their `*_test.ts` neighbours.
- Write `framework/*/{skills,commands}/*/SKILL.md` to add or update the
  `version:` frontmatter field.
- Write `scripts/resource-types.ts`, `scripts/build-plugins.ts`,
  `scripts/validate-plugins.ts` and their test files.
- Run `deno task check` to verify.

### Ask First

- Any change to the shape of `plugin.json` or `marketplace.json` beyond an
  additive `metadata` object — both are read by Claude Code and Codex, and a
  rejected manifest breaks installation for every user.
- Adding a third-party semver library (prefer `@std/semver` from Deno std).
- Changing the bump convention after it is documented.

### Never

- Delete or rename an existing frontmatter field in SKILL.md.
- Hand-edit anything under `dist/claude-plugins/` — it is generated.
- Hand-edit a SKILL.md listed as a target in `framework/composites.yaml`; it is
  a generator build artefact (FR-SKILL-COMPOSE). Edit the atom or the composite
  source instead.
- Skip `deno task check`.

## Definition of Done

- [ ] Every `framework/*/{skills,commands}/*/SKILL.md` carries a valid semver
      `version:` field, and `SkillFrontmatterSchema` accepts it.
- [ ] `scripts/build-plugins.ts` copies each skill's `version` into the rendered
      plugin's `metadata.skills` map without changing `plugin.json` `version`.
- [ ] `scripts/validate-plugins.ts` rejects a rendered tree whose skill version
      is absent or is not semver.
- [ ] `validate-plugins` output lists each skill with its version.
- [ ] Unit tests cover frontmatter parsing, the build's metadata emission and the
      validator's rejection paths.
- [ ] One acceptance scenario proves an agent adds a well-formed `version:` to a
      SKILL.md that lacks one.
- [ ] `deno task check` exits 0 with no errors or warnings.

---

## Phase 1: SKILL.md Frontmatter Versioning

**Status:** not-started | **Prerequisites:** none

### Goal

Add a `version: "X.Y.Z"` semver field to every SKILL.md frontmatter, and teach
the frontmatter schema to accept it. Establish and document the bump convention.
This is the data foundation every later phase depends on.

### Scope

- All `framework/*/{skills,commands}/*/SKILL.md` files
- `scripts/resource-types.ts` (the schema)
- `documents/design.md` (the bump convention)

### Tasks

1. Extend `SkillFrontmatterSchema` in `scripts/resource-types.ts` with
   `version: z.string().regex(/^\d+\.\d+\.\d+$/).optional()`. The schema is
   `.strict()`, so WITHOUT this step every added `version:` line fails
   `deno task check` with `unrecognized_keys` — do this before touching any
   SKILL.md.
2. Assign the initial version: every existing skill starts at `1.0.0`; they are
   stable and in production use.
3. Add `version: "1.0.0"` to the frontmatter of every SKILL.md. Prefer a bulk
   pass (a short Deno script) over per-file edits. Skip the generated composite
   targets listed in `framework/composites.yaml` — edit
   `framework/atoms/<name>.md` / `framework/composites/<name>.md` instead and
   regenerate with `deno run -A scripts/generate-skill-composites.ts --write`.
4. Document the bump convention in `documents/design.md`:
   - PATCH (`1.0.x`): typos, clarifications, wording — no behaviour change.
   - MINOR (`1.x.0`): new capabilities or new optional steps — backwards
     compatible.
   - MAJOR (`x.0.0`): breaking workflow changes, removed steps, changed outputs.

### Verification

- [ ] `grep -rL '^version:' framework/*/skills/*/SKILL.md framework/*/commands/*/SKILL.md` returns no files.
- [ ] Every `version:` value matches `^\d+\.\d+\.\d+$`.
- [ ] `deno task check` exits 0 (the schema accepts the new field).

### Notes

- The frontmatter block is delimited by `---` lines and is parsed with
  `@std/yaml`; existing fields already use block syntax (`description: >-`), so
  the parser handles multi-line values.
- The per-skill version is independent of `deno.json` `.version`. The two never
  have to agree.

---

## Phase 2: Carry the Version Through the Plugin Build

**Status:** not-started | **Prerequisites:** Phase 1

### Goal

Make the rendered marketplace carry each skill's version, so a consumer of
`dist/claude-plugins/` can tell which skill moved between two releases.

### Scope

- `scripts/build-plugins.ts`
- `scripts/build-plugins_test.ts`

### Tasks

1. In the skill-emit pass (transform pass (b)), read the parsed frontmatter's
   `version` alongside `name` and `description`. A skill without one contributes
   nothing rather than a sentinel — absence and `0.0.0` are different claims.
2. Collect the pairs per pack and emit them into the plugin manifest as
   `metadata: { skills: { "<stripped-skill-name>": "<version>" } }`, additively.
   `plugin.json` `version` KEEPS the repository version from
   `readUpstreamVersion` — the IDE keys the installed plugin on it, and
   changing it would make every skill bump look like a plugin bump.
3. Emit the same map into the Codex manifest, so both IDEs read one shape.
4. Strip `version:` from the rendered SKILL.md frontmatter only if it turns out
   an IDE rejects the unknown key; verify against the installed copy before
   deciding, and record the verdict here.
5. Tests in `scripts/build-plugins_test.ts`:
   - A pack with two versioned skills renders both entries in `metadata.skills`.
   - A skill with no `version` is absent from the map, and the build does not
     fail.
   - `plugin.json` `version` still equals the injected repository version.

### Verification

- [ ] `deno test -A scripts/build-plugins_test.ts` passes.
- [ ] `deno task build-plugins` then
      `jq '.metadata.skills' dist/claude-plugins/plugins/flowai/.claude-plugin/plugin.json`
      prints the map.
- [ ] `deno task check` exits 0.

### Notes

- The build already injects a version (pass (f)); this phase adds a second,
  finer-grained one and must not disturb the first.
- `scripts/validate-plugins.ts` parses both manifests with Zod. Extend its
  schema in the same phase or the build's own output fails validation.

---

## Phase 3: Update Flow — Delegated to the IDE

**Status:** not-started | **Prerequisites:** Phase 2

### Goal

State the update contract and record what this repository does NOT do, so no
later session reinvents an installer.

### Scope

- `README.md` (§Updating)
- `documents/design.md` (§3.5 / §3.5.1)

### Tasks

1. Document the two update paths:
   - Claude Code and Codex: `/plugin update` replaces the installed plugin from
     the marketplace. The IDE decides; the framework supplies the tree.
   - Cursor and OpenCode: re-run `deno task build-plugins` and re-copy
     `dist/claude-plugins/plugins/<pack>/skills/*` into `.claude/skills/`.
2. State that neither path can pin or skip a single skill, and that the
   per-skill version is informational — a reader's signal, not an installer's
   input.
3. **Proposed, not implemented here:** a monotonic-version gate in
   `scripts/validate-plugins.ts` that compares each skill's version against the
   version in the previously published marketplace and fails the build when a
   version moves backwards or when a changed skill did not bump. No such check
   exists today; adding it needs a source for the previous versions (the
   downstream repo's rendered tree, fetched in CI) and belongs in its own task.

### Verification

- [ ] README §Updating names both paths and no installer command.
- [ ] `! grep -n -E 'flowai (sync|update)' README.md documents/design.md`.

### Notes

- This phase writes no code. It exists so the absent installer is a recorded
  decision rather than a gap someone fills by accident.

---

## Phase 4: Validator Output

**Status:** not-started | **Prerequisites:** Phase 2

### Goal

Surface the per-skill versions where the build is already checked, so a bad or
missing version fails before the tree is pushed downstream.

### Scope

- `scripts/validate-plugins.ts`
- `scripts/validate-plugins_test.ts`

### Tasks

1. Extend the manifest schema with the optional
   `metadata.skills: Record<string, Semver>` object. `Semver` already exists in
   the file and carries the message
   "version must be semver MAJOR.MINOR.PATCH (optionally with -pre / +build)".
2. Cross-check the map against the rendered tree: every directory under
   `plugins/<plugin>/skills/` has an entry, and every entry has a directory.
   A mismatch is an error naming both sides.
3. Print one line per plugin listing its skills with versions, so the CI log
   records what was published.
4. Tests: a tree with a skill missing from the map fails; a map entry with no
   directory fails; a well-formed tree passes and its output names every skill.

### Verification

- [ ] `deno test -A scripts/validate-plugins_test.ts` passes.
- [ ] `deno task build-plugins && deno run -A scripts/validate-plugins.ts dist/claude-plugins`
      exits 0 and prints the versions.
- [ ] `deno task check` exits 0.

### Notes

- Keep the output compact; the version list is supplementary to the validator's
  existing findings.

---

## Phase 5: Tests and Acceptance Coverage

**Status:** not-started | **Prerequisites:** Phases 1–4

### Goal

Close the loop: unit coverage for the schema, the build and the validator, plus
one acceptance scenario proving an agent authors the field correctly.

### Scope

- `scripts/resource-types_test.ts`
- `scripts/build-plugins_test.ts`
- `scripts/validate-plugins_test.ts`
- One new acceptance scenario under the skill-authoring primitive

### Tasks

1. Run `deno task check` and fix every failure before proceeding.
2. Confirm coverage for the edge cases:
   - Frontmatter with no `version` → accepted, absent from `metadata.skills`.
   - Frontmatter with a non-semver `version` → schema rejection naming the file.
   - A rendered tree whose map and directories disagree → validator error.
3. Author the acceptance scenario under the skill-authoring primitive's own
   `acceptance-tests/` directory (resolve the host with
   `ls framework/devtools/skills/`; the scenario lives beside the primitive it
   tests, per the Acceptance Test TDD flow in AGENTS.md):
   - Query: the user asks to add `version: "1.0.0"` to a SKILL.md that lacks it.
   - Checklist: the agent adds the field inside the frontmatter block; no other
     frontmatter field is modified; the value matches `^\d+\.\d+\.\d+$`.
4. RED first — run the scenario before the SKILL.md changes and confirm it
   fails. Then GREEN, then re-run the single scenario.
5. Hand the full sweep for the affected primitive to the user:
   `deno task acceptance-tests -f <primitive-id>`.

### Verification

- [ ] `deno task check` exits 0.
- [ ] The new scenario passes:
      `deno task acceptance-tests -f <scenario-id>`.

### Notes

- Acceptance scenarios are co-located with the primitive and discovered by
  `scripts/task-acceptance-tests.ts`; `framework/AGENTS.md` carries the file
  format.
