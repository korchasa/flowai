---
date: "2026-09-02"
status: in progress
implements:
  - FR-ACCEPT
  - FR-INIT
  - FR-DOCS
tags: [merge-readiness, acceptance-tests, hygiene, codex]
related_tasks:
  - 2026/09/acceptance-harness-on-codex.md
  - 2026/08/full-sweep-2026-08-28-reds.md
  - 2026/08/seven-reds-after-08-24-sweep.md
  - 2026/08/agents-rules-four-reds-full-sweep.md
---

# Bring `chore/swe-bench-rescue` to a mergeable state [ANC:task:2026-09-merge-branch-swe-bench-rescue]

## Goal

Merge 216 commits of framework and harness work into `main` on evidence, not on
hope. Three things have to be true at merge time: the acceptance suite states a
verdict measured on the harness that actually ships, the working tree carries no
unfinished or unexplained content, and the repository holds nothing that is not
a record.

## Overview

### Context

The branch is 216 commits ahead of `main` and 0 behind, so the merge itself is a
fast-forward with no conflict risk. What is missing is a defensible answer to
"does the suite pass".

The measurement history breaks in two places:

1. **The last honest sweep predates the harness that now ships.** Sweep
   `acceptance-tests/runs/2026-08-31T00-43-39` scored 255/271 with 16 reds. It
   ran the agent, the judge and the user emulator on Claude. Commit `a1098f92`
   (2026-09-01) moved all three to codex, and the task that shipped it
   (`2026/09/acceptance-harness-on-codex.md`) says in so many words that the
   full sweep is the operator's to run. It has not been run. So there is no
   acceptance verdict on the current commit at all — only a verdict on a harness
   that no longer exists.

2. **The one sweep taken after that is unusable.** Sweep
   `acceptance-tests/runs/2026-08-31T22-31-40` reads 135/225 with 90 reds, which
   looks catastrophic and is at least partly an outage. 27 of its runs carry the
   line
   `[acp-error] {"acpError":"Internal error: You've hit your org's monthly spend limit …"}`
   in `judge-evidence.md`: the account hit its Claude spend limit mid-sweep and
   those sessions died before their first tool call. Whether the other 63 reds
   are behaviour or collateral of the same outage is unknown, and that is
   precisely why the sweep cannot be used as a verdict.

   The runner already has the guard for exactly this
   (`HARNESS_FAULT_PATTERNS` / `detectAuthFailure`,
   `scripts/acceptance-tests/lib/runner.ts:431`), built after an identical
   incident on 2026-08-20. It lists `OAuth session expired`,
   `Failed to authenticate`, `Invalid API key`, `Usage credits required` — and
   not the spend-limit wording. One missing string turned an outage into
   recorded product failures.

Of the 16 reds in the last honest sweep, four are already retired: SRS
FR-ACCEPT-GUARDS records `implement-tdd-cycle-completes`,
`maintenance-tooling-relevance`, `maintenance-no-spurious-invocation` and
`init-brownfield-update` as `system_health` spawn refusals, fixed by commit
`66602309` (wait for memory instead of refusing). Twelve candidates remain, and
none of them has been re-measured on codex.

Meanwhile the working tree holds 15 modified and 7 untracked paths that are not
one piece of work but at least four:

- a harness change that moves `collectGeneratedFiles` and
  `renderFileForEvidence` out of `runner.ts` into the existing `evidence.ts`
  and, in the same move, rebuilds how the judge's `GENERATED FILES` section is
  selected — git queries instead of a filesystem walk. This changes judge
  evidence assembly for **every** scenario in the suite, not just the ones
  re-run;
- an `init` command change (SRS/SDS structure moved out of
  `AGENTS.template.md` into two new asset templates) with all five `init`
  scenarios edited, and SRS FR-DOCS / FR-INIT already updated to match;
- three new dev-only skills under `.agents/skills/` plus a codex agent;
- a new acceptance scenario for `diagnose-benchmark-failure` belonging to an
  open task.

### Current State

- `deno task check` — recorded **green** earlier today on this exact tree:
  `776 passed | 0 failed` and `182 passed | 0 failed`, every validator
  (`check-pack-refs --leakage`, `check-naming-prefix`, `check-traceability`,
  `check-salp`, `check-srs-evidence`, `check-trigger-coverage`,
  `check-task-format`) passing. Not re-run in this planning session, because the
  check mutates local plugin marketplace state as a side effect; it is re-run as
  the first step of the Solution.
- Branch: `chore/swe-bench-rescue`, 216 ahead / 0 behind `main`
  (`git rev-list --left-right --count main...HEAD` prints `0 216`).
- Scenarios: 316 `mod.ts` under `acceptance-tests/`, of which 4 sit inside
  `fixture/` directories and are not scenarios; `discoverScenarios()` returns
  **312**, and 126 of those are trigger scenarios. The last sweeps ran 271 and
  225. The 271 is two days and 216 commits old, so growth explains most of that
  gap; the 225 sweep died in the spend-limit outage.
- Repository content is clean. `.git` is 26 MB; the largest tracked file is
  `CHANGELOG.md` at 444 KB. No build output or run artefact is tracked.
- Disk, by contrast, is not: `acceptance-tests/runs/` holds **154 GB** across
  412 run directories, `scripts/benchmark/runs/` 4.8 GB, `logs/` 64 MB,
  `.venv-swebench/` + `.venv-rebench/` 832 MB. All gitignored, none of it in the
  repository.
