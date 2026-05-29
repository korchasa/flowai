---
date: "2026-05-24"
status: done
implements:
  - FR-DIST.MARKETPLACE
  - FR-MAINT
tags: [distribution, marketplace, dogfood, namespace, claude-code, codex]
related_tasks:
  - 2026/05/claude-code-plugin-marketplace-pilot.md
  - 2026/05/codex-plugin-marketplace-support.md
---

# Local marketplace namespace (`flowai-plugins-local`)

## Goal

Stop overloading the single `flowai-plugins` marketplace name across upstream-tracking installs and framework-developer dogfood installs. After this change, `deno task sync-plugins-local` re-points / installs under a distinct namespace (`flowai-plugins-local`); the upstream `flowai-plugins` registration stays untouched, so framework developers can compare released vs in-development behaviour side-by-side and revert to upstream by removing only the local entry. Mirrors the approach already shipped in [`korchasa/flowai-workflow`](https://github.com/korchasa/flowai-workflow) (`scripts/sync-plugins-local.ts:37`).

Business value:
- Side-by-side: `claude plugin list` and `~/.codex/config.toml` clearly separate dev-loop installs (`<plugin>@flowai-plugins-local`) from upstream installs (`<plugin>@flowai-plugins`).
- Rollback to released behaviour is one `claude plugin marketplace remove flowai-plugins-local` away — no need to `marketplace add korchasa/flowai-plugins` again from scratch.
- Aligns this repo with the dogfood UX already in `flowai-workflow`; developers cross-cutting both repos see identical primitives.

## Overview

### Context

- Today `scripts/sync-plugins-local.ts:17` declares `MARKETPLACE_NAME = "flowai-plugins"` — the same name the public marketplace at `korchasa/flowai-plugins` carries. Sync `marketplace remove` + `marketplace add <local-abs>` replaces the upstream registration silently every time the dogfood loop runs.
- `scripts/build-plugins.ts:38` already exposes `DEFAULT_MARKETPLACE_NAME = "flowai-plugins"` and accepts a `--marketplace-name <name>` CLI flag, but `sync-plugins-local.ts` never passes it; sub-process invocation just runs `deno run -A scripts/build-plugins.ts --out <outDir>`.
- Reference design in [flowai-workflow](https://github.com/korchasa/flowai-workflow):
  - Constant `MARKETPLACE_NAME = "flowai-workflow-local"` (`scripts/sync-plugins-local.ts:37`).
  - Build entry point is the in-process function `buildPluginPayload({ marketplaceName: MARKETPLACE_NAME, … })`; sync passes the local name directly.
  - Helper `substituteMarketplaceName(json, name)` (`scripts/build-plugin-payload.ts:98`) is a text-level fallback patcher only because flowai-workflow builds the catalog by copying source verbatim; our `build-plugins.ts` constructs the catalog from `MarketplaceCatalog` data, so we can keep parameter-flow purity.
  - `parseAndStripFlowaiTables(text, marketplaceName)` (default = `flowai-workflow-local`) — only strips Codex `[plugins."x@flowai-workflow-local"]` tables, leaving upstream `[plugins."x@flowai-workflow"]` blocks intact.
- Codex 0.130+ behaviour confirmed in `documents/design.md:441`: adding a marketplace auto-registers every emitted pack with `enabled = true`. Adding the same packs under a different marketplace name therefore creates parallel TOML tables; ordering / precedence between same-named plugins from two marketplaces inside one Codex thread is not formally documented — to verify in this task.
- `FR-MAINT` acceptance bullets (`documents/requirements.md:73-78`) and `FR-DIST.MARKETPLACE` "Local refresh contract" (`documents/requirements.md:347`) currently quote the marketplace name `flowai-plugins`; both must be updated to `flowai-plugins-local` for dogfood references while keeping `flowai-plugins` only where the upstream-tracking install is meant.
- README has the same string at `README.md:105`. SDS at `documents/design.md:407` likewise quotes "re-points the `flowai-plugins` marketplace in each available CLI".

### Current State

- `scripts/sync-plugins-local.ts`:
  - `MARKETPLACE_NAME = "flowai-plugins"` shared between Claude/Codex remove + add, marketplace.json read, and Codex `parseAndStripFlowaiTables` default.
  - Builds via sub-process `deno run -A scripts/build-plugins.ts --out <outDir>` — no `--marketplace-name` passed.
- `scripts/build-plugins.ts`:
  - `DEFAULT_MARKETPLACE_NAME = "flowai-plugins"` (`:38`), accepted via `--marketplace-name <name>` flag (`:858`).
  - Catalog construction at `:178-225` writes `name: marketplaceName` directly into `marketplace.json` (Claude) and `.agents/plugins/marketplace.json` (Codex). No string substitution involved.
- `scripts/sync-plugins-local_test.ts`: tests `planClaudeActions`, `readMarketplacePluginNames`, `reconcileCodexFlowaiPluginEntries`, `autoInstallEnabled`. TOML fixtures use `flowai-plugins` literal.
- `.env` carries `AUTO_INSTALL_PLUGINS=true` (see `documents/requirements.md:381`). Switching namespaces does NOT change the gate semantics.
- SRS `FR-MAINT` acceptance bullets 75, 77 reference "the `flowai-plugins` marketplace".
- SRS `FR-DIST.MARKETPLACE` Local refresh contract (line 347) quotes the same name.
- SDS §3.5.1 (`documents/design.md:407`) quotes the same name.
- README §local install (`README.md:105`) quotes the same name.

### Constraints

- MUST keep the upstream marketplace `flowai-plugins` and any `[plugins."x@flowai-plugins"]` Codex blocks completely untouched by the dogfood loop — proven by tests on `parseAndStripFlowaiTables`, `reconcileCodexFlowaiPluginEntries`, `planClaudeActions`, and `buildCheckPlan`.
- MUST NOT introduce a text-substitution `substituteMarketplaceName` helper — `build-plugins.ts` already takes `marketplaceName` as a structured parameter; reuse that path (sync passes either `--marketplace-name flowai-plugins-local` via CLI flag, OR import `buildPlugins({ marketplaceName })` and call in-process — the variant analysis decides).
- MUST NOT rename `plugins[].name` inside the marketplace catalog. Install IDs read `flowai@flowai-plugins-local`, `flowai-deno@flowai-plugins-local`, etc. — symmetric with upstream.
- Pure helpers stay unit-testable; behavioural side effects (`claude plugin marketplace add …`) remain covered only by interactive smoke (manual reviewer evidence). No new integration tests against live `claude` / `codex` CLIs.
- All doc references in SRS / SDS / README must be migrated atomically; partial migration leaves a contradictory contract.

## Definition of Done

- [x] FR-DIST.MARKETPLACE: `scripts/sync-plugins-local.ts` re-points and installs under `flowai-plugins-local` (Claude + Codex), leaving any pre-existing `flowai-plugins` marketplace registration and `[plugins."x@flowai-plugins"]` Codex blocks byte-identical.
  - Test: `scripts/sync-plugins-local_test.ts::parseAndStripFlowaiTables leaves upstream flowai-plugins blocks untouched`
  - Evidence: `deno test -A scripts/sync-plugins-local_test.ts`
- [x] FR-DIST.MARKETPLACE: Generated `dist/claude-plugins/.claude-plugin/marketplace.json` `name` field is `flowai-plugins-local` when produced through the dogfood build path, and `flowai-plugins` when produced through the default `deno task build-plugins` path used by CI / release.
  - Test: `scripts/build-plugins_test.ts::builds-catalog-with-marketplace-name-override`
  - Evidence: `deno test -A scripts/build-plugins_test.ts`
- [x] FR-DIST.MARKETPLACE: Codex marketplace catalog `dist/claude-plugins/.agents/plugins/marketplace.json` `name` field is `flowai-plugins-local` under the dogfood path; upstream-default path emits `flowai-plugins`.
  - Test: `scripts/build-plugins_test.ts::codex-marketplace honours-marketplace-name-override`
  - Evidence: `deno test -A scripts/build-plugins_test.ts`
- [x] FR-MAINT: `deno task check` (with `AUTO_INSTALL_PLUGINS=true`) auto-installs every emitted pack into `flowai-plugins-local` namespace; upstream `flowai-plugins` registration remains untouched on the developer machine.
  - Test: `scripts/task-check_test.ts::buildCheckPlan: build-plugins gets --marketplace-name flowai-plugins-local when syncPluginsLocal is on` + `scripts/sync-plugins-local_test.ts::planClaudeActions: ignores project-scope and other-marketplace disabled entries`
  - Evidence: `deno test -A scripts/task-check_test.ts` + `deno test -A scripts/sync-plugins-local_test.ts`
- [x] FR-DIST.MARKETPLACE: SRS `FR-DIST.MARKETPLACE` "Local refresh contract" wording references `flowai-plugins-local` for dogfood operations and `flowai-plugins` only for downstream-tracking operations; SDS §3.5.1 mirrors the same split.
  - Test: `manual — korchasa` (doc review)
  - Evidence: `grep -nE 'flowai-plugins(-local)?' documents/requirements.md documents/design.md README.md` reviewed against the contract.
- [x] FR-MAINT: SRS `FR-MAINT` acceptance bullets (currently lines 75–78) reference `flowai-plugins-local` for sync targets; upstream-only references in the same section are tagged as such.
  - Test: `manual — korchasa`
  - Evidence: line-by-line diff against `documents/requirements.md` §FR-MAINT.
- [x] FR-DIST.MARKETPLACE: README local-dogfood paragraph documents `flowai-plugins-local` namespace + revert recipe (`claude plugin marketplace remove flowai-plugins-local`).
  - Test: `manual — korchasa`
  - Evidence: `grep -n flowai-plugins-local README.md` shows the dogfood paragraph mentions both the new namespace and the revert recipe.
- [x] FR-DIST.MARKETPLACE: `deno task check` passes after all edits — zero `=== FAIL` real (per AGENTS.md `deno task check` Output Quirks: ignore the three intentional `Deno.exit(...)` fixture lines).
  - Test: `deno task check`
  - Evidence: `NO_COLOR=1 deno task check` exits 0 after task-format baseline cleanup.
- [x] FR-DIST.MARKETPLACE: Codex plugin manifest `interface.displayName` equals the plugin install identifier (`flowai`, `flowai-deno`, …) so the Codex UI does not render `core` pack as `flowai-core`. Surfaced during post-implement smoke; folded into this task per user direction.
  - Test: `scripts/build-plugins_test.ts::codex-plugin-manifest displayName matches pluginName for every pack`
  - Evidence: `deno test -A scripts/build-plugins_test.ts --filter 'displayName matches pluginName'`
- [x] FR-DIST.MARKETPLACE: `syncCodex` wipes the on-disk Codex payload cache `<CODEX_HOME>/plugins/cache/flowai-plugins-local/` between `marketplace remove` and `marketplace add`, and also wipes the legacy `flowai-plugins` cache only when that legacy marketplace is absent or still points at this repo's local dist. Without this, Codex's "skip-copy when `<plugin>/<version>/` already exists" optimisation keeps the user pinned to whatever was cached at first sync (verified May 29: stale displayName `flowai core` and missing skills survived rebuild + re-add until cache was wiped). `marketplace upgrade` was tried first — it works only for git-source marketplaces and rejects local sources with `not configured as a Git marketplace`, so wipe-then-add is the only deterministic refresh for local payloads.
  - Test: `scripts/sync-plugins-local_test.ts::codexCachePathFor: honours CODEX_HOME over HOME` + `scripts/sync-plugins-local_test.ts::codexCachePathFor: falls back to HOME/.codex when CODEX_HOME unset` + `scripts/sync-plugins-local_test.ts::shouldWipeLegacyCodexCache: preserves genuine upstream legacy cache`
  - Evidence: `deno test -A scripts/sync-plugins-local_test.ts` (pure helpers) + manual smoke `deno task sync-plugins-local` (legacy `~/.codex/plugins/cache/flowai-plugins/flowai-core` removed; next Codex session repopulates `flowai-plugins-local` from source with `.interface.displayName == "flowai"` and `skills/investigate/` present)
- [x] FR-DIST.MARKETPLACE: One-time manual smoke. **If** upstream `flowai-plugins` is already registered on the dev box: after `deno task sync-plugins-local`, `claude plugin marketplace list` shows BOTH entries; `claude plugin list` lists both `<plugin>@flowai-plugins` and `<plugin>@flowai-plugins-local`; `~/.codex/config.toml` carries parallel `[plugins."x@flowai-plugins"]` and `[plugins."x@flowai-plugins-local"]` blocks. **Else** (upstream not installed): record "upstream not installed — coexistence step skipped".
  - Test: `manual — korchasa`
  - Evidence: Smoke captured in this task's "Verification log" appendix on completion day.

## Solution

**Selected variant: V2 (in-process import of `buildPlugins`)** — mirrors flowai-workflow's `scripts/sync-plugins-local.ts:425-430` exactly. No regex / text-substitution helper is required because `scripts/build-plugins.ts:194-204` already writes `name: marketplaceName` directly into the catalog JSON literal.

### Files to modify

- `scripts/sync-plugins-local.ts` — change marketplace constant, replace sub-process build with in-process call, update header comment.
- `scripts/build-plugins.ts` — no signature change required; the existing `BuildOptions.marketplaceName` parameter (`:123`) and `DEFAULT_MARKETPLACE_NAME = "flowai-plugins"` (`:38`) cover both upstream (default) and dogfood (override) paths. The CLI wrapper at `:800-842` keeps the existing `--marketplace-name` flag for callers (incl. updated task-check.ts).
- `scripts/task-check.ts` — when `options.syncPluginsLocal === true`, the prerequisite `build-plugins` step gets `--marketplace-name flowai-plugins-local`, so the dist that the subsequent `sync-plugins-local --no-build` re-uses already carries the dogfood name. When the flag is off (default; CI), the build keeps emitting the upstream name. This is the one place that diverges from flowai-workflow's approach (theirs always rebuilds, ours avoids double-build).
- `scripts/sync-plugins-local_test.ts` — extend existing fixtures to:
  1. add a test that `parseAndStripFlowaiTables(toml, "flowai-plugins-local")` leaves `[plugins."x@flowai-plugins"]` blocks byte-identical (upstream isolation invariant);
  2. add a test that `reconcileCodexFlowaiPluginEntries()` preserves upstream `[plugins."x@flowai-plugins"]` blocks while replacing dogfood `[plugins."x@flowai-plugins-local"]` blocks;
  3. update `planClaudeActions` fixtures so upstream and third-party marketplace entries cannot influence the dogfood action plan.
- `scripts/build-plugins_test.ts` — add two tests:
  1. `builds-catalog-with-marketplace-name-override`: invoking `buildPlugins({ marketplaceName: "flowai-plugins-local", … })` produces `<outDir>/.claude-plugin/marketplace.json` with `.name === "flowai-plugins-local"`;
  2. `codex-marketplace honours-marketplace-name-override`: same assertion for `<outDir>/.agents/plugins/marketplace.json`.
- `scripts/task-check_test.ts` — add `buildCheckPlan: marketplace-name is dogfood when sync-plugins-local is gated on`. Existing `buildCheckPlan: sync-plugins-local is gated by env flag` keeps current assertions.
- `documents/requirements.md` — surgical edits:
  - `FR-MAINT` (lines 75–78): replace `flowai-plugins` with `flowai-plugins-local` in dogfood-sync sentences; keep the upstream name only where the downstream-tracking install flow is described.
  - `FR-DIST.MARKETPLACE` `**Local refresh contract:**` (line 347): split sentence into "dogfood (`flowai-plugins-local`)" vs "upstream (`flowai-plugins`)" — preserving any other line byte-identical.
  - `FR-DIST.MARKETPLACE` acceptance bullets (lines 381, 383, 387): replace `flowai-plugins` → `flowai-plugins-local` where they describe `sync-plugins-local`.
- `documents/design.md` §3.5.1 (lines 405–407): update CLI default & local-sync paragraph to describe dual-namespace behaviour; reference the namespace constant `MARKETPLACE_NAME = "flowai-plugins-local"` and explain that `task-check.ts` passes `--marketplace-name flowai-plugins-local` to the build step only when `AUTO_INSTALL_PLUGINS=true`.
- `README.md:105` paragraph: replace single-namespace narrative with dogfood-vs-upstream split; add revert recipe `claude plugin marketplace remove flowai-plugins-local`.
- `documents/index.md` — no row changes needed (FR-DIST.MARKETPLACE and FR-MAINT rows already present); summaries kept as-is (one-line summary unaffected by namespace change).

### Implementation note — `sync-plugins-local.ts` changes (concrete)

```ts
// Header comment: replace "re-points the flowai-plugins marketplace" with
// "re-points the flowai-plugins-local marketplace … leaving any existing
// flowai-plugins (upstream) registration untouched".

import { buildPlugins, DEFAULT_PACKS } from "./build-plugins.ts";  // NEW top-level import

const DEFAULT_OUT_DIR = "dist/claude-plugins";
const MARKETPLACE_NAME = "flowai-plugins-local";    // was "flowai-plugins"

async function ensureBuild(outDir: string, skipBuild: boolean): Promise<void> {
  if (skipBuild) {
    const stat = await Deno.stat(outDir).catch(() => null);
    if (!stat || !stat.isDirectory) {
      throw new Error(
        `--no-build was set but ${outDir} does not exist. Run \`deno task build-plugins\` first.`,
      );
    }
    // Fail-fast: catalog must already carry the dogfood marketplace name,
    // otherwise `claude marketplace add <abs>` would register under the WRONG
    // namespace and silently overwrite upstream state. Critique #3 mitigation.
    const catalog = JSON.parse(
      await Deno.readTextFile(join(outDir, ".claude-plugin", "marketplace.json")),
    ) as { name?: unknown };
    if (catalog.name !== MARKETPLACE_NAME) {
      throw new Error(
        `${outDir}/.claude-plugin/marketplace.json carries name="${catalog.name}", expected "${MARKETPLACE_NAME}". ` +
          `Rebuild with \`deno run -A scripts/build-plugins.ts --marketplace-name ${MARKETPLACE_NAME}\` or drop --no-build.`,
      );
    }
    return;
  }
  console.log(`[sync-plugins-local] Building plugin marketplace at ${outDir}`);
  // Regenerate composite SKILL.md atoms first — when sync-plugins-local runs
  // standalone (no preceding `deno task check`), composites could be stale.
  // Idempotent, ~200ms. Critique #2 mitigation; mirrors `build-plugins.ts:815-827`'s
  // wrapper-level call, which we bypass when using the in-process API.
  await runInherited("deno", [
    "run", "-A", "scripts/generate-skill-composites.ts", "--write",
  ]);
  await buildPlugins({
    packs: [...DEFAULT_PACKS],
    frameworkDir: resolve("framework"),
    outDir,
    marketplaceName: MARKETPLACE_NAME,
  });
}
```

Prerequisite: `DEFAULT_PACKS` must be exported from `scripts/build-plugins.ts`. Currently the constant exists (`scripts/build-plugins.ts` top region) but its `export` status must be verified during implementation; add `export` if missing.

`parseAndStripFlowaiTables`'s default parameter already points at `MARKETPLACE_NAME`, so changing the const automatically rewires the Codex strip logic. `readMarketplacePluginNames` and `planClaudeActions` are namespace-agnostic — no changes. **Test-suite revision required (Critique #8):** every existing call to `parseAndStripFlowaiTables(text)` (no second arg) in `scripts/sync-plugins-local_test.ts` MUST be reviewed — fixtures that imitate upstream state need an explicit `"flowai-plugins"` second argument; fixtures that imitate dogfood state can keep the default.

### `syncClaude` plugin-list assumption (Critique #4)

`readClaudePluginList()` returns `claude plugin list --json` output. The `planClaudeActions(emitted, installedBefore)` planner compares plugin IDs. Because installed plugin IDs are namespace-qualified (`<name>@<marketplace>`), and `emitted` comes from the local catalog with `<name>` only, the planner today implicitly assumes single-marketplace use. With dual-marketplace, the planner must compare `<name>@flowai-plugins-local` only and ignore `<name>@flowai-plugins` upstream entries. During implementation: inspect the `ClaudePluginListEntry` type definition; either filter `installedBefore` to `entry.marketplace === MARKETPLACE_NAME` BEFORE passing into `planClaudeActions`, OR update `planClaudeActions` to take a marketplace filter argument. Pick the lower-blast-radius option (probably the filter at call site).

### `syncCodex` cross-catalog read (Critique #5)

`syncCodex` reads `<absoluteOutDir>/.claude-plugin/marketplace.json` (NOT the Codex catalog) just to extract the list of plugin names. Plugin names are identical in both catalogs, so this is functionally fine but reads as a bug at first glance. Add a one-line comment in the body: `// Plugin names match across Claude/Codex catalogs; reading the Claude one avoids parsing the Codex source-shape twice.`

