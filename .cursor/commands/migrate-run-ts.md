---
description: Migrate from run.ts to individual scripts and deno task
---

# Task: Migrate run.ts to Deno Tasks

## Overview
Migrate the monolithic `run.ts` script to individual scripts in `./scripts/` and configure `deno.json` tasks.

## Context
<context>
The project currently uses a single `run.ts` file (and potentially a `./run` wrapper) for automation commands like `check`, `test`, and `dev`. The goal is to modularize this into separate scripts located in `./scripts/` and execute them using the standard `deno task` system. This improves maintainability, leverages Deno's native task runner, and keeps the root directory clean.
</context>

## Rules & Constraints
<rules>
1.  **Atomic Scripts**: Each command from `run.ts` must be moved to a separate file named `task-<command-name>.ts` in `./scripts/`.
2.  **Deno Native**: All tasks must be defined in `deno.json`.
3.  **Shared Code**: Common logic (imports, helper functions) must be extracted to `./scripts/utils.ts` or similar shared modules to avoid duplication.
4.  **Preservation**: Ensure all logic from the original `run.ts` is preserved.
5.  **Clean Migration**: The original `run.ts` and `./run` files should be removed ONLY after verification.
6.  **Mandatory**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1.  **Initialize**
    -   Use `todo_write` to create a plan based on these steps.

2.  **Analyze Source**
    -   Read `run.ts` to identify all available commands (e.g., `check`, `test`, `dev`).
    -   Identify any shared variables, types, or helper functions that need to be extracted.

3.  **Prepare Environment**
    -   Create the `./scripts` directory if it doesn't exist.
    -   Create `deno.json` if it doesn't exist.

4.  **Migrate Logic**
    -   **Shared Code**: Extract common code into `./scripts/utils.ts` (or relevant shared file).
    -   **Individual Tasks**: For each command in `run.ts`:
        -   Create a file `./scripts/task-<command-name>.ts`.
        -   Copy the relevant logic.
        -   Ensure imports point to the correct locations (adjusting relative paths if necessary).
        -   Make the script executable directly if needed, or designed to be imported.

5.  **Configure Deno Tasks**
    -   Update `deno.json` to include a `tasks` section.
    -   Map each command name to its script execution.
        -   Example: `"check": "deno run -A ./scripts/task-check.ts"`
    -   Ensure permissions (flags like `-A` or specific `--allow-*`) are correct for each task.

6.  **Verify Migration**
    -   Run each new task using `deno task <command_name>`.
    -   Verify the output matches the expected behavior of the original script.

7.  **Cleanup**
    -   Delete `./run.ts` and `./run` (if it exists).
</step_by_step>

## Verification
<verification>
[ ] `./scripts/` directory exists and contains `task-*.ts` files for all original commands.
[ ] `deno.json` exists and contains a `tasks` object with entries for all commands.
[ ] `deno task check` runs successfully.
[ ] `deno task dev` runs successfully.
[ ] `deno task test` runs successfully.
[ ] `./run.ts` and `./run` are removed.
</verification>
