# Benchmarking System

The benchmarking system is designed for objective evaluation of AI agent performance and skills within the AssistFlow environment. It emulates Cursor's behavior and verifies not only the response text but also real changes in the file system.

## Architecture and Isolation

### Sandbox

Each scenario run occurs in an isolated temporary directory (`scripts/benchmarks/work/<scenario-id>/sandbox`).

- The directory is completely cleared before starting.
- Files from the `fixture/` folder of the corresponding scenario are copied to the sandbox.
- All agent commands (bash scripts) are executed within this directory.

### Runner (Orchestrator)

Manages the test lifecycle:

1. **Setup**: Creating the sandbox, copying fixtures, executing `scenario.setup()`.
2. **Context Assembly**: Assembling the system prompt and preparing `AGENTS.md`.
3. **Execution Loop**: Iterative interaction with the LLM (up to 10 steps by default).
4. **Evidence Collection**: Collecting logs, `git status`, `git diff`, and file states after the agent's work.
5. **Judging**: Evaluating results using an LLM judge.

## Context Assembly

The Runner forms a system prompt that is as close as possible to reality in Cursor:

1. **System Instructions**: A template from `lib/prompts.ts` is used, including `user_info` (OS, Shell, Date). The template contains the following placeholders:
   - `{{AGENTS}}`: The content of the `AGENTS.md` file is inserted here. This is a key element defining general behavior rules and project context.
   - `{{SKILL}}`: The content of the `.md` file of the skill being tested (from `targetAgentPath`) is inserted here. This defines the specific logic and steps for task execution.

2. **AGENTS.md**:
   - **Mandatory** for each scenario.
   - Searched in `fixture/AGENTS.md` or passed explicitly in `agentsMarkdown`.
   - Inserted into the `<rules>` section of the system prompt.
   - Copied to the sandbox root so the agent can read it.

3. **Skill/Agent Definition**: The content of the skill's `.md` file (e.g., `af-plan/SKILL.md`) is appended to the end of the system prompt.

## Agent Response Handling

Agents in benchmark mode operate in tool emulation mode:

- They **do not use** real MCP tools or `todo_write`.
- Instead, they output commands in `` ```bash `` code blocks.
- The Runner intercepts these blocks, writes them to temporary `.sh` files inside the sandbox, and executes them.
- The execution result (stdout/stderr) is returned to the agent as `Command Output`.

## Result Evaluation (Judging)

Evaluation is performed by an LLM judge based on:

1. **User Query**: The original user request.
2. **Full Log**: The entire history of agent interaction and command outputs.
3. **Evidence**: The final git state, list of executed commands, and file changes.
4. **Checklist**: A list of criteria from the scenario's `mod.ts`.

Criteria can be:

- **Critical**: If the check fails, the entire scenario is considered `FAILED`.
- **Non-critical**: Affect the final score but do not lead to failure.

## How to Run Benchmarks

### Locally

```bash
deno task bench
```

### In Docker (recommended for security)

To isolate agent command execution from the host system, use Docker. This will automatically build the necessary image and run benchmarks in an isolated container with the current directory mounted.

```bash
deno task bench --docker
```

## How to Create a New Benchmark

1. Create a directory in `scenarios/af-<skill>/<name>`.
2. Create `fixture/AGENTS.md` with a project description for this test.
3. Create `mod.ts` exporting a `BenchmarkScenario` object.
4. Define a `checklist` with clear verification criteria.
5. Run to verify:
   ```bash
   deno task bench --scenario <scenario-id>
   ```

## Debugging

After each run, the following are created in the `work/<scenario-id>/` folder:

- `sandbox/`: Final state of files (can be inspected manually).
- `trace.md`: Full execution log, including system prompts, LLM responses, command outputs, and judge's reasoning.
