---
name: flowai-skill-write-agent-benchmarks
description: Create, maintain, and run evidence-based benchmarks for AI agents. Use when setting up testing infrastructure, writing new test scenarios, or evaluating agent performance.
---

# Universal Agent Benchmarking Skill

## 1. Context & Philosophy

This skill defines a universal, language-agnostic standard for benchmarking Autonomous AI Agents. The goal is to objectively measure an agent's ability to solve real-world tasks, whether they are coding, data analysis, or conversational.

### Core Principles

1. **Evidence-Based Verification**: We do not trust the agent's words. We verify its actions.
   - **Bad**: The agent says "I fixed the bug." -> Judge believes it.
   - **Good**: The agent says "I fixed the bug." -> Judge runs the test suite in the environment and verifies the exit code is 0.
2. **Strict Isolation**: Test run MUST execute in a completely isolated environment (Docker, VM, etc.). This ensures a clean, reproducible state and prevents side effects.
3. **Black Box Protocol**: The benchmark knows *nothing* about the agent's internals (prompts, tools, language). It only observes:
   - **Input**: User Query + Environment State.
   - **Output**: New Environment State + Response Text.
4. **Determinism**: Benchmarks should be reproducible. Mock external network calls where possible and use fixed seeds.
5. **Universal Applicability**: The standard applies to any agent type:
   - **CLI/IDE Agents**: Interact via shell/files.
   - **API Agents**: Interact via HTTP/JSON.
   - **Chat Agents**: Interact via conversation.

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

## 3. Interaction Strategies

Choosing the right interaction strategy is critical for stable benchmarks.

### 3.1 Atomic Request Verification (Step-by-Step)
- **Method**: Send a single input, wait for output, verify immediately.
- **Best for**: Stateless APIs, simple function calling agents, or deterministic workflows where the agent's path is fixed.
- **Limitation**: Fails with autonomous agents that might "think" for 3 steps before acting. If you expect a file write on Step 1, but the agent does it on Step 2, the test fails falsely.

### 3.2 User Emulation (End-to-End Session)
- **Method**: The Runner starts a session and acts as a **Simulated User**. It observes the agent's loop without interfering until the agent signals completion or asks for input.
- **Best for**: Autonomous agents, complex problem solvers, and chat-based assistants.
- **Reasoning**: In an autonomous loop, we cannot predict *when* the agent will perform the target action (e.g., writing a file). It might first explore, then plan, then act.
- **Protocol**: The Runner waits for the agent to say "I'm done" or "I need X", providing replies via the Simulated User persona, and only verifies the final state after the session ends.

## 4. Architecture & Requirements

A robust benchmarking system consists of five key modules.

### 4.1 The Environment (Sandbox)

The isolated state container where the task is performed. It is not limited to a file system.

- **File System Context**: A directory with files (for coding tasks).
- **Network Context**: Mock servers or intercepted HTTP traffic (for API tasks).
- **Data Context**: Ephemeral databases (e.g., Postgres, Redis containers) for data tasks.
- **Browser Context**: Headless browser instances (for web agents).
- **Lifecycle**: Must support `Setup` (initial state), `Reset` (between runs), and `Teardown`.

### 4.2 The Runner (Orchestrator)

The central controller managing the test lifecycle.

- **Interface Adapters**: Adapts the Agent's native output to the Environment.
  - *Shell Adapter*: Executes bash commands.
  - *SQL Adapter*: Executes SQL queries against the Data Context.
  - *HTTP Adapter*: Sends requests to the Network Context.
- **Concurrency**: Should run multiple scenarios in parallel.

### 4.3 The Simulated User (Persona)

For interactive agents that ask clarifying questions.

- **Role**: Replaces the human in the loop.
- **Persona**: Defined by a specific goal, knowledge level, and constraints (e.g., "Junior Dev who doesn't know Docker").
- **Behavior**: Provides consistent, deterministic answers to the agent's questions during the run.

### 4.4 The Judge (Evaluator)

The logic that determines if a test passed or failed based on **Evidence**.

- **Artifact Evidence**: Files created, DB rows inserted, resources deployed.
- **Interaction Evidence**: API logs, tool call arguments, HTTP request bodies.
- **Semantic Evidence**: The quality/accuracy of the text response (evaluated by LLM).

### 4.5 Observability (The Trace)

Complete capture of the agent's lifecycle in a **single human-readable file** (e.g., `trace.md` or `trace.json`).

- **Must Capture**: Full conversation history, exact Judge prompts/responses, command outputs, environment diffs.
- **Normalization**: Output should be normalized for consistent evaluation.

## 5. Workflow: Creating a New Benchmark

Follow this process to add a new benchmark scenario.

### Step 1: Define the Goal

