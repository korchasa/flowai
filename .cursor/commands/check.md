---
description: Run project check suite and analyze failures to determine root causes without fixes
---

# Check and Analyze

## Overview
Run the project's check suite (`deno task check`) and analyze any failures to determine root causes without applying fixes.

## Context
<context>
The project has an automation scripts in deno.json (executable as `deno task <name>`) with a `check` command. This command runs several stages (lint, format, test, etc.).
</context>

## Rules & Constraints
<rules>
1. **No Fixes**: DO NOT attempt to fix any errors discovered during analysis.
2. **Analysis Only**: Focus on identifying root causes and grouping errors.
3. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Execute Check Suite**
   - Run `deno task check` in the terminal.
   - Capture the full output, including exit codes and error messages.
3. **Analyze Results**
   - If the command succeeds (exit code 0):
     - Confirm that all checks passed.
     - Report the clean state.
   - If the command fails:
     - Identify the specific step(s) that failed (e.g., linting, formatting, tests, build).
     - Extract the error messages and stack traces.
     - Group errors by category (e.g., Syntax Error, Type Error, Logic Failure, Style Violation).
4. **Determine Root Causes**
   - For each identified error category:
     - Explain *why* the error occurred based on the logs.
     - Link the error to specific files or lines of code if possible.
     - Distinguish between transient issues (flaky tests) and permanent failures.
5. **Report Findings**
   - Summarize the health of the project in the Chat.
   - List all found issues with their determined causes.
   - Provide recommendations for next steps (e.g., "Run linter auto-fix", "Update test case").
</step_by_step>

## Verification
<verification>
- [ ] `deno task check` executed.
- [ ] Output captured and analyzed.
- [ ] Root causes identified for all failures.
- [ ] Report generated in Chat.
- [ ] No code changes applied.
</verification>
