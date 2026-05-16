---
date: "2026-05-16"
status: to do
implements:
  - FR-DIST
  - FR-DIST.BUNDLE
  - FR-CICD
tags: [cli, repo-split, distribution, ci-cd, bundling]
related_tasks: []
---

# Extract flowai CLI to a separate repository

## Goal

Decouple the CLI release cadence from the framework so that:
- the CLI codebase can evolve (refactors, dep bumps, JSR releases) without polluting the framework's git history;
- framework changes do not force a CLI republish unless the bundled snapshot actually changes;
- contributors can fork/audit the CLI surface independently of the (much larger) skill/agent corpus.

## Overview

### Context

- The `cli/` subtree (single command published to JSR as `@korchasa/flowai`) currently lives in the framework monorepo at `/Users/korchasa/www/flowai/flowai`.
- The CLI bundles `framework/` into `cli/src/bundled.json` at publish time via `cli/scripts/bundle-framework.ts` (FR-DIST.BUNDLE). At runtime the CLI has zero network dependency.
- One unified `.github/workflows/ci.yml` runs `deno task check` and (on `main`) publishes both the JSR package and the GitHub release.
- Root `deno.json` carries the JSR package metadata (`name: "@korchasa/flowai"`, `exports: "./cli/src/main.ts"`, `publish.include: ["cli/src/"]`) — so the CLI is published from the monorepo root config, not from `cli/deno.json` (which is intentionally empty).
- Acceptance tests for skills/commands/agents (`scripts/acceptance-tests/`) and framework primitives (`framework/<pack>/acceptance-tests/`) are framework-side concerns; the CLI has its own TS unit tests under `cli/src/*_test.ts`.
- CLI tests require `-A` and currently must run from repo root because some tests reference `cli/src/main.ts` as a relative path.
- Solo-maintained project (`korchasa`), so a coordinated cutover is feasible without inter-team scheduling.
- User-confirmed split scope (this turn): CLI moves out → new repo `flowai-cli`; framework stays in current repo; CLI obtains framework via tarball downloaded from a GitHub release at bundle time; acceptance tests stay with framework; plan covers extraction execution (not just target state).

### Current State

- Single repo `flowai` contains both `cli/` (~13.5 kloc TS) and `framework/` (skills, commands, agents, packs).
- `cli/src/bundled.json` and `cli/src/_version.ts` are gitignored generated artifacts produced by `deno task bundle`.
- `deno task check` chain: bundle → fmt → lint → tests + validators (`scripts/check-*.ts`).
- `cli/AGENTS.md` already documents the "monorepo, not a separate repo" decision — that line becomes obsolete after the split.
- Framework releases are implicit: a JSR publish ships whatever `framework/` looks like at that commit. No separate framework version tag.
- `cli/src/source.ts` knows how to read framework files from a cloned repo dir (`FrameworkSource` abstraction) — adapter pattern already present, so adding a "tarball download" source is a fit, not a rewrite.

### Constraints

- Must keep CLI installable via `deno install -A jsr:@korchasa/flowai` after the split (same JSR package coordinates `@korchasa/flowai`).
- Must preserve users' existing `.flowai.yaml` configs unchanged.
- Framework versioning becomes a first-class concern: CLI needs to pin a framework revision (tag, commit SHA, or release tag) for reproducible bundles.
- Acceptance tests stay framework-side, so CLI repo CI cannot run them — CLI repo CI must still catch the regressions previously caught by `deno task check` (lint, fmt, TS tests, validators that apply to CLI code).
- No `git push --force` to the framework repo when rewriting history into the new CLI repo; preserve original SHAs in the framework repo.
- Validators that read framework files (`scripts/check-skills.ts`, `scripts/check-traceability.ts`, `check-fr-coverage.ts`, `check-naming-prefix.ts`) stay with the framework and run on framework PRs only.
- CLI repo must not pull `framework/` at runtime — only at bundle/publish time. Runtime stays offline (FR-DIST.BUNDLE invariant preserved).
- Pin framework tarball download by **commit SHA + SHA-256 checksum** in CLI repo (no floating refs); reject tag re-pointing.

## Definition of Done