What specific capability are you testing?

- _Example_: "Can the agent fix a syntax error?" or "Can the agent negotiate a price?"

### Step 2: Design the Environment (Pre-condition)

Create the initial state.

- **Static Setup**: Copy fixture files, seed database with initial rows.
- **Dynamic Setup**: Start mock servers, configure environment variables.

### Step 3: Define the Task (Trigger)

Write the prompt that instructs the agent.

- _Prompt_: "Run the script and fix errors" or "Book a flight to Paris".

### Step 4: Define Success Criteria (Post-condition)

How do we know it worked?

1. **Hard Check (Artifact)**: File `script.py` runs with exit code 0.
2. **Hard Check (State)**: Database table `users` has 1 new row.
3. **Soft Check (Semantic)**: Agent's explanation is polite and accurate.
4. **Interaction Check**: Agent called `GET /api/v1/flights` with correct parameters.

### Step 5: Register

Add the scenario to your Runner's registry.

## 6. Workflow: Running & Debugging

### Execution Loop

1. **Init**: Runner prepares the Environment (Docker, DB, Mocks).
2. **Seed**: Runner executes Scenario Setup.
3. **Act**: Agent runs in the environment.
   - *Interactive Loop*: Agent <-> Simulated User.
   - *Command Loop*: Agent <-> Environment (Shell/API).
4. **Stop**: Agent signals completion or timeout.
5. **Evidence**: Runner collects state diffs (git, DB dump) and logs.
6. **Judge**: Runner passes Evidence to the Judge.
7. **Report**: Result is saved. Environment is destroyed.

### Debugging Failures

If a benchmark fails, check the **Trace**:

1. **Did the Setup work?** Check initial environment state.
2. **Did the Agent try?** Check logs for actions/tool calls.
3. **Did the Simulated User confuse the Agent?** Check the conversation log.
4. **Did the Judge hallucinate?** Check the Judge's reasoning against the actual evidence.

### Before editing the skill under test — verify the infrastructure

When a scenario fails, especially a `verbatim_relay` / `mock-reached-agent`
check, do NOT jump straight to rewriting SKILL.md. The test infrastructure
itself is the most common culprit and the silent-failure mode is real
(see the flowai bench history: `PreToolUse` key camelCase typo silenced
all Claude-adapter mocks for months, and "passing" scenarios were passing
on pattern-matching, not hook interception).

Run this checklist first:

1. **Hook script installed?** `ls <sandbox>/.claude/hooks/` should show
   `mock-<tool>.sh`. Absence → adapter didn't call `setupMocks`, or
   sandbox was overwritten.
2. **Settings file correct?** `cat <sandbox>/.claude/settings.local.json`
   — the top-level event key MUST be PascalCase (`PreToolUse`,
   `PostToolUse`). Claude Code silently ignores camelCase; no warning.
3. **Matcher matches your command shape?** If the skill under test uses
   env-prefixed commands (e.g. `CLAUDECODE="" claude -p …`), a naive
   `Bash(<tool>:*)` matcher will NOT fire — first token is the env
   assignment. The flowai adapter uses a broad `Bash` matcher plus
   in-script filtering; replicate that pattern if you add a new adapter.
4. **Sentinel in mock text?** Mock strings MUST contain a unique token
   (e.g. `[benchmock-<6-hex>]`) that is **guaranteed absent** from the
   skill's own SKILL.md and examples. Then grep the judge output for
   the sentinel: present → hook fired and agent quoted it;
   absent → synthesis or pattern-match, NOT relay. This is the only
   robust signal that a mock actually reached the agent.
5. **No test-fitting.** Never write a skill rule that demands preserving
   a bench-only artifact (e.g. "keep the `MOCK:` prefix"). Mock-prefix
   scaffolding is not something real CLIs emit; teaching the agent to
   preserve it corrupts real-world behaviour. Design the mock so its
   **distinctive content** is what proves the relay — not the framing.

Only after steps 1–5 pass is it safe to conclude the skill itself is at
fault and edit SKILL.md. Skipping this checklist and iterating on the
skill text wastes bench cycles and frequently introduces regressions
(e.g. "mandatory capture-to-file" rules that don't help because hooks
block before the shell redirect executes).

## 6.1 Trigger Scenarios for Skills (FR-ACCEPT.TRIGGER)

Execution scenarios prove "when skill X runs, it works." They do NOT prove that the model picks skill X for a relevant query, or that it stands down for an unrelated one. **Trigger scenarios** close that gap: they verify description-matching correctness.

### Scope and shape

