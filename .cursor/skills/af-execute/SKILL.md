---
name: af-execute
description: Execute task in Autonomous Mode using strict TDD
disable-model-invocation: true
---

# Task Execution

## Overview

Execute a task in Autonomous Mode using strict TDD, keeping documentation
updated.

## Context

<context>
Implementation command focused on Test-Driven Development and documentation synchronization.
</context>

## Rules & Constraints

<rules>
1. **Strict TDD**: Write failing test first, then minimal implementation, then refactor.
2. **Whiteboard Tracking**: Continuously update progress in `./documents/whiteboard.md`.
3. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions

<step_by_step>

1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Preparation**
   - Read documentation and review task in `whiteboard.md`.
3. **Analysis & Gap Filling**
   - Analyze if all necessary context is available.
   - If missing info, search project code/docs and the internet.
   - If questions remain, conduct a Q&A session with the user.
4. **Implement with TDD**
   - Iterative TDD cycle for each subtask.
   - Update `whiteboard.md` progress.
   - Add/update relevant comments.
5. **Quality gate**
   - Run `deno task check` and fix all issues until clean. </step_by_step>

## Verification

<verification>
- [ ] Work done via TDD with incremental changes.
- [ ] Progress reflected in `whiteboard.md`.
- [ ] `deno task check` passes cleanly.
</verification>