### task-check.ts change (concrete)

```ts
// implements [FR-DIST.MARKETPLACE]
const buildPluginsArgs = ["run", "-A", "scripts/build-plugins.ts"];
if (options.syncPluginsLocal === true) {
  buildPluginsArgs.push("--marketplace-name", "flowai-plugins-local");
}
prerequisites.push({ cmd: "deno", args: buildPluginsArgs });
```

The `sync-plugins-local --no-build` step remains as-is; the catalog it consumes will now carry the matching name.

### Error handling

- `buildPlugins` throws on missing pack / unwritable outDir → propagate (no swallow). Sync-script's outer try-catch in `main()` already converts to `console.error` + `Deno.exit(1)`.
- If `claude plugin marketplace remove flowai-plugins-local` fails when no such marketplace exists yet, `runInheritedAllowFail` swallows the error (existing behaviour) — correct: first-ever sync has nothing to remove.
- If `~/.codex/config.toml` does NOT contain any `[plugins."x@flowai-plugins-local"]` blocks (first-ever sync), `parseAndStripFlowaiTables` returns `{ stripped: text, previousEnabled: new Map() }` and re-emits fresh blocks — no behaviour change vs today.
- Upstream isolation invariant: every `parseAndStripFlowaiTables` call uses `marketplaceName = "flowai-plugins-local"`, so any `[plugins."x@flowai-plugins"]` block in the TOML is treated as unrelated text and preserved byte-identical (covered by the new test).