- `.claude/settings.json` (tracked) carries an uncommitted
  `+ "autoCompactWindow": 200000` plus the missing-trailing-newline fix. The
  whole 5-line diff is that; it is hand-authored, not a `sync-plugins-local`
  side effect.
- Two untracked dev skills fail a bare `deno fmt --check`
  (`improve-primitive-from-benchmark/SKILL.md`, `session-history-analyzer/SKILL.md`).
  `.agents/` sits outside the `deno task check` gate, so the gate never sees them.
- `framework/core/assets/SRS.template.md` and `SDS.template.md` are new and
  untracked. **They need no `pack.yaml` change** — resolved this session against
  the code: CI packs the whole directory (`tar … -cf framework.tar framework/`,
  `.github/workflows/ci.yml:117-125`), and `copyReferencedAssets` in
  `scripts/build-plugins.ts:647` copies pack-level assets by scanning the skill
  body with `/(?:\.\.\/)*assets\/([A-Za-z0-9_.-]+)/g`, which matches the
  `../../assets/SRS.template.md` references `init/SKILL.md` now carries. The
  `assets:` map in `pack.yaml` is the scaffold-rename table
  (`AGENTS.template.md` -> `AGENTS.md`), a different mechanism.
- Two untracked task files, both `status: to do`:
  `2026/08/diagnose-bench-raw-session.md`, `2026/09/skill-description-length-cap.md`.
- **Correction to both scout reports:** they describe
  `scripts/acceptance-tests/lib/evidence.ts` and `evidence_test.ts` as new,
  untracked modules. They are not. Both are tracked in `HEAD` (`evidence.ts` is
  122 lines there, exporting `MAX_DIFF_LEN`, `truncateDiff`, `MAX_TRACE_LEN`,
  `truncateTrace`, `formatJudgeEvidence`); the uncommitted diff ADDS
  `renderFileForEvidence` and `collectGeneratedFiles` to them, moved out of
  `runner.ts`. `git status` shows both as ` M`, not `??`. The behavioural claim
  the reports build on it — git-based file selection replacing the filesystem
  walk, affecting every scenario — is correct and unchanged. The verbatim scout
  block below is left as returned; this line is the correction.
- `detectAuthFailure` is covered by `scripts/acceptance-tests/lib/runner_timeout_test.ts`,
  which is inside the gate (only `runner_test.ts` is on the `--ignore` list),
  so a new fault-pattern test has a home that actually runs.

### Constraints

- A full sweep is expensive: the 2026-08-31 sweep took 5 h 23 m of wall clock at
  `-p 3` and 226 sessions. It runs on the operator's account, and per AGENTS.md
  the CHECK-phase full sweep is the user's to run, not the agent's.
- `system_health` and `process_watchdog` gate every spawn. They are not to be
  overridden; a blocked run is reported, not forced.
- The parallelism ceiling is empirical: `-p 3` refused nine `plan-*` spawns on
  2026-08-29 and `-p 2` cleared all 26.
- Nothing under `documents/tasks/` is deleted — task files are permanent records.
- Any `rm -rf` over run directories guards every path component and dry-runs
  first (AGENTS.md safe-deletion rule).
- `deno task check` mutates local plugin marketplace state via
  `sync-plugins-local.ts`. That is expected, not a defect to chase.

### Affected Surface

The `surface-scout` report collected this session, verbatim as returned. A prior
session dispatched the same scout on the same request; its report covered the
same ground and is superseded by this one.

