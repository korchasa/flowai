# Unified Benchmark Report

## Goal

Consolidate benchmark output into a single HTML report per run, with all scenario artifacts organized in one run directory. Enable switching between test results and viewing overall statistics from a single file — like Playwright HTML Reporter. Multiple runs of the same scenario (`-n`) are a first-class feature with aggregated statistics.

## Overview

### Context

- `scripts/task-bench.ts` — benchmark entry point (`deno task bench`)
- `scripts/benchmarks/lib/runner.ts` — scenario runner, creates per-scenario `TraceLogger` in `benchmarks/<skill>/runs/<scenario-id>/`
- `scripts/benchmarks/lib/trace.ts` — TraceLogger, already supports multi-scenario rendering (dashboard, ToC, drill-down), but each scenario creates its own instance
- Current output: 7+ separate `trace.html` files scattered across `benchmarks/<skill>/runs/<id>/`

### Current Flow (per scenario)

```
task-bench.ts loop:
  for each scenario:
    workDir = benchmarks/<skill>/runs/
    scenarioDir = workDir/<scenario-id>/
    tracer = new TraceLogger(scenarioDir)  // <-- separate per scenario
    tracer.init(...)
    ... run agent ...
    tracer.logSummary(...)
```

### Current Directory Layout

```
benchmarks/
  flow-commit/runs/af-commit-basic/trace.html + sandbox/
  flow-plan/runs/af-plan-basic/trace.html + sandbox/
  flow-answer/runs/flow-answer-basic/trace.html + sandbox/
```

### Target Directory Layout

```
benchmarks/runs/
  2026-03-07T12-00-00/                    # timestamped run directory
    report.html                            # single unified report
    flow-commit-basic/                     # scenario (single run)
      run-1/sandbox/                       # run artifacts
    flow-answer-basic/                     # scenario (multiple runs with -n 3)
      run-1/sandbox/
      run-2/sandbox/
      run-3/sandbox/
  latest -> 2026-03-07T12-00-00/          # symlink to latest
```

### Multi-Run Data Model

When `-n 3` is used, each run of the same scenario gets a unique id in TraceLogger:

```
scenario.id = "flow-answer-basic"
run 1 -> traceId = "flow-answer-basic/run-1"
run 2 -> traceId = "flow-answer-basic/run-2"
run 3 -> traceId = "flow-answer-basic/run-3"
```

TraceLogger groups these by `scenarioId` for aggregated stats in dashboard:
- Pass rate: 2/3 (66.7%)
- Avg duration, avg tokens, avg cost
- Each run expandable in ToC sidebar

## Definition of Done

- [ ] Single `TraceLogger` created in `task-bench.ts`, shared across all scenarios
- [ ] All scenario sandboxes stored under `benchmarks/runs/<timestamp>/<scenario-id>/run-N/sandbox/`
- [ ] Single `report.html` generated at `benchmarks/runs/<timestamp>/report.html`
- [ ] `latest` symlink points to the most recent run directory
- [ ] Report dashboard shows aggregated stats per scenario (pass rate, avg score, avg duration when `-n > 1`)
- [ ] Report dashboard shows per-run rows expandable under scenario group
- [ ] Report allows switching between individual runs via ToC sidebar
- [ ] Report contains links to sandbox directories for each run (relative paths)
- [ ] Console output prints `file:///` URL to report.html at the end
- [ ] Old per-skill `benchmarks/<skill>/runs/` directories deleted; code that creates them removed
- [ ] Console output still prints summary table (no regression)
- [ ] `deno task check` passes
- [ ] Integration test updated if it references old paths

## Solution

### Step 1: Change run directory structure in `task-bench.ts`

Replace per-skill `workDir` calculation with a single timestamped run directory:

```typescript
// Before (per scenario):
const getWorkDir = (scenario) => join(Deno.cwd(), "benchmarks", scenario.skill, "runs");

// After (single run dir):
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const runDir = join(Deno.cwd(), "benchmarks", "runs", timestamp);
await Deno.mkdir(runDir, { recursive: true });
```

For multi-run (`-n`), each run gets its own subdirectory:

```typescript
for (let i = 0; i < runs; i++) {
  const runIndex = i + 1;
  const scenarioWorkDir = join(runDir, scenario.id, `run-${runIndex}`);
  // scenarioWorkDir passed to runScenario as workDir
}
```

Remove `getWorkDir()` helper entirely.

### Step 2: Create single TraceLogger in `task-bench.ts`

Move TraceLogger creation from `runner.ts` to `task-bench.ts`:

```typescript
// In task-bench.ts, before scenario loop:
const tracer = new TraceLogger(runDir, "report.html");

// Pass tracer to runScenario() via options
const result = await runScenario(scenario, { ...options, tracer, runIndex });
```

Update `RunnerOptions` in `runner.ts` to accept `tracer: TraceLogger` and `runIndex: number`.

### Step 3: Update `runner.ts` to use shared TraceLogger

- Remove `const tracer = new TraceLogger(scenarioDir)` from `runScenario()`
- Accept `tracer` and `runIndex` from options
- Use `runIndex` to create unique trace ids: `tracer.init(name, \`${id}/run-${runIndex}\`, ...)`
- Sandbox path becomes `join(workDir, "sandbox")` where workDir is already `runDir/<scenario-id>/run-N`

### Step 4: Add multi-run aggregation to TraceLogger

Extend `trace.ts`:

- Add `scenarioGroup` field to `ScenarioMetadata` — the base scenario id (without `/run-N`)
- In `render()`, group scenarios by `scenarioGroup`:
  - Dashboard table: one row per scenario group with aggregated stats (pass rate, avg score, avg duration, total cost)
  - Clicking row expands to show individual runs
  - ToC sidebar: scenarios grouped, with runs as sub-items
- Individual run pages remain unchanged (full trace with events)

### Step 5: Add sandbox link to report

In `trace.ts`, add a "Sandbox" link in the scenario header section:

```typescript
<div class="meta-item"><b>SANDBOX:</b> <a href="./${meta.scenarioGroup}/run-${meta.runIndex}/sandbox/">.../sandbox/</a></div>
```

### Step 6: Print report URL to console

At the end of `task-bench.ts`, after summary table:

```typescript
const reportPath = join(runDir, "report.html");
console.log(`\nReport: file://${reportPath}`);
```

Also print per-scenario trace link on failure using `file:///` format instead of relative path.

### Step 7: Create `latest` symlink

After the scenario loop in `task-bench.ts`:

```typescript
const latestLink = join(Deno.cwd(), "benchmarks", "runs", "latest");
try { await Deno.remove(latestLink); } catch { /* ignore */ }
await Deno.symlink(runDir, latestLink);
```

### Step 8: Delete old per-skill runs and update .gitignore

- Delete existing `benchmarks/<skill>/runs/` directories
- Add `benchmarks/runs/` to `.gitignore`
- Remove any references to old `benchmarks/<skill>/runs/` paths in docs and tests

### Step 9: Update integration tests

Check `runner.test.ts`, `integration.test.ts`, `spawned_agent.test.ts` for old path references. Update to match new structure.

### Step 10: Verify

```bash
deno task bench -f flow-answer-basic        # single scenario, single run
deno task bench -f flow-answer-basic -n 3   # single scenario, 3 runs — aggregated stats
deno task bench                              # all scenarios — full report
deno task check                              # fmt + lint + test
```

### Execution Order

```
Step 1 (run dir) -> Step 2 (shared tracer) -> Step 3 (runner) -> Step 4 (multi-run aggregation)
                                                                -> Step 5 (sandbox link)
                                                                -> Step 6 (console URL)
                                                                -> Step 7 (latest symlink)
                                                                -> Step 8 (delete old + gitignore)
                                                                -> Step 9 (tests)
                                                                -> Step 10 (verify)
```

Steps 4-9 are independent after Step 3.

### Files Changed

- `scripts/task-bench.ts` — steps 1, 2, 6, 7, 8
- `scripts/benchmarks/lib/runner.ts` — step 3 (accept shared tracer, use runIndex)
- `scripts/benchmarks/lib/trace.ts` — steps 4, 5 (multi-run grouping, sandbox link, aggregated dashboard)
- `scripts/benchmarks/lib/types.ts` — add `runIndex` to RunnerOptions if needed
- `.gitignore` — step 8