- [ ] FR-DIST.BUNDLE: CLI bundle script in the new `flowai-cli` repo downloads `framework/` from a pinned framework GitHub release tarball, verifies integrity, and produces `cli/src/bundled.json` identical (byte-for-byte) to what the monorepo currently produces for the same framework revision.
  - Test: `cli/scripts/bundle-framework_test.ts::tarball-bundle-matches-monorepo-snapshot` (new, in `flowai-cli` repo)
  - Evidence: in `flowai-cli` repo, `deno task bundle && diff <(jq -S . cli/src/bundled.json) <(curl -sL https://github.com/korchasa/flowai/releases/download/framework-vX.Y.Z/bundled.json | jq -S .)` exits 0
- [ ] FR-DIST: Published JSR package `@korchasa/flowai` from the new repo installs and runs `flowai --help` and `flowai` (sync) against a sample project with same observable behavior as the pre-split release.
  - Test: `cli/src/main_test.ts::CLI - --help` and `::CLI - sync golden-path` (preserved from monorepo)
  - Evidence: `deno install -A --global -n flowai jsr:@korchasa/flowai@<post-split-version> && flowai --help | grep -q "flowai"` exits 0 in a clean container
- [ ] FR-CICD: New `flowai-cli` repo CI runs `deno task check` (fmt + lint + TS tests + CLI-scoped validators) on PR and `main`; on tagged push, publishes to JSR via OIDC (no long-lived secrets).
  - Test: `manual — korchasa` (one preview PR + one release dry-run); GH Actions log must show OIDC token exchange line.
  - Evidence: `gh run list --repo korchasa/flowai-cli --workflow ci.yml --limit 1 --json conclusion -q '.[0].conclusion'` returns `success`
- [ ] FR-DIST.BUNDLE: Framework repo publishes a `framework-vX.Y.Z` GitHub release on every framework version bump, with a `framework.tar.gz` and `framework.tar.gz.sha256` asset attached.
  - Test: `manual — korchasa` (first release + tag triggers asset upload)
  - Evidence: `gh release view framework-v0.13.0 --repo korchasa/flowai --json assets -q '.assets[].name' | sort` includes both `framework.tar.gz` and `framework.tar.gz.sha256`
- [ ] FR-DIST: Old monorepo stops publishing `@korchasa/flowai` (removes JSR publish step from its CI). Final monorepo CLI version emits a one-line deprecation notice on `flowai --version` pointing to the new repo, OR (alternative if no transitional release is shipped) the JSR README is updated to point to the new repo before the next publish from the new repo.
  - Test: `manual — korchasa`
  - Evidence: `grep -L "deno publish" .github/workflows/ci.yml` (monorepo) is empty (i.e. file contains no `deno publish` after split); `jq -r .name deno.json` no longer returns `@korchasa/flowai` (root deno.json is repurposed or removed)
- [ ] FR-DIST: Update SRS section `FR-DIST.BUNDLE` to reflect the new bundle source (pinned framework GitHub release tarball, not adjacent `framework/` dir) and add subsection `FR-DIST.BUNDLE.PIN` for the SHA-256 pinning contract.
  - Test: `manual — korchasa`
  - Evidence: `grep -n "framework-v.*\.tar\.gz" documents/requirements.md` returns a non-empty match under the `FR-DIST.BUNDLE` heading
- [ ] FR-DIST.BUNDLE: `framework.lock` schema (version, commit_sha, tarball_sha256) is documented in SRS under FR-DIST.BUNDLE.PIN and enforced at bundle time — bundle script aborts when any field is missing, malformed, or fails checksum.
  - Test: `cli/scripts/bundle-framework_test.ts::lock-validation-missing-field` and `::lock-validation-sha-mismatch` (new, in `flowai-cli` repo)
  - Evidence: `deno test -A scripts/bundle-framework_test.ts -- --filter 'lock-validation'` exits 0
- [ ] FR-DIST.BUNDLE: Bundle output is byte-deterministic — running `deno task bundle` twice in a row produces identical `bundled.json` bytes (no walk-order or timestamp drift).
  - Test: `cli/scripts/bundle-framework_test.ts::byte-deterministic-rerun` (new, in `flowai-cli` repo)
  - Evidence: `deno test -A scripts/bundle-framework_test.ts -- --filter 'byte-deterministic'` exits 0