### Verification commands

```sh
# Unit tests
deno test -A scripts/sync-plugins-local_test.ts
deno test -A scripts/build-plugins_test.ts
deno test -A scripts/task-check_test.ts

# Full pipeline (with AUTO_INSTALL_PLUGINS off — default)
NO_COLOR=1 deno task check

# Full dogfood loop (with AUTO_INSTALL_PLUGINS=true from .env)
NO_COLOR=1 AUTO_INSTALL_PLUGINS=true deno task check

# Standalone sync
NO_COLOR=1 deno task sync-plugins-local

# Manual smoke (post-merge, by korchasa)
claude plugin marketplace list   # expect: BOTH "flowai-plugins" (if previously added) and "flowai-plugins-local"
claude plugin list                # expect: <pack>@flowai-plugins-local entries; any pre-existing <pack>@flowai-plugins entries preserved
grep -nE '@flowai-plugins(-local)?' ~/.codex/config.toml
```

### Sequencing

1. **Single atomic commit (Critique #6):** code + tests + SRS / SDS / README updates land together. Splitting commits creates a window where SRS bullets reference `flowai-plugins-local` while code still uses `flowai-plugins` (or vice-versa) — and any `deno task check` run inside that window fails the FR Acceptance Gate.
2. Verify `deno task check` green (without the env flag) before push.
3. Verify `AUTO_INSTALL_PLUGINS=true deno task check` green on the dev box.
4. Manual smoke by korchasa on macOS dev box; capture into the "Verification log" appendix below and mark DoD `[x]`.

## Follow-ups

- **Codex/Claude precedence when same `<pack>` is installed from two marketplaces (Critique #10, deferred):** when `flowai@flowai-plugins` AND `flowai@flowai-plugins-local` are both enabled, slash-command `/flowai:commit` could resolve to either. Manual experiment AFTER MVP: install both, run `/flowai:commit`, observe which version executes. Document the resolution rule (or its absence) in SDS §3.5.1. If both fire, recommend disabling upstream while dogfooding (Codex: `enabled = false`; Claude: `claude plugin disable flowai@flowai-plugins`).
- **Adjust DoD item "parallel marketplace UX" (Critique #7):** the smoke step is meaningful ONLY if upstream `flowai-plugins` is already registered on the dev box. On a fresh machine it's a no-op. Reword to "when upstream is already registered, verify both entries coexist; on fresh machines record 'upstream not installed — step skipped'."

## Verification log

- 2026-05-29: `NO_COLOR=1 deno task check` passed end-to-end with `AUTO_INSTALL_PLUGINS=true`.
- Claude marketplace smoke: `claude plugin marketplace list` shows `flowai-plugins-local` directory source and no upstream `flowai-plugins`; coexistence branch skipped because upstream is not installed on this dev box.
- Claude plugin smoke: `claude plugin list` shows six `@flowai-plugins-local` packs (`flowai`, `flowai-deno`, `flowai-devtools`, `flowai-engineering`, `flowai-memex`, `flowai-typescript`).
- Codex config smoke: `~/.codex/config.toml` contains `[marketplaces.flowai-plugins-local]` and six `[plugins."<pack>@flowai-plugins-local"]` blocks; no `[marketplaces.flowai-plugins]` or `[plugins."<pack>@flowai-plugins"]` blocks remain.
- Codex cache smoke: legacy `~/.codex/plugins/cache/flowai-plugins/` is absent after sync; source dist contains `.codex-plugin/plugin.json` `interface.displayName = "flowai"` and `skills/investigate/SKILL.md`.
- Superseded task lifecycle regression: `NO_COLOR=1 deno task acceptance-tests -f commit-preserves-superseded-task-status -i codex` passed; cache written at `acceptance-tests/cache/core/commit-preserves-superseded-task-status/codex.json`.
