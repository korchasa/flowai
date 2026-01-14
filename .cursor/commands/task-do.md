---
description: Execute task in Autonomous Mode with code implementation and comments
---

# Do something

## Overview
Execute a task in Autonomous Mode in project context.

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
2. **Preparation**
   - Read all docs in `./documents`.
   - Analyze requirements and constraints.
3. **Implementation**
   - Resolve user query with code changes.
   - Add/update comments at file, function, and block levels.
</step_by_step>

## Verification
<verification>
- [ ] Task scope and acceptance clarified.
- [ ] Code/comments cover critical logic.
- [ ] Final response respects project rules.
</verification>