```
This confirms and extends what a prior session already recorded in `documents/tasks/2026/09/merge-branch-swe-bench-rescue.md`. I independently surveyed the tree and cross-checked the key claims; my findings agree with that file and add a couple of confirmations. Below is my own enumeration, built from the request text alone.

## Surface

- `scripts/acceptance-tests/lib/evidence.ts`, `runner.ts`, `evidence_test.ts`, `runner_timeout_test.ts` — the judge-evidence assembly was extracted and changed to select files via `git diff`/`ls-files --others` instead of a filesystem walk; this is a harness-wide behavior change, not scoped to one primitive — evidence: `git diff --stat` shows `evidence.ts` +127/-0, `runner.ts` net -95 lines at the deleted `collectGeneratedFiles`/`renderFileForEvidence` block, `evidence_test.ts` new file.
- Every acceptance-test scenario under `framework/*/skills/*/acceptance-tests/`, `framework/*/commands/*/acceptance-tests/`, `framework/*/agents/*/acceptance-tests/` — consumer of the changed evidence pipeline; only the five `init` scenarios have been re-run against it since the change — evidence: `find framework -path '*/acceptance-tests/*/mod.ts' -newer` not run by me directly, but the task file's own count (316 `mod.ts`, 126 trigger scenarios) and my `find framework/` listing of packs (`atoms beta core deno devtools engineering memex typescript`) confirm the harness spans all of them, not just `core/commands/init`.
- `scripts/acceptance-tests/lib/runner.ts` `HARNESS_FAULT_PATTERNS` (around line 431) — does not include the Claude spend-limit error string, so an account-limit outage is recorded as 90 product failures instead of being flagged as infra fault — evidence: the string list in that constant (`OAuth session expired`, `Failed to authenticate`, `Invalid API key`, `Usage credits required`) and the outage in `acceptance-tests/runs/2026-08-31T22-31-40` reading `[acp-error] {"acpError":"Internal error: You've hit your org's monthly spend limit …"}`.
- `framework/core/commands/init/acceptance-tests/{brownfield,brownfield-update,brownfield-idempotent,greenfield,vision-integration}/mod.ts` — all 5 modified, checklist and setup changes tied to the SRS/SDS template split — evidence: `git diff --stat` lines for each, `check-agents-template_test.ts` diff confirming the new `SRS Format`/`SDS Format` block removal contract.
- `framework/core/commands/init/SKILL.md` — modified to point at `../../assets/SRS.template.md` / `SDS.template.md` instead of embedding structure inline, plus a script-path fix and an AGENTS.md-recording instruction.
- `framework/core/assets/AGENTS.template.md` — modified, −70 net lines (SRS/SDS format blocks removed).
- `framework/core/assets/SRS.template.md`, `framework/core/assets/SDS.template.md` — new, untracked, referenced by `init/SKILL.md` and `check-agents-template_test.ts`, but **not present** in `framework/core/pack.yaml`'s `assets:` map, which still lists only `AGENTS.template.md: AGENTS.md` — evidence: `cat framework/core/pack.yaml` shows a single `assets:` entry; I could not locate the tarball-build script itself (`grep` for `tar -czf`/`framework.tar.gz` in `.ts`/`.yml` files only hit test/check files and `.github/workflows/ci.yml`, none of which is the build step), so whether these two files ship at all is unresolved.
- `scripts/check-agents-template_test.ts` — modified: one assertion flipped (template must NOT name `migrate-to-salp.ts`) and one new test added asserting the two new template files exist on disk — evidence: full diff read, shown above.
- `documents/design.md`, `documents/requirements.md` — modified, presumably kept in sync with the evidence-pipeline and doc-schema-indirection changes.
- `.claude/settings.json` — modified, carries `"autoCompactWindow": 200000`, a personal cost setting in a tracked shared file.
- `.agents/skills/improve-primitive-from-benchmark/`, `.agents/skills/root-cause-and-fix/`, `.agents/skills/session-history-analyzer/`, `.codex/agents/session-error-analyzer.toml` — untracked dev-only additions, outside the `deno task check` gate (which scopes fmt/lint to `scripts framework deno.json` only) — evidence: `find .agents -type f` and `find .codex -type f` listings; two of the five `.agents/skills` files are not `deno fmt`-clean per the referenced task file.
- `framework/engineering/skills/diagnose-benchmark-failure/acceptance-tests/raw-session/` — untracked, new acceptance-test scenario tied to open task `documents/tasks/2026/08/diagnose-bench-raw-session.md` (`status: to do`).
- `documents/tasks/2026/08/diagnose-bench-raw-session.md`, `documents/tasks/2026/09/skill-description-length-cap.md` — untracked task files, both `status: to do` — unfinished work sitting in the tree.
- `documents/tasks/2026/09/merge-branch-swe-bench-rescue.md` — untracked, is itself the task file already tracking this exact merge-readiness effort (dated today, `status: to do`); a session resuming this request should read and continue it rather than start fresh.
- `README.md` — checked for staleness against the template split: `grep` for `SRS.template`, `SDS.template`, `migrate-to-salp` returns zero hits, so either README never described that detail or it is silently stale on the new asset split.
- `acceptance-tests/runs/` (154 GB, ~412-415 run directories), `scripts/benchmark/runs/` (4.8 GB), `logs/` (64 MB), `.venv-rebench/` (496 MB), `.venv-swebench/` (336 MB), `.swe-bench-fork/` (4.1 MB) — large disk artefacts, all gitignored (confirmed against `.gitignore` lines for `acceptance-tests/runs/`, `logs/`, `.venv-swebench/`, `scripts/benchmark/runs/`, `.venv-rebench/`, `.swe-bench-fork/`), so not git-tracked garbage but real disk footprint if "no garbage" is read as a disk-hygiene concern rather than a git one.
- `.git` directory itself and tracked file sizes — not affected: `git ls-files` shows no `.DS_Store`, no `dist/`, no `tmp/`, no `logs/` tracked; largest tracked file is `CHANGELOG.md`.
- `deno task check` gate — the merge-readiness signal for "general state" — not independently re-run by me this pass, but the task file records it green (`776 passed | 0 failed`, `182 passed | 0 failed`) on this exact working tree state.
- CI workflow `.github/workflows/ci.yml` — runs `deno task check` on push; relevant because a merge to `main` triggers it, and it's also where `tarball`/`framework.tar.gz` references live per my grep, worth opening to see if it's the actual build step for the two new untracked assets.
- `acceptance-tests/runs/latest` symlink and the run-history gap (last sweeps ran 271 and 225 scenarios against 316 `mod.ts` on disk, 126 of them trigger scenarios) — unexplained discrepancy in scenario count between disk and the last two sweeps.

## Queries used

- `ls -la`, `git status`, `git diff --stat`, `git status --porcelain=v1`
- `cat documents/tasks/2026/09/merge-branch-swe-bench-rescue.md` (existing prior scout report + task context)
- `cat .gitignore`
- `git ls-files | grep -i '.DS_Store'`, `git ls-files dist/`, `git ls-files tmp/`, `git ls-files logs/`
- `ls framework/` (pack survey)
- `find documents/tasks -maxdepth 3 -type f -newer README.md`
- `find .agents -type f`, `find .codex -type f`
- `git log --oneline -- .agents`
- `git diff scripts/check-agents-template_test.ts`
- `cat framework/core/pack.yaml`
- `grep -rln "framework.tar.gz|tar -czf|tarball" --include='*.ts' --include='*.yml' .`
- `du -sh acceptance-tests/runs acceptance-tests/cache scripts/benchmark/runs logs .venv-rebench .venv-swebench .swe-bench-fork tmp dist`
- `grep -n "SRS.template|SDS.template|migrate-to-salp" README.md`
- `grep -n "assets" scripts/check-pack-refs.ts`

## Not examined (budget)

- The actual `framework.tar.gz` build/release step (only test/check files and `ci.yml` surfaced by grep; did not open `.github/workflows/ci.yml` to confirm what builds and packs the tarball, so whether `SRS.template.md`/`SDS.template.md` ship is unresolved).
- Full diff content of `documents/design.md`, `documents/requirements.md`, `.claude/settings.json` (only stats seen from the prior task file, not independently re-read this pass).
- Content of `.agents/skills/root-cause-and-fix/SKILL.md`, `.agents/skills/session-history-analyzer/SKILL.md`, `.agents/skills/improve-primitive-from-benchmark/` beyond file listing.
- The remaining acceptance-test scenario directories across `framework/atoms`, `beta`, `deno`, `devtools`, `engineering`, `memex`, `typescript` packs — not individually opened to check whether the `evidence.ts` git-based file selection changes their judge outcome (fixtures with untracked/gitignored generated files are the specific risk named in the prior scout report).
- Older run directories under `acceptance-tests/runs/` beyond what the prior task file sampled (5 most recent) — not resurveyed.
- `.github/workflows/ci.yml` full content.
- Whether `deno task check` still passes on the current working tree right now — relied on the prior task file's recorded green run rather than re-running the ~3-5 min full check myself.

## Could not rule out

- That the harness-wide `evidence.ts` change silently changes judge outcomes for acceptance scenarios outside `init-*`, in either direction — same open question the prior task file raised, and I found no new evidence to close it.
- That the untracked `SRS.template.md`/`SDS.template.md` need a `pack.yaml` `assets:` entry to actually ship in `framework.tar.gz` — plausible bundling gap, still unconfirmed either way since the build script itself was not located.
- Whether the two untracked `status: to do` task files and their associated scaffolding (`.agents/skills/*`, `.codex/agents/session-error-analyzer.toml`, `diagnose-benchmark-failure/acceptance-tests/raw-session/`) are one coherent piece of work that should ship with this merge or unrelated WIP that should be split off.
- Whether `README.md`'s silence on the SRS/SDS template split is intentional (nothing user-facing changed) or a doc-sync gap — I only grepped for exact strings, not for the surrounding sections that describe `init`'s behavior.
```

- `scripts/acceptance-tests/lib/evidence.ts` + `runner.ts` + `evidence_test.ts` + `runner_timeout_test.ts` — covered-by Solution Phase 1 steps 3-6 (fault-pattern RED/GREEN lands in the same files, committed as group 1)
- Judge-evidence assembly for all 312 scenarios (harness-wide behaviour change) — covered-by Solution Phase 3 step 13, the full sweep; this is the only thing that actually measures the blast radius
- `HARNESS_FAULT_PATTERNS` missing the spend-limit marker (`runner.ts:431`) — covered-by DoD item 1 and Solution Phase 1 steps 3-4
- Five `init` scenarios + `init/SKILL.md` + `AGENTS.template.md` + the two new asset templates + `check-agents-template_test.ts` — covered-by DoD items 2-3 and Solution Phase 2 step 7 (group 2)
- `framework/core/pack.yaml` `assets:` registration for the two new templates — not affected: the tarball packs all of `framework/` (`.github/workflows/ci.yml:117-125`) and `copyReferencedAssets` (`scripts/build-plugins.ts:647`) picks the templates up from the `../../assets/...` references in `init/SKILL.md`; the `assets:` map is the scaffold-rename table, a different mechanism
- `documents/requirements.md`, `documents/design.md` uncommitted edits — covered-by Solution Phase 1 step 5 (SDS) and Phase 2 step 7 (SRS)
- `.claude/settings.json` `autoCompactWindow` — covered-by Solution Phase 2 step 10, committed as-is per the user's decision
- Three untracked `.agents/skills/*` + `.codex/agents/session-error-analyzer.toml`, two of them not `deno fmt`-clean — covered-by Solution Phase 2 step 8 (group 3, formatted then committed); keeping them formatted afterwards is a Follow-up
- `framework/engineering/.../acceptance-tests/raw-session/` and its open task — covered-by Solution Phase 2 step 9 (group 4)
- Two untracked `status: to do` task files — covered-by Solution Phase 2 steps 9-10; both ship as open records, their work is not part of this merge
- 154 GB `acceptance-tests/runs/` + 4.8 GB `scripts/benchmark/runs/` + 64 MB `logs/` + 832 MB venvs — deferred — human choice (variant C scope, recorded under Follow-ups)
- Repository content itself — not affected: `git ls-files` shows no build output or run artefact; `.git` is 26 MB and the largest tracked file is `CHANGELOG.md` (444 KB)
- README staleness against the SRS/SDS template split — covered-by Solution Phase 2 step 7, which checks README against the Documentation Map before committing group 2
- Scenario-count gap (312 on disk vs 271 and 225 in the last two sweeps) — covered-by DoD item 4 and Solution Phase 3 step 12; likely growth over 216 commits rather than silent skipping, and one command settles it before the sweep starts
- Merge mechanics — not affected: `git rev-list --left-right --count main...HEAD` prints `0 216`, so the merge is a fast-forward with no conflict surface
- CI on merge (`.github/workflows/ci.yml` runs `deno task check`, then cuts a `framework-v<version>` release with the tarball) — covered-by Solution Phase 4 step 20

## Definition of Done

- [x] FR-ACCEPT: a sweep session killed by an account spend limit before its
      first tool call aborts the run instead of scoring 0, the same way an
      expired OAuth session already does; a child CLI surfacing the same wording
      through a tool result still only warns.
  - Test: `scripts/acceptance-tests/lib/runner_timeout_test.ts::detectAuthFailure: a spend-limit outage is not a behavioural result`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/runner_timeout_test.ts`
- [x] FR-DOCS: the SRS/SDS format blocks are gone from `AGENTS.template.md`, the
      two template assets exist, and the template no longer points downstream at
      the repository-only `migrate-to-salp.ts`.
  - Test: `scripts/check-agents-template_test.ts`
  - Evidence: `deno test -A scripts/check-agents-template_test.ts`
- [ ] FR-INIT: all five edited `init` scenarios pass on the codex harness in one
      run, including `init-greenfield` and `init-vision-integration`, which have
      not appeared in any recent run directory.
  - Benchmark: `init-greenfield`, `init-brownfield`, `init-brownfield-update`, `init-brownfield-idempotent`, `init-vision-integration`
  - Evidence: `deno task acceptance-tests -f init- -p 2`
- [ ] FR-ACCEPT: the sweep covers every scenario that exists on disk — no
      scenario is dropped by a swallowed import error, and the discovered count
      matches the 312 `mod.ts` files that live outside `fixture/`.
  - Evidence: `deno eval -A 'import { discoverScenarios } from "./scripts/acceptance-tests/lib/acceptance_discovery.ts"; console.log((await discoverScenarios()).length)'` prints exactly `312`, AND `grep -c "Failed to import scenario" "$SWEEP_LOG"` returns 0
  - Progress (2026-09-02): the discovery half is verified — the command printed
    `312`. The sweep-log half waits for the operator sweep.
- [x] FR-ACCEPT: the extracted evidence pipeline is covered by unit tests for the
      two silent-failure paths the extraction introduced — a product file under
      an IDE config dir, and a sandbox whose `initHash` does not resolve.
  - Test: `scripts/acceptance-tests/lib/evidence_test.ts`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/evidence_test.ts`
  - Correction (2026-09-02): the second path is not silent. `runGit` throws on a
    non-zero exit, so `collectGeneratedFiles` rejects with the failing command
    and the unresolved hash in the message, and the scenario run fails rather
    than handing the judge an empty section. The two tests added pin that
    fail-loud contract (unresolvable `initHash`, sandbox that is not a git
    repository); the IDE-dir skip was already pinned before this session.
- [x] FR-INIT: the two new template assets survive the plugin build, not only the
      CI tarball — `copyReferencedAssets` resolves the `../../assets/...` form.
  - Evidence: `deno task build-plugins` exits 0 AND `ls dist/claude-plugins/*/skills/init/assets/` lists `SRS.template.md` and `SDS.template.md`
- [ ] FR-ACCEPT: the suite has a verdict measured on the harness that ships —
      agent, judge and user emulator all on codex — and every red in it is
      classified as behaviour or as harness fault, with the reason recorded in
      this file.
  - Benchmark: full sweep, all scenarios
  - Evidence: `deno task acceptance-tests -p 2` (operator-run; per-red triage table appended to this file)
- [ ] FR-ACCEPT: every behavioural red is either fixed and re-measured green, or
      recorded in the SRS as a known gap with its own task file. No red is left
      unexplained.
  - Evidence: for each fixed scenario, `deno task acceptance-tests -f <scenario-id> -p 2` passes; for each accepted gap, `grep -n "<scenario-id>" documents/requirements.md` returns a line
- [ ] FR-ACCEPT: no uncommitted or unexplained content remains **at the moment
      of the merge** — checked after the post-sweep fixes are committed, not only
      after Phase 2 — and the dev-only Markdown skills under `.agents/` are
      formatter-clean.
  - Evidence: on the merge commit, `git status --porcelain` prints nothing AND `deno fmt --check` exits 0
- [ ] FR-ACCEPT: the gate is green on the merge commit and CI agrees.
  - Evidence: `deno task check` exits 0, then `gh run list --commit "$(git rev-parse HEAD)" --limit 1 --json status,conclusion` reports `completed` / `success`

## Solution

Variant B — commit the tree in coherent groups, fix the fault-pattern gap first,
then take a full sweep on codex before merging. Ordering is not cosmetic: the
spend-limit guard must exist before the expensive run, or a second outage
produces a second unusable sweep.

### Phase 0 — baseline

1. Run `deno task check > "$SCRATCH/check-baseline.log" 2>&1; echo "EXIT: $?"`.
   Read the verdict from the final `N passed | M failed` summary lines, not from
   the presence of `=== FAIL` (three `deno eval Deno.exit(...)` lines are
   intentional fixtures). Expect exit 0. The run mutates local plugin
   marketplace state via `sync-plugins-local.ts` — expected, not a defect.
2. Immediately after that run, re-read `git diff .claude/settings.json`. The
   check re-points the local plugin marketplace, and the known failure is that
   it flips a muted pack's enablement back on inside this tracked file. The
   diff must still be exactly the two hunks the user approved
   (`"autoCompactWindow": 200000` plus the trailing newline). Anything else that
   appeared is a side effect, not the user's change — drop it with a targeted
   edit before step 10 commits the file. Repeat this check after Phase 4 step 18.
3. Sweep orphaned test runners before anything spawns agents:
   `ps -Ao pid,etime,command | grep -E "tests/runtests.py|flowai-bench.*multiprocessing" | grep -v grep`.
   Anything older than ~10 min with no live `benchmark.ts run` is an orphan —
   kill it. A leaked pool trips `system_health` and silently aborts every
   subsequent session.

### Phase 1 — the fault-pattern fix, before anything expensive

4. **RED.** Add to `scripts/acceptance-tests/lib/runner_timeout_test.ts`:
   - `detectAuthFailure: a spend-limit outage is not a behavioural result` —
     feeds the observed trace
     `[acp-error] {"acpError":"Internal error: You've hit your org's monthly spend limit ..."}`
     with `toolCallCount` 0 and asserts a non-null message.
   - a companion assertion that the same trace with `toolCallCount > 0` returns
     null from `detectAuthFailure` and a warning from
     `detectHarnessFaultWarning` — a scenario driving another IDE's CLI surfaces
     that child's billing error through a tool result, and that is a correct
     observation about the sandbox, not a broken bench. This is the exact
     distinction that cost three good runs of `delegate-to-ide-trigger-adj-1`.
   Run `deno test -A scripts/acceptance-tests/lib/runner_timeout_test.ts` — it
   MUST fail, and it must fail on the missing pattern, not on a compile error.
5. **GREEN.** Add `"monthly spend limit"` to `HARNESS_FAULT_PATTERNS`
   (`scripts/acceptance-tests/lib/runner.ts:431`). The narrower literal is
   deliberate: `spend limit` alone would match ordinary agent prose about
   budgets, and the possessive in `your org's` is provider wording that may
   change. Re-run the file — green.