- [ ] FR-CICD: Update SRS `FR-CICD` and add subsection `FR-CICD.SPLIT` describing the two-repo CI topology (framework repo: check + release-tarball; CLI repo: check + JSR publish) and the OIDC trust relationship per repo.
  - Test: `manual — korchasa`
  - Evidence: `grep -n "FR-CICD.SPLIT" documents/requirements.md` returns a match
- [ ] FR-DIST: Documentation Map in `CLAUDE.md` updated — `cli/src/*` rows removed from this repo's map; CLI repo gets its own root `AGENTS.md`/`CLAUDE.md` with code-only Documentation Map.
  - Test: `manual — korchasa`
  - Evidence: `grep -c "^- \`cli/" CLAUDE.md` returns `0`

## Solution

Selected variant: **V1 — clean cut, fresh CLI repo, no history transplant** with tarball-from-GitHub-release as the bundle source.

### Phase 0 — Prep in the monorepo (one PR, reversible)

**Files modified (monorepo)**
- `documents/requirements.md` — add `FR-DIST.BUNDLE.PIN` subsection and `FR-CICD.SPLIT` subsection; rewrite `FR-DIST.BUNDLE` body to reference tarball source.
- `documents/design.md` — update §3.5 (Global Framework Distribution) to describe split topology; mark CLI components as "moved to `flowai-cli` repo (post-split)".
- `cli/scripts/bundle-framework.ts` — extract reusable `bundleFrameworkDir(srcDir, outBundlePath, outVersionPath)` function. Existing monorepo entry point still calls it with `../framework`. No behavior change.
- `cli/src/source.ts` — no change yet (will be deleted in Phase 2, but kept in monorepo Phase 0 for risk-free rollback).
- `cli/scripts/bundle-framework_test.ts` — NEW. Test the extracted function against a synthetic framework tree fixture. Verifies deterministic byte-equal output across two runs with same input.

**Verification (monorepo)**
- `deno task check` exits 0.
- `deno task bundle && git diff --exit-code cli/src/bundled.json` — bundle output unchanged (since `bundled.json` is gitignored, instead compare `jq -S . cli/src/bundled.json` against pre-Phase-0 captured baseline).

### Phase 1 — Framework repo publishes release tarballs

**Files modified (monorepo)**
- `.github/workflows/ci.yml` — in the existing `release` job, after `git push --follow-tags origin main` and before the JSR publish step, add a "Build framework tarball" step that:
  1. Computes the framework version from `framework/<pack>/pack.yaml` (or reuses root `deno.json` version — TBD in implementation; reusing root version is simpler and is the current de-facto framework version).
  2. Runs `tar --sort=name --owner=0 --group=0 --numeric-owner --mtime=@${SOURCE_DATE_EPOCH} -czf framework.tar.gz framework/` for reproducibility.
  3. Computes `sha256sum framework.tar.gz > framework.tar.gz.sha256`.
  4. Uploads both as assets to a NEW release `framework-v${NEW_VERSION}` via `gh release create framework-v${NEW_VERSION} framework.tar.gz framework.tar.gz.sha256 --notes "Framework snapshot for CLI bundling. See @korchasa/flowai for the consumer."`.
- The existing `v${NEW_VERSION}` release tag (CLI release) is preserved alongside the new `framework-v${NEW_VERSION}` (framework release). Two parallel release lines from the same SHA during the transition; after Phase 4, the monorepo only produces `framework-v*`.

**Verification (monorepo)**
- After merging Phase 1 PR, the next `chore(release):` commit on `main` should produce both `v<X>` and `framework-v<X>` releases. Inspect with `gh release list --repo korchasa/flowai --limit 4`.
- `gh release download framework-v<X> -p 'framework.tar.gz*' -D /tmp/fw && sha256sum -c /tmp/fw/framework.tar.gz.sha256` exits 0.

### Phase 2 — Create `flowai-cli` repo

**Repo setup (manual, one-time)**
- Create empty `github.com/korchasa/flowai-cli` repo (public, MIT license matching the existing `deno.json`).
- **Do NOT rebind JSR OIDC trust yet** — keep the existing `korchasa/flowai` binding intact through Phase 2. The rebind to `korchasa/flowai-cli` happens in Phase 3 immediately before the first tag push, after the local-install dry-run succeeds. This preserves the monorepo's ability to publish a rollback patch if Phase 3 fails.

