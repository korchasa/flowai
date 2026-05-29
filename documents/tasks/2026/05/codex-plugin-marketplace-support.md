---
date: "2026-05-17"
status: done
implements:
  - FR-DIST.MARKETPLACE
tags: [distribution, codex, plugins, marketplace]
related_tasks:
  - 2026/05/claude-code-plugin-marketplace-pilot.md
---

# Codex plugin marketplace support

## Goal

Make the generated `korchasa/flowai-plugins` marketplace installable from Codex as well as Claude Code, so Codex users can install flowai packs through Codex's native plugin marketplace instead of relying only on `flowai sync`.

Business value:
- One generated plugin repository serves both Claude Code and Codex.
- Codex users get native install, enable, disable, and update UX for flowai packs.
- The framework keeps one pack source of truth under `framework/<pack>/` and avoids manual plugin mirrors.

## Overview

### Context

- `FR-DIST.MARKETPLACE` currently defines `korchasa/flowai-plugins` as a Claude-Code-native marketplace generated from `framework/<pack>/`.
- Existing output layout is Claude-specific: `.claude-plugin/marketplace.json` and per-pack `.claude-plugin/plugin.json`.
- Codex plugin docs define a parallel manifest and marketplace format:
  - Required plugin manifest: `.codex-plugin/plugin.json`.
  - Repo marketplace path: `.agents/plugins/marketplace.json`.
  - Plugin payload dirs live at plugin root: `skills/`, `hooks/`, `.app.json`, `.mcp.json`, `assets/`.
  - A marketplace entry can point at local `./plugins/<name>` paths or Git-backed sources.
  - Codex also reads legacy-compatible `$REPO_ROOT/.claude-plugin/marketplace.json`, but the Codex-native repo catalog is `.agents/plugins/marketplace.json`.
- The existing Claude plugin builder already performs most payload transforms needed by Codex:
  - source pack enumeration;
  - command/skill merge into `skills/`;
  - `flowai-` prefix stripping;
  - `disable-model-invocation` injection for commands;
  - scope filtering;
  - asset copying and path rewriting;
  - cross-skill slash invocation rewriting;
  - hook file emission.
- Codex-specific differences are the marketplace file, plugin manifest location and fields, install docs, smoke tests, and hook caveat. Codex plugin hooks are feature-gated by `[features].plugin_hooks = true`, while skills are available immediately after install.
- Official self-serve publication into the public Codex Plugin Directory is not available yet, so this task targets a custom marketplace source installable with `codex plugin marketplace add korchasa/flowai-plugins`.

### Current State

- `scripts/build-claude-plugins.ts` emits all six packs into `dist/claude-plugins/`.
- `scripts/validate-claude-plugins.ts` validates the generated Claude marketplace tree.
- `deno task build-plugins` builds and validates only the Claude layout.
- `README.md`, `documents/requirements.md`, and `documents/design.md` describe the marketplace channel as Claude Code-only and still state that Codex uses the CLI path.
- `documents/index.md` already links `FR-DIST.MARKETPLACE` to the Claude-specific SRS anchor.
- The downstream repository name `korchasa/flowai-plugins` is already the desired shared repository name.

### Constraints

- Keep Claude Code installation working unchanged.
- Keep the downstream repo `korchasa/flowai-plugins`; do not create a separate Codex-only repo unless selected explicitly.
- Do not hand-author plugin payloads. All Codex plugin artefacts must be generated from `framework/<pack>/`.
- Do not change canonical framework primitive placement or names.
- Do not silently enable Codex plugin hooks. Emit hooks only with clear documentation that Codex requires `[features].plugin_hooks = true`.
- Preserve deterministic output and validation before publication.
- Do not submit to the official Codex Plugin Directory in this task; self-serve publishing is not available yet.

## Definition of Done

- [x] FR-DIST.MARKETPLACE: generated marketplace output includes a Codex-native marketplace file at `.agents/plugins/marketplace.json` that lists every emitted `flowai-*` pack plugin and points each entry at `./plugins/<plugin-name>`.
  - Test: `scripts/build-plugins_test.ts::codex-marketplace emits-codex-marketplace-for-all-packs`
  - Evidence: `deno test -A scripts/build-plugins_test.ts --filter 'codex-marketplace'` exits 0
