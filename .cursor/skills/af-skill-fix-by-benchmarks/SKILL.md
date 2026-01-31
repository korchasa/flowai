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

### 2. Run and Analyze (via Subagent)

Delegate the execution and initial analysis to the `benchmark-runner` subagent.

> "Run the benchmark for scenario <scenario-id> and analyze the results."

The subagent will:
- Execute `deno task bench -f <scenario-id>`
- Report Pass/Fail status
- Detail specific checklist failures and evidence

### 3. Determine Root Cause

Based on the subagent's report and your own analysis of the skill:

1.  **Analyze**: Why did the specific checklist items fail?
2.  **Hypothesize**:
    - **Prompt Issue**: Ambiguous instructions in `SKILL.md`.
    - **Tool Issue**: Missing or misused tools.
    - **Context Issue**: Missing project knowledge.
    - **Model Limitation**: Task too complex for the model.

### 4. Propose and Argument Fixes

Present the findings:
- **Finding**: Root cause of the failure.
- **Proposed Fix**: Specific changes to `SKILL.md` or code.
- **Argumentation**: Why this fix works.
- **Verification Plan**: State that the benchmark will be re-run after the fix to verify success.

### 5. Implement and Verify

1.  Apply the agreed-upon fix.
2.  Ask `benchmark-runner` to run the benchmark again to verify.
3.  Confirm all checks pass.

## Tips for Root Cause Analysis

- **Check the "Evidence" section**: It often contains the ground truth (git diffs, file contents) that contradicts the agent's claims.
- **Look for "hallucinated" success**: Did the agent say it finished but the judge found missing files?
- **Examine tool outputs**: Did a command fail with an error the agent ignored?
