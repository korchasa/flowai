---
description: Create critiqued plan in whiteboard.md
---

# Task Planning

## Overview
Create a clear, critiqued plan in `./documents/whiteboard.md` using the GODS framework.

## Context
<context>
Principal Software Architect role focused on analysis and planning without implementation.
</context>

## Rules & Constraints
<rules>
1. **Pure Planning**: MUST NOT write executable code in source files.
2. **Whiteboard Only**: The only output file is `./documents/whiteboard.md`.
3. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Swtich mode**
   - Call `SwitchMode` tool with target_mode_id=plan
2. **Initialize**
   - Use `todo_write` to create a plan based on steps below:
     1. **Read & Contextualize**
        - Analyze codebase and documentation.
     2. **Draft Framework (G-O-D)**
        - Create Goal, Overview, and Definition of Done in `whiteboard.md`.
     3. **Strategic Analysis**
        - Generate 2-3 implementation variants.
        - Conduct Q&A loop to clarify requirements and select variant. If the `AskQuestion` tool is available, use it.
     4. **Detail Solution (S)**
        - Complete Solution section with detailed steps for selected variant.
</step_by_step>

## Verification
<verification>
- [ ] Mode switched
- [ ] ONLY `./documents/whiteboard.md` modified.
- [ ] Analyzed at least 2 distinct implementation variants.
- [ ] Plan follows GODS framework strictly.
</verification>