6. **REFACTOR / CHECK.** Update the SDS `Execution Stability` bullet
   (`documents/design.md`, FR-ACCEPT component) to name the new pattern and the
   2026-08-31 incident, in the same voice as the 2026-08-20 entry beside it.
   Run `deno task check`.
7. **Commit group 1 — harness.** Paths, explicitly, never a directory:
   `scripts/acceptance-tests/lib/evidence.ts`,
   `scripts/acceptance-tests/lib/evidence_test.ts`,
   `scripts/acceptance-tests/lib/runner.ts`,
   `scripts/acceptance-tests/lib/runner_timeout_test.ts`,
   `documents/design.md`.
   Before committing, extend `evidence_test.ts` with the two paths the
   extraction made silent: (a) a product file under `.claude/` or `.codex/` is
   skipped by `IDE_DIRS`, so a scenario whose expected output legitimately lives
   there now shows the judge nothing; (b) a sandbox that is not a git repo, or
   whose `initHash` does not resolve, yields an empty `GENERATED FILES` section
   rather than an error. Both read as behavioural reds during triage if they are
   not pinned by a test first. This matters more than the `init` scenarios: the
   git-based selection changed what the judge sees for all 312 scenarios, and
   the sweep is the only other thing that would catch it.
   Check `git diff --cached --stat` in a SEPARATE call before committing —
   parallel sessions stage into the same index.

