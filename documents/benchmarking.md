# Benchmarking Subsystem Design

## 1. Overview

The benchmarking system (`scripts/task-bench.ts`) evaluates agent performance by running scenarios in isolated sandbox environments. It validates not just the text output, but the actual side effects (files created, git commits, etc.).

## 2. Directory Structure

Scenarios are co-located with skills; runs and infra stored centrally in `benchmarks/`.

```text
framework/skills/<skill>/
├── SKILL.md                    # Skill definition
└── benchmarks/
    └── <scenario>/
        ├── mod.ts              # Scenario definition
        └── fixture/            # Test fixtures (optional)

benchmarks/
├── runs/                       # All run artifacts (git-ignored)
│   └── <timestamp>/
│       ├── <scenario-id>/
│       │   └── sandbox/        # Isolated execution environment
│       └── report.html         # Execution log and report
├── benchmarks.lock
└── config.json                 # Multi-IDE benchmark configuration
```

## 2.1 Multi-IDE Architecture

Benchmarks support multiple IDEs (Cursor, Claude Code) via an adapter pattern.

- **Config** (`benchmarks/config.json`): IDE-keyed structure with per-IDE agent models and judge settings
  - `default_ides`: array of IDE ids to run by default
  - `ides.<ide>.agent_models`: available models for the IDE
  - `ides.<ide>.default_agent_model`: default model
  - `ides.<ide>.judge`: LLM judge config (model, temperature)
- **Adapters** (`scripts/benchmarks/lib/adapters/`):
  - `types.ts`: `AgentAdapter` interface (CLI args, output parsing, mock setup, env, usage)
  - `cursor.ts`: `CursorAdapter` — wraps `cursor-agent` CLI
  - `claude.ts`: `ClaudeAdapter` — wraps `claude` CLI with streaming JSON
  - `mod.ts`: factory `createAdapter(ide)` and `SUPPORTED_IDES` constant

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
| `flow-answer-basic` | PASSED | 0 | 0 | 17.6 | |
| `flow-commit-basic` | PASSED | 0 | 1 | 19.0 | |
| `flow-commit-atomic-refactor` | PASSED | 0 | 0 | 21.1 | |
| `flow-commit-atomic-docs` | PASSED | 0 | 0 | 18.9 | |
| `flow-commit-check` | PASSED | 0 | 0 | 30.0+ | |
| `flow-commit-check-fail` | PASSED | 0 | 0 | 19.9 | Correctly refused to commit on check failure |
| `flow-commit-deps` | PASSED | 0 | 0 | 22.1 |  |
| `flow-commit-sync-docs` | PASSED | 0 | 0 | 21.5 | |
| `flow-commit-atomic-hunk` | PASSED | 0 | 0 | 27.0 | |
| `flow-init-brownfield` | FAILED | 5 | 0 | 31.0 | Claims to create files (AGENTS.md, docs) but doesn't |
| `flow-investigate-basic` | PASSED | 0 | 0 | 14.7 | |
| `flow-plan-basic` | PASSED | 0 | 0 | 39.0 | Fixed runner.ts to include whiteboard.md in evidence |
| `flow-plan-context` | PASSED | 0 | 0 | 25.5 | |
| `flow-plan-db` | PASSED | 0 | 0 | 22.7 | Generalized environment side-effects rule |
| `flow-plan-interactive` | PASSED | 0 | 0 | 35.9 | Full multi-turn flow with SimulatedUser and resume |
| `flow-plan-migration` | PASSED | 0 | 0 | 19.0 | Correctly proposed fetch and async/await |
| `flow-plan-refactor` | FAILED | 1 | 0 | 17.9 | Missing test preservation step |
| `flow-plan-variants-complex` | FAILED | 3 | 0 | 30.5 | No whiteboard, no variants, no tradeoffs |
| `flow-plan-variants-obvious` | FAILED | 1 | 0 | 17.1 | Whiteboard not created |
| `flow-maintenance-basic` | FAILED | 2 | 0 | 118.7 | Claims whiteboard update but doesn't; missed TODO |
