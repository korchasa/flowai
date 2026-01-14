---
description: Create Deno task scripts for project automation
---

# Create Task Scripts

## Overview
Create Deno task scripts and `deno.json` tasks for project automation following the project's specification and documentation requirements.

## Context
<context>
The project uses Deno task scripts in `./scripts/` and `deno.json` tasks for common automation commands.
</context>

## Rules & Constraints
<rules>
1. **Deno Powered**: Implementation MUST be based on Deno framework.
2. **Modular Scripts**: Each task must live in its own TypeScript file under `./scripts/`.
3. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Read specifications**
   - Review project documentation and requirements.
   - Identify all required automation commands (init, test-one, cleanup, dev, check).
3. **Create task scripts**
   - Ensure `./scripts/` exists.
   - Create `task-<command>.ts` files for each command.
4. **Configure tasks**
   - Create/update `deno.json`.
   - Map each command name to its script execution.
5. **Implement required commands**
   - Implement `init`, `test-one`, `cleanup`, and `dev`.
6. **Implement check command**
   - Implement `check` command with stages: clean, compile, comment-scan, format, lint, test, analyze.
7. **Test and validate**
   - Execute `deno task <command>` for each command.
   - Verify functionality and fix any issues.
</step_by_step>

## Verification
<verification>
- [ ] `./scripts/` contains task scripts for all required commands.
- [ ] `deno.json` tasks map to the task scripts.
- [ ] All required commands (init, test-one, cleanup, dev, check) implemented.
- [ ] `check` command includes all required stages.
- [ ] All commands tested and verified working.
</verification>
