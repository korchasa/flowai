# Benchmarks

Evidence-based agent evaluation infrastructure (run artifacts and config).

## Responsibility

- `runs/` — Generated output (trace HTML, sandbox snapshots). Gitignored.
- `cache/` — Committed per-scenario verdicts (`cache/<pack>/<scenario-id>/<ide>.json`). Cache hit → skip agent + judge. Managed by `scripts/benchmarks/lib/cache.ts`; CLI flags: `--no-cache`, `--refresh-cache`, `--cache-check`, `--cache-with-runs`.
- `config.json` — Multi-IDE benchmark configuration.
- `benchmarks.lock` — Prevents concurrent benchmark runs.

Scenario definitions live co-located with skills: `framework/skills/<skill>/benchmarks/<scenario>/mod.ts`.

## Key Decisions

- Scenarios are discovered dynamically via `walk()` over `framework/skills/` in `scripts/task-bench.ts`.
- Evaluation uses LLM-Judge (`scripts/benchmarks/lib/judge.ts`) with semantic checklist items.
- Each run is isolated in a temporary sandbox directory.
- Multi-run support for statistical pass-rate analysis.
- Claude Code CLI blocks Write tool to `.claude/` directory even in `bypassPermissions` mode. Scenarios that need file creation must target `.cursor/` or other non-protected paths.
- **Cache warming (cold repo)**: The first `deno task bench` on a fresh clone is a full sweep (real $). The maintainer runs once with `--refresh-cache`, commits `benchmarks/cache/`; downstream contributors inherit the warm state. Failed scenarios never write cache — the RED phase of Benchmark TDD always re-executes.
- **Cache key covers**: scenario `mod.ts` + fixture, primitive directory (excluding `benchmarks/`), `pack.yaml`, `AGENTS.template.md`, `scripts/benchmarks/lib/**`, `scripts/task-bench.ts`, `cli/src/transform.ts`, `cli/src/sync.ts`, `scripts/utils.ts`, full `benchmarks/config.json`, plus CLI args (ide, agent model, runs) and best-effort IDE CLI `--version`.
