---
name: af-skill-write-agent-benchmarks
description: Create, maintain, and run evidence-based benchmarks for AI agents. Use when setting up testing infrastructure, writing new test scenarios, or evaluating agent performance.
---

# Universal Agent Benchmarking Skill

## 1. Context & Philosophy

This skill defines a universal, language-agnostic standard for benchmarking Autonomous AI Agents. The goal is to objectively measure an agent's ability to solve real-world coding tasks.

### Core Principles

1. **Evidence-Based Verification**: We do not trust the agent's words. We verify its actions.
   - **Bad**: The agent says "I fixed the bug." -> Judge believes it.
   - **Good**: The agent says "I fixed the bug." -> Judge runs the test suite in the sandbox and verifies the exit code is 0.
2. **Strict Isolation (Docker)**: Test run MUST execute in a completely isolated Docker container. This ensures a clean, reproducible environment and prevents any side effects on the host system.
   - _Note_: A single container MAY be reused for multiple scenarios within the same run, provided that the environment is fully reset (e.g., cleaning the working directory and resetting system state) between scenarios.
3. **Determinism**: Benchmarks should be reproducible. Mock external network calls where possible and use fixed seeds.
4. **Freedom of Implementation**: This standard describes **WHAT** needs to be built, not **HOW**. You are free to implement these modules in any language (Python, TS, Go, etc.).

## 2. Evaluation Modes

The system supports three primary evaluation modes:

1. **Quality Evaluation (Checklist-based)**:
   - **Goal**: Verify if an agent meets minimum quality standards.
   - **Method**: Evaluates a single agent against a predefined checklist of criteria (Critical Errors vs Warnings).
   - **Use Case**: CI/CD pipelines, regression testing.

2. **Model Selection (Pairwise Comparison)**:
   - **Goal**: Determine which LLM/Model performs best.
   - **Method**: **LLM-as-a-Judge Side-by-Side (SBS)**. The Judge compares outputs from two models and selects a winner.

3. **Version Comparison (Regression Tracking)**:
   - **Goal**: Measure impact of changes to prompt or logic.
   - **Method**: Compare current version (HEAD) against a baseline (BASE).

## 3. Architecture & Requirements

A robust benchmarking system consists of four key modules.

### 3.1 The Sandbox (Environment)

The interface through which the agent interacts with the world.

- **Isolation**: MUST use Docker containers for execution.
- **Capabilities**: FileSystem operations, Shell execution (`git`, `npm`), and Snapshotting (capturing state before/after).
- **Fixture Loading**: Automatically populates the sandbox from a `fixture/` directory if it exists within the scenario folder.

### 3.2 The Runner (Orchestrator)

The central controller managing the test lifecycle (`Setup` -> `Run Agent` -> `Collect Evidence` -> `Teardown`).

- **Multi-turn Interaction**: Supports iterative loops (Agent -> Command -> Output -> Agent) with a configurable `max_steps` limit.
- **Tool Execution**: Intercepts and executes shell commands; supports mocking external tools (e.g., `gh`, `curl`).
- **Concurrency**: Should run multiple scenarios in parallel.

### 3.3 The Judge (Evaluator)

The logic that determines if a test passed or failed.

- **Deterministic Checks (Hard)**: "File X must exist", "Exit code 0".
- **Probabilistic Checks (Soft)**: LLM-based evaluation (e.g., "Is the commit message descriptive?").
- **Metrics**: Tracks Pass/Fail status, Financial Cost, Steps Taken, and Duration.
- **Pass@k**: Supports running a scenario `k` times to determine success rate.

### 3.4 Observability (The Trace)

Complete capture of the agent's lifecycle in a **single human-readable file** (e.g., `trace.md`).

- **Must Capture**: Full conversation history, exact Judge prompts/responses, command outputs (stdout/stderr), file system diffs, and final score/reasoning.
- **Normalization**: Output should be normalized (line endings, encoding) for consistent evaluation.
- **Structured Readability**:
  - **Visual Separation**: Use clear delimiters between logical sections (Messages, Commands, Evaluations).
  - **Embedded Metadata**: Each section must include machine-readable metadata (type, source, role, step, etc.) using hidden or non-obtrusive formats.
  - **Source Attribution**: Clearly identify the origin of every interaction (e.g., `agent`, `judge`, `user_emulation`, `system`).
  - **Tool Context**: Include definitions of tools or mocks available to the agent during the run.

