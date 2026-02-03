# Benchmarking Subsystem Design

## 1. Overview

The benchmarking system (`scripts/task-bench.ts`) evaluates agent performance by running scenarios in isolated sandbox environments. It validates not just the text output, but the actual side effects (files created, git commits, etc.).

## 2. Directory Structure

Work artifacts are stored in `benchmarks/`, which is git-ignored. Scenarios and
runs are organized by skill.

```text
benchmarks/
├── <skill>/
│   ├── scenarios/
│   │   └── <scenario>/
│   │       └── mod.ts          # Scenario definition
│   └── runs/
│       └── <scenario-id>/      # e.g., af-commit-basic
│           ├── sandbox/        # Isolated execution environment
│           │   ├── .git/
│           │   ├── README.md
│           │   └── ... (project files)
│           └── trace.html      # Execution log and report
├── benchmarks.lock
└── config.json
```

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
| `af-answer-basic` | PASSED | 0 | 0 | 17.6 | |
| `af-commit-basic` | PASSED | 0 | 1 | 19.0 | |
| `af-commit-atomic-refactor` | PASSED | 0 | 0 | 21.1 | |
| `af-commit-atomic-docs` | PASSED | 0 | 0 | 18.9 | |
| `af-commit-check` | PASSED | 0 | 0 | 30.0+ | |
| `af-commit-check-fail` | PASSED | 0 | 0 | 19.9 | Correctly refused to commit on check failure |
| `af-commit-deps` | PASSED | 0 | 0 | 22.1 |  |
| `af-commit-sync-docs` | PASSED | 0 | 0 | 21.5 | |
| `af-commit-atomic-hunk` | PASSED | 0 | 0 | 27.0 | |
| `af-init-brownfield` | FAILED | 5 | 0 | 31.0 | Claims to create files (AGENTS.md, docs) but doesn't |
| `af-investigate-basic` | PASSED | 0 | 0 | 14.7 | |
| `af-plan-basic` | PASSED | 0 | 0 | 39.0 | Fixed runner.ts to include whiteboard.md in evidence |
| `af-plan-context` | PASSED | 0 | 0 | 25.5 | |
| `af-plan-db` | PASSED | 0 | 0 | 22.7 | Generalized environment side-effects rule |
| `af-plan-interactive` | PASSED | 0 | 0 | 35.9 | Full multi-turn flow with SimulatedUser and resume |
| `af-plan-migration` | PASSED | 0 | 0 | 19.0 | Correctly proposed fetch and async/await |
| `af-plan-refactor` | FAILED | 1 | 0 | 17.9 | Missing test preservation step |
| `af-plan-variants-complex` | FAILED | 3 | 0 | 30.5 | No whiteboard, no variants, no tradeoffs |
| `af-plan-variants-obvious` | FAILED | 1 | 0 | 17.1 | Whiteboard not created |
| `af-maintenance-basic` | FAILED | 2 | 0 | 118.7 | Claims whiteboard update but doesn't; missed TODO |