**Files created in `flowai-cli` (initial commit)**
- `deno.json` — copied from monorepo root `deno.json` with these edits:
  - `exports` → `"./src/main.ts"` (flattened, no `cli/` prefix).
  - `publish.include` → `["src/"]`.
  - Remove `@acceptance-tests/` import map entry (acceptance tests stay framework-side).
  - Remove the `acceptance-tests` task; remove `sync-local`/`sync-global` tasks (those manipulate framework/, which is gone here).
  - `bundle` task → `deno run -A scripts/bundle-framework.ts`.
  - Adjust `lint.exclude`/`fmt.exclude` — drop all `framework/*` patterns; this repo has no `framework/` dir.
- `src/` — copy `cli/src/**` (flatten one level). Apply `find src -name '*.ts' -exec sed -i '' 's|cli/src/|src/|g; s|../../framework|<unused — remove>|g' {} +` then hand-audit. Specifically:
  - `src/main_test.ts` and `src/ide_test.ts` — change the path constant from `cli/src/main.ts` to `src/main.ts`.
  - **Gate**: `grep -rn 'cli/src/' src/ scripts/ .github/` in the new repo MUST return empty before the first commit lands. Any remaining occurrence is a port miss.
  - `cli/AGENTS.md` rule "monorepo, not a separate repo" is deleted; the new `AGENTS.md` declares "standalone repo; bundles framework via GH release tarball pinned in `framework.lock`".
- **Version source change**: `src/_version.ts` is generated by the bundle script from the new repo's own `deno.json` version field (NOT the framework version). The new repo's CLI release line restarts at `0.13.0` independent of the framework version.
- `scripts/bundle-framework.ts` — NEW. Replaces `cli/scripts/bundle-framework.ts`. Pseudocode:
  ```ts
  // Read framework.lock {commit_sha, version, sha256}
  // Download https://github.com/korchasa/flowai/releases/download/framework-v<version>/framework.tar.gz
  // Verify SHA-256 against framework.lock; error out on mismatch
  // Untar to a tmp dir
  // Reuse the extracted bundleFrameworkDir(tmpDir, "src/bundled.json", "src/_version.ts") from Phase 0
  // Clean up tmp dir
  ```
  Error handling: any download/checksum/untar failure aborts with non-zero exit and a clear message (no silent fallback to a cached copy — fail fast per project rules).
- `scripts/bundle-framework_test.ts` — port of the test added in Phase 0; injects a `FetchAdapter` interface for the download step so the test can serve a fixture tarball.
- `framework.lock` — NEW. **All three fields are mandatory; bundle script rejects the file on any missing/malformed field.** Format:
  ```yaml
  # Pinned framework revision consumed by scripts/bundle-framework.ts
  # Bump via: scripts/bump-framework.ts <version>
  version: "0.13.0"            # framework release tag (without `framework-v` prefix); must match /^\d+\.\d+\.\d+$/
  commit_sha: "<full 40-char SHA in korchasa/flowai>"  # required; must match /^[0-9a-f]{40}$/; cross-checked against tag's actual SHA
  tarball_sha256: "<64-hex>"   # required; must match /^[0-9a-f]{64}$/; verified against downloaded asset
  ```
  Validator runs on bundle: load YAML → assert schema → download tarball → recompute SHA-256 → match. Any failure aborts with the offending field name and expected vs. actual values.
- `scripts/bump-framework.ts` — NEW. Helper: given a target framework version, fetches `framework-v<version>` release metadata via `gh api`, reads the asset SHA-256, resolves the tag's commit SHA, writes `framework.lock`, runs `deno task bundle` to verify, prints a one-line summary. Idempotent.
- `scripts/task-check.ts` — adapted: drops the framework-validator invocations (`check-skills.ts`, `check-naming-prefix.ts`, `check-fr-coverage.ts`, `check-traceability.ts`). Keeps only `fmt`, `lint`, `test`.
- `.github/workflows/ci.yml` — new CI: runs `deno task check` on PR/push; on tag `v*`, runs `deno task bundle && deno publish` with OIDC.
- `AGENTS.md` — fresh, scoped to CLI only. Includes Documentation Map for `src/*.ts` → docs in upstream `flowai` repo's SRS/SDS sections (links to `https://github.com/korchasa/flowai/blob/main/documents/requirements.md#fr-dist-...`).
- `CLAUDE.md` — symlink to `AGENTS.md`.
- `README.md` — installation, usage, link to upstream framework repo for skill catalog and acceptance tests.
- `.gitignore` — `src/bundled.json`, `src/_version.ts`, plus standard Deno/macOS entries.

