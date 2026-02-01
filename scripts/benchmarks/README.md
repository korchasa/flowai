# Benchmarking System

The benchmarking system is designed for objective evaluation of AI agent performance and skills within the AssistFlow environment. It emulates Cursor's behavior and verifies not only the response text but also real changes in the file system.

## Architecture and Isolation

### Sandbox

Each scenario run occurs in an isolated temporary directory (`benchmarks/<scenario-id>/sandbox`).

- The directory is completely cleared before starting.
- Files from the `fixture/` folder of the corresponding scenario are copied to the sandbox.
- All agent commands (bash scripts) are executed within this directory.
- The sandbox remains available after the run for manual inspection.

### Docker Isolation

Benchmarks always run in an isolated Docker container to protect the host system from agent-generated commands. The environment is based on `denoland/deno:alpine` with `git` and `bash` installed.

```bash
deno task bench
```

This command automatically builds the `assistflow-bench` image and runs the orchestrator inside it.

### Runner (Orchestrator)

Manages the test lifecycle:

1. **Setup**: Creating the sandbox, copying fixtures, and executing the scenario's `setup()` function.
2. **Context Assembly**: Assembling the system prompt that mimics Cursor's real context.
3. **Execution Loop**: Iterative interaction with the LLM (up to 10 steps by default).
4. **Evidence Collection**: Collecting `git status`, `git log`, and command outputs after the agent's work.
5. **Judging**: Evaluating results using an LLM judge.

## Environment Setup & Context

The Runner prepares a realistic environment for the `cursor-agent`:

1. **Sandbox Creation**: A clean directory is created for each run.
2. **Fixture Injection**: Files from the scenario's `fixture/` directory are copied.
3. **Catalog Injection**: The full project `catalog/` is copied to `sandbox/.cursor/` so the agent can discover all skills and rules natively.
4. **Native Context**: We rely on `cursor-agent` to read the file system, `AGENTS.md`, and `.cursor/` directory to form its own context, just like in the real IDE.
5. **Explicit Commands**: Scenarios use explicit commands (e.g., `/af-plan`) to trigger specific skills.

## Agent Response Handling

Agents in benchmark mode operate in tool emulation mode:

- They **do not use** real MCP tools or `todo_write`.
- Instead, they output commands in `` ```bash `` code blocks.
- The Runner intercepts these blocks, executes them in the sandbox as shell scripts, and returns the output to the agent as `Command Output`.
- Interactive commands (like `git add -p`) are NOT supported.

## Result Evaluation (Judging)

Evaluation is performed by an LLM judge based on:

1. **User Query**: The original user request.
2. **Full Log**: The entire history of agent interaction and command outputs.
3. **Evidence**: The final git state, list of executed commands, and file changes.
4. **Checklist**: A list of criteria from the scenario's `mod.ts`.

Criteria can be:

- **Critical**: If the check fails, the entire scenario is considered `FAILED`.
- **Non-critical (Warnings)**: Affect the final score but do not lead to failure.

## Configuration

The system uses `benchmarks/config.json` to store model presets for agents and judges.

- **Default Agent**: `gemini-2.5-flash-lite`
- **Default Judge**: `gemini-2.5-flash-lite`

## How to Run Benchmarks

```bash
deno task bench [options]
```

### Options

- `-f, --filter <string>`: Filter scenarios by ID (substring match).
- `-p, --preset <string>`: Agent preset to use (e.g., `gemini-3-flash`).
- `--judge-preset <string>`: Judge preset to use.
- `-n, --runs <number>`: Number of runs per scenario (default: 1).

## How to Create a New Benchmark

1. Create a directory in `benchmarks/<skill>/scenarios/<name>`.
2. Create `fixture/AGENTS.md` with a project description for this test.
3. Create `mod.ts` exporting a `BenchmarkScenario` object.
4. Define a `checklist` with clear verification criteria.
5. Register the scenario in `scripts/task-bench.ts`.
6. Run to verify:
   ```bash
   deno task bench --filter <scenario-id>
   ```

### Advanced Scenario Features

- **Mocks**: Provide custom scripts for external tools (e.g., `gh`, `npm`) in the `mocks` field.
- **User Replies**: Simulate interactive flows by providing a list of `userReplies` to be sent when the agent stops issuing commands.
- **Timeouts**: Set `stepTimeoutMs` to limit the duration of individual steps.

## Debugging and Tracing

After each run, work artifacts are stored in `benchmarks/<skill>/runs/<scenario-id>/`:

- **`sandbox/`**: Final state of files (can be inspected manually).
- **`trace.html`**: A rich, interactive execution log with step-by-step timeline, syntax highlighting, and unified data UI for logs and prompts.
