---
date: 2026-05-03
status: done
tags:
  - refactor
  - maintainability
  - cli
  - benchmarks
related_tasks: []
migrated_from: "ADR-0003 (status: accepted)"
---

# Decompose five complexity hotspots into ≤100-line single-responsibility helpers

## Context

A `/flowai-skill-maintenance` scan on 2026-04-19 surfaced five files where a single function spanned 150–540 lines and owned multiple concerns: [cli/src/sync.ts](../../cli/src/sync.ts) `sync()` (541 lines), [scripts/task-bench.ts](../../scripts/task-bench.ts) `main()` (540 lines), [scripts/acceptance-tests/lib/runner.ts](../../scripts/acceptance-tests/lib/runner.ts) `runScenario()` (488 lines), [cli/src/cli.ts](../../cli/src/cli.ts) (three hotspots — `runSync` 152, render 160, `main` 195), [scripts/acceptance-tests/lib/trace-renderer.ts](../../scripts/acceptance-tests/lib/trace-renderer.ts) renderer (191 lines). The concrete cost: a cache-key change in `runner.ts` required re-reading ~500 lines to confirm nothing else broke. Existing test suites cover all five files — they bound the refactor.

## Alternatives

- **Per-file manual decomposition into named helpers, ≤100 lines each, single responsibility, behavior-preserving** (CHOSEN) — extract phases as private functions; preserve public signatures and side-effect order; one file per commit; lowest blast-radius first.
  - Pros: regression bound by existing tests; bisect-friendly (one logical file per commit); readability improves immediately; no API surface growth.
  - Cons: file LoC grows (helper signatures add overhead); requires discipline to avoid drift back into god-functions.

- **Leave as-is; add structural comments and section banners** — paper over with documentation.
  - Pros: zero risk.
  - Cons: doesn't lower edit risk; the next session still re-reads 500 lines; comments rot faster than function boundaries.
  - Rejected because: the goal is to lower the cost of future local edits, not to make the existing layout easier to read once.

- **Aggressive abstraction (pipeline / phase classes, dependency injection, builder API)** — refactor toward a framework rather than helpers.
  - Pros: extensibility; testable phases in isolation.
  - Cons: invents a framework with no second consumer; adds public API; breaks the "no behavior change" contract; large-scale rewrite that the existing test suite cannot fully bound.
  - Rejected because: speculative — there is no second pipeline waiting to reuse this. Premature abstraction.

## Decision

Decompose the five hotspot files into named helper functions, each ≤100 lines and single-responsibility. Preserve every public signature; preserve the order of side-effects observable from existing tests. No new dependencies, no new tests for existing behavior, no test modification. Refactor order from lowest to highest blast-radius: [trace-renderer.ts](../../scripts/acceptance-tests/lib/trace-renderer.ts) → [cli.ts](../../cli/src/cli.ts) → [task-bench.ts](../../scripts/task-bench.ts) → [runner.ts](../../scripts/acceptance-tests/lib/runner.ts) → [sync.ts](../../cli/src/sync.ts). One file per commit. `deno task check` green after each commit, not only at the end.

## Consequences

- Each touched file now exposes a top-level orchestrator with a flat call list of named phases — diff-pollution and bisect cost both drop.
- File LoC grew (e.g. `cli/src/sync.ts` 897 → 1091, `task-bench.ts` 713 → 972) — expected, signature overhead from extracted helpers; not a regression.
- No public API change. External callers of `sync()`, `main()`, `runScenario()`, `renderTraceReport()` continue to work.
- Behavior preservation guaranteed only as far as the existing test suite covers it. Areas without test coverage (rare CLI flag combos, error paths in trace rendering) remain unverified — not a regression but a known boundary.
- Tests untouched — refactor cannot mask a regression by editing the test that would have caught it.

## Definition of Done

All items evidenced as currently satisfied (this ADR is retrospective).

- [x] INTERNAL: no function in the five touched files exceeds 100 lines.
  - Test: manual — korchasa
  - Evidence: `grep -nE "^(export )?(async )?function " <file>` shows many small declarations; consecutive starts confirm body length under threshold (sample-checked across all five).
