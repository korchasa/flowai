---
name: af-skill-write-agent-benchmarks
description: Create, maintain, and run evidence-based benchmarks for AI agents. Use when setting up testing infrastructure, writing new test scenarios, or evaluating agent performance.
---

# Agent Benchmarking Skill

## Context

This skill guides you in building and maintaining a robust, evidence-based benchmarking system for Autonomous AI Agents. The system verifies agent capabilities by checking **side effects** (file changes, git commits) in isolated sandboxes, rather than trusting text output.

## Core Components

- **Runner**: Orchestrates tests, manages sandboxes (`work/<id>/sandbox`).
- **Judge**: LLM-based evaluator that checks evidence against criteria.
- **Scenarios**: TypeScript/script files defining the task, setup, and success criteria.
- **Trace**: Detailed logs of execution (`trace.md`).

## Workflows

### 1. Initialize Infrastructure

Use this workflow if the project lacks a benchmarking system.

1. **Analyze Project**: Detect language (TS/Deno/Node/Python).
2. **Scaffold Directory Structure**:
   - `scripts/benchmarks/` (Root for benchmarks)
   - `scripts/benchmarks/scenarios/` (Test definitions)
   - `scripts/benchmarks/lib/` (Core logic: Runner, Judge, Trace)
   - `work/` (Runtime sandboxes - ADD TO .gitignore)
3. **Implement Core Modules**:
   - **Runner**: Implements the REPL loop (Agent -> Command -> Output).
   - **Judge**: Implements LLM evaluation using `.cursor/skills/af-skill-write-agent-benchmarks/assets/judge-prompt.txt`.
   - **Trace**: Implements logging to `trace.md`.
4. **Configure Task**: Add a command (e.g., `deno task bench`) to run the benchmarks.

**Reference**: See [REQUIREMENTS.md](REQUIREMENTS.md) for detailed specifications.

### 2. Write a New Scenario

Use this workflow to add a new test case.

1. **Define Goal**: What capability are we testing? (e.g., "Git Commit", "Refactoring").
2. **Create File**: Create a new file in `scenarios/` (e.g., `af-commit.bench.ts`).
3. **Setup Fixture**: Define the initial state. Use `sandbox.write()` or `sandbox.exec()` to prepare the environment.
4. **Define Criteria**:
   - **Critical**: Binary checks (e.g., "file exists", "exit code 0"). Failure here fails the test.
   - **Semantic**: LLM Judge checks (e.g., "commit message is descriptive").
5. **Register**: Ensure the runner imports/discovers the new scenario.

**Scenario Template (TypeScript)**:

```typescript
import { BenchmarkScenario } from "../lib/types.ts";

export const scenario: BenchmarkScenario = {
  id: "af-commit-fix",
  name: "Git Commit Fix",
  description: "Agent must fix a bug and commit the change.",
  targetAgent: "af-commit", // ID of the agent to test

  setup: async (sandbox) => {
    // 1. Create initial files
    await sandbox.write("main.ts", "console.log('bug')");
    // 2. Initialize git repo
    await sandbox.exec("git init && git add . && git commit -m 'init'");
  },

  userQuery:
    "Fix the bug in main.ts (change to 'fixed') and commit the change.",

  checklist: [
    {
      id: "file_modified",
      description: "main.ts content changed to 'fixed'",
      critical: true,
      type: "static", // Checked by code/grep
    },
    {
      id: "commit_created",
      description: "A new commit was created with a descriptive message",
      critical: true,
      type: "semantic", // Checked by LLM Judge
    },
  ],
};
```

### 3. Run and Debug

Use this workflow to evaluate agents and debug failures.

1. **Run Benchmarks**: Execute the task (e.g., `deno task bench`).
2. **Analyze Trace**: Open `work/<scenario-id>/trace.md`.
   - Check **Conversation**: Did the agent understand the task?
   - Check **Execution**: Did the commands succeed?
   - Check **Evidence**: What did the file system look like at the end?
   - Check **Judge Reasoning**: Why did it pass/fail?
3. **Debug**:
   - If the agent failed to execute commands, check the Runner logic.
   - If the Judge failed a correct result, refine the `checklist` description or the Judge prompt.

## Best Practices

- **Isolation**: NEVER run tests in the root directory. Always use a sandbox.
- **Determinism**: Mock external tools (network, time) if possible.
- **Evidence**: Collect git diffs, file trees, and exit codes to show the Judge.
- **Cleanliness**: Ensure `work/` directory is cleaned before runs.

## Assets

- **[REQUIREMENTS.md](REQUIREMENTS.md)**: Full System Requirements Specification (SRS).
- **`.cursor/skills/af-skill-write-agent-benchmarks/assets/judge-prompt.txt`**: System prompt for the LLM Judge.
- **`.cursor/skills/af-skill-write-agent-benchmarks/assets/types.ts`**: TypeScript interfaces for the system.