### Phase 2 — commit the rest of the tree, four more groups

8. **Group 2 — `init` and the doc-schema split.** First confirm
   `deno test -A scripts/check-agents-template_test.ts` passes. Then check
   `README.md` against the Documentation Map: `init/SKILL.md` maps to
   README section Packs. Grep for the `init` description and for any surviving
   claim that AGENTS.md carries the SRS/SDS structure; update if stale, leave
   alone if the README never described that level of detail. Commit:
   `framework/core/commands/init/SKILL.md`,
   `framework/core/assets/AGENTS.template.md`,
   `framework/core/assets/SRS.template.md`,
   `framework/core/assets/SDS.template.md`,
   the five `framework/core/commands/init/acceptance-tests/*/mod.ts`,
   `scripts/check-agents-template_test.ts`,
   `documents/requirements.md`, and `README.md` if touched.
   No `framework/core/pack.yaml` change — established above that the tarball
   packs all of `framework/` and `copyReferencedAssets` resolves the
   `../../assets/...` references.
9. **Group 3 — dev-only skills.** Run `deno fmt .agents/` (those files sit
   outside the gate, so the gate will never do it) and confirm with a bare
   `deno fmt --check`, which currently names exactly the two offenders. Note
   `deno fmt` has **no TOML formatter**: `.codex/agents/session-error-analyzer.toml`
   is untouched by that step and a clean `--check` says nothing about it — read
   it by eye instead. Then commit `.agents/skills/improve-primitive-from-benchmark/`,
   `.agents/skills/root-cause-and-fix/`, `.agents/skills/session-history-analyzer/`,
   `.codex/agents/session-error-analyzer.toml`.