**Verification (new repo)**
- `deno task check` exits 0.
- `deno task bundle && jq -S . src/bundled.json > /tmp/new.json` then in monorepo `git checkout <same-framework-sha> && deno task bundle && jq -S . cli/src/bundled.json > /tmp/old.json && diff /tmp/new.json /tmp/old.json` — empty diff. This is the byte-equality acceptance check.
- `deno install -A --global -n flowai-local ./src/main.ts && flowai-local --help` succeeds locally (pre-publish dry-run).

### Phase 3 — Tag and publish from `flowai-cli`

- **Local dry-run first** (no JSR involvement): `deno publish --dry-run --allow-dirty` in `flowai-cli`. Must exit 0.
- **Then rebind JSR OIDC**: at `jsr.io/@korchasa/flowai/publish`, replace `korchasa/flowai` repo binding with `korchasa/flowai-cli`. From this moment, the monorepo can no longer publish — keep the time window between this step and the next short.
- **Update JSR package README** to note the repo move BEFORE the first publish, so the discoverability surface is correct on day one.
- In `flowai-cli`: bump `deno.json` version to `0.13.0`, tag `v0.13.0`, push tag.
- CI publishes to JSR. Verify with `deno install -A --global -n flowai jsr:@korchasa/flowai@0.13.0 && flowai --version` in a clean container.
- Smoke-test in a real project: `cd /tmp/sample && flowai` (sync), compare resulting `.claude/`/`.cursor/`/`.opencode/` trees against monorepo-built `flowai@0.12.9` output for the same framework revision — must be identical.

### Phase 4 — Decommission CLI in monorepo

**Files modified (monorepo, one final cleanup PR)**
- `.github/workflows/ci.yml` — remove the JSR publish step (`deno task bundle && deno publish --allow-dirty`) and the "Verify CLI install" step. Keep the framework tarball release step (Phase 1).
- Root `deno.json` — strip JSR publish metadata. Options (pick during implementation):
  - (a) repurpose root `deno.json` as framework-only config (tasks for `check`, `test`, `acceptance-tests`; no `publish` block, no `exports`); OR
  - (b) split into `deno.json` for the workspace and let `cli/`-specific tooling go.
  - Prefer (a) — minimal diff, keeps task surface for contributors.
- Delete `cli/` directory entirely.
- Delete `cli/scripts/bundle-framework.ts` (moved to `flowai-cli`); delete `scripts/task-check.ts` invocations of CLI-test paths.
- `CLAUDE.md` — remove all `cli/src/*` rows from the Documentation Map; remove "CLI Test Caveat" section; remove the "@korchasa/flowai" JSR mention from the Architecture block.
- `documents/design.md` — §3.5 retitled "Framework Distribution (External CLI)"; subsections describing CLI internals (writer, sync, plan, etc.) replaced with one paragraph pointing to `github.com/korchasa/flowai-cli`.
- `documents/requirements.md` — `FR-DIST.BUNDLE` reworded to "Framework files bundled into the external CLI's `src/bundled.json` at publish time. The CLI repo (`korchasa/flowai-cli`) pins a framework release tag and verifies its SHA-256." Sub-clauses describing CLI-internal behavior (`FR-DIST.SYNC`, `FR-DIST.CONFIG`, `FR-DIST.GLOBAL`, `FR-DIST.FILTER`, `FR-DIST.SYMLINKS`, `FR-DIST.DETECT`, `FR-DIST.UPDATE`, `FR-DIST.UPDATE-CMD`, `FR-DIST.USER-SYNC`, `FR-DIST.MIGRATE`, `FR-DIST.MAPPING`, `FR-DIST.CODEX-AGENTS`, `FR-DIST.CLEAN-PREFIX`, `FR-DIST.CODEX-HOOKS`) — keep the headings but add a `**Implemented in:** korchasa/flowai-cli` line and move the per-clause `Acceptance` references to the external repo. **Do not delete the clauses** — they remain the contract the CLI must honor; only their implementation site moves.
- `README.md` — update "Installation" to `deno install -A jsr:@korchasa/flowai` (unchanged coordinate), but rewrite the "Project Structure" section to drop `cli/` and add a "CLI source" link to the new repo.

