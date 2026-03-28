---
name: bench-all
description: Run all framework benchmarks. Default is sequential (single `deno task bench`). Use `--parallel` for 5-subagent parallel mode. Triggers on "run all benchmarks", "bench all", "/bench-all".
---

# Run All Benchmarks

## Workflow

### 1. Choose mode

- **Default (sequential)**: Run all benchmarks in a single `deno task bench` invocation.
- **Parallel** (when user says "parallel", "fast", or passes `--parallel`): Split across 5 subagents.

### 2a. Sequential mode (default)

Run all benchmarks in one command:

```bash
deno task bench
```

Report results as they appear. After completion, summarize pass/fail counts.

### 2b. Parallel mode

#### Discover scenarios

```bash
deno eval "
import { dirname, join } from '@std/path';
import { existsSync, walk } from '@std/fs';
const fw = join(Deno.cwd(), 'framework');
const ids = [];
for await (const pe of Deno.readDir(fw)) {
  if (!pe.isDirectory) continue;
  const sd = join(fw, pe.name, 'skills');
  if (!existsSync(sd)) continue;
  for await (const e of walk(sd, { maxDepth: 10, includeFiles: true, match: [/mod\.ts$/] })) {
    if (!e.path.includes('/benchmarks/') || e.path.includes('/fixture/')) continue;
    try {
      const m = await import('file://' + e.path);
      for (const k in m) { if (m[k]?.id && m[k]?.userQuery) ids.push(m[k].id); }
    } catch {}
  }
}
console.log(JSON.stringify(ids));
"
```

#### Split into 5 batches

Distribute scenarios round-robin across 5 batches.

#### Launch 5 parallel subagents

For each batch N (1-5), launch a `benchmark-runner` subagent with this prompt template:

```
Run these benchmark scenarios sequentially using deno task bench.
For each scenario, run: deno task bench -f <scenario-id> --lock batch-N.lock
Scenarios: <comma-separated list of IDs in this batch>

IMPORTANT: Always pass --lock batch-N.lock to avoid lock conflicts with other parallel agents.

Run them one by one. After each scenario completes, report its result (PASS/FAIL, errors, warnings).
At the end, provide a summary of all scenarios in this batch.
```

Launch ALL 5 subagents in a SINGLE message (parallel Agent tool calls). Use `run_in_background: true` for each.

#### Status reporting

While subagents are running, report status to the user every ~60 seconds:

- How many subagents have completed vs still running
- Results from completed subagents (if any)

### 3. Final report

After all scenarios complete, compile results into a summary:

```
## Benchmark Results

- Total scenarios: N
- Passed: N
- Failed: N
- Errors: N
- Warnings: N

### Failed scenarios
- scenario-id: reason
```

## Important notes

- The `benchmark-runner` agent is READ-ONLY. It runs benchmarks but does not fix anything.
- Each `deno task bench -f <id>` runs a single scenario. The `-f` flag filters by substring match, so use exact scenario IDs to avoid matching multiple scenarios.
- Each subagent MUST use `--lock batch-N.lock` (where N is the batch number 1-5) to avoid lock conflicts between parallel agents.