- [x] FR-DIST.MARKETPLACE: every generated pack plugin includes `.codex-plugin/plugin.json` with Codex-compatible metadata and component pointers such as `skills`, optional `hooks`, and optional `mcpServers` when present.
  - Test: `scripts/build-plugins_test.ts::codex-plugin-manifests emits-codex-plugin-manifests`
  - Evidence: `deno test -A scripts/build-plugins_test.ts --filter 'codex-plugin-manifests'` exits 0
- [x] FR-DIST.MARKETPLACE: Codex output reuses the same generated payload contract as the Claude output: stripped skill names, command `disable-model-invocation`, scope filtering, asset rewrite, cross-skill slash rewrite, and deterministic pack ordering.
  - Test: `scripts/build-plugins_test.ts::codex-payload codex-payload-matches-shared-transform-contract`
  - Evidence: `deno test -A scripts/build-plugins_test.ts --filter 'codex-payload'` exits 0
- [x] FR-DIST.MARKETPLACE: validator catches malformed Codex marketplace and plugin manifests before downstream publication.
  - Test: `scripts/validate-plugins_test.ts::codex rejects-invalid-codex-marketplace`
  - Evidence: `deno test -A scripts/validate-plugins_test.ts --filter 'codex'` exits 0
- [x] FR-DIST.MARKETPLACE: `deno task build-plugins` builds and validates both Claude and Codex plugin surfaces in one output tree.
  - Test: manual — korchasa
  - Evidence: `deno task build-plugins && deno task check` exits 0
- [x] FR-DIST.MARKETPLACE: CI downstream sync preserves `README.md` and `LICENSE`, publishes both `.claude-plugin/` and `.agents/plugins/` catalog files, and keeps one release commit/tag per framework release.
  - Test: manual — korchasa
  - Evidence: GitHub Actions run `26005062103` succeeded; downstream `korchasa/flowai-plugins` main is `d80cb59a016a6773912ffa6ddc6f61b6e23c658e` (`release: framework-v0.12.17`); GitHub contents API returns `.agents/plugins/marketplace.json` and `plugins/flowai/.codex-plugin/plugin.json`.
- [x] FR-DIST.MARKETPLACE: README documents Codex installation through the plugin marketplace and warns that plugin installs and `flowai sync` should not be mixed for the same Codex project.
  - Test: manual — korchasa
  - Evidence: `grep -n 'codex plugin marketplace add korchasa/flowai-plugins' README.md` returns a non-empty match
- [x] FR-DIST.MARKETPLACE: SRS and SDS describe the marketplace as shared Claude Code + Codex distribution, including Codex layout, hook feature gate, validation, and out-of-scope official public Codex submission.
  - Test: manual — korchasa
  - Evidence: `grep -n 'Codex' documents/requirements.md documents/design.md | grep 'FR-DIST.MARKETPLACE'` returns non-empty matches
- [x] FR-DIST.MARKETPLACE: local smoke instructions exist for Codex marketplace install.
  - Test: manual — korchasa
  - Evidence: README documents `codex plugin marketplace add ./dist/claude-plugins`, interactive `/plugins` install, and the current lack of `codex plugin install`.
- [x] FR-DIST.MARKETPLACE: Codex local install is automated by `deno task check` with `AUTO_INSTALL_PLUGINS=true` (declared in `.env`). `scripts/sync-plugins-local.ts` runs `codex plugin marketplace remove flowai-plugins` + `codex plugin marketplace add <abs dist path>`; Codex 0.130+ auto-registers every pack with `enabled = true` in `~/.codex/config.toml`.
  - Test: runnable — `AUTO_INSTALL_PLUGINS=true deno task check` exits 0.
  - Evidence: `grep -cE '^\[plugins\."flowai[^\"]*@flowai-plugins\"\]' ~/.codex/config.toml` returns `6`; every following `enabled = true`. Verified 2026-05-24.

## Solution

Selected variant: **1 — shared generator, shared downstream repository**.

Implementation status: local build, validation, tests, docs, push, CI, downstream publication, and local install instructions are done. Interactive Codex `/plugins` install smoke remains open.

Smoke note (2026-05-18): `codex plugin marketplace add /Users/korchasa/www/flowai/flowai/dist/claude-plugins` succeeds against a clean temporary Codex home and writes `[marketplaces.flowai-plugins]`. `codex plugin` currently exposes marketplace management only (`marketplace add|upgrade|remove`), not a non-interactive plugin install command. A full smoke still requires opening Codex `/plugins`, installing `flowai`, and starting a new thread. A `codex exec` attempt with temporary `-c` marketplace/plugin overrides reached the model, but the visible `flowai-plan` source was the existing global `r0/flowai-plan/SKILL.md`, so it does not prove plugin-store loading.

