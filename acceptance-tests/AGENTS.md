# Acceptance Tests

Evidence-based agent evaluation infrastructure (run artifacts and config).

## Responsibility

- `runs/` — Generated output (trace HTML, sandbox snapshots). Gitignored.
- `cache/` — Per-scenario verdicts (`cache/<pack>/<scenario-id>/<ide>.json`). Local and gitignored since 2026-08-04 — the key hashes the whole runner, so a clone inherits nothing. Cache hit → skip agent + judge. Managed by `scripts/acceptance-tests/lib/cache.ts`; CLI flags: `--no-cache`, `--refresh-cache`, `--cache-check`, `--cache-with-runs`.
- `config.json` — Multi-IDE acceptance test configuration.
- `acceptance-tests.lock` — Prevents concurrent acceptance test runs.

Scenario definitions live co-located with primitives:
`framework/<pack>/skills/<skill>/acceptance-tests/<scenario>/mod.ts`,
`framework/<pack>/commands/<command>/acceptance-tests/<scenario>/mod.ts`,
`framework/<pack>/agents/<agent>/acceptance-tests/<scenario>/mod.ts`,
`framework/<pack>/acceptance-tests/<scenario>/mod.ts` (pack-level).

## Key Decisions

- Scenarios are discovered dynamically via `walk()` over `framework/<pack>/{skills,commands,agents,acceptance-tests}/` in `scripts/task-acceptance-tests.ts`.
- Evaluation uses LLM-Judge (`scripts/acceptance-tests/lib/judge.ts`) with semantic checklist items.
- Each run is isolated in a temporary sandbox directory.
- Multi-run support for statistical pass-rate analysis.
- Claude Code CLI blocks Write tool to `.claude/` directory even in `bypassPermissions` mode. Scenarios that need file creation must target `.cursor/` or other non-protected paths.
- **Cold start**: the first sweep on a fresh clone is a full sweep (real $), and there is no way to hand a warm cache to anyone else — it is gitignored because a committed one measured 0 hits and 313 misses (FR-ACCEPT-CACHE). Failed scenarios never write cache — the RED phase of Acceptance Test TDD always re-executes.
- **Cache key covers**: scenario `mod.ts` + fixture, primitive directory (excluding `acceptance-tests/`), `pack.yaml`, `AGENTS.template.md`, `scripts/acceptance-tests/lib/**` (tests excluded), `scripts/task-acceptance-tests.ts`, `scripts/utils.ts`, `scripts/benchmark/sandbox_root.ts`, plus the settings this run uses — ide, agent model, agent effort, judge model, judge effort, judge temperature, runs — and best-effort IDE CLI `--version`. `config.json` is NOT hashed as a file: each arm's slots move only when that arm's own settings move.
