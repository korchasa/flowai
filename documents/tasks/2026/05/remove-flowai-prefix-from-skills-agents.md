---
date: "2026-05-21"
status: to do
implements:
  - FR-PACKS
  - FR-HOWTO
  - FR-DIST
  - FR-DIST.MARKETPLACE
  - FR-ADAPT
  - FR-ACCEPT.TRIGGER
tags: [naming, skills, agents, distribution, refactor]
related_tasks:
  - 2026/05/2026-05-21-workflow-skills-meta.md
  - 2026/05/claude-code-plugin-marketplace-pilot.md
  - 2026/05/codex-plugin-marketplace-support.md
  - 2026/05/simplify-flowai-update-boundaries.md
  - 2026/05/skill-trigger-benchmarks.md
  - 2026/05/trigger-n1-retry.md
---
# Remove `flowai-` Prefix from Skills and Subagents

## Goal

Make framework skill and subagent names shorter at source level by removing the redundant `flowai-` prefix from `framework/<pack>/skills/*` and `framework/<pack>/agents/*.md`, while preserving command naming and distribution safety.

## Overview

### Context

The framework now ships through pack namespaces and plugin namespaces. Plugin builds already strip `flowai-` from skill and command names to avoid names like `/flowai:flowai-commit`. Keeping the same prefix in source skill and subagent names adds rename friction, noisy references, and duplicate branding in generated surfaces.

### Current State

- `framework/<pack>/skills/*` currently uses `flowai-*` directory names and matching `name:` frontmatter.
- `framework/<pack>/agents/*.md` currently uses `flowai-*` filenames and matching `name:` frontmatter.
- `framework/<pack>/commands/*` also uses `flowai-*`, but commands are user-invoked slash workflows and remain out of scope unless the selected variant explicitly expands scope.
- `scripts/check-naming-prefix.ts` requires all primitives to start with `flowai-`.
- `scripts/check-trigger-coverage.ts` only scans skill directories starting with `flowai-`.
- Plugin build already strips skill/command `flowai-` at output time; after source skill names become short, the builder must remain deterministic and avoid double assumptions.
- Distribution cleanup in the external `korchasa/flowai-cli` still relies on `flowai-*` installed names for ownership and orphan deletion.

### Constraints

- Follow acceptance-test TDD for changed skills, commands, or agents.
- Do not rename commands unless the user explicitly selects a variant that includes them.
- Preserve pack self-containment and generated composite rules.
- Keep plugin namespace output valid for Claude Code and Codex.
- Avoid deleting user-owned installed primitives when source names become unprefixed; ownership/cleanup rules need an explicit migration path.
- Update SRS, SDS, README, validators, generated composite config, benchmarks, cache references, and documentation links in the same implementation phase.

## Definition of Done

- [ ] FR-PACKS: Source skill and subagent naming contract permits unprefixed skill directories and agent filenames, while command names keep `flowai-`.
  - Test: `scripts/check-naming-prefix_test.ts::validateNamingPrefix: skill and agent names without flowai prefix pass`
  - Evidence: `NO_COLOR=1 deno test scripts/check-naming-prefix_test.ts`
- [ ] FR-HOWTO: All framework skill directories and `name:` frontmatter values are migrated from `flowai-*` to short names, and in-repo references are updated.
  - Test: `manual — korchasa`
  - Evidence: `NO_COLOR=1 find framework -mindepth 4 -maxdepth 4 -path 'framework/*/skills/flowai-*' -type d | wc -l` returns `0`
- [ ] FR-PACKS: All framework subagent filenames and `name:` frontmatter values are migrated from `flowai-*` to short names, and parent skills reference the new names.
  - Test: `manual — korchasa`
  - Evidence: `NO_COLOR=1 find framework -mindepth 3 -maxdepth 3 -path 'framework/*/agents/flowai-*.md' -type f | wc -l` returns `0`
- [ ] FR-ACCEPT.TRIGGER: Trigger coverage scans all skill directories regardless of prefix and all renamed trigger scenarios keep valid `id` and `skill` fields.
  - Test: `scripts/check-trigger-coverage_test.ts::validateAllTriggerCoverage: scans unprefixed skill directories`
  - Evidence: `NO_COLOR=1 deno test scripts/check-trigger-coverage_test.ts && NO_COLOR=1 deno run -A scripts/check-trigger-coverage.ts`
- [ ] FR-DIST.MARKETPLACE: Plugin build and validation handle unprefixed source skill names without changing plugin namespace invocation shape.
  - Test: `scripts/build-plugins_test.ts::skill-and-command-dirs-have-prefix-stripped`
  - Evidence: `NO_COLOR=1 deno test -A scripts/build-plugins_test.ts --filter 'skill-and-command-dirs-have-prefix-stripped' && NO_COLOR=1 deno task build-plugins`
- [ ] FR-ADAPT: Adaptation workflow scans and delegates renamed installed skills and agents according to the selected ownership/migration model.
  - Benchmark: `flowai-adapt-all`
  - Evidence: `NO_COLOR=1 deno task acceptance-tests -f flowai-adapt-all`
- [ ] FR-DIST: CLI-side installed-resource ownership and cleanup requirements are updated or recorded as an explicit external follow-up for `korchasa/flowai-cli`.
  - Test: `manual — korchasa`
  - Evidence: `NO_COLOR=1 rg -n 'unprefixed|short skill names|ownership|orphan cleanup' documents/requirements.md documents/design.md README.md`
- [ ] FR-HOWTO, FR-PACKS, FR-DIST, FR-ADAPT, FR-ACCEPT.TRIGGER: Project-wide verification is green after migration.
  - Test: `deno task check`
  - Evidence: `NO_COLOR=1 deno task check`

## Solution

Pending variant selection.