10. **Group 4 — the new acceptance scenario.** Commit
   `framework/engineering/skills/diagnose-benchmark-failure/acceptance-tests/raw-session/`
   together with its task file
   `documents/tasks/2026/08/diagnose-bench-raw-session.md`. The task stays
   `status: to do` — the scenario exists, the skill change it describes does
   not, and that is the honest state.
11. **Group 5 — settings and records.** Commit `.claude/settings.json` with
    `"autoCompactWindow": 200000` as-is (user decision), plus
    `documents/tasks/2026/09/skill-description-length-cap.md` and this task
    file.
12. `git status --porcelain` must now print nothing. Also run
    `deno task build-plugins` once here: it is the only thing that exercises
    `copyReferencedAssets` on the two new template assets, and the CI tarball
    check does not cover that path.

### Phase 3 — the sweep

13. Confirm discovery covers the tree before spending six hours on it. The
    count alone does not prove it: `importScenariosFromDir`
    (`scripts/acceptance-tests/lib/acceptance_discovery.ts:49-53`) wraps the
    dynamic import in `try/catch` and only `console.warn`s
    `Warning: Failed to import scenario from ...`, so a scenario that fails to
    compile disappears from the discovered count AND from the report — both
    sides of any count comparison agree by construction. So do two things:
    - `deno eval -A 'import { discoverScenarios } from "./scripts/acceptance-tests/lib/acceptance_discovery.ts"; console.log((await discoverScenarios()).length)'`
      must print exactly `312` (316 `mod.ts` minus the 4 under `fixture/`);
    - the sweep log must contain zero `Failed to import scenario` lines. Capture
      the whole sweep to a log file for exactly this reason.