- [x] INTERNAL: existing test suite passes after refactor.
  - Test: full project suite under `deno task check`
  - Evidence: `deno task check` exits 0
- [x] INTERNAL: behavior unchanged — no existing test modified, no new tests added for existing behavior.
  - Test: `git log --oneline -- 'cli/src/*_test.ts' 'scripts/**/*_test.ts'` for the refactor commits
  - Evidence: no test-file modifications in the refactor commit set; suite runs unchanged
- [x] INTERNAL: one file per commit, lowest blast-radius first.
  - Test: manual — korchasa
  - Evidence: `git log --oneline --follow <file>` shows one refactor commit per hotspot in the documented order

## Solution

For each file, in order — `trace-renderer.ts` → `cli.ts` → `task-bench.ts` → `runner.ts` → `sync.ts`:

1. Read the file's existing test suite. Map the observable behaviors the suite asserts on.
2. Run `deno task check` and confirm a green baseline. Do NOT proceed if anything is red.
3. Identify natural phase boundaries inside the god-function (resolve / setup / execute / report; or header / body / summary). Extract one phase at a time as a private helper with a descriptive name. Re-run the file's test suite after each extraction.
4. Keep the public signature of the orchestrator. The orchestrator becomes a flat call list of helpers plus minimal glue.
5. Final `deno task check` for the file. Commit.

Concrete decomposition (as implemented):

- **[trace-renderer.ts](../../scripts/acceptance-tests/lib/trace-renderer.ts)** → `renderDashboard`, `renderDashboardRows`, `renderEvent`, `renderEventTimeline`, `renderScenarioSummaryCard`, `renderScenarioHeader`, `renderScenarioDetail`, `renderToC`, `renderTraceReport` (top-level).
- **[cli.ts](../../cli/src/cli.ts)** → `prepareScope`, `loadOrGenerateConfig`, `executeSync`, `buildResourceSections`, `buildActionEntries`, `printSyncHeader`, `printActionsAndSummary`, `printTrailers`, `groupByAction`, plus per-subcommand builders `buildSyncSubcommand` / `buildLoopSubcommand` / `buildMigrateSubcommand` / `buildUpdateSubcommand` / `buildRootAction`.
- **[task-bench.ts](../../scripts/task-bench.ts)** → `parseAndValidateArgs`, `selectScenarios`, `precheckCache`, `runTasks`, `executeTask`, `printSummaryTable`, `buildExecutionContext`, `finalizeRun`, `printPassRates`, `printDetailedErrors`, `buildRuntimeSetup`, `printRunHeader`, `createRunDir`, `updateLatestSymlink`. Top-level `main()` becomes a short orchestrator.
- **[runner.ts](../../scripts/acceptance-tests/lib/runner.ts)** → `setupSandbox`, `initTracer`, `prepareSandboxFiles`, `initSandboxGit`, `runAgentWithTimeout`, `gatherJudgeEvidence`, `judgeAndScore`, `collectGeneratedFiles`, `scoreChecklist`. Top-level `runScenario()` orchestrates.
- **[sync.ts](../../cli/src/sync.ts)** → `loadFrameworkAndIndexes`, `resolveResourcesForSync`, `readPrimitiveFiles`, `syncSkillsAndCommandsForIde`, `syncAgentsForIde`, `syncHooksForIde`, `syncScriptsForIde`, `syncCoreAssetsForIde`, `syncSingleIde`, `runUserSyncStep`, `runSymlinksStep`, `resolveTargetIdes`, `markAllFailedActions`. Top-level `sync()` orchestrates phases in fixed order.

## Follow-ups

- Add a lightweight check (script or lint plugin) that flags any function > 100 lines in `cli/src/`, `scripts/acceptance-tests/lib/`, `scripts/task-*.ts`. Without it, drift back into god-functions is invisible until the next maintenance scan.
- Consider extracting subcommand handlers from `cli/src/cli.ts` into `cli/src/commands/<name>.ts` if `cli.ts` grows further — currently in-file helpers are sufficient.