**Verification (monorepo, post-cleanup)**
- `deno task check` exits 0 (without `cli/` tests in the loop).
- `git ls-files cli/` returns empty.
- `grep -RIn '@korchasa/flowai' README.md` shows only consumer-facing install instructions, no internal references.

### Phase 5 — Reconcile and document

- Pin a "split commit" SHA in both repos' README as the canonical hand-off reference.
- File 1 GitHub issue in `flowai-cli` titled "Bootstrap parity coverage" listing the CLI-side test gaps now that acceptance tests no longer guard sync paths end-to-end. Resolution NOT in scope of this task.
- Update `cli/AGENTS.md` content (the new repo's `AGENTS.md`) with a "How to bump framework" section linking `scripts/bump-framework.ts`.

### Files to create (new `flowai-cli` repo)

- `deno.json`, `AGENTS.md`, `CLAUDE.md` (symlink), `README.md`, `.gitignore`, `LICENSE` (MIT).
- `src/**` — full port of `cli/src/**` from monorepo (flat).
- `scripts/bundle-framework.ts`, `scripts/bundle-framework_test.ts`, `scripts/bump-framework.ts`, `scripts/task-check.ts`, `scripts/task-test.ts`, `scripts/task-dev.ts`.
- `.github/workflows/ci.yml`.
- `framework.lock`.

### Files to modify (current monorepo)

- `.github/workflows/ci.yml` (Phase 1: add tarball release; Phase 4: drop JSR publish).
- `cli/scripts/bundle-framework.ts` (Phase 0: extract reusable function).
- `cli/scripts/bundle-framework_test.ts` (Phase 0: new test).
- `documents/requirements.md`, `documents/design.md`, `CLAUDE.md`, `README.md` (Phase 0 and Phase 4 — surgical edits).

### Files to delete (current monorepo, Phase 4)

- `cli/` (entire subtree).
- JSR publish metadata block from root `deno.json`.

### Error handling strategy

- Bundle script: download retry once on transient network error (timeout, 5xx). On SHA-256 mismatch or 404 of pinned release: abort with diagnostic message that includes the pinned `version` + `commit_sha` and the actual computed checksum. No silent fallback.
- `bump-framework.ts`: if the framework release lacks `framework.tar.gz.sha256`, abort with an instruction to re-run the framework release with the Phase 1 workflow.
- JSR publish in new repo: if `bundled.json` is missing or empty at publish time, abort before `deno publish` runs (cheap pre-flight check).

### Rollback strategy

- If Phase 3 publish smoke test fails, do NOT cut Phase 4. The monorepo still publishes the CLI; users see no disruption. Re-attempt Phase 3 after fixing the issue in `flowai-cli`.
- If Phase 4 lands and a regression surfaces within 14 days: re-enable JSR publish in monorepo CI (one-line revert), publish a `0.12.10` patch, and pause the CLI repo until the issue is fixed.

### Verification commands (cross-cutting)

- Byte-equal bundle parity: `diff <(jq -S . monorepo:cli/src/bundled.json) <(jq -S . flowai-cli:src/bundled.json)` returns empty for the same pinned framework SHA.
- Consumer parity: `flowai` (sync) run against a sample project from monorepo build and from new-repo build produces identical file trees (`diff -r .claude.from-monorepo .claude.from-new-repo`).
- JSR install: `deno install -A --global -n flowai jsr:@korchasa/flowai@0.13.0 && flowai --version` returns `0.13.0`.
- Framework release reproducibility: re-running the Phase 1 tarball step on the same commit produces an identical SHA-256.

## Follow-ups

- Bootstrap parity coverage in `flowai-cli` (file issue post-split; out of scope here).
- Decide whether to mirror `documents/requirements.md` CLI subclauses into the new repo's `docs/` or rely purely on upstream links. Re-evaluate after first month of post-split maintenance.
- Investigate a single `gh workflow_dispatch` glue action in `korchasa/flowai-cli` that triggers when a `framework-v*` release is published in `korchasa/flowai` and opens an auto-bump PR. Removes manual `bump-framework.ts` step. Defer to a separate task once the manual flow proves stable.
