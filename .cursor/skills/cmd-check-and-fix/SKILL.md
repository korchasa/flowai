---
name: cmd-check-and-fix
description: Iteratively run project checks and fix errors until success
disable-model-invocation: true
---


# Task: Iterative Check and Fix

## Overview
Iteratively run project verification tasks (primarily `deno task check`, but also others if requested) and fix detected errors until the project is clean or a limit is reached.

## Context
<context>
The project maintains code quality via verification scripts (e.g., `deno task check`). These scripts may report linting errors, type errors, or test failures. The goal is to automate the cycle of running these checks and applying fixes to reach a passing state.
</context>

## Rules & Constraints
<rules>
1. **Iterative Fixing**: Run checks, analyze output, fix errors, and repeat.
2. **Loop Limit**: Stop after 5 iterations to prevent infinite loops if an error is unresolvable.
3. **Broad Scope**: 
   - Start with `deno task check`.
   - **Crucial**: If the user's instructions or the current task context define additional checks (e.g., specific test files, other scripts), include them in the verification loop.
4. **Fix Strategy**:
   - Prefer safe auto-fixes (e.g., `deno fmt`, `eslint --fix`) first.
   - For logic/type errors, read the relevant files and apply targeted code corrections.
5. **Mandatory**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Identify Verification Methods**
   - **Primary**: `deno task check`.
   - **Instruction-Defined**: Parse the current user prompt and task context for *additional* required checks (e.g., "run tests for X", "check strict mode").
   - Compile a **list of verification commands** to run in sequence.
3. **Iterative Repair Loop (Max 5 attempts)**
   - **Step 3.1: Execute Checks**
     - Iterate through the compiled **list of verification commands**.
     - For each command:
       - Run the command.
       - **Fail-Fast**: If *any* command fails, stop the sequence immediately to address the error.
     - If all commands pass:
       - Mark iteration as successful.
       - BREAK the loop.
   - **Step 3.2: Analyze Failure** (if failure occurred)
     - Analyze stderr/stdout of the failed command.
     - Identify failing files and error types.
   - **Step 3.3: Apply Fixes**     
       - Find the root cause of the failure.
       - Apply a fix.
       - *Self-Correction*: If a fix is complex, verify it locally by reading the file again.
   - **Step 3.4: Re-evaluate**
     - Continue to next iteration (which will restart the check sequence).
4. **Final Verification**
   - Run the full list of check commands one last time to ensure stability.
5. **Report**
   - Summarize fixed issues.
   - List any remaining unresolvable errors.
</step_by_step>

## Verification
<verification>
[ ] All verification methods identified (including instruction-defined ones).
[ ] Iterative loop executed (check list -> fix -> repeat).
[ ] Fixes applied for identified errors.
[ ] Final run of all checks confirms status.
[ ] Report generated.
</verification>
