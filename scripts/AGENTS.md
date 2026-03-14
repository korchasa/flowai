# Scripts Module

## Responsibility

Build tooling, verification, and benchmark infrastructure for AssistFlow.

- `scripts/*.ts` — Deno task entry points (check, test, dev, bench)
- `scripts/benchmarks/lib/` — Benchmark framework: adapter layer for IDE CLIs, scenario runner, LLM judge, trace visualization, token usage estimation
- `scripts/check-*.ts` — Validation scripts for skills and sync integrity

## Standard Interface
- `check` - Comprehensive project verification: formatting, linting, tests, skill validation
- `test <path>` - Runs a single test
- `dev` - Runs the application in development mode with watch mode enabled

## Detected Commands
- `deno task check` (check deno.json)
- `deno task test` (check deno.json)
- `deno task dev` (check deno.json)
- `deno task bench` (check deno.json)
