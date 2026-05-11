# Benchmark Subsystem Design

This document describes the **benchmark** (regression test) infrastructure in `flow`. The sibling evaluation class — **experiments** (parameterized empirical studies of the agent platform) — was extracted to [`flowai-experiments`](https://github.com/korchasa/flowai-experiments) on 2026-04-11. The concept contrast is preserved below so contributors understand why only acceptance tests live here.

## 0. Benchmarks vs Experiments

- **Benchmark** (this repo) — regression test for a single framework primitive (skill, command, agent). Binary pass/fail per scenario. Run via `deno task bench`. Scenarios co-located with primitive under `framework/<pack>/.../<primitive>/acceptance-tests/`. Run artifacts in `acceptance-tests/runs/` (gitignored). Goal: detect regressions in primitive behavior.
- **Experiment** ([`flowai-experiments`](https://github.com/korchasa/flowai-experiments)) — parameterized sweep producing a curve or headline number. Not tied to any primitive. Goal: empirically measure a system characteristic (e.g., max memory file length at which adherence stays ≥80%). See the sibling repo for infrastructure, CLI, methodology, and committed results.

Key differences:

- **Output unit** — benchmark: pass/fail per checklist item; experiment: continuous metric over axes.
- **Repetition** — benchmark: typically 1 run per scenario; experiment: N reps per cell for statistical confidence.
- **Result lifecycle** — benchmark: ephemeral runs, result stored in git only indirectly via tests; experiment: raw results committed as evidence.
- **Scope** — benchmark: tests one primitive's behavior; experiment: tests the agent platform, IDE, model, or combinations thereof.

## 1. Overview

The benchmarking system (`scripts/task-bench.ts`) evaluates agent performance by running scenarios in isolated sandbox environments. It validates not just the text output, but the actual side effects (files created, git commits, etc.).

## 2. Directory Structure

Scenarios are co-located with each primitive (commands, skills, agents); runs and infra stored centrally in `acceptance-tests/`.

```text
framework/<pack>/commands/<command>/
├── SKILL.md                    # User-only primitive
└── acceptance-tests/
    └── <scenario>/
        ├── mod.ts              # Scenario definition
        └── fixture/            # Test fixtures (optional)

framework/<pack>/skills/<skill>/
├── SKILL.md                    # Agent-invocable primitive
└── acceptance-tests/
    └── <scenario>/
        ├── mod.ts
        └── fixture/

acceptance-tests/
├── runs/                       # All run artifacts (git-ignored)
│   └── <timestamp>/
│       ├── <scenario-id>/
│       │   └── sandbox/        # Isolated execution environment
│       └── report.html         # Execution log and report
├── acceptance-tests.lock
└── config.json                 # Multi-IDE benchmark configuration
```

## 2.1 Multi-IDE Architecture

Benchmarks support multiple IDEs (Cursor, Claude Code) via an adapter pattern.

- **Config** (`acceptance-tests/config.json`): IDE-keyed structure with per-IDE agent models and judge settings
  - `default_ides`: array of IDE ids to run by default
  - `ides.<ide>.agent_models`: available models for the IDE
  - `ides.<ide>.default_agent_model`: default model
  - `ides.<ide>.judge`: LLM judge config (model, temperature)
- **Adapters** (`scripts/acceptance-tests/lib/adapters/`):
  - `types.ts`: `AgentAdapter` interface (CLI args, output parsing, mock setup, env, usage)
  - `cursor.ts`: `CursorAdapter` — wraps `cursor-agent` CLI
  - `claude.ts`: `ClaudeAdapter` — wraps `claude` CLI with streaming JSON
  - `mod.ts`: factory `createAdapter(ide)` and `SUPPORTED_IDES` constant

## 2.2 Sandbox Context Priors

The benchmark runner injects `framework/core/assets/AGENTS.template.md` as the sandbox `AGENTS.md` (symlinked to `CLAUDE.md` for Claude Code). This template carries project-level rules that propagate into every scenario and can override local SKILL.md guidance when a skill's output resembles a "task artifact":

- **Documentation Hierarchy** → `Tasks (documents/tasks/<YYYY-MM-DD>-<slug>.md): Temporary plans and notes. One file per task or session.`
- **Planning Rules → Plan Persistence** → `save the detailed plan to documents/tasks/<...>.md — chat-only plans are lost between sessions.`

**Effect on scenarios**: A skill whose final output looks task-like (structured report, timestamped header, categorized findings) can be pushed by these priors toward persisting to `documents/tasks/` even when the local SKILL.md says "inline only". Observed in practice: `flowai-skill-maintenance-tooling-relevance` intermittently saved an audit file after an early refactor that added a `Do NOT save to file` rule but left the file-shaped example in Phase 9.

**Two rules for scenario and skill authors**:

- **Do not fight priors with prohibitions.** Adding `Do NOT save …` to a SKILL.md competes with `Plan Persistence` — an unreliable battle that fails intermittently. Instead, remove the priming source inside the skill itself: drop file-shaped examples (`#` headings, timestamped titles, checkbox lists), rename misleading section titles (`Reporting` → `Deliver findings`), and strip the `Output Target` rule entirely.
- **Watch for intermittent leaks.** If a scenario passes once but judges mention "written file" or similar side effects, re-run it: the prior-driven behavior may be probabilistic, not deterministic.

## 3. Trace Log (`trace.html`)

Each scenario run generates a `trace.html` file containing a comprehensive record of the session. This allows for post-mortem analysis of the agent's reasoning and actions.

### Format Specification

The trace is a structured HTML document designed for readability and detailed inspection.

- **Visual Separation**: Clear delimiters between logical sections (Messages, Commands, Evaluations).
- **Embedded Metadata**: Each section includes machine-readable metadata (type, source, role, step, etc.).
- **Source Attribution**: Clearly identifies the origin of every interaction (`agent`, `judge`, `user_emulation`, `system`).
- **Tool Context**: Includes definitions of tools or mocks available to the agent during the run.
- **Interactive Elements**: Collapsible sections for long content (LLM responses, command outputs).
- **Content Decoding**: Automatically decodes URL-encoded content in events for better readability.

## 5. Current State (2026-01-31)

| Scenario ID | Result | Errors | Warnings | Time (s) | Notes |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `flowai-commit-basic` | PASSED | 0 | 1 | 19.0 | |
| `flowai-commit-atomic-refactor` | PASSED | 0 | 0 | 21.1 | |
| `flowai-commit-atomic-docs` | PASSED | 0 | 0 | 18.9 | |
| `flowai-commit-check` | PASSED | 0 | 0 | 30.0+ | |
| `flowai-commit-check-fail` | PASSED | 0 | 0 | 19.9 | Correctly refused to commit on check failure |
| `flowai-commit-deps` | PASSED | 0 | 0 | 22.1 |  |
| `flowai-commit-sync-docs` | PASSED | 0 | 0 | 21.5 | |
| `flowai-commit-atomic-hunk` | PASSED | 0 | 0 | 27.0 | |
| `flowai-init-brownfield` | FAILED | 5 | 0 | 31.0 | Claims to create files (AGENTS.md, docs) but doesn't |
| `flowai-skill-investigate-basic` | PASSED | 0 | 0 | 14.7 | |
| `flowai-skill-plan-basic` | PASSED | 0 | 0 | 39.0 | Fixed runner.ts to include task file in evidence |
| `flowai-skill-plan-context` | PASSED | 0 | 0 | 25.5 | |
| `flowai-skill-plan-db` | PASSED | 0 | 0 | 22.7 | Generalized environment side-effects rule |
| `flowai-skill-plan-interactive` | PASSED | 0 | 0 | 35.9 | Full multi-turn flow with SimulatedUser and resume |
| `flowai-skill-plan-migration` | PASSED | 0 | 0 | 19.0 | Correctly proposed fetch and async/await |
| `flowai-skill-plan-refactor` | FAILED | 1 | 0 | 17.9 | Missing test preservation step |
| `flowai-skill-plan-variants-complex` | FAILED | 3 | 0 | 30.5 | No task file, no variants, no tradeoffs |
| `flowai-skill-plan-variants-obvious` | FAILED | 1 | 0 | 17.1 | Task file not created |
| `flowai-skill-maintenance-basic` | FAILED | 2 | 0 | 118.7 | Claims task file update but doesn't; missed TODO |

## 6. Experiments Subsystem (RELOCATED)

Experiments were extracted to [`flowai-experiments`](https://github.com/korchasa/flowai-experiments) on 2026-04-11. That repo owns the infrastructure (runner, judge, noise, report, tokens), the `deno task experiment` CLI, the `writeMemoryFile`/`getCleanroomEnv` adapter extensions, and all committed results. See the sibling repo's README for methodology, directory layout, and how to run.