## 4. Workflow: Creating a New Benchmark

Follow this process to add a new benchmark scenario.

### Step 1: Define the Goal

What specific capability are you testing?

- _Example_: "Can the agent fix a syntax error in a Python file?"

### Step 2: Design the Setup (Pre-condition)

Create the initial state that presents the problem.

- **Static Setup**: Place files in a `fixture/` directory within your scenario folder. These files should be automatically copied to the sandbox by the Runner before the agent starts.
- **Dynamic Setup**: Use the scenario's setup logic (e.g., a setup function or script) for actions like `git init`, setting up environment variables, or creating files that depend on the dynamic sandbox path.
  - _Example_: Initialize a git repository or create a `.env` file with temporary paths.

### Step 3: Define the Task (Trigger)

Write the prompt that instructs the agent.

- _Prompt_: "Run the script and fix any errors you find."

### Step 4: Define Success Criteria (Post-condition)

How do we know it worked?

1. **Hard Check**: Running `python script.py` returns exit code 0.
2. **Hard Check**: File `script.py` content matches `print("hello")`.
3. **Soft Check**: Agent did not delete other files.

### Step 5: Register

Add the scenario to your Runner's registry.

## 5. Workflow: Running & Debugging

### Execution Loop

1. **Init**: Runner ensures a clean Sandbox (e.g., starts a new Docker container or resets an existing one).
2. **Seed**: Runner executes Scenario Setup (copies fixtures and runs setup logic).
3. **Act**: Agent runs in the sandbox container.
   - Agent reads file -> runs file (fails) -> edits file -> runs file (passes).
4. **Stop**: Agent signals completion or timeout.
5. **Evidence**: Runner collects `git diff` and execution logs.
6. **Judge**: Runner passes Evidence to the Judge.
7. **Report**: Result is saved. Sandbox is deleted.

### Debugging Failures

If a benchmark fails, check the **Trace**:

1. **Did the Setup work?** Check initial file state.
2. **Did the Agent try?** Check logs for tool calls.
3. **Did the Tool fail?** Check stderr of the commands.
4. **Did the Judge hallucinate?** Check the Judge's reasoning against the actual file diff.

## 6. Configuration Principles

The benchmarking system uses a centralized configuration to manage LLM parameters and execution defaults.

### Key Principles

1. **Preset-Based Management**: LLM configurations (model, temperature, provider settings) are managed as named presets. This allows switching between different models or providers without changing the scenario definitions.
2. **Role Separation**: The system distinguishes between the **Agent** (the model being tested) and the **Judge** (the model evaluating the results). Different presets can be assigned to each role to optimize for cost or intelligence.
3. **Reproducibility**: Configuration should enforce deterministic behavior (e.g., `temperature: 0`) to ensure benchmark results are consistent across runs.
4. **Provider Flexibility**: Support for provider-specific routing (e.g., OpenRouter provider order) allows for fallback mechanisms and cost optimization during large-scale runs.

## 7. Data Model Reference

### Scenario Definition

```pseudocode
Structure BenchmarkScenario:
    id: String              // Unique identifier (e.g., "af-commit-basic")
    name: String            // Human-readable name
    targetAgentPath: Path   // Path to the agent/skill definition
    setup: Function(sandboxPath: Path) -> Promise // Fixture setup logic
    userQuery: String       // The initial task for the agent
    checklist: List<ChecklistItem> // Evaluation criteria
    maxSteps: Integer       // Optional limit on interaction turns (default: 10)
    mocks: Map<String, String> // Optional tool mocks (command -> response)
```

### Checklist Item

```pseudocode
Structure ChecklistItem:
    id: String              // Unique identifier within the scenario
    description: String     // What the judge should verify
    critical: Boolean       // True: Failure fails the test. False: Results in a warning.
    type: Enum              // Optional: "static" (regex/grep) or "semantic" (LLM judge)
```

## 8. Assets & References

- **[examples/scenario-example.md](examples/scenario-example.md)**: Template for defining scenarios.
- **[benchmarks.config.json](benchmarks.config.json)**: Main configuration file for models and presets.
