---
name: af-do
description: Execute task in Autonomous Mode with code implementation and comments
disable-model-invocation: true
---

# Do something

## Overview

Execute a task in project context.

## Context

<context>
General purpose task execution command for code changes and logic implementation.
</context>

## Rules & Constraints

<rules>
1. **Language Policy**: Technical terms in English, explanations in User's language.
2. **Quality**: No stubs or hacks; include comments for critical logic.
3. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions

<step_by_step>

1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Prepare**
   - Read project docs in `./documents`.
   - Analyze requirements and constraints.
3. **Implement**
   - Resolve user query with code changes.
   - Add/update comments at file, function, and block levels.
4. **Verify**
   - Ensure that the task was correctly understood.
   - Ensure that the task was performed as requested by the user.
   - Check that no temporary or garbage data (files, edits, etc.) remains.
     </step_by_step>

## Verification

<verification>
- [ ] Task scope and acceptance clarified.
- [ ] Code/comments cover critical logic.
- [ ] Final response respects project rules.
- [ ] No temporary or garbage data remains.
</verification>
