---
name: af-skill-fix-by-benchmarks
description: Run benchmarks to identify root causes of failures in skills and propose fixes with argumentation. Use when a skill is not performing as expected, failing tests, or when you need to verify improvements using the benchmarking system.
---

# Fix by Benchmarks

This command provides a systematic approach to debugging and improving AssistFlow skills using the built-in benchmarking infrastructure.

## When to Use

- A skill fails to complete a task correctly.
- You've made changes to a skill and want to verify they don't break existing functionality.
- You need to understand why an agent is making specific mistakes in a controlled environment.

## Core Workflow

### 1. Identify the Benchmark

Find the relevant benchmark scenario for the skill you are working on.

- Scenarios are located in `scripts/benchmarks/scenarios/`.
- Each scenario has a `mod.ts` file defining the test logic and a `fixture/` directory with initial files.

### 2. Run the Benchmark

Execute the benchmark using the Deno task:

```bash
deno task bench -f <scenario-id>
```

Example: `deno task bench -f af-commit-basic`

### 3. Analyze the Failure

If the benchmark fails, perform a root cause analysis:

1. **Check the Trace**: Read the `trace.html` (or `trace.md` if available) in `benchmarks/<scenario-id>/`.
2. **Examine Evidence**: Look at the "EVIDENCE" section in the trace which includes `git status`, `git diff`, and logs.
3. **Inspect Sandbox**: The sandbox directory `benchmarks/<scenario-id>/sandbox/` is preserved for manual inspection.
4. **Compare Logs**: Compare the agent's actions in the log with the expected behavior defined in the scenario's `checklist`.

### 4. Determine Root Cause

Identify why the agent failed:

- **Prompt Issue**: The instructions in `SKILL.md` are ambiguous or missing key steps.
- **Tool Issue**: A required tool is missing, broken, or not used correctly.
- **Context Issue**: The agent didn't have enough information about the project structure or conventions.
- **Model Limitation**: The model used for the agent is not capable enough for the task (check if it works with a smarter model).

### 5. Propose and Argument Fixes

Present the findings to the user:

- **Finding**: Clearly state what failed and why (the root cause).
- **Proposed Fix**: Describe the specific changes needed (e.g., "Add a step to check git status before committing in SKILL.md").
- **Argumentation**: Explain how this fix addresses the root cause and why it's the best approach.
- **Verification Plan**: State that the benchmark will be re-run after the fix to verify success.

### 6. Implement and Verify

1. Apply the agreed-upon fix.
2. Re-run the benchmark: `deno task bench -f <scenario-id>`.
3. Confirm all checklist items pass.

## Tips for Root Cause Analysis

- **Check the "Evidence" section**: It often contains the ground truth (git diffs, file contents) that contradicts the agent's claims.
- **Look for "hallucinated" success**: Did the agent say it finished but the judge found missing files?
- **Examine tool outputs**: Did a command fail with an error the agent ignored?
