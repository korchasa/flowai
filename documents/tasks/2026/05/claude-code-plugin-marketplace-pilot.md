---
date: "2026-05-16"
status: done
implements:
  - FR-DIST.MARKETPLACE
  - FR-DIST.GLOBAL
tags: [distribution, claude-code, plugins, marketplace, packs]
related_tasks:
  - 2026/05/extract-cli-to-separate-repo.md
---

# Claude Code plugin marketplace — pilot with `core` pack

## Goal

Add a second, additive distribution channel: ship flowai packs as native Claude Code plugins through a flowai-owned plugin marketplace. Claude Code users can `\plugin marketplace add korchasa/flowai` and `\plugin install <pack>@flowai` instead of (or in addition to) running `flowai` CLI. Pilot the path with one pack (`core`) so we learn the marketplace ergonomics — namespacing, agent/hook transform, version resolution, cache behaviour — before rolling out the remaining five packs.

Business value:
- Lower install friction for Claude Code users (one slash command, no Deno install).
- Brings flowai under Claude Code's update/disable/uninstall UX (`/plugin update`, auto-update, `/reload-plugins`).
- Future-proofs distribution: Anthropic is investing in marketplaces (official catalog, managed restrictions, seed dirs for containers).

Explicit non-goals (this task):
- Multi-pack rollout — covered by follow-up tasks after the pilot.
- Replacement of flowai CLI for any IDE. CLI remains the primary channel for Cursor/OpenCode/Codex AND a supported channel for Claude Code (additive coexistence, user-selected).
- Codex/Cursor/OpenCode marketplace equivalents — none of those IDEs expose a Claude-compatible plugin manager today.
- Submission to the official Anthropic marketplace (`claude-plugins-official`) — pilot lives as a third-party marketplace pointed at `korchasa/flowai`. Submission is a later decision.

## Overview

### Context

