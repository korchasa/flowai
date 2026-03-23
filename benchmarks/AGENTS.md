# Benchmarks

Evidence-based agent evaluation infrastructure.

## Responsibility

- `<skill>/scenarios/<scenario>/mod.ts` — Scenario definitions (class implementing `BenchmarkScenario`).
- `<skill>/scenarios/<scenario>/fixture/` — Test fixtures copied to sandbox before execution.
- `runs/` — Generated output (trace HTML, sandbox snapshots). Gitignored.

## Key Decisions

- Scenarios are discovered dynamically via `walk()` in `scripts/task-bench.ts`.
- Evaluation uses LLM-Judge (`scripts/benchmarks/lib/judge.ts`) with semantic checklist items.
- Each run is isolated in a temporary sandbox directory.
- Multi-run support for statistical pass-rate analysis.
- Claude Code CLI blocks Write tool to `.claude/` directory even in `bypassPermissions` mode. Scenarios that need file creation must target `.cursor/` or other non-protected paths.
