---
description: Run project check suite and analyze failures to determine root causes without fixes
---

# Check and Analyze

## Overview
Run the project's check suite (`./run check`) and analyze any failures to determine root causes without applying fixes.

## Todo List
1. **Execute Check Suite**
   - Run `./run check` in the terminal.
   - Capture the full output, including exit codes and error messages.

2. **Analyze Results**
   - If the command succeeds (exit code 0):
     - Confirm that all checks passed.
     - Report the clean state.
   - If the command fails:
     - Identify the specific step(s) that failed (e.g., linting, formatting, tests, build).
     - Extract the error messages and stack traces.
     - Group errors by category (e.g., Syntax Error, Type Error, Logic Failure, Style Violation).

3. **Determine Root Causes**
   - For each identified error category:
     - Explain *why* the error occurred based on the logs.
     - Link the error to specific files or lines of code if possible.
     - Distinguish between transient issues (flaky tests) and permanent failures.

4. **Report Findings**
   - Summarize the health of the project.
   - List all found issues with their determined causes.
   - **DO NOT** attempt to fix any errors.
   - Provide recommendations for next steps (e.g., "Run linter auto-fix", "Update test case").

## Checklist
- [ ] `./run check` executed
- [ ] Output captured and analyzed
- [ ] Root causes identified for all failures
- [ ] Report generated
- [ ] No code changes applied

## Output Format
- **Status**: [PASS/FAIL]
- **Summary**: Brief overview of the check results.
- **Detailed Analysis**:
  - **Category**: [e.g., Linting]
    - **Error**: [Error description]
    - **Location**: [File:Line]
    - **Cause**: [Explanation of why this is happening]
- **Recommendations**: Suggested actions for the user.

