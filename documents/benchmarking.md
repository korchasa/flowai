# Benchmarking Subsystem Design

## 1. Overview

The benchmarking system (`scripts/task-bench.ts`) evaluates agent performance by running scenarios in isolated sandbox environments. It validates not just the text output, but the actual side effects (files created, git commits, etc.).

## 2. Directory Structure

Work artifacts are stored in `scripts/benchmarks/work/`, which is git-ignored.

```text
scripts/benchmarks/work/
└── <scenario-id>/              # e.g., af-commit-basic
    ├── sandbox/                # Isolated execution environment
    │   ├── .git/
    │   ├── README.md
    │   └── ... (project files)
    └── trace.md                # Execution log and report
```

## 3. Trace Log (`trace.md`)

Each scenario run generates a `trace.md` file containing a comprehensive record of the session. This allows for post-mortem analysis of the agent's reasoning and actions.

### Format Specification

```markdown
# Benchmark Trace: <Scenario Name>

**ID:** `<scenario-id>`
**Date:** `YYYY-MM-DD HH:mm:ss`
**Model:** `<model-name>`

## 1. Context

**Agent Rules:** `<path-to-agent-rules>`
**User Query:**

> <user-query>

## 2. LLM Interaction

### Input Messages

**System:** ...
**User:** ...

### Model Output

<raw-llm-response>

## 3. Execution Trace

**Command:** `<command>`

- **Exit Code:** `<code >`
- **Stdout:** ...
- **Stderr:** ...

## 4. Evidence State

### Git Status

...

### Git Log

...

### 5. Evaluation
    
| ID | Description | Pass | Reason |
|----|-------------|------|--------|
| <id> | <desc> | [x] | <reason> |

## Summary

- **Result:** PASSED / FAILED
- **Score:** <N>%
- **Duration:** <N>ms
- **Tokens:** <N>
```

## 4. Execution Flow

1. **Setup**: Clean `scripts/benchmarks/work/<scenario-id>`, create `sandbox/`.
2. **Init**: Initialize `trace.md` with header and context.
3. **Simulation**: Run LLM, log inputs and outputs to `trace.md`.
4. **Execution**: Parse and run commands in `sandbox/`, log results to `trace.md`.
5. **Evidence**: Collect git status/log, append to `trace.md`.
6. **Evaluation**: Run checklist, log results to `trace.md`.
7. **Reporting**: Output summary to console.
