---
name: af-reflect
description: Analyze agent's process and logic to find behavioral errors.
disable-model-invocation: true
---

# Task: Reflect on Process & Logic

## Overview

Analyze the task execution (either current history or a provided transcript) to identify errors in the **agent's process and logic**.
Focus on *how* the agent attempted to solve the problem, not just the code it wrote.

## Context

<context>
The goal is to perform a "Root Cause Analysis" of the agent's behavior.
We are looking for:
- **Logic Loops**: Repeating the same failing action.
- **False Assumptions**: Assuming a state without verifying.
- **Ignoring Feedback**: Ignoring tool error messages.
- **Process Violations**: Skipping required steps (like reading docs or verifying).
- **Hallucinations**: Inventing facts or file contents.
</context>

## Rules & Constraints

<rules>
1. **Evidence-Based**: Base all observations on the actual conversation history and tool outputs from the current session.
2. **Specific References**: When suggesting improvements, cite the specific file (e.g., `.cursor/rules/foo.md`) or command (e.g., `.cursor/commands/bar.md`).
3. **Constructive**: Focus on actionable improvements (additions, clarifications, removals).
4. **Do not make changes to the agent's instructions or rules**. Only suggest improvements.
5. **Mandatory**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions

<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan for the reflection process.
    
2. **Identify Source**
   - If the user points to a transcript file, read it.
   - Otherwise, review the current conversation history.

3. **Analyze Execution Flow**
   - Map out the agent's "Thought -> Action -> Result" loop.
   - Identify where the chain broke:
     - Did the Thought match the Goal?
     - Did the Action match the Thought?
     - Did the Agent interpret the Result correctly?

4. **Detect Logic Patterns**
   - **Looping**: Is the agent retrying without changing strategy?
   - **Blindness**: Is the agent ignoring "File not found" or linter errors?
   - **Stubbornness**: Is the agent forcing a solution that doesn't fit?

5. **Formulate Report**
   - **Summary**: What went wrong in the *process*?
   - **Root Cause**: Why did the agent make this mistake? (e.g., "Assumed file existed").
   - **Corrective Action**: What should the agent do differently next time? (e.g., "Use `list_dir` before `read_file`").

6. **Report Findings**
   - Present a summary of the reflection.
   - List the proposed actionable items.
   - Ask the user if they want to apply these changes immediately.
</step_by_step>
