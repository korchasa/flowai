# Benchmarks

Evidence-based agent evaluation infrastructure (run artifacts and config).

## Responsibility

- `runs/` — Generated output (trace HTML, sandbox snapshots). Gitignored.
- `config.json` — Multi-IDE benchmark configuration.
- `benchmarks.lock` — Prevents concurrent benchmark runs.

Scenario definitions live co-located with skills: `framework/skills/<skill>/benchmarks/<scenario>/mod.ts`.

## Key Decisions

- Scenarios are discovered dynamically via `walk()` over `framework/skills/` in `scripts/task-bench.ts`.
- Evaluation uses LLM-Judge (`scripts/benchmarks/lib/judge.ts`) with semantic checklist items.
- Each run is isolated in a temporary sandbox directory.
- Multi-run support for statistical pass-rate analysis.
- Claude Code CLI blocks Write tool to `.claude/` directory even in `bypassPermissions` mode. Scenarios that need file creation must target `.cursor/` or other non-protected paths.