14. **Operator step.** `deno task acceptance-tests -p 2 > "$SCRATCH/sweep.log" 2>&1`. Not `-p 3`: it refused
    nine `plan-*` spawns on 2026-08-29 while `-p 2` cleared all 26. No cache
    flag needed — the cache key hashes `scripts/acceptance-tests/lib/**`, which
    Phase 1 just changed, so every entry misses anyway.
15. **Triage every red, in this order.** For each failing scenario:
    - `acceptance-tests/runs/latest/<id>/run-1/judge-evidence.md` — first, for
      the checklist verdict and any `[acp-error]` line;
    - the raw codex rollout,
      `<run>/<id>/run-1/bench-home/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl`
      — ground truth for what was actually invoked:
      `jq -r 'select(.type=="response_item") | .payload | select(.type=="function_call" or .type=="custom_tool_call") | .name' <file> | sort | uniq -c | sort -rn`.
      A tool-call count separates "could not" from "did not"; the judge's prose
      never will.
    Classify each red as **harness fault** (spend/auth outage, global timeout,
    `system_health` or `process_watchdog` refusal) or **behaviour**. Record the
    classification and its evidence path in a table appended to this file.
16. For each behavioural red, fix through Acceptance-Test TDD on the primitive,
    not by editing the scenario. When the fix is a wording change, interview
    every failed run before editing — resume in place with
    `cd "$(readlink <run>/<id>/run-N/sandbox)" && CODEX_HOME="$(readlink <run>/<id>/run-N/bench-home)/.codex" codex exec resume <uuid> "<question>"`,
    ask neutrally which phrase left room, and edit the sentence the runs agree
    on. Re-measure only the fixed scenario: `deno task acceptance-tests -f <id> -p 2`.
17. A red that is real but out of this task's scope becomes an SRS entry naming
    it as a known gap plus its own task file — not a silent pass.
18. **Commit the post-sweep work before leaving Phase 3.** Steps 16-17 edit
    SKILL.md files, the SRS and new task files; none of that is on the branch
    until it is committed. Commit it in its own group, then assert
    `git status --porcelain` prints nothing again. Without this the merge in
    Phase 4 can ship a branch that does not contain the fixes the sweep bought.
19. Second failed fix attempt on the same scenario: STOP and output a
    STOP-ANALYSIS REPORT (state, expected, 5-why chain, root cause, hypotheses).

### Phase 4 — merge

20. `deno task check` green on the final tree, then re-read
    `git diff .claude/settings.json` one last time (step 2's reason applies
    again) and confirm `git status --porcelain` is empty.
21. `git checkout main && git merge --ff-only chore/swe-bench-rescue`. The
    `--ff-only` is the assertion: `main` is 0 ahead, so a merge commit here
    would mean the premise changed while the sweep ran.
22. `git push` (pre-authorized for this repo), then await CI per the AGENTS.md
    CI block: poll every 15 s, 180 s budget, and treat a longer build as an
    incident rather than a slow success.

### Error handling

- A guard (`system_health`, `process_watchdog`) blocking a spawn is a signal
  that conditions are wrong, never a hint to use an override. Report the
  blocker, free the resource (usually an orphaned `runtests.py` pool), retry.
  No `--force`, no override env var, without explicit per-action authorization.
- A second spend-limit outage mid-sweep now aborts the affected runs loudly
  instead of scoring them. Resume the sweep rather than re-reading its numbers.
- Never roll a probe back with `git checkout --` or `git restore` while the tree
  carries uncommitted work: `cp` the file first and restore from the copy.

### Verification commands

```
deno task check
deno test -A scripts/acceptance-tests/lib/runner_timeout_test.ts
deno test -A scripts/acceptance-tests/lib/evidence_test.ts
deno test -A scripts/check-agents-template_test.ts
deno task build-plugins
deno fmt --check
git status --porcelain
git diff .claude/settings.json
deno eval -A 'import { discoverScenarios } from "./scripts/acceptance-tests/lib/acceptance_discovery.ts"; console.log((await discoverScenarios()).length)'
deno task acceptance-tests -f init- -p 2
deno task acceptance-tests -p 2
```

## Implementation notes (2026-09-02)

- Phases 0-2 done in one session; Phase 3 step 14 (the full sweep) and Phase 4
  (the merge) are the operator's and are still open.
- `deno task check` green before and after the edits; the `.claude/settings.json`
  diff stayed exactly the two approved hunks through both runs.
- `.codex/agents/session-error-analyzer.toml` was read by eye per Phase 2 step 9
  and turned out to be a mangled port of `.claude/agents/session-error-analyzer.md`:
  every "Claude Code" had become "Codex", so the IDE list read
  "Codex, OpenAI Codex, OpenCode" and the Claude Code extraction section was
  titled "Codex". Restored the six occurrences from the tracked Markdown agent.