### Architecture

Keep `korchasa/flowai-plugins` as the single generated marketplace repository and extend the generated tree so it is valid for both Claude Code and Codex. Preserve the existing output root `dist/claude-plugins/` unless implementation proves the name materially confusing; if it is renamed, update every CI, task, doc, and validator reference in the same commit.

```text
dist/claude-plugins/
  .claude-plugin/marketplace.json
  .agents/plugins/marketplace.json
  plugins/
    flowai/
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      skills/
      agents/        # Claude Code payload; Codex ignores unless future docs add support.
      hooks/
```

The payload under `plugins/flowai-<pack>/` remains shared. Only the top-level marketplace catalog and per-plugin manifest are surface-specific. This preserves one source of truth for transformed skills, agents, assets, and hooks.

### Files to Modify

- Rename `scripts/build-claude-plugins.ts` -> `scripts/build-plugins.ts`; keep `scripts/build-claude-plugins.ts` as a thin re-export/CLI wrapper for one release if any local docs, tasks, or scripts still call it.
- Rename `scripts/build-claude-plugins_test.ts` -> `scripts/build-plugins_test.ts` and extend it with Codex assertions.
- Rename `scripts/validate-claude-plugins.ts` -> `scripts/validate-plugins.ts`; keep `scripts/validate-claude-plugins.ts` as a thin wrapper for one release if needed.
- Rename `scripts/validate-claude-plugins_test.ts` -> `scripts/validate-plugins_test.ts` and add negative Codex schema cases.
- Run `rg 'build-claude-plugins|validate-claude-plugins|dist/claude-plugins|Claude Code Plugin Marketplace' README.md documents scripts .github deno.json` during implementation and update every stale reference intentionally.
- Update `deno.json` tasks:
  - `build-plugins-only`: `deno run -A scripts/build-plugins.ts`
  - `build-plugins`: build + `deno run -A scripts/validate-plugins.ts`
  - `validate-plugins`: same validation path.
- Update `.github/workflows/ci.yml` release job text and copied output path if the output directory changes from `dist/claude-plugins` to `dist/plugins`.
- Update `README.md`, `documents/requirements.md`, and `documents/design.md` during implementation to describe shared Claude Code + Codex plugin distribution.

### Implementation Approach

1. Introduce a shared internal model:
   - `PluginPackArtifact`: plugin name, pack name, description, version, tags, emitted paths, has hooks.
   - `BuildSurface`: `"claude" | "codex"`.
   - `MarketplaceEmitter`: function that writes one surface-specific marketplace catalog.
   - `PluginManifestEmitter`: function that writes one surface-specific manifest into each plugin root.

2. Refactor the existing builder:
   - Keep the current transform order for payload generation:
     1. regenerate composite `SKILL.md` files before reading framework primitives;
     2. filter `scope: project-only`;
     3. merge commands and skills into `skills/`;
     4. strip the outer `flowai-` prefix;
     5. inject `disable-model-invocation: true` for commands;
     6. copy support files except acceptance tests;
     7. copy pack-level assets into consuming skills and rewrite references;
     8. strip CLI-only fences;
     9. rewrite cross-skill slash invocations to `/flowai-<pack>:<short>`;
     10. emit agents and hooks.
   - Write shared payload once per pack, then call both manifest emitters.

3. Emit Claude Code surface unchanged:
   - Keep `.claude-plugin/marketplace.json` schema and existing entry fields stable.
   - Keep `.claude-plugin/plugin.json` fields stable.
   - Add regression tests that compare key fields and source paths against the current generated shape.