- **Applies to:** every skill under `framework/<pack>/skills/flowai-skill-*/`. Commands (`commands/`) carry `disable-model-invocation: true` and are out of scope.
- **Per skill:** exactly 3 scenarios — 1 positive, 1 adjacent-negative, 1 false-use-negative.
- **Layout:** sibling folders to existing scenarios:
  ```
  framework/<pack>/skills/<skill-id>/benchmarks/
    trigger-pos-1/mod.ts
    trigger-adj-1/mod.ts
    trigger-false-1/mod.ts
  ```
- **Scenario id:** `<skill-id>-trigger-<pos|adj|false>-1` (the trailing `-1` is preserved for backward compatibility with trace tooling; only `n=1` is permitted).
- **Coverage check:** `scripts/check-trigger-coverage.ts` (wired into `deno task check`) fails if any of the 3 are missing, or if stray `trigger-{type}-{2,3,...}` directories exist.

### Picking queries

With N=1, each query carries the full description-match weight for its class — pick the phrasing most likely to expose a description regression.

- **Positive (`trigger-pos-1`):** a natural, short user query that matches the skill's description. **No `/skill-name` prefix** (that bypasses description-matching), no over-specified jargon, no hints at internal mechanics. Pick the phrasing a typical user would write — the least-jargonized form — so the test stresses description match, not exact wording.
- **Adjacent-negative (`trigger-adj-1`):** a query for which a *different, neighboring* skill is the correct match. Pick the most-likely confusion candidate from the same pack or with overlapping vocabulary. Typical confusion patterns: a "fix this test" skill vs. a "review my diff" skill (overlap on "I broke something"); a single-task planner vs. a multi-phase epic planner (overlap on "plan"); a current-session reflection vs. a historical-sessions reflection (overlap on "reflect").
- **False-use-negative (`trigger-false-1`):** a query inside the skill's general domain but with the wrong intent. Recommended patterns: surface vocabulary that matches but the actual ask is something else (e.g., a planning skill receiving "plan" in a non-software-task sense; a fix-tests skill receiving a "speed up the test runner" perf request); reverse-intent traps (e.g., write *new* tests vs fix *failing* ones). **Do NOT use meta-questions about the skill itself** ("what does X cover?", "how does X work?", "when should I use X?") as false-use — under Claude Code these are legitimately answered by *reading* the skill's `SKILL.md`, so the agent will rightly load it and the judge will record activation. Treat meta-questions as positives or omit them.

### Checklist contract

Every trigger scenario carries exactly **one critical** checklist item.

- Positive (`trigger-pos-*`):
  ```ts
  checklist = [{
    id: "skill_invoked",
    description: "Did the agent load and act on `<skill-id>` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `<skill-id>`.",
    critical: true,
  }];
  ```
- Negative (`trigger-adj-*` and `trigger-false-*`):
  ```ts
  checklist = [{
    id: "skill_not_invoked",
    description: "Did the agent AVOID loading `<skill-id>`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `<skill-id>/SKILL.md` or calling the `Skill` tool with `<skill-id>`.",
    critical: true,
  }];
  ```

### Template (`mod.ts`)

```ts
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const TriggerPos1 = new class extends AcceptanceTestScenario {
  id = "<skill-id>-trigger-pos-1";
  name = "<short label, e.g. 'natural fix-tests query'>";
  skill = "<skill-id>";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery = "<natural user query>";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `<skill-id>` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `<skill-id>`.",
    critical: true,
  }];
}();
```

### RED-phase verification

Before scaling, write one positive scenario and run it; confirm the judge correctly fails the run when the skill's `description` is mangled to be unrelated. Then revert the description. This validates the pattern end-to-end. See SRS `FR-ACCEPT.TRIGGER`, SDS §3.4.2.

## 7. Universal Result Schema

To ensure cross-platform compatibility, benchmark results must follow a standard JSON schema.

```json
{
  "scenario_id": "string",
  "outcome": "pass|fail",
  "score": 0-100,
  "metrics": {
    "duration_ms": 1200,
    "cost_usd": 0.01,
    "steps_taken": 5,
    "tokens_used": 1500
  },
  "evidence": {
    "artifacts": ["file_paths"],
    "logs": ["log_entries"]
  },
  "checklist": [
    { "id": "check_1", "status": "pass", "reason": "..." }
  ]
}
```

## 8. Configuration Principles

1. **Preset-Based Management**: Manage LLM configurations as named presets.
2. **Role Separation**: Distinguish between **Agent** (tested), **Judge** (evaluator), and **Simulated User** (context provider).
3. **Reproducibility**: Enforce deterministic behavior (e.g., `temperature: 0`).

## 9. Assets & References

- **[examples/scenario-example.md](assets/scenario-example.md)**: Template for defining scenarios.
- **[acceptance-tests/config.json](acceptance-tests/config.json)**: Main configuration file for models and presets.