- README left untouched for group 2: it names `AGENTS.template.md` only as an
  example of a pack-level asset (line 81) and describes `init` as "docs
  scaffolding" (line 249); it never carried the SRS/SDS block detail that moved.
- The same search-replace damage reached two of the three `.agents/` skills:
  `session-history-analyzer/SKILL.md` documented `--ide Codex` (a value its own
  `list_sessions.py` rejects) and `~/.Codex/projects`; `root-cause-and-fix/SKILL.md`
  pointed at `.Codex/projects` and `Codex -p --resume`. Found while the review
  read them; restored from the tracked `.claude/skills/` sources before the verdict.
- Doc drift caught by the review: SDS §3.18 still said `migrate-to-salp.ts` is
  "shipped to downstream projects"; reworded to repository-only, guarded by the
  template test, and committed with group 2.
- Two extra `runner_timeout_test.ts` tests went RED on the missing pattern
  (`typeof null !== "string"`), not on a compile error, before the one-line
  GREEN in `HARNESS_FAULT_PATTERNS`.
- **Phase 3 step 14, first attempt (2026-09-02T01-07-10), killed at 55/312.**
  Every `plan-*` scenario was red with `Command "/plan" requires no arguments.`
  and no codex rollout on disk: the pinned ACP bridge
  `@agentclientprotocol/codex-acp@1.1.7` intercepts a leading `/<name>` for its
  own built-ins (`plan`, `review`, `compact`, `goal`, `status`, ...) before codex
  runs, and advertises installed skills as `$<skill>`. The SWE-bench operator
  already knew this (`commandPrefixFor(ide)` in `scripts/benchmark/operator.ts`,
  FR-BENCH-SWE.IDE); the acceptance runner never applied it. Fix: the prefix
  table now lives on the ACP registry (`commandPrefix` on `AcpAgentSpec`,
  `scripts/acceptance-tests/lib/acp/registry.ts`), `AcpAgent` rewrites the
  leading slash command of every turn with `nativeCommandTurn`, and
  `operator.ts` re-exports the table instead of owning a copy. Scenarios keep
  the cross-IDE `/<skill>` form. Unit tests in `registry_test.ts`; the `plan-basic`
  rollout (`acceptance-tests/runs/2026-09-02T01-31-05`) shows the `$plan` turn
  reading `.codex/skills/plan/SKILL.md` six times. The lib edit invalidates every
  cache key, so the sweep restarts from scratch (second attempt below).
- `plan-basic` on codex is still red after the fix, for a different reason: the
  scenario ships no fixture, its query claims `index.js` exists, and the codex
  agent stops to ask for the file instead of inventing an Express layout the way
  the cached claude run did; the codex judge also counts the tasks index
  `documents/index.md` against `no_code_changes`. Both go to the Phase 3 triage
  table with the rest of the reds.

## Follow-ups

- The `.agents/skills/root-cause-and-fix/SKILL.md` copy is an older snapshot than
  the tracked `.claude/skills/root-cause-and-fix/SKILL.md` (no 2026-08-25 /
  2026-08-28 signatures) and carries a rule 7 the newer file compressed away.
  Decide which is canonical and whether the codex copy should be generated.
- The tracked `.codex/agents/acceptance-test-fixer.toml` carries the same
  `.Codex/` search-replace damage (lines 52-72). Outside this task's Solution.
- `raw-session` plants its fixture in `setup()` after the init commit, so the
  judge will read the planted files as agent edits under `no_files_edited`.
  Commit them in `setup()` the way the five init scenarios now do, before the
  RED run of `documents/tasks/2026/08/diagnose-bench-raw-session.md`.
- **Deferred to a later task (variant C scope):** bring `.agents/` inside the
  `deno task check` formatter gate. Phase 2 formats those files by hand once;
  nothing stops them drifting again, because the gate scopes fmt/lint to
  `scripts framework deno.json`.
- **Deferred to a later task (variant C scope):** a retention policy for
  `acceptance-tests/runs/`. 154 GB across 412 directories is gitignored and so
  invisible to every repository check, and it grows by a sweep each time. Any
  cleanup must guard every path component and dry-run first.
- The 63 reds in `acceptance-tests/runs/2026-08-31T22-31-40` that carry no
  `[acp-error]` line are not diagnosed by this task. The Phase 3 sweep
  re-measures them from scratch on codex, which supersedes the question rather
  than answering it.
- `documents/tasks/2026/09/skill-description-length-cap.md` (FR-DESC-QUALITY)
  ships as an open record in group 5. Its work is not part of this merge.
- `check-fr-coverage.ts` reports `NO EVIDENCE` for a dozen FRs, FR-ACCEPT and
  FR-DOCS among them. It is not part of `deno task check` (stated in
  `documents/CLAUDE.md`) and it is not a merge blocker, but it means the
  declared acceptance coverage of those requirements is not machine-checked at
  all. Worth its own task.
- Swallowed scenario-import failures deserve a permanent fix, not a grep.
  `importScenariosFromDir` should fail the run rather than `console.warn`, so a
  scenario that stops compiling cannot vanish from a sweep silently. Out of
  scope here; this task only guards against it with a log check.
- This task file continues an untracked draft written by an earlier session on
  the same day and the same request, rather than opening a second file for one
  piece of work. AGENTS.md asks for a new file per session; the deviation is
  deliberate and was raised with the user.