- The framework lives in this monorepo at `framework/<pack>/` with six packs: `core`, `devtools`, `engineering`, `deno`, `typescript`, `memex` (see `framework/CLAUDE.md`).
- Each pack has `pack.yaml` + `commands/` + `skills/` + optional `agents/`, `hooks/`, `scripts/`, `assets/`, `acceptance-tests/`. Source primitives use the universal/canonical formats — `flowai-cli` does per-IDE transformation at sync time (FR-DIST.SYNC, FR-DIST.MAPPING, FR-DIST.CODEX-AGENTS, FR-DIST.CODEX-HOOKS).
- Today's installation path for Claude Code users: `deno install -A jsr:@korchasa/flowai` → `flowai sync` reads bundled framework → writes `.claude/skills/`, `.claude/agents/`, `.claude/settings.json` hooks block. flowai CLI lives in the separate `korchasa/flowai-cli` repo and consumes a SHA-256-pinned `framework.tar.gz` from this repo's GitHub releases (FR-DIST.BUNDLE.PIN, see `documents/tasks/2026/05/extract-cli-to-separate-repo.md`).
- Claude Code plugin marketplace contract (from official docs, fetched 2026-05-16):
  - Catalog file at `.claude-plugin/marketplace.json` at repo root with `name`, `owner`, `plugins[]` (schema: https://code.claude.com/docs/en/plugin-marketplaces).
  - Each plugin: directory with `.claude-plugin/plugin.json` (`name`, `description`, optional `version`).
  - Plugin payload dirs at plugin root: `skills/<name>/SKILL.md`, `commands/<name>.md` (legacy flat), `agents/<name>.md`, `hooks/hooks.json`, `.mcp.json`, `.lsp.json`, `monitors/`, `bin/`, `settings.json`. **Do not** nest these inside `.claude-plugin/`.
  - Skill names are namespaced as `/<plugin-name>:<skill-dir-name>`. Namespace = `plugin.json` `name` field.
  - Plugin sources for marketplace entries: relative path (`./...`), `github` (owner/repo), `url` (full git URL), `git-subdir` (sparse clone), `npm`.
  - Add command: `\plugin marketplace add owner/repo` (clones full repo) or `--sparse <paths>` for monorepo trim. Direct `marketplace.json` URL works but disables relative-path sources.
  - Version resolution: `plugin.json` `version` > marketplace-entry `version` > git commit SHA. Omitting all three = every commit is a new version (cleanest for actively-developed plugins).
  - Plugins are copied to `~/.claude/plugins/cache` on install; paths like `../shared-utils` outside the plugin dir do not survive. `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` env vars resolve at runtime inside hooks/MCP configs.
  - `\plugin validate .` (or `claude plugin validate .`) checks marketplace JSON syntax.
- Decisions already locked with the user (chat, 2026-05-16):
  - **Coexistence:** additive — both CLI and marketplace channels live.
  - **Pilot scope:** one pack, `core`.
  - **Skill names inside plugins:** strip the `flowai-` prefix so invocations look like `/flowai:commit`, not `/flowai:flowai-commit`.
  - **Source layout:** still open — decided in the Variants section of this plan.

### Current State

- `framework/core/` contains:
  - 8 commands under `commands/` (`flowai-init`, `flowai-commit`, `flowai-plan`, `flowai-review-and-commit`, `flowai-update`, `flowai-do-with-plan`, `flowai-commit-beta`, `flowai-adapt`).
  - 10 skills under `skills/` (`flowai-adapt-instructions`, `flowai-configure-deno-commands`, `flowai-epic`, `flowai-investigate`, `flowai-maintenance`, `flowai-plan`, `flowai-reflect`, `flowai-reflect-by-history`, `flowai-review`, `flowai-setup-ai-ide-devcontainer`).
  - At least one agent file under `agents/` (canonical-format `<name>.md`).
  - `assets/AGENTS.template.md` shared template.
  - `pack.yaml` declaring `name`, `version`, `description`, `scaffolds` map (primitive → artifact paths).
- No marketplace artefacts in this repo. No `.claude-plugin/` dirs anywhere.
- flowai CLI's plan-resolver / writer already encodes the per-IDE transforms we need (agent frontmatter, hook JSON shape, `disable-model-invocation` injection for commands).
- SRS `FR-DIST.GLOBAL` currently lists "native marketplace plugin packaging" as **not in scope** — that sentence must be amended once the pilot ships.

### Constraints

- **Strip-prefix invariant**: every framework primitive in the source tree keeps its `flowai-*` directory name (existing convention enforced by `scripts/check-naming-prefix.ts`). The plugin distribution layer is the **only** place names lose the prefix.
- **No cross-IDE regression**: flowai CLI must keep producing identical output for `.claude/`, `.cursor/`, `.opencode/`, `.codex/`. The marketplace pilot cannot change the canonical source format in a way that breaks CLI sync. Verified by running existing CLI acceptance tests in the `korchasa/flowai-cli` repo after framework changes.
- **Single source of truth**: no human-authored duplicate of any primitive. Either (a) the framework source is consumed directly by the plugin builder, or (b) a generated tree is committed but produced deterministically from the framework source and validated by CI (drift = build failure).
- **Plugin cache locality**: skills/agents must reference only files under their own plugin root. `${CLAUDE_PLUGIN_ROOT}` for hook commands. No `../` escapes.
- **Symlinks survive `\plugin install`** per docs ("If you need to share files across plugins, use symlinks") — usable as a stripping technique if we choose Variant A.
- **Version policy for the pilot**: omit `version` in plugin.json (commit SHA = version). Lets users get updates on every framework commit without manual bumping. Re-evaluate before multi-pack rollout.
- **Trust + security**: marketplaces execute arbitrary code at user privilege; docs are explicit ("Only install plugins and add marketplaces from sources you trust"). README + plugin description must surface the same warning we already give for the CLI.
- **Reproducibility**: marketplace adds via direct `marketplace.json` URL DO NOT resolve relative paths; the pilot must work as a **git-cloned marketplace** (`\plugin marketplace add korchasa/flowai`), not a URL-only marketplace.
- **Pack manifest scaffolds**: `pack.yaml` `scaffolds:` is read by flowai CLI at sync time; plugin install does not run scaffolds. Skills that *invoke* scaffolds at runtime (`flowai-init`, `flowai-configure-deno-commands`, `flowai-setup-ai-ide-devcontainer`) keep working under plugin install — they write project files when the user invokes them, not at install. Scaffolds-as-install-side-effect is **not** brought to the marketplace path.
- **Hook count today**: only the `devtools` pack ships a hook (`skill-structure-validate`). The pilot pack `core` has zero hooks, so the hook transform path is exercised by future packs, not the pilot. Plan must still specify the contract so multi-pack rollout is unblocked.
- **Existing `flowai-cli` repo** owns CLI-side transforms; the marketplace build can reuse those modules (vendor or re-publish as a Deno library) OR re-implement minimally in this repo. Decision deferred to Solution step.
- **`disable-model-invocation` semantics carry over verbatim.** Primitives under `framework/<pack>/commands/` are user-only by definition (FR-PACKS.CMD-INVARIANT). The marketplace build injects `disable-model-invocation: true` into the emitted SKILL.md exactly as flowai CLI does today (FR-DIST.SYNC). Effect in Claude Code: the model cannot auto-invoke commands; the user invokes them as `/flowai:<short>`. This is deliberate parity with the CLI path; if pilot feedback says "let the model invoke `flowai-plan` automatically", that is a separate change to FR-PACKS.CMD-INVARIANT, not a marketplace-layer tweak.
- **Pre-conditions for local smoke-test:** the manual install smoke (`/plugin marketplace add ./dist/claude-plugins` + `/plugin install`) requires Claude Code CLI installed locally. If the maintainer works only through the web UI, the smoke step is performed in a sandbox VM with `claude` CLI installed once. Documented in the SDS subsection.
- **Marketplace name is configurable but defaults to repo name.** Build script exposes `--marketplace-name`; default `flowai-plugins` matches the downstream repo name. Single source of truth lives in `scripts/build-claude-plugins.ts` as an exported constant `DEFAULT_MARKETPLACE_NAME`. CI passes the flag explicitly so the value is visible in the workflow file.

## Definition of Done

- [x] FR-DIST.MARKETPLACE: `scripts/build-plugins.ts` (legacy alias: `scripts/build-claude-plugins.ts`) reads `framework/core/` and emits a Claude-plugin-shaped tree under `dist/claude-plugins/` containing `.claude-plugin/marketplace.json` and `plugins/flowai/.claude-plugin/plugin.json` + payload dirs.
  - Test: `scripts/build-plugins_test.ts::emits-marketplace-and-plugin-manifest-for-core`
  - Evidence: `deno test -A scripts/build-plugins_test.ts --filter 'emits-marketplace-and-plugin-manifest-for-core'` exits 0
- [x] FR-DIST.MARKETPLACE: skill and command directory names inside the generated plugin payload have the `flowai-` prefix stripped (e.g. `framework/core/skills/flowai-plan/` → `plugins/flowai/skills/plan/`). Plugin invocations therefore appear as `/flowai:<short-name>`, not `/flowai:flowai-<short-name>`.
  - Test: `scripts/build-plugins_test.ts::skill-and-command-dirs-have-prefix-stripped`
  - Evidence: `deno task build-plugins && find dist/claude-plugins/plugins/flowai -type d -name 'flowai-*'` returns empty
- [x] FR-DIST.MARKETPLACE: `disable-model-invocation: true` is injected into `SKILL.md` frontmatter for every primitive sourced from `framework/core/commands/`, and absent for every primitive sourced from `framework/core/skills/`.
  - Test: `scripts/build-plugins_test.ts::commands-get-disable-model-invocation-injected-skills-do-not`
  - Evidence: `deno test -A scripts/build-plugins_test.ts --filter 'disable-model-invocation'` exits 0
- [x] FR-DIST.MARKETPLACE: Agent frontmatter in `plugins/flowai/agents/*.md` is Claude-native — fields outside the Claude-supported set (per FR-DIST.MAPPING universal→Claude column) are stripped; supported fields preserved verbatim. Agent body unchanged.
  - Test: `scripts/build-plugins_test.ts::agent-frontmatter-matches-claude-native-mapping`
  - Evidence: `deno test -A scripts/build-plugins_test.ts --filter 'agent-frontmatter'` exits 0
- [x] FR-DIST.MARKETPLACE: Marketplace + plugin manifest JSON validates against the official schema fields documented in `documents/design.md` (see Solution step 5). Required fields present, no unknown top-level fields, plugin `name` is kebab-case.
  - Test: `scripts/build-plugins_test.ts::marketplace-and-plugin-json-schema-valid`
  - Evidence: `deno test -A scripts/build-plugins_test.ts --filter 'schema-valid'` exits 0; additionally `claude plugin validate ./dist/claude-plugins` exits 0 (manual smoke).
- [x] FR-DIST.MARKETPLACE: Local install end-to-end is automated by `deno task check` with `AUTO_INSTALL_PLUGINS=true` (declared in `.env`). The pipeline runs `scripts/build-plugins.ts` → `scripts/validate-plugins.ts` → `scripts/sync-plugins-local.ts --no-build`, which re-points the `flowai-plugins` marketplace at `./dist/claude-plugins` and installs every emitted pack into Claude Code at user scope.
  - Test: runnable — `AUTO_INSTALL_PLUGINS=true deno task check` exits 0.
  - Evidence: `claude plugin list | grep -c '@flowai-plugins'` returns `6`, and every matching entry's `Version:` line equals `jq -r .version deno.json` (currently `0.12.19`). Verified 2026-05-24 after `deno task build-plugins && deno run -A scripts/sync-plugins-local.ts --no-build`.
- [x] FR-DIST.MARKETPLACE: CI job `release-claude-plugins` on a `framework-v*` tag builds the plugin tree, force-pushes to `korchasa/flowai-plugins` with a commit message `release: framework-vX.Y.Z`, and tags the same SHA `framework-vX.Y.Z` in the downstream repo.
  - Test: `manual — korchasa` (one preview tag, then one real tag)
  - Evidence: `gh api repos/korchasa/flowai-plugins/commits --jq '[.[] | select(.commit.message | startswith("release: framework-v"))] | length'` = 8 (incl. `framework-v0.13.0` HEAD = `5c300fb9`, 2026-05-24); `git ls-remote --tags https://github.com/korchasa/flowai-plugins` lists `framework-v0.12.13`..`framework-v0.13.0`.
- [x] FR-DIST.MARKETPLACE: `korchasa/flowai-plugins` repository exists and is reachable, contains `README.md` pointing back to this repo, and ships an initial commit produced by the CI job (no human-authored content other than `README.md`).
  - Test: `manual — korchasa`
  - Evidence: `gh repo view korchasa/flowai-plugins --json url,description` returns the repo with description `Generated Claude Code plugin marketplace for AssistFlow framework — do not edit by hand; source: https://github.com/korchasa/flowai`.
- [x] FR-DIST.MARKETPLACE: No regression in `flowai-cli` — its acceptance suite passes against the framework HEAD that contains this pilot's build script and SRS edits.
  - Test: `manual — korchasa`
  - Evidence: `gh run list --repo korchasa/flowai-cli --workflow ci.yml --limit 1 --json conclusion -q '.[0].conclusion'` = `success`.
- [x] FR-DIST.MARKETPLACE: SRS gains a new `### FR-DIST.MARKETPLACE` subsection with `**Description**`, `**Scenario**`, `**Acceptance**` (the criteria above, all marked `[x]` after pilot ship) and `**Tasks:** [claude-code-plugin-marketplace-pilot](tasks/2026/05/claude-code-plugin-marketplace-pilot.md)`.
  - Test: `manual — korchasa`
  - Evidence: `grep -n '^#### FR-DIST.MARKETPLACE' documents/requirements.md` → `documents/requirements.md:341` (heading depth `####` under the `### FR-DIST` group).
- [x] FR-DIST.GLOBAL: SRS `FR-DIST.GLOBAL` `Not in scope` list no longer contains "native marketplace plugin packaging" — it is replaced with a forward-pointer line "Native marketplace packaging — see FR-DIST.MARKETPLACE."
  - Test: `manual — korchasa`
  - Evidence: `documents/requirements.md:316` — `**Not in scope:** Auto-migration from project to global. (Native marketplace packaging — see FR-DIST.MARKETPLACE.)`.
- [x] FR-DIST.MARKETPLACE: SDS gains a `### 3.X Claude Code plugin marketplace` subsection describing the build script, the `dist/claude-plugins/` layout, the CI release job, and the contract with `korchasa/flowai-plugins`.
  - Test: `manual — korchasa`
  - Evidence: `grep -n 'Claude Code plugin marketplace' documents/design.md` → `documents/design.md:400` (`### 3.5.1 Claude Code + Codex Plugin Marketplace — FR-DIST.MARKETPLACE`).
- [x] FR-DIST.MARKETPLACE: README §Installation gains a "Claude Code plugin marketplace (pilot)" subsection showing the two-step `/plugin marketplace add korchasa/flowai-plugins` + `/plugin install flowai@flowai-plugins` flow, with an explicit trust-and-security note.
  - Test: `manual — korchasa`
  - Evidence: `README.md:81` (`/plugin marketplace add korchasa/flowai-plugins`); `README.md:133` (`plugins execute arbitrary code at your user privilege`).
- [x] FR-DIST.MARKETPLACE: Build fails fast when a source primitive violates `FR-PACKS.CMD-INVARIANT` (a `framework/<pack>/commands/*/SKILL.md` already carrying `disable-model-invocation` in source) or `FR-PACKS.SKILL-INVARIANT` (a `framework/<pack>/skills/*/SKILL.md` carrying it). Error message names the offending file path and the violated invariant.
  - Test: `scripts/build-plugins_test.ts::fails-fast-on-cmd-invariant-violation` and `::fails-fast-on-skill-invariant-violation`
  - Evidence: `deno test -A scripts/build-plugins_test.ts --filter 'fails-fast'` exits 0 (tests assert non-zero exit from the build script on fixture violations).
- [x] FR-DIST.MARKETPLACE: After CI push, downstream `korchasa/flowai-plugins` retains its hand-authored `README.md` and `LICENSE` files unchanged. Only the generated `.claude-plugin/marketplace.json` / `.agents/plugins/marketplace.json` / `plugins/` tree is replaced. Hand-authored edits by maintainers are allowed; the contract is that the CI release bot never mutates these paths.
  - Test: runnable — `for sha in $(gh api "repos/korchasa/flowai-plugins/commits?per_page=50" --jq '.[] | select(.commit.message | startswith("release: framework-v")) | .sha'); do gh api "repos/korchasa/flowai-plugins/commits/$sha" --jq '[.files[].filename] | map(select(. == "README.md" or . == "LICENSE")) | length'; done | sort -u` returns only `0`.
  - Evidence: audited 2026-05-24 — 8 release commits authored by `flowai-release-bot` (`framework-v0.12.13`..`framework-v0.13.0`), none touched `README.md` or `LICENSE`. The 2 historical `README.md` commits (`4b077238 chore: bootstrap`, `c6445d6b docs: update marketplace README for Codex`) are by `korchasa` and predate / are independent of the release pipeline.

## Solution

Selected variant: **C-refined** — generated `dist/claude-plugins/` tree (not committed to `main`), built by a Deno script, published by CI on `framework-v*` tags into a new separate repository `korchasa/flowai-plugins` (D2 from the chat analysis).

### Layout summary

- This repo (`korchasa/flowai`):
  - Adds `scripts/build-claude-plugins.ts`, `scripts/build-claude-plugins_test.ts`.
  - Adds `dist/` to `.gitignore`. Build output is **never** committed here.
  - Adds `deno task build-plugins` to `deno.json`.
  - Adds CI job `release-claude-plugins` to `.github/workflows/ci.yml`, gated on `tag-push framework-v*`.
  - Updates SRS (`FR-DIST.GLOBAL` amend + new `FR-DIST.MARKETPLACE` section), SDS (architecture subsection), README (Installation subsection).
- New repo (`korchasa/flowai-plugins`):
  - Owns only the published artefact tree (no human source). Default branch `main` is force-pushed by CI on every framework tag.
  - Contains exactly:
    - `README.md` (hand-authored once, refers users back to this repo for issues and source).
    - `LICENSE` (mirror of framework repo's license).
    - `.claude-plugin/marketplace.json` (generated).
    - `plugins/flowai/...` (generated; future packs land alongside).
  - No CI of its own. No tests. No `.gitignore` beyond standard editor files.

### Sub-decision — transform code: vendor for pilot

`flowai-cli` already implements agent/hook transforms for Claude Code (`crossTransformAgent`, hooks-writer). For the pilot, **vendor a minimal copy** of the Claude-target transform logic into `scripts/build-claude-plugins.ts` (≤200 LOC, focused on `claude` output). Rationale:
- One pack, one output target — full cross-IDE library is overkill.
- Avoids cross-repo Deno library publishing during pilot ramp-up.
- Drift risk is bounded because (a) only Claude target is in scope, (b) `flowai-cli`'s transforms have their own regression tests (FR-DIST.MAPPING).
- Follow-up: if multi-pack rollout exposes drift, extract a shared library `@korchasa/flowai-transforms` to JSR and consume from both repos. Tracked as a deferred follow-up item below.

### Build script contract (`scripts/build-claude-plugins.ts`)

CLI surface:

```
deno run -A scripts/build-claude-plugins.ts \
  --pack core \
  --framework ./framework \
  --out ./dist/claude-plugins \
  [--marketplace-name flowai-plugins]
```

Inputs:
- `--pack <name>` (repeatable; defaults to `core` for the pilot) — restricts which packs are emitted.
- `--framework <dir>` — source root; defaults to `./framework`.
- `--out <dir>` — output root; defaults to `./dist/claude-plugins`. Cleared before write.
- `--marketplace-name <id>` — value used for `marketplace.json` top-level `name` field. Defaults to `flowai-plugins` (must match the downstream repo name so that `/plugin install X@flowai-plugins` resolves).

Outputs (deterministic; sorted-keys JSON, stable file ordering):

1. `<out>/.claude-plugin/marketplace.json`:
   ```json
   {
     "name": "flowai-plugins",
     "owner": { "name": "korchasa", "email": "<inferred from git config or omit>" },
     "description": "AssistFlow framework — Claude Code plugin marketplace",
     "metadata": { "pluginRoot": "./plugins" },
     "plugins": [
       {
         "name": "flowai",
         "source": "./flowai",
         "description": "<copied from framework/core/pack.yaml description>"
       }
     ]
   }
   ```
   `version` deliberately omitted on the marketplace level — release identity is the git tag of `korchasa/flowai-plugins`.

2. `<out>/plugins/flowai-<pack>/.claude-plugin/plugin.json`:
   ```json
   {
     "name": "flowai",
     "description": "<from pack.yaml>",
     "author": { "name": "korchasa" },
     "repository": "https://github.com/korchasa/flowai",
     "homepage": "https://github.com/korchasa/flowai#claude-code-plugin-marketplace",
     "license": "<from LICENSE file>",
     "keywords": ["ai", "workflow", "framework", "assistflow"],
     "category": "development-workflows"
   }
   ```
   `version` deliberately omitted (per pilot policy — commit SHA = version, no manual bumping). Bump strategy revisited before multi-pack rollout. Version-resolution implication: Claude Code uses the SHA of the **downstream** `korchasa/flowai-plugins` commit. Because CI only pushes downstream on `framework-v*` tag (B3 trigger), users with auto-update on receive exactly one update per framework release — not one per upstream commit.

3. `<out>/plugins/flowai-<pack>/skills/<stripped>/SKILL.md` — one per source file under `framework/<pack>/{commands,skills}/`:
   - Source dir name `framework/core/skills/flowai-investigate/` → stripped name `investigate` → emitted at `plugins/flowai/skills/investigate/SKILL.md`. If a source dir name does not start with `flowai-`, the name is preserved unchanged (defensive — currently every source dir does start with `flowai-`).
   - Stripping rule applied to the **outermost** directory name only. Nested files (`scripts/`, `references/`) preserved verbatim under the stripped parent.
   - Commands (source path under `commands/`) get `disable-model-invocation: true` injected into frontmatter at top level. Skills get nothing injected. Existing frontmatter merged via YAML round-trip (parse → mutate → serialize, key order preserved).
   - Body bytes preserved verbatim (no whitespace normalisation).

4. `<out>/plugins/flowai-<pack>/agents/<name>.md` — one per source file under `framework/<pack>/agents/*.md`:
   - Frontmatter transformed to Claude-native shape: keep `name`, `description`, `tools`, `disallowedTools`, `model`, `effort`, `maxTurns`, `background`, `isolation`, `color`; drop `readonly`, `mode`, `opencode_tools`; resolve `model` tier (max/smart/fast/cheap/inherit) to the Claude-native model string using the same resolver flowai-cli uses. Drop any unknown key.
   - Body preserved verbatim.

5. `<out>/plugins/flowai-<pack>/hooks/hooks.json` — generated **only** if `framework/<pack>/hooks/` contains entries. For `core` (pilot pack) this is empty; the file is skipped. Contract for future packs documented in SDS.

6. **Not emitted in pilot**: `pack.yaml`, `assets/`, `acceptance-tests/`, `.flowai.yaml`, `scaffolds:` mapping. These are CLI-side concerns; plugin install does not run scaffolds, and Claude Code does not consume them.

Determinism contract:
- Filesystem walk uses sorted `Deno.readDir` output.
- JSON written with `JSON.stringify(value, null, 2)` against alphabetically-sorted keys.
- YAML frontmatter written using a small in-house serializer that preserves source key order plus appends injected `disable-model-invocation` at the end if not already present.
- Re-running the build twice in a row produces byte-identical output (verified by test).

### Test plan (`scripts/build-claude-plugins_test.ts`)

Test scenarios (Deno test framework, all hermetic — no network, no global `~/.claude/`):
- `emits-marketplace-and-plugin-manifest-for-core`: smoke test, build core, assert the two manifest files exist with required fields.
- `skill-and-command-dirs-have-prefix-stripped`: assert no directory under `plugins/flowai/skills/` starts with `flowai-`.
- `commands-get-disable-model-invocation-injected-skills-do-not`: for each emitted SKILL.md, frontmatter must contain `disable-model-invocation: true` iff source path was under `framework/core/commands/`.
- `agent-frontmatter-matches-claude-native-mapping`: feed a fixture agent with universal frontmatter (all fields populated); assert transformed frontmatter matches FR-DIST.MAPPING universal→Claude column exactly.
- `marketplace-and-plugin-json-schema-valid`: run a hand-written Zod schema for marketplace.json and plugin.json against generated output. Schema mirrors the table from `documents/design.md` §3.X.
- `byte-deterministic-rerun`: build twice into separate tempdirs, recursively diff — must be byte-identical.
- `commands-are-the-only-source-of-disable-mi`: assert no SKILL.md under `framework/core/` carries `disable-model-invocation` (FR-PACKS.CMD-INVARIANT / FR-PACKS.SKILL-INVARIANT guard at the build boundary).

Tests use the **real** `framework/core/` directory as input (not a fixture). This catches drift: if anyone adds a new skill that breaks the build, the test fails on next `deno task check`.

### CI integration

In `.github/workflows/ci.yml`, add a job `release-claude-plugins`:

```yaml
release-claude-plugins:
  needs: check
  if: startsWith(github.ref, 'refs/tags/framework-v')
  runs-on: ubuntu-latest
  permissions:
    contents: read
  steps:
    - uses: actions/checkout@<pinned-sha> # framework repo
    - uses: denoland/setup-deno@<pinned-sha>
    - run: deno task build-plugins
    - uses: actions/checkout@<pinned-sha>
      with:
        repository: korchasa/flowai-plugins
        ssh-key: ${{ secrets.FLOWAI_PLUGINS_DEPLOY_KEY }}
        path: downstream
    - name: Replace downstream artefacts
      run: |
        # Remove generated artefacts only — keep README.md and LICENSE
        find downstream -mindepth 1 -maxdepth 1 \
             ! -name README.md ! -name LICENSE ! -name .git -exec rm -rf {} +
        cp -r dist/claude-plugins/. downstream/
    - name: Commit and push
      working-directory: downstream
      run: |
        git config user.name 'flowai-release-bot'
        git config user.email 'release-bot@flowai.local'
        TAG="${GITHUB_REF#refs/tags/}"
        git add -A
        # Tolerate idempotent re-runs (preview tag re-shot, manual workflow_dispatch with same SHA).
        if git diff --cached --quiet; then
          echo "No artefact changes; skipping commit."
        else
          git commit -m "release: ${TAG}"
        fi
        # Tag may already exist on a re-run; allow replacement and force-push the tag ref only.
        git tag -f "${TAG}"
        git push origin main
        git push --force-with-lease origin "refs/tags/${TAG}"
```

Deploy key:
- Generate ed25519 key locally: `ssh-keygen -t ed25519 -C 'flowai-plugins-deploy' -f flowai_plugins_deploy -N ''`.
- Add public key as a **write-enabled deploy key** on `korchasa/flowai-plugins` (Settings → Deploy keys → Add → tick "Allow write access").
- Add private key as repository secret `FLOWAI_PLUGINS_DEPLOY_KEY` on `korchasa/flowai`.
- Document procedure in `documents/design.md` §3.X.

Failure behaviour:
- If the downstream push fails (deploy key revoked, branch protection, network blip), the CI step fails and the framework tag is preserved — re-run the workflow once credentials are fixed. No partial state in downstream repo because the `git commit` happens locally before push.
- If `build-plugins` fails before push, downstream is untouched.

### `korchasa/flowai-plugins` bootstrap

One-time, manual:
1. Create empty public repo `korchasa/flowai-plugins` on GitHub (description: "Generated Claude Code plugin marketplace for AssistFlow — do not edit by hand; source lives at github.com/korchasa/flowai").
2. Initial commit on `main` with two files: `README.md` (pointer back to this repo + installation instructions) and `LICENSE` (mirror of this repo's license).
3. Add deploy key per CI step above.
4. Trigger the upstream `release-claude-plugins` job once via a preview tag `framework-v0.0.0-pilot.1` (or similar) — verify the downstream `main` receives the generated tree and the tag appears.

### SRS edits

1. New section under `FR-DIST` parent, between `FR-DIST.GLOBAL` and `FR-PACKS.SCOPE`:

   ```markdown
   #### FR-DIST.MARKETPLACE Claude Code Plugin Marketplace (Pilot)

   - **Desc:** Additional distribution channel for Claude Code users. The framework publishes a Claude-Code-native plugin marketplace at `korchasa/flowai-plugins`. Catalog (`marketplace.json`) and plugin payloads are generated from `framework/<pack>/` on every `framework-v*` tag by CI; no plugin artefacts are committed to this repo. Pilot ships only the `core` pack as plugin `flowai`; remaining packs follow as separate tasks. flowai CLI distribution (FR-DIST.SYNC) is unaffected and remains the channel for Cursor/OpenCode/Codex.
   - **Tasks:** [claude-code-plugin-marketplace-pilot](tasks/2026/05/claude-code-plugin-marketplace-pilot.md)
   - **Scenario:** User on Claude Code runs `/plugin marketplace add korchasa/flowai-plugins` once, then `/plugin install flowai@flowai-plugins`. Skills become available as `/flowai:<short-name>` (the `flowai-` prefix is stripped from skill directory names during build to avoid `/flowai:flowai-commit`-style double prefix). Updates arrive via Claude Code's built-in `/plugin update` / auto-update flow tied to the downstream repo's commit SHA.
   - **Acceptance:**
     - [ ] `scripts/build-claude-plugins.ts` emits a deterministic plugin tree under `dist/claude-plugins/`.
       Evidence: `scripts/build-claude-plugins_test.ts::byte-deterministic-rerun`.
     - [ ] Skill/command directory names have `flowai-` stripped in the emitted tree.
       Evidence: `scripts/build-claude-plugins_test.ts::skill-and-command-dirs-have-prefix-stripped`.
     - [ ] `disable-model-invocation: true` injected for commands, absent for skills.
       Evidence: `scripts/build-claude-plugins_test.ts::commands-get-disable-model-invocation-injected-skills-do-not`.
     - [ ] Agent frontmatter transformed per FR-DIST.MAPPING universal→Claude column.
       Evidence: `scripts/build-claude-plugins_test.ts::agent-frontmatter-matches-claude-native-mapping`.
     - [ ] CI job `release-claude-plugins` publishes to `korchasa/flowai-plugins` on `framework-v*` tag.
       Evidence: `manual — korchasa` (one preview tag round-trip).
     - [ ] `korchasa/flowai-plugins` repository bootstrapped with README + LICENSE.
       Evidence: `manual — korchasa`.
   - **Status:** [ ] (flips to `[x]` once pilot ships)
   - **Out of scope:** multi-pack rollout (separate tasks); submission to official Anthropic marketplace; latest/dev release channel; npm-source plugin distribution; hook transform validation (no hooks in `core` pack).
   ```

2. `FR-DIST.GLOBAL` `Not in scope` line edit:
   - Replace `Auto-migration from project to global; native marketplace plugin packaging.` with `Auto-migration from project to global. (Native marketplace packaging — see FR-DIST.MARKETPLACE.)`

### SDS edits

Add a new component subsection under §3 Components (numbering to be confirmed when editing):

```markdown
### 3.X Claude Code plugin marketplace (`scripts/build-claude-plugins.ts`)

- **Purpose:** Transform `framework/<pack>/` into a Claude-Code-native plugin tree and publish to `korchasa/flowai-plugins` for distribution via Claude Code's plugin marketplace UI.
- **Interfaces:**
  - CLI: `deno task build-plugins [--pack core] [--out dist/claude-plugins] [--marketplace-name flowai-plugins]`
  - CI: job `release-claude-plugins` in `.github/workflows/ci.yml`, gated on `framework-v*` tag push.
  - Downstream: repository `korchasa/flowai-plugins`, force-pushed on `main`, tagged with the framework version.
- **Deps:**
  - Reads `framework/<pack>/{commands,skills,agents,hooks,pack.yaml,LICENSE}`. No network.
  - Vendors a subset of `flowai-cli`'s `crossTransformAgent("claude")` logic — limited to fields enumerated in FR-DIST.MAPPING. Drift risk bounded by `agent-frontmatter-matches-claude-native-mapping` test.
- **Determinism:** sorted directory walk, sorted JSON keys, stable YAML serialization. `byte-deterministic-rerun` test enforces.
- **Failure mode:** any source primitive violating FR-PACKS.{CMD,SKILL}-INVARIANT fails the build (fail-fast). Missing pack directory fails with explicit error naming the path. Network errors impossible (offline by construction).
```

### README edits

Add a subsection under §Installation:

```markdown
### Claude Code plugin marketplace (pilot)

In addition to the `flowai` CLI, Claude Code users can install the `core` pack as a native plugin:

\```shell
/plugin marketplace add korchasa/flowai-plugins
/plugin install flowai@flowai-plugins
/reload-plugins
\```

> **Security:** Claude Code plugins execute arbitrary code at your user privilege. Only install marketplaces and plugins from sources you trust. The `korchasa/flowai-plugins` repository is a CI-generated mirror of this framework's `core` pack and contains no human-authored code beyond `README.md` and `LICENSE`.

Skills are then invoked under the `/flowai:` namespace, e.g. `/flowai:commit`. The remaining packs (devtools, engineering, deno, typescript, memex) continue to ship via the `flowai` CLI; multi-pack marketplace rollout follows after the pilot validates the pipeline.
```

### Execution order

1. Land `scripts/build-claude-plugins.ts` + `scripts/build-claude-plugins_test.ts` + `deno task build-plugins` + `.gitignore` entry + `deno task check` passing.
2. Bootstrap `korchasa/flowai-plugins` repo (README + LICENSE only). Add deploy key.
3. Add CI job `release-claude-plugins`. Configure secret `FLOWAI_PLUGINS_DEPLOY_KEY`.
4. Edit SRS (`FR-DIST.MARKETPLACE` + `FR-DIST.GLOBAL` amend) and SDS (§3.X).
5. Edit README (Installation subsection).
6. Commit with `feat(dist): claude code plugin marketplace pilot (FR-DIST.MARKETPLACE)`.
7. Tag preview release `framework-vX.Y.Z-pilot.1`; verify CI round-trip into `flowai-plugins`.
8. Manual smoke install: `/plugin marketplace add korchasa/flowai-plugins` + `/plugin install flowai@flowai-plugins` + invoke a skill. Capture transcript in PR description.
9. Cut real `framework-vX.Y.Z` release. Flip SRS `FR-DIST.MARKETPLACE` `Status` to `[x]`.
10. Trigger `flowai-cli` repo CI against this framework HEAD; verify green.

## Follow-ups

- **Multi-pack rollout** — five remaining packs (`devtools`, `engineering`, `deno`, `typescript`, `memex`). Use the same build script; verify hook transform on `devtools` (the only pack currently carrying a hook). Tracked as separate tasks once pilot is shipped and stable for ≥ one release cycle.
- **Extract `@korchasa/flowai-transforms` JSR library** consumed by both `flowai-cli` (existing transforms) and `flowai`'s `build-claude-plugins.ts` (pilot — currently vendored). Eliminates drift risk between the two consumers of the universal-→-Claude mapping. Effort estimate: small (the code already exists in `flowai-cli`, just publish + consume); priority bumps once the second consumer (multi-pack rollout) lands and drift becomes more than theoretical.
- **Latest/dev release channel** (B4 from the chat axis analysis) — second downstream branch tracking `main` instead of tags, giving early-adopters every-commit updates. Enabled by adding a `release-claude-plugins-dev` CI job gated on `push: branches: [main]`. Skipped in pilot to avoid doubling CI surface from day one.
- **Submission to official Anthropic marketplace** (`claude-plugins-official`) via the in-app submission form (https://claude.ai/settings/plugins/submit). Re-evaluate once `flowai-plugins` has shipped ≥ 3 framework releases and we have user-feedback evidence.

<!-- Captured during step 7 (critique triage). Items classified "defer" land here. -->

## Round 2: Full-featured plugin install

After the pilot landed, several core skills broke or degraded under plugin install because the tree lacked artefacts the CLI install provides. Round 2 closes the gap. Plan: [/Users/korchasa/.claude/plans/1-2-transient-simon.md](../../../../../../.claude/plans/1-2-transient-simon.md).

### Round 2 DoD

- [x] **FR-DIST.MARKETPLACE**: scope filter excludes `scope: project-only` primitives from the plugin tree.
  - Test: `scripts/build-claude-plugins_test.ts::scope-filter-excludes-project-only-primitives`
  - Evidence: `deno test -A scripts/build-claude-plugins_test.ts --filter scope-filter`
- [x] **FR-DIST.MARKETPLACE**: pack-level `assets/<file>` referenced by SKILL.md is copied into the per-skill `assets/` and body paths are rewritten.
  - Test: `scripts/build-claude-plugins_test.ts::copies-pack-assets-into-consuming-skill-dirs` + validator `validateAssetReferences`
  - Evidence: `deno task validate-plugins`
- [x] **FR-DIST.MARKETPLACE**: `<!-- begin: cli-only-skill-update --> ... <!-- end: cli-only-skill-update -->` blocks are stripped during plugin emit.
  - Test: `scripts/build-claude-plugins_test.ts::strips-cli-only-fences`
  - Evidence: `deno test -A scripts/build-claude-plugins_test.ts --filter strips-cli-only-fences`
- [x] **FR-DIST.MARKETPLACE**: `/flowai-<name>` references in SKILL.md bodies are rewritten to `/flowai-<pack>:<name>`.
  - Test: `scripts/build-claude-plugins_test.ts::rewrites-cross-skill-slash-invocations` + validator `validateNoUnnamespacedSlashCommands`
  - Evidence: `deno task validate-plugins`
- [x] **FR-DIST.MARKETPLACE**: `version` injected into plugin.json and marketplace entry from upstream `deno.json` (semver-validated by validator).
  - Test: `scripts/build-claude-plugins_test.ts::injects-version-from-upstream-deno-json`
  - Evidence: `jq '.version' dist/claude-plugins/plugins/flowai/.claude-plugin/plugin.json`
- [x] **FR-DIST.MARKETPLACE**: skill `tags:` unioned, sorted, capped at 8, emitted on marketplace entry only.
  - Test: `scripts/build-claude-plugins_test.ts::collects-tags-into-marketplace-entry-only`
  - Evidence: synthetic-fixture test (core skills declare no tags yet)
- [x] **FR-DIST.MARKETPLACE**: pack hooks (`framework/<pack>/hooks/<name>/{hook.yaml,run.ts}`) → `hooks/hooks.json` + per-hook `run.ts` copy; validator parses the JSON schema and cross-checks command files exist.
  - Test: `scripts/build-claude-plugins_test.ts::transforms-hook-yaml-into-hooks-json`
  - Evidence: synthetic-fixture test (core has zero hooks)
- **External follow-up** (not gating this task): CLI aborts with an explicit message when a Claude Code plugin install for the same pack is detected. Cross-repo: implemented in [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli).
  - Test: TBD in `flowai-cli` repo
  - Evidence: manual — install plugin, run `flowai sync`, confirm non-zero exit.
