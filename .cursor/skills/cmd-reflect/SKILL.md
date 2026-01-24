---
name: cmd-reflect
description: Analyze recent task execution to improve agent instructions and rules.
disable-model-invocation: true
---


# Task: Reflect on Performance & Instructions

## Overview
Analyze the recent task execution to identify improvements for agent instructions, rules, and documentation.

## Context
<context>
The agent has just completed a task or a series of interactions. The goal is to perform a "retrospective" to identify:
- Ambiguities in current instructions.
- Missing tools or context.
- Contradictions in rules.
- Opportunities to optimize workflows.
This ensures the system evolves and becomes more efficient over time.
</context>

## Rules & Constraints
<rules>
1. **Evidence-Based**: Base all observations on the actual conversation history and tool outputs from the current session.
2. **Specific References**: When suggesting improvements, cite the specific file (e.g., `.cursor/rules/foo.md`) or command (e.g., `.cursor/commands/bar.md`).
3. **Constructive**: Focus on actionable improvements (additions, clarifications, removals).
4. **Mandatory**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan for the reflection process.

2. **Analyze Interaction History**
   - Review the user's initial query and subsequent turns.
   - Identify:
     - Were there any tool errors?
     - Did the agent have to ask clarifying questions that could have been avoided with better rules?
     - Did the agent take unnecessary steps?
     - Was the tone and style consistent with instructions?

3. **Evaluate Active Rules & Commands**
   - Check the rules that were active during the session.
   - Determine if any rule caused friction or if a missing rule led to suboptimal performance.

4. **Draft Improvements**
   - Formulate specific changes.
   - Format: "In file `[path]`, change `[old text]` to `[new text]`" or "Add new rule regarding `[topic]`".

5. **Report Findings**
   - Present a summary of the reflection.
   - List the proposed actionable items.
   - Ask the user if they want to apply these changes immediately.
</step_by_step>

## Verification
<verification>
[ ] Reflection covers both positive aspects and areas for improvement.
[ ] Proposed changes are linked to specific files or rules.
[ ] The report is concise and actionable.
</verification>