4. Emit Codex surface:
   - Write `.agents/plugins/marketplace.json` at output root:
     ```json
     {
       "name": "flowai-plugins",
       "interface": {
         "displayName": "flowai-plugins"
       },
       "plugins": [
         {
           "name": "flowai",
           "source": {
             "source": "local",
             "path": "./plugins/flowai"
           },
           "policy": {
             "installation": "AVAILABLE",
             "authentication": "ON_INSTALL"
           },
           "category": "Productivity"
         }
       ]
     }
     ```
   - Write `.codex-plugin/plugin.json` inside every plugin root:
     ```json
     {
       "name": "flowai",
       "version": "0.12.15",
       "description": "...",
       "author": { "name": "korchasa" },
       "repository": "https://github.com/korchasa/flowai",
       "license": "MIT",
       "keywords": ["ai", "workflow", "framework", "flowai"],
       "skills": "./skills/",
       "hooks": "./hooks/hooks.json",
       "interface": {
         "displayName": "flowai core",
         "shortDescription": "...",
         "developerName": "korchasa",
         "category": "Productivity",
         "capabilities": ["Read", "Write"]
       }
     }
   ```
   - Omit `hooks` when the plugin has no `hooks/hooks.json`.
   - Do not add `.mcp.json` or `.app.json` unless a pack actually ships those files later.
   - Do not list `agents` in `.codex-plugin/plugin.json`; Codex plugin docs used for this plan do not define agents as a plugin component. Keep `agents/` in the shared payload for Claude Code only, and treat Codex agent support as a follow-up if official docs add that surface.

5. Validate Codex output:
   - Add a `CodexMarketplaceSchema` for `.agents/plugins/marketplace.json`.
   - Add a `CodexPluginManifestSchema` for `.codex-plugin/plugin.json`.
   - Enforce path rules:
     - manifest component paths start with `./`;
     - marketplace `source.path` starts with `./`;
     - all referenced files or directories exist inside the plugin root;
     - no `source.path` escapes the marketplace root.
   - Validate shared payload once, independent of surface.

6. Keep output deterministic:
   - Sort packs, primitives, manifest keys, marketplace entries, tags, and generated file writes.
   - Extend the existing byte-deterministic test so it covers the full dual-surface tree.

7. Preserve hook compatibility:
   - Keep existing generated hook commands using `${CLAUDE_PLUGIN_ROOT}` because Claude Code requires it and Codex documents `CLAUDE_PLUGIN_ROOT` / `CLAUDE_PLUGIN_DATA` as compatibility environment variables.
   - Add a validator assertion or focused test comment that explains why the shared hook file does not switch to `${PLUGIN_ROOT}`.

### Error Handling Strategy

- Missing pack directory -> throw with `pack not found: <path>`.
- Missing `pack.yaml` or malformed YAML -> throw with the path and parser error.
- Missing `SKILL.md` in a primitive directory -> throw with the primitive path.
- Source command or skill already carrying forbidden `disable-model-invocation` -> fail fast with the existing invariant name and file path.
- Codex manifest path outside plugin root -> validator returns a precise issue and exits non-zero.
- Unsupported marketplace source shape -> validator returns a precise issue; builder only emits supported local sources.
- CI downstream push failure -> leave framework release intact; downstream update can be retried after credentials or branch protection are fixed.

### Documentation Updates

- SRS: rename the FR title from Claude-specific to shared marketplace distribution and add Codex build/layout/acceptance bullets.
- SDS: update §3.5.2 to describe shared payload generation plus two surface emitters.
- README: add Codex install instructions:
  ```text
  codex plugin marketplace add korchasa/flowai-plugins
  ```
  Then direct users to open `/plugins`, choose the marketplace, install desired `flowai-*` packs, restart or start a new thread, and invoke the installed skills.
- README and SRS: document mutual exclusion with `flowai sync` for the same Codex project, matching the Claude Code warning.
- README and SDS: document that Codex plugin hooks require `[features].plugin_hooks = true`; skills work without that feature gate.

### Verification Commands

```sh
deno test -A scripts/build-plugins_test.ts --filter 'codex-marketplace'
deno test -A scripts/build-plugins_test.ts --filter 'codex-plugin-manifests'
deno test -A scripts/build-plugins_test.ts --filter 'codex-payload'
deno test -A scripts/validate-plugins_test.ts --filter 'codex'
deno task build-plugins
deno task check
```

Manual smoke after a preview downstream publish:

```sh
codex plugin marketplace add korchasa/flowai-plugins
```

Then open Codex `/plugins`, select the flowai marketplace, install `flowai`, start a new thread, and verify an installed flowai skill can be invoked or auto-loaded.

Smoke pass criteria:
- Codex lists the custom `flowai-plugins` marketplace.
- Codex shows `flowai` as installable.
- Installing `flowai` copies the plugin into Codex's plugin cache without schema errors.
- A new Codex thread can access at least one installed flowai skill from `flowai`.
