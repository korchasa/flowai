---
date: "2026-09-12"
status: to do
implements:
  - FR-DIST
  - FR-DIST.MARKETPLACE
  - FR-CICD
  - FR-ADAPT
tags: [distribution, cli, docs, srs, ci, readme, devcontainer]
related_tasks:
  - 2026/05/extract-cli-to-separate-repo.md
  - 2026/05/simplify-update-boundaries.md
  - 2026/05/claude-code-plugin-marketplace-pilot.md
  - 2026/05/codex-plugin-marketplace-support.md
  - 2026/05/local-marketplace-namespace.md
  - 2026/05/remove-flowai-prefix-from-primitives.md
  - 2026/05/remove-flowai-prefix-from-skills-agents.md
---
# Retire the archived flowai CLI from docs and the release pipeline [ANC:task:2026-09-retire-flowai-cli-docs]

## Goal

Every document a reader or an agent opens in this repo describes the distribution channel that actually exists — the generated plugin marketplace — and none of them sends a user to a CLI that no longer receives releases. A future session must not spend a turn discovering that `korchasa/flowai-cli` is archived, and a Cursor or OpenCode user must find a working instruction, not a dead `deno install`.

## Overview

### Context

- `korchasa/flowai-cli` (JSR `@korchasa/flowai`) was archived on GitHub on 2026-06-05; its last push is 2026-05-16. Verified with `gh repo view korchasa/flowai-cli --json archivedAt,pushedAt`.
- Live distribution is the generated marketplace `korchasa/flowai-plugins` (last push 2026-09-09): `deno task build-plugins` renders `dist/claude-plugins/`, `validate-plugins` checks it, and the CI release job pushes it downstream on every `framework-v<version>` release (`.github/workflows/ci.yml` lines 175-201).
- The CI release job still builds `framework.tar.gz` + `.sha256` and attaches them to the release "for the external flowai-cli repo" (`ci.yml` lines 92-95, 152, 165). The tarball has no live consumer. `scripts/check-pack-refs.ts --leakage` builds its own tarball locally and does not depend on the release asset.
- `AGENTS.md` was corrected in commit `37105d7a` (this repo). Everything else still tells the CLI story.
- The two SRS clauses that ARE alive inside the FR-DIST family are `FR-DIST.MARKETPLACE` and `FR-DIST.MAPPING`: scripts reference them via `[REF:fr:dist.marketplace]` (`build-plugins.ts`, `validate-plugins.ts`, `sync-plugins-local.ts`, `task-check.ts`) and `[REF:fr:dist.mapping]` (`check-skills.ts`, `check-agents.ts`, `cli-internals.ts`). No script references any other `fr:dist.*`, `fr:loop` or `fr:adapt.*` anchor; the only outside references to those are the rows of `documents/index.md`.
- `adapt` and `update` are live framework commands (`framework/core/commands/adapt/`, `framework/core/commands/update/`) — FR-ADAPT stays, but its text and the `skill-adapter` / `agent-adapter` agents describe the working tree as "written by `flowai sync`".
- Related tasks read (all share FR-IDs with this one):
  - `2026/05/extract-cli-to-separate-repo.md` (FR-DIST, FR-DIST.BUNDLE, FR-CICD) — the split that created the tarball contract; done.
  - `2026/05/simplify-update-boundaries.md` (FR-UPDATE, FR-ADAPT, FR-DIST) — moved CLI lifecycle out of the `update` command; done.
  - `2026/05/claude-code-plugin-marketplace-pilot.md`, `2026/05/codex-plugin-marketplace-support.md`, `2026/05/local-marketplace-namespace.md` (FR-DIST.MARKETPLACE) — the marketplace channel that replaced the CLI; done.
  - `2026/05/remove-flowai-prefix-from-primitives.md` (done), `2026/05/remove-flowai-prefix-from-skills-agents.md` (0/8, superseded in practice by the former) — naming across both channels.

### Current State

Stale surfaces, with line evidence:

- `README.md` — lines 9, 51-57, 87, 110-139 (Cursor / OpenCode / §flowai CLI install via `deno install -g -A jsr:@korchasa/flowai`), 202-219 (§Updating: `flowai update`), 361-379 (§Automation `flowai loop`), 442-472 (§Distribution flow diagram), 500, 532.
- `documents/requirements.md` — `FR-DIST` parent description (line 819) and CLI-only sub-clauses `.SYNC .CONFIG .GLOBAL .FILTER .SYMLINKS .DETECT .UPDATE .UPDATE-CMD .BUNDLE .BUNDLE.PIN .USER-SYNC .MIGRATE .CODEX-AGENTS .CLEAN-PREFIX .CODEX-HOOKS` (lines 825-1212, with `FR-DIST.MARKETPLACE` 913 and `FR-DIST.MAPPING` 1077 alive in between); `FR-CICD.SPLIT` criterion (line 1690); `FR-LOOP` (line 1778); `FR-ADAPT` prose (1490-1525). `[x]` criteria there cite evidence in the archived repo.
- `documents/design.md` — line 418 (§3.5 components "live in the external flowai-cli repo"), line 488 (drift surface vs `flowai-cli`'s `crossTransformAgent`), line 284, line 641; §3.4 heading names a `benchmarks/` directory that does not exist (the runner lives in `acceptance-tests/` + `scripts/acceptance-tests/`).
- `documents/index.md` — rows 32-49 and 74 mirror the dead clauses.
- `documents/spec-skill-versioning.md` lines 13, 18, 232 and `documents/ides-difference.md` line 334 describe `flowai sync` behaviour.
- `.github/workflows/ci.yml` — tarball comment (92-95), release-notes comment (152), release body "Consumed by korchasa/flowai-cli via framework.lock" (165); the `Build framework tarball` step and the two release assets.
- `framework/core/skills/setup-ai-ide-devcontainer/` — `SKILL.md` lines 193, 282; `references/dockerfile-patterns.md` line 78; `references/devcontainer-template.md` line 249; acceptance scenario `acceptance-tests/deno-with-flowai/mod.ts` is built around `deno install jsr:@korchasa/flowai`. A shipped primitive: changing it is Acceptance Test TDD.
- `framework/core/agents/skill-adapter.md` line 24, `agent-adapter.md` line 24 ("written by `flowai sync`"); `framework/core/commands/adapt/SKILL.md` line 126 ("CLI `flowai sync` layout"); `framework/core/commands/update/SKILL.md` lines 36, 147 (negative rule "do not run `flowai update` …").
- `scripts/acceptance-tests/lib/cli-internals.ts` header frames itself as a mirror of `flowai-cli@^0.13` helpers; the code is live (build-plugins needs the transform), only the framing is stale.
- `scripts/build-plugins.ts` `CLI_ONLY_FENCE_RE` (lines 23, 58-59, 583-584) strips `cli-only-skill-update` fences; `grep -rln cli-only-skill-update framework/` finds no user, so the mechanism is dead code.
- `AGENTS.md` Documentation Map still names `FR-ADAPT-INSTRUCTIONS`, an FR that does not exist in the SRS.

### Constraints

- Task files under `documents/tasks/` are permanent records: not edited, their `Evidence:` lines not rewritten. `CHANGELOG.md` is generated and stays.
- `documents/ides-difference.md` is READ-ONLY reference per AGENTS.md — update only when an IDE capability changes; a CLI mention there is annotated, not rewritten.
- SALP: every `[REF:fr:…]` must resolve to an `[ANC:fr:…]` (`scripts/check-salp.ts`); removing an SRS section requires removing or retargeting its `documents/index.md` row in the same commit.
- `check-fr-coverage.ts` / `check-traceability.ts` run in `deno task check`; the SRS edit must leave the check green.
- Changing `setup-ai-ide-devcontainer` follows Acceptance Test TDD: RED scenario first, single-scenario runs by the agent, full-primitive sweep handed to the user.
- Deleting the tarball step changes what a `framework-v<version>` release carries; there is no known consumer, but the deletion is visible to anyone who pinned it. This is the user's call (variant selection).
- English only in documents; no changelog prose ("used to be the CLI…") in living docs.

### Affected Surface

Scout report (`surface-scout`, dispatched with the verbatim request, collected in the foreground):

```text
Confirmed: `dist/claude-plugins/` is a build artifact (gitignored, regenerated by `deno task build-plugins`), so it inherits the same CLI mentions from `framework/core/skills/setup-ai-ide-devcontainer/` — not a separate surface to edit by hand.

## Surface

- `README.md` (13 mentions per dispatch, confirmed at lines 9, 56-57, 87, 110, 114-139, 190-213, 361-379, 444-472, 500, 532) — installation instructions for Cursor/OpenCode tell users to `deno install jsr:@korchasa/flowai`, and the whole "Distribution flow diagram" (lines ~444-472) describes the now-defunct monorepo→flowai-cli→JSR pipeline — evidence: `/Users/korchasa/www/flowai/flowai/README.md` lines 9-10, 56-139, 190-213, 361-379, 444-472, 500, 532.
- `documents/requirements.md` — FR-DIST parent clause and its sub-clauses (`FR-DIST.SYNC`, `.CONFIG`, `.GLOBAL`, `.FILTER`, `.SYMLINKS`, `.DETECT`, `.UPDATE`, `.UPDATE-CMD`, `.BUNDLE`, `.BUNDLE.PIN`, `.USER-SYNC`, `.MIGRATE`, `.MAPPING`, `.CODEX-AGENTS`, `.CLEAN-PREFIX`, `.CODEX-HOOKS`), `FR-LOOP`, `FR-ADAPT` and its sub-clauses (`.SKILLS`, `.AGENTS`, `.ASSETS`, `.HOOKS`) — describe CLI-only behavior implemented in the archived repo — evidence: `documents/requirements.md` lines 819-1212 (FR-DIST family), 1490-1525 (FR-ADAPT family), 1778+ (FR-LOOP). Note: `FR-DIST.MARKETPLACE` (line 913) and `FR-DIST.MAPPING` (line 1077) are NOT dead — they describe the live plugin marketplace / tier-resolution logic that is still implemented in `scripts/build-plugins.ts`, `scripts/check-skills.ts`, `scripts/check-agents.ts`, `scripts/resource-types.ts` — these must NOT be deleted along with the rest of the FR-DIST family; only the CLI-sync-specific sub-clauses are dead.
- `documents/index.md` — the FR status index lines for the same IDs (`FR-DIST`, its sub-clauses, `FR-ADAPT` family, `FR-LOOP`) mirror requirements.md and will go stale if requirements.md changes without a matching edit here — evidence: `documents/index.md` lines 11-49, 74.
- `documents/design.md` — 4 mentions plus the nonexistent `benchmarks/` directory named in §3.4 header (dispatch already found this) — evidence: `documents/design.md` §3.4 header `### 3.4 Acceptance Test System (`benchmarks/`, `scripts/acceptance-tests/`)`, and the doc-index list referencing "§3.5 Global Framework Distribution" split topology language inherited from the extraction task.
- `.github/workflows/ci.yml` — the "Create Framework Release" step comment and body (not just lines 92-95; the actual tarball-and-release logic spans roughly lines 88-165) references `korchasa/flowai-cli` and `framework.lock`/`FR-DIST.BUNDLE.PIN` as the consumer of `framework.tar.gz`/`framework.tar.gz.sha256` — evidence: `.github/workflows/ci.yml` comments above "Build framework tarball" and "Create Framework Release" steps, plus the release body text `Consumed by [korchasa/flowai-cli]...`.
- `framework/core/skills/setup-ai-ide-devcontainer/` (SKILL.md, `references/dockerfile-patterns.md`, `references/devcontainer-template.md`, `acceptance-tests/deno-with-flowai/mod.ts`) — **not in the dispatch's list at all.** This shipped skill instructs generating devcontainer configs that install the CLI via `deno install -g -A -f jsr:@korchasa/flowai` for Cursor/OpenCode users, and has a whole acceptance-test scenario named `deno-with-flowai` built around it — evidence: `SKILL.md` line 282, `references/dockerfile-patterns.md` line 78, `references/devcontainer-template.md` line 249, `acceptance-tests/deno-with-flowai/mod.ts` lines 6, 26, 29-30, 58. This is exactly the kind of parallel copy the dispatch's own open question ("what are Cursor/OpenCode users told to do now") must resolve consistently between README.md and this skill.
- `dist/claude-plugins/plugins/flowai/skills/setup-ai-ide-devcontainer/` — not affected directly — build artifact regenerated by `deno task build-plugins` from the `framework/` source above; fixing the source and rerunning the build is sufficient, no direct edit needed — evidence: `dist/claude-plugins/plugins/flowai/skills/setup-ai-ide-devcontainer/SKILL.md` (identical content to source).
- `scripts/acceptance-tests/lib/cli-internals.ts` and `cli-internals_test.ts` — deliberate, documented mirror of two flowai-cli helper functions, needed so `build-plugins`/acceptance tests can reproduce the CLI's sync transform without a compile-time dependency on the external (now archived) repo — evidence: file header comment lines 1-9. This is likely NOT dead code (build-plugins still needs the transform logic for the live plugin marketplace), but its header comment explicitly frames itself as tracking `flowai-cli@^0.13`, which is now a frozen, unmaintained version — worth a decision on whether the comment should be reworded now that there is no upstream to track drift against.
- `scripts/build-plugins.ts` — `CLI_ONLY_FENCE_RE` mechanism (lines 23, 58-59, 583-584) strips `<!-- begin: cli-only-skill-update --> ... <!-- end -->` fenced blocks from SKILL.md bodies before building the plugin bundle, i.e. content meant "for the CLI-installed variant only, not the plugin variant." With the CLI retired, any SKILL.md still using that fence marker needs checking — evidence: `scripts/build-plugins.ts` lines 23, 58-59, 583-584.
- `documents/tasks/2026/05/extract-cli-to-separate-repo.md` and other historic task files (`claude-code-plugin-marketplace-pilot.md`, `codex-plugin-marketplace-support.md`, `generate-skills-from-atoms.md`, `local-marketplace-namespace.md`, `remove-flowai-prefix-from-primitives.md`, `remove-flowai-prefix-from-skills-agents.md`, `simplify-update-boundaries.md`) — not affected — these are permanent historical records per project rules ("Task files are permanent records... not rewritten after the fact"); they should not be edited, only left as-is — evidence: `AGENTS.md` §Documentation Rules bullet on deleting artifacts, and project convention that `documents/tasks/` is an append-only log.
- `CHANGELOG.md` — not affected — auto-generated by `standard-version` from commit history; contains historical `flowai-cli:` scoped commit messages (lines 4199, 4227, 4401, 4409, 4433) that are a historical record, not living documentation — evidence: file header states "No changelogs — docs reflect current state, not history" rule applies to hand-maintained docs, but this file itself is a generated log the project's own rule (`## Documentation Rules`) exempts from rewriting.
- `deno.json` — not affected — no `publish`/`exports`/JSR package metadata remains (checked: only `version`, `license`, `imports`, `tasks`, `lint`); the JSR-publish step referenced by the historical extraction task file was already removed — evidence: `deno.json` full content shows no `publish.include` or `name: "@korchasa/flowai"` keys.

## Queries used

- `ls` on repo root, `documents/`, `.github/workflows/`, `scripts/`
- `grep -rln "flowai-cli\|flowai loop\|@korchasa/flowai\|FR-DIST\|FR-LOOP\|FR-ADAPT\|FR-CICD\|framework.tar.gz\|framework-v" --include='*.md' --include='*.yml' --include='*.yaml' --include='*.ts'`
- `grep -n` targeted at README.md, ci.yml, documents/design.md, documents/index.md, documents/requirements.md (FR-DIST/.LOOP/.ADAPT/.CICD header lines)
- `grep -n "flowai-cli\|@korchasa/flowai\|flowai loop\|CLI"` across `scripts/*.ts`, `scripts/acceptance-tests/lib/*.ts`, `framework/**`
- `grep -rn "cli-only\|CLI_ONLY"` across `framework/` and `scripts/build-plugins.ts`
- `cat deno.json`; `grep -n "publish\|@korchasa/flowai\|exports" deno.json`
- `find dist -maxdepth 2`; `grep -rln "flowai-cli\|@korchasa/flowai" dist`
- `grep -c "flowai-cli\|@korchasa/flowai" CHANGELOG.md`
- `grep -n "flowai-cli\|@korchasa/flowai"` in `documents/tasks/2026/05/extract-cli-to-separate-repo.md`

## Not examined (budget)

- Did not open every historic task file found by the grep (`claude-code-plugin-marketplace-pilot.md`, `codex-plugin-marketplace-support.md`, `generate-skills-from-atoms.md`, `local-marketplace-namespace.md`, `remove-flowai-prefix-from-primitives.md`, `remove-flowai-prefix-from-skills-agents.md`, `simplify-update-boundaries.md`, `documents/tasks/2026/06/*`, `2026/07/model-tier-carries-effort.md`, `2026/09/*`) — grep-matched on FR-DIST/CLI strings but not individually read for whether any contain forward-looking (not just historical) statements that would need updating.
- Did not open `framework/atoms/plan.md` or `framework/composites.yaml` beyond a keyword grep that returned no direct CLI hits — did not confirm whether any atom/composite step references the CLI indirectly (e.g. by describing "sync" generically).
- Did not check `documents/acceptance-testing.md`, `documents/ides-difference.md`, `documents/spec-skill-versioning.md`, `documents/AGENTS.md`, `documents/rnd/` for CLI mentions — these were not in the initial grep hit list but were not independently re-grepped with a broader term set (e.g. "flowai update", "flowai migrate", "self-update").
- Did not verify whether `scripts/task-check.ts` or `scripts/check-fr-coverage.ts` have logic that specifically enforces FR-DIST/.LOOP/.ADAPT `[x]`/`[ ]` status that would break if those clauses are deleted rather than marked retired.
- Did not check GitHub repo settings/secrets (`FLOWAI_PLUGINS_DEPLOY_KEY`, JSR OIDC trust) for residual configuration tied to the old CLI publish flow — this is outside file-based grep and would need `gh` API calls.

## Could not rule out

- `framework/atoms/plan.md` and other atom/composite step files may reference "the CLI" or "sync" in generic prose without the literal strings `flowai-cli` or `@korchasa/flowai` — a broader term search (`flowai update`, `flowai migrate`, `flowai sync`) was not run against `framework/`.
- Other `.md` files under `documents/tasks/2026/06/` through `2026/09/` (opencode-acceptance-adapter.md, ci-bump-actions-to-node24.md, doc-anchors-validate-hook.md, adopt-salp-anchors.md, merge-branch-swe-bench-rescue.md, skill-description-length-cap.md, sweep-reds-follow-up.md, tasks-overview-skill.md) were grep-hit but not opened — `sweep-reds-follow-up.md` in particular was referenced from `design.md` as tracking an out-of-repo flowai-cli issue (`~/.codex/agents/flowai-*.toml` lacking `model`) and may need a note if that follow-up is now moot.
```

Dispositions (union of the planner's list and the scout's):

- `README.md` install / updating / automation / distribution-flow sections — covered-by DoD "README describes only the marketplace".
- `documents/requirements.md` FR-DIST CLI-only sub-clauses, FR-LOOP, FR-CICD.SPLIT, FR-DIST.BUNDLE.PIN — covered-by Solution steps 2 and 4 (Variant 2: deleted; `FR-DIST.BUNDLE` and `FR-DIST.GLOBAL` kept as retired stubs for traceability).
- `scripts/check-traceability.ts` task-`implements:` rule (lines 368-380) — covered-by Solution step 2: the two ids that historic task files implement stay as stubs; `FR-LOOP` leaves this task's `implements:`.
- `documents/AGENTS.md:9` (sub-FR example `FR-DIST.SYNC`) — covered-by Solution step 13.
- `documents/design.md:284` (Codex agents as TOML; defers a fix to `flowai-cli`, tracked with `sweep-reds-follow-up.md:37`) — covered-by Solution step 8.
- `.github/workflows/ci.yml:194` downstream `TAG: framework-v${{ steps.framework-tarball.outputs.framework_version }}` — covered-by Solution step 17 (re-sourced from `create-release`).
- `framework/atoms/`, `framework/composites/`, `documents/acceptance-testing.md`, `documents/rnd/` — not affected — `grep -rn -E 'flowai (sync|update|loop|migrate)|flowai-cli|@korchasa/flowai'` over each returns nothing (verified 2026-09-12).
- `documents/requirements.md` FR-DIST.MARKETPLACE, FR-DIST.MAPPING — not affected — live anchors referenced from `scripts/build-plugins.ts:2`, `scripts/validate-plugins.ts:2`, `scripts/check-skills.ts:272`, `scripts/check-agents.ts:47`; kept in every variant.
- `documents/requirements.md` FR-ADAPT family — covered-by DoD "FR-ADAPT prose names the plugin layout" (the command is live; only the `flowai sync` framing changes).
- `documents/index.md` rows for removed/retired FRs — covered-by DoD "SALP check green" (rows removed or re-summarised in the same commit as the SRS edit).
- `documents/design.md` §3.5 components, line 488 drift note, §3.4 `benchmarks/` heading — covered-by DoD "SDS names live modules and directories".
- `documents/spec-skill-versioning.md` — covered-by Solution step 9 (decision 3B at variant selection: rewritten against `build-plugins.ts` and the marketplace update flow).
- `documents/ides-difference.md` line 334 — not affected — READ-ONLY reference per AGENTS.md; the codex-hooks gate it describes belonged to the CLI, an annotation is recorded under Follow-ups instead of an edit.
- `.github/workflows/ci.yml` comments and release body — covered-by DoD "release job text names no CLI".
- `.github/workflows/ci.yml` tarball step + release assets, FR-DIST.BUNDLE.PIN — covered-by Solution step 17 (decision 2A: removed).
- `framework/core/skills/setup-ai-ide-devcontainer/` + scenario `deno-with-flowai` — covered-by DoD "devcontainer skill installs flowai without the CLI" (Acceptance Test TDD).
- `dist/claude-plugins/…` — not affected — gitignored build artefact regenerated from `framework/` by `deno task build-plugins`.
- `framework/core/agents/skill-adapter.md:24`, `agent-adapter.md:24`, `framework/core/commands/adapt/SKILL.md:126`, `framework/core/commands/update/SKILL.md:36,147` — covered-by DoD "framework primitives name no CLI command".
- `scripts/acceptance-tests/lib/cli-internals.ts` header — covered-by DoD "framework primitives name no CLI command" (comment reworded: the transform is this repo's own now; code untouched).
- `scripts/build-plugins.ts` `CLI_ONLY_FENCE_RE` — deferred — human choice (dead mechanism with zero users in `framework/`; removal is a code change with tests and belongs to the long-term variant or a follow-up).
- `documents/tasks/2026/05/*.md` and other historic task files — not affected — permanent records (AGENTS.md §Documentation Rules); `sweep-reds-follow-up.md:37` names an out-of-repo flowai-cli follow-up that is now moot — annotated under Follow-ups, file untouched.
- `CHANGELOG.md` — not affected — generated by `standard-version`, historical.
- `deno.json` — not affected — no JSR publish metadata remains (verified: keys are `version`, `license`, `imports`, `tasks`, `lint`, `fmt`).
- `AGENTS.md` Documentation Map `FR-ADAPT-INSTRUCTIONS` — covered-by DoD "AGENTS.md names only FRs that exist".
- GitHub repo secrets / JSR OIDC binding for the old publish flow — deferred — human choice (outside the repo; `gh secret list` can confirm, removal is an account action).

## Definition of Done

- [ ] FR-DIST: `README.md` describes only the marketplace channel; Cursor and OpenCode users get the build-and-copy instruction; no section names `flowai-cli`, `jsr:@korchasa/flowai`, `flowai sync|update|loop|migrate`, or `framework.tar.gz`.
  - Test: `manual — korchasa` (prose; the grep gate below is the automation)
  - Evidence: `! grep -n -E 'flowai-cli|@korchasa/flowai|flowai (sync|update|loop|migrate|user-sync)|framework\.tar' README.md`
- [ ] FR-DIST: the SRS FR-DIST section describes the marketplace and keeps two live sub-clauses, `FR-DIST.MARKETPLACE` and `FR-DIST.MAPPING`, plus two one-paragraph retired stubs, `FR-DIST.BUNDLE` and `FR-DIST.GLOBAL` (historic task files implement them and `check-traceability` requires the headings); every other CLI-only sub-clause and FR-LOOP are gone; no `[x]` criterion cites the archived repo.
  - Test: `scripts/check-salp.ts` (anchors) + `scripts/check-traceability.ts` (task `implements:`) + `manual — korchasa` (content)
  - Evidence: `grep -c '^#### FR-DIST\.' documents/requirements.md | grep -qx 4 && ! grep -n -E 'flowai-cli|FR-LOOP|FR-DIST\.(SYNC|CONFIG|FILTER|SYMLINKS|DETECT|UPDATE|BUNDLE\.PIN|USER-SYNC|MIGRATE|CODEX-AGENTS|CLEAN-PREFIX|CODEX-HOOKS)' documents/requirements.md && grep -c 'Status:\*\* retired' documents/requirements.md | grep -qx 2`
- [ ] FR-DIST: the SRS no longer presents `flowai loop` (former FR-LOOP) as a live requirement; the section and its `documents/index.md` row are gone.
  - Test: `scripts/check-salp.ts`
  - Evidence: `! grep -n -E 'FR-LOOP|fr:loop' documents/requirements.md documents/index.md`
- [ ] FR-CICD: the release job builds no `framework.tar.gz` and creates no `framework-v<version>` release in this repo; its comments name no CLI; the `v<version>` release is unchanged; the downstream push to `flowai-plugins` keeps its `framework-v<version>` tag scheme with the version sourced from the `create-release` step; the push to `main` that carries the change is green.
  - Test: `.github/workflows/ci.yml` run on the pushed commit (CI Status command from AGENTS.md §CI/CD)
  - Evidence: `! grep -n -E 'flowai-cli|framework\.tar|framework-tarball|BUNDLE\.PIN|CICD\.SPLIT|Create Framework Release' .github/workflows/ci.yml && grep -q 'TAG: framework-v${{ steps.create-release.outputs.version }}' .github/workflows/ci.yml && gh run list --branch main --limit 1 --json conclusion --jq '.[0].conclusion' | grep -qx success`
- [ ] FR-ADAPT: FR-ADAPT prose, `framework/core/commands/adapt/SKILL.md`, `framework/core/commands/update/SKILL.md`, `framework/core/agents/skill-adapter.md` and `agent-adapter.md` name the plugin layout, not `flowai sync`; `scripts/acceptance-tests/lib/cli-internals.ts` header describes the transform as this repo's own.
  - Benchmark: `adapt-*` and `update-*` existing scenarios (no behaviour change — wording only; the sweep is the regression gate)
  - Evidence: `! grep -rn -E 'flowai (sync|update|migrate)|flowai-cli' framework/core/commands/adapt framework/core/commands/update framework/core/agents/skill-adapter.md framework/core/agents/agent-adapter.md scripts/acceptance-tests/lib/cli-internals.ts`
- [ ] FR-DIST: the `setup-ai-ide-devcontainer` skill installs flowai through the plugin marketplace (Claude Code / Codex containers) and never emits `jsr:@korchasa/flowai`; the renamed scenario proves it.
  - Benchmark: `setup-ai-ide-devcontainer-deno-flowai-plugins` (renamed from `setup-ai-ide-devcontainer-deno-flowai`, RED first)
  - Evidence: `deno task acceptance-tests -f setup-ai-ide-devcontainer-deno-flowai-plugins && ! grep -rn '@korchasa/flowai' framework/core/skills/setup-ai-ide-devcontainer --include='*.md'`
- [ ] FR-DIST: SDS §3.5 describes `scripts/build-plugins.ts` as the distribution implementation, §3.4 heading names `acceptance-tests/`, and no SDS line names `flowai-cli`.
  - Test: `manual — korchasa`
  - Evidence: `! grep -n -E 'flowai-cli|benchmarks/' documents/design.md`
- [ ] FR-DIST: `documents/spec-skill-versioning.md` is rewritten against `scripts/build-plugins.ts` and the marketplace update flow; no `cli/src` path or `flowai sync` remains.
  - Test: `manual — korchasa`
  - Evidence: `! grep -n -E 'cli/src|flowai sync' documents/spec-skill-versioning.md`
- [ ] FR-DIST: `documents/index.md` holds no row for a removed FR, every `[REF:fr:…]` in the repo resolves, and `deno task check` is green.
  - Test: `scripts/check-salp.ts`, `scripts/check-traceability.ts` (both inside `deno task check`)
  - Evidence: `env -u AUTO_INSTALL_PLUGINS deno task check > "$SCRATCH/check.log" 2>&1; grep -E '[0-9]+ passed \| [0-9]+ failed' "$SCRATCH/check.log"` shows `0 failed`
- [ ] FR-DIST: `AGENTS.md` and `documents/AGENTS.md` name only FRs that exist in the SRS (`FR-ADAPT-INSTRUCTIONS`, `FR-DIST.BUNDLE.PIN` and the `FR-DIST.SYNC` example gone); the Distribution bullet names neither the tarball nor a `framework-v` release of this repo; the Documentation Map no longer says `FR-DIST.*` describes the archived CLI.
  - Test: `manual — korchasa`
  - Evidence: `for id in $(grep -oh -E 'FR-[A-Z0-9]+(\.[A-Z0-9]+(-[A-Z0-9]+)*)*' AGENTS.md documents/AGENTS.md | sort -u); do grep -q -E "^#+ $id( |$)" documents/requirements.md || echo "MISSING $id"; done` prints nothing (the pattern stops before `*`, so glob-style ids such as `FR-DIST.*` and `FR-HOOK-*` yield their prefix and MUST be checked by eye — expected prefixes: `FR-DIST`, `FR-HOOK`), and `! grep -n -E 'describe the archived|framework-v' AGENTS.md`

## Solution

Selected: Variant 2 — delete the dead clauses and the tarball, give Cursor and OpenCode the build-and-copy path, fix the devcontainer skill through Acceptance Test TDD, rewrite the versioning spec against the marketplace. Decisions taken at selection: tarball step and assets removed (2A); `spec-skill-versioning.md` rewritten, not retired (3B).

Order matters: the SRS edit comes first (workflow: SRS → SDS → implement), the devcontainer skill is the only primitive change and runs its own RED → GREEN loop, CI is validated by the merge push.

### Phase 1 — SRS (`documents/requirements.md`)

1. Rewrite the `### FR-DIST` parent (line 819): Description = the plugin marketplace `korchasa/flowai-plugins` generated by `scripts/build-plugins.ts`; keep the existing `**Tasks:**` list (permanent record) and add this task. Replace the CLI-shaped `**Acceptance:**` with references to `FR-DIST.MARKETPLACE` and `FR-DIST.MAPPING`.
2. Delete sections `FR-DIST.SYNC`, `.CONFIG`, `.FILTER`, `.SYMLINKS`, `.DETECT`, `.UPDATE`, `.UPDATE-CMD`, `.BUNDLE.PIN`, `.USER-SYNC`, `.MIGRATE`, `.CODEX-AGENTS`, `.CLEAN-PREFIX`, `.CODEX-HOOKS` (lines 825-1212 minus the kept ones) and `### FR-LOOP` (line 1778). `FR-DIST.BUNDLE` and `FR-DIST.GLOBAL` are NOT deleted: `scripts/check-traceability.ts` (lines 368-380, part of `deno task check`) fails on any task file whose `implements:` names an id without an SRS heading, and `documents/tasks/2026/05/extract-cli-to-separate-repo.md` implements `FR-DIST.BUNDLE` while `claude-code-plugin-marketplace-pilot.md` implements `FR-DIST.GLOBAL`. Reduce each of the two to a stub: the `####` heading with its anchor, `- **Status:** retired` (the CLI that implemented it was archived 2026-06-05), the existing `- **Tasks:**` line, no `**Acceptance:**` and no criteria. The stub is a traceability anchor, not a requirement. FR-LOOP has no historic implementer besides this task, so it is deleted and dropped from this task's `implements:`. Before each deletion, `grep -rn 'fr:<id>' --include='*.md' --include='*.ts' --include='*.yml' .` — expected hits only in `documents/index.md` and `documents/tasks/` (code spans there are ignored by `check-salp`; a bare token in a task file must be wrapped in backticks, not rewritten).
3. `FR-DIST.MARKETPLACE` (line 913): drop the sentence that positions the CLI as the alternative channel; add the Cursor / OpenCode contract: `deno task build-plugins`, copy `dist/claude-plugins/plugins/<pack>/skills/*` into `.claude/skills/` (both IDEs read that directory — `documents/ides-difference.md:176,178`). `FR-DIST.MAPPING` (line 1077): reword any `flowai sync` / CLI phrasing to `build-plugins`.
4. `FR-CICD` (line 1680): remove the `FR-CICD.SPLIT` criterion (line 1690); if a sibling criterion cites the `framework-v` release, reword it to the `v<version>` release + `flowai-plugins` push.
5. `FR-ADAPT` (lines 1490-1525): replace "installed by `flowai sync`" phrasing with "installed from the plugin marketplace or copied from `dist/claude-plugins`".
6. Grep gate: `grep -n -E 'flowai-cli|@korchasa/flowai|flowai (sync|update|loop|migrate)' documents/requirements.md` → empty.

### Phase 2 — index and SDS

7. `documents/index.md`: delete rows 33-41, 44-49 (all removed `fr:dist.*` ids) and row 74 (`fr:loop`); refresh the FR-DIST row summary from the new Description.
8. `documents/design.md`: line 284 (Codex agents emitted as TOML by the acceptance runner's own `installCodexAgents`) — keep the runner description, delete only the clause deferring the fix to `flowai-cli`; §3.5 (line 395) — heading `(scripts/build-plugins.ts)`, Components = `build-plugins.ts`, `validate-plugins.ts`, `sync-plugins-local.ts`, `resource-types.ts`, `scripts/acceptance-tests/lib/cli-internals.ts` (the transform helpers), drop "live in the external repo" (line 418); line 488 drift note → "the transform is owned here; no upstream to drift from"; lines 284, 641 reworded; §3.4 heading (line 271) → `(acceptance-tests/, scripts/acceptance-tests/)`.
9. `documents/spec-skill-versioning.md`: keep Goal / Overview / Non-Goals / DoD shape; retarget: Phase 1 unchanged (SKILL.md frontmatter `version`); Phase 2 → `scripts/build-plugins.ts` parses `version` and emits it into `plugin.json` `metadata`; Phase 3 → version-aware update is delegated to the IDE's `/plugin update`; the spec PROPOSES a monotonic-version gate in `validate-plugins.ts` as a future phase (no such check exists today — `grep -n monoton scripts/validate-plugins.ts` is empty — and this task adds none); Phase 4 → `validate-plugins` output, not CLI UX; Phase 5 → `build-plugins_test.ts` + one acceptance scenario. Remove every `cli/src/*` path.

### Phase 3 — README

10. `README.md`: lines 51-57 (channels) → one channel; §Cursor and §OpenCode (112-133) → clone + `deno task build-plugins` + copy into `.claude/skills/` (state that Cursor and OpenCode read that directory, cite the docs footnotes); delete §flowai CLI (134-191); §Updating (202-219) → drop the `flowai update` paragraph and code block; delete §Automation (`flowai loop`) (361-379); §Distribution flow (442-472) → a 6-line diagram `main → release job → v<version> release + dist/claude-plugins → korchasa/flowai-plugins → /plugin install`; fix lines 9, 87, 110, 500, 532 by grep.

### Phase 4 — framework primitives (wording) and script comments

11. `framework/core/agents/skill-adapter.md:24`, `agent-adapter.md:24`: "written by the plugin install (or copied from `dist/claude-plugins`)". `framework/core/commands/adapt/SKILL.md:126`: rename the layout label. `framework/core/commands/update/SKILL.md:36,147`: shorten the negative rule to "Do not run any installer or sync tool; this command edits project-owned files only." Existing `adapt-*` / `update-*` scenarios are the regression gate (no behaviour change) — hand the sweep to the user.
12. `scripts/acceptance-tests/lib/cli-internals.ts` header: the two helpers are this repo's transform, formerly mirrored from the CLI; no version to track.
13. `AGENTS.md`: Distribution bullet (line 46) — drop the tarball sentence and the phrase "on each `framework-v<version>` release" (this repo's release is `v<version>`; `framework-v` survives only as the downstream tag in `flowai-plugins`); Documentation Map (line 92) — replace `FR-ADAPT-INSTRUCTIONS` with `FR-ADAPT` and delete the sentence "The SRS clauses `FR-DIST.*` … describe the archived `flowai` CLI", which Phase 1 makes false. `documents/AGENTS.md:9` — the sub-FR example `FR-DIST.SYNC` → `FR-DIST.MARKETPLACE`.

### Phase 5 — devcontainer skill (Acceptance Test TDD)

14. RED: rename `framework/core/skills/setup-ai-ide-devcontainer/acceptance-tests/deno-with-flowai/` → `deno-with-flowai-plugins/`, id `setup-ai-ide-devcontainer-deno-flowai-plugins`, query "with flowai installed from its plugin marketplace"; checklist `flowai_install_in_post_create` → `postCreateCommand` runs `claude plugin marketplace add korchasa/flowai-plugins` and `claude plugin install flowai@flowai-plugins` (Codex equivalent accepted), critical; new critical item `no_jsr_install`: no `jsr:@korchasa/flowai` anywhere in the generated files; keep `no_flowai_config_volume` reworded to "no volume for a flowai config file". Rewrite the persona (`mod.ts:25-33`) to match: the developer wants Claude Code in the container with the flowai plugin ("When asked about AI CLI tools, choose Claude Code with the flowai plugin"). Reword `deno_support` (`mod.ts:45-48`): Deno is required because the fixture is a Deno project, not because flowai needs it; the item stays critical. Run `deno task acceptance-tests -f setup-ai-ide-devcontainer-deno-flowai-plugins` — must fail on the install item.
15. GREEN: `SKILL.md` lines 193, 282; `references/dockerfile-patterns.md:78`; `references/devcontainer-template.md:249` — replace the `deno install` line with the marketplace commands (Claude Code, Codex) and, for Cursor / OpenCode containers, the build-and-copy step from README. Re-run the single scenario until green.
16. REFACTOR: tighten wording; re-run once. CHECK: hand off `deno task acceptance-tests -f setup-ai-ide-devcontainer` to the user.

### Phase 6 — CI

17. `.github/workflows/ci.yml`: delete steps `Build framework tarball` (96-134), `Verify framework tarball contains no generator-input leaks` (136-140; the same gate already runs inside `deno task check` via `check-pack-refs.ts --leakage`, `scripts/task-check.ts:137`), `Create Framework Release` (150-172) with their comments. The downstream sync step reads `steps.framework-tarball.outputs.framework_version` at line 194 (`TAG: framework-v…`, then `git commit -m "release: ${TAG}"`, `git tag -f`, `git push --force-with-lease` at 209-214) — deleting the tarball step without this edit breaks the `flowai-plugins` push. Change that one line to `TAG: framework-v${{ steps.create-release.outputs.version }}`; the downstream tag scheme stays as it is (`flowai-plugins` already carries `framework-v0.14.x` tags, and renaming them is a visible change to another repo, out of scope). After the edit `grep -n framework-tarball .github/workflows/ci.yml` → empty. Local validation: `deno run -A scripts/check-salp.ts` (the deleted comments carried `[REF:fr:dist.bundle.pin]`), then a YAML parse `yq '.jobs.release.steps[].name' .github/workflows/ci.yml`.
18. `scripts/check-pack-refs.ts --leakage` stays: it still proves the rendered tree carries no generator inputs; its doc comment (lines 2-14, 201, 232) is reworded from "tarball shipped to the CLI" to "distribution tree". No logic change.

### Phase 7 — verification and hand-off

19. `env -u AUTO_INSTALL_PLUGINS deno task check > "$SCRATCH/check.log" 2>&1` — read the `N passed | M failed` line. Then every DoD Evidence command above.
20. Three commits, each green on `deno task check` by itself. An SRS anchor and its last `[REF]` must leave in the same commit: `[REF:fr:dist.bundle.pin]` sits in `ci.yml:95,154` and the index rows mirror the SRS, so SRS, index, SDS, spec, CI and both AGENTS.md files travel together. (1) `docs(dist): retire the flowai CLI from the SRS, SDS, index, spec and CI`; (2) `docs(readme): describe the marketplace as the only channel` — README + adapt/update/adapter wording + `cli-internals.ts` header + `check-pack-refs.ts` comments; (3) `fix(setup-ai-ide-devcontainer): install flowai from the plugin marketplace` — skill, references, renamed scenario. Push once after all three; the `fix:` in commit 3 triggers the release job, which exercises the edited pipeline.
21. Hand-off message: scenarios run (`setup-ai-ide-devcontainer-deno-flowai-plugins`), cache state, the two sweep commands for the user (`deno task acceptance-tests -f setup-ai-ide-devcontainer`, `-f adapt`, `-f update`), and the CI run URL of the merge push.

Error handling: a `check-salp` failure after an SRS deletion names the dangling REF — wrap the token in backticks where it is illustrative (task files) or delete the row (index). A red acceptance scenario is diagnosed via `judge-evidence.md` and the raw rollout before any SKILL.md edit (AGENTS.md §Diagnosing Failures). A red CI run on the push is investigated with the Logs command from AGENTS.md §CI/CD; the release job runs only on `feat:`/`fix:` commits, so the push that carries commit 3 is the one to watch.

## Follow-ups

- `scripts/build-plugins.ts` `CLI_ONLY_FENCE_RE` (lines 23, 58-59, 583-584) has no user under `framework/`; removing it is a code change with tests — separate task.
- GitHub secrets / JSR OIDC binding for the old CLI publish flow are account-level; `gh secret list` and the JSR package settings are checked by the user, not by this task.

- `documents/ides-difference.md:334` describes the `experimental.codexHooks` gate of `flowai sync`; the file is READ-ONLY reference and the gate no longer has an implementation. Leave as is; note here.
- `documents/tasks/2026/09/sweep-reds-follow-up.md:37` records an out-of-repo follow-up against `flowai-cli` (Codex agent TOML lacking `model`); the repo is archived, so the follow-up is moot. Task files are not rewritten.
