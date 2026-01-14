---
description: Create comprehensive run.ts script for project automation
---

# Create Run Script

## Overview
Create a comprehensive `run.ts` script for project automation following the project's specification and documentation requirements.

## Context
<context>
The project uses a Deno-based `run.ts` script for common tasks like init, test, and check.
</context>

## Rules & Constraints
<rules>
1. **Deno Powered**: Implementation MUST be based on Deno framework.
2. **Single File**: Implement as a single, independently executable TypeScript file.
3. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Read specifications**
   - Review project documentation and requirements.
   - Identify all required automation commands (init, test-one, cleanup, dev, check).
3. **Generate run.ts file**
   - Create `run.ts` in the project root.
   - Implement basic structure and command parsing.
4. **Implement required commands**
   - Implement `init`, `test-one`, `cleanup`, and `dev`.
5. **Implement check command**
   - Implement `check` command with stages: clean, compile, comment-scan, format, lint, test, analyze.
6. **Test and validate**
   - Execute `./run.ts <command>` for each command.
   - Verify functionality and fix any issues.
</step_by_step>

## Verification
<verification>
- [ ] `run.ts` file created in project root.
- [ ] File is single, independently executable TypeScript file.
- [ ] All required commands (init, test-one, cleanup, dev, check) implemented.
- [ ] `check` command includes all required stages.
- [ ] All commands tested and verified working.
</verification>
