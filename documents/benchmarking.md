# Benchmarking Subsystem Design

## 1. Overview

The benchmarking system (`scripts/task-bench.ts`) evaluates agent performance by running scenarios in isolated sandbox environments. It validates not just the text output, but the actual side effects (files created, git commits, etc.).

## 2. Directory Structure

Work artifacts are stored in `benchmarks/`, which is git-ignored. Scenarios are organized hierarchically.

```text
scripts/benchmarks/
├── scenarios/
│   └── <skill>/
│       └── <scenario>/
│           └── mod.ts          # Scenario definition
└── work/
    └── <scenario-id>/          # e.g., af-commit-basic
        ├── sandbox/            # Isolated execution environment
        │   ├── .git/
        │   ├── README.md
        │   └── ... (project files)
        └── trace.md            # Execution log and report
```

## 3. Trace Log (`trace.html`)

Each scenario run generates a `trace.html` file containing a comprehensive record of the session. This allows for post-mortem analysis of the agent's reasoning and actions.

### Format Specification

The trace is a structured HTML document designed for readability and detailed inspection.

*   **Visual Separation**: Clear delimiters between logical sections (Messages, Commands, Evaluations).
*   **Embedded Metadata**: Each section includes machine-readable metadata (type, source, role, step, etc.).
*   **Source Attribution**: Clearly identifies the origin of every interaction (`agent`, `judge`, `user_emulation`, `system`).
*   **Tool Context**: Includes definitions of tools or mocks available to the agent during the run.
*   **Interactive Elements**: Collapsible sections for long content (LLM responses, command outputs).
*   **Content Decoding**: Automatically decodes URL-encoded content in events for better readability.

## 4. Execution Flow

1. **Setup**: Clean `benchmarks/<scenario-id>`, create `sandbox/`.
2. **Init**: Initialize `trace.html` with header and context.
3. **Simulation**: Run LLM, log inputs and outputs to `trace.html`.
4. **Execution**: Parse and run commands in `sandbox/`, log results to `trace.html`.
5. **Evidence**: Collect git status/log, append to `trace.html`.
6. **Evaluation**: Run checklist, log results to `trace.html`.
7. **Reporting**: Output summary to console.
