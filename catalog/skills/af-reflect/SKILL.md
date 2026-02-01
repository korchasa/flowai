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
1. **Process-First**: Do not focus on syntax errors in code unless they result from a logical failure (e.g., forgetting to read the file first).
2. **Evidence-Based**: Cite specific turns or log lines where the logic failed.
3. **Constructive**: Propose a *behavioral* fix (e.g., "Always check `ls` before `read_file`").
4. **Input Flexibility**: If the user provides a transcript file, analyze that. Otherwise, analyze the current session history.
</rules>

## Instructions

<step_by_step>

1. **Identify Source**
   - If the user points to a transcript file, read it.
   - Otherwise, review the current conversation history.

2. **Analyze Execution Flow**
   - Map out the agent's "Thought -> Action -> Result" loop.
   - Identify where the chain broke:
     - Did the Thought match the Goal?
     - Did the Action match the Thought?
     - Did the Agent interpret the Result correctly?

3. **Detect Logic Patterns**
   - **Looping**: Is the agent retrying without changing strategy?
   - **Blindness**: Is the agent ignoring "File not found" or linter errors?
   - **Stubbornness**: Is the agent forcing a solution that doesn't fit?

4. **Formulate Report**
   - **Summary**: What went wrong in the *process*?
   - **Root Cause**: Why did the agent make this mistake? (e.g., "Assumed file existed").
   - **Corrective Action**: What should the agent do differently next time? (e.g., "Use `list_dir` before `read_file`").

5. **Output**
   - Present the report in a clear, markdown format.
</step_by_step>
