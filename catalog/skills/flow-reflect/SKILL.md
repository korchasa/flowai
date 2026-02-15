---
name: flow-reflect
description: Analyze agent's process, logic, and context usage to find behavioral errors and inefficiencies.
disable-model-invocation: true
---

# Task: Reflect on Process, Logic & Context

## Overview

Analyze the task execution (either current history or a provided transcript) to identify errors in the **agent's process and logic**, and inefficiencies in **context usage**.
Focus on *how* the agent attempted to solve the problem and *what information it used or missed*.

## Context

<context>
The goal is to perform a "Root Cause Analysis" of the agent's behavior AND an audit of its information gathering.

### Behavioral Errors
- **Logic Loops**: Repeating the same failing action.
- **False Assumptions**: Assuming a state without verifying.
- **Ignoring Feedback**: Ignoring tool error messages.
- **Process Violations**: Skipping required steps (like reading docs or verifying).
- **Hallucinations**: Inventing facts or file contents.

### Context Inefficiencies
- **Missing Context**: Information the agent needed but never obtained.
- **Redundant Context**: Information the agent loaded but never used.
</context>

## Rules & Constraints

<rules>
1. **Evidence-Based**: Base all observations on the actual conversation history and tool outputs from the current session.
2. **Specific References**: When suggesting improvements, cite the specific file (e.g., `.cursor/rules/foo.md`) or command (e.g., `.cursor/commands/bar.md`).
3. **Constructive**: Focus on actionable improvements (additions, clarifications, removals).
4. **Do not make changes to the agent's instructions or rules**. Only suggest improvements.
5. **Mandatory**: The agent MUST use a task management tool (e.g., todo write) to track the execution steps.
</rules>

## Instructions

<step_by_step>
1. **Initialize**
   - Use a task management tool (e.g., todo write) to create a plan for the reflection process.

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

5. **Analyze Context: Missing Information**
   Identify what the agent *should have* read/checked but didn't:
   - **Unread docs**: Project docs (README, AGENTS.md, design docs) relevant to the task but never opened.
   - **Unread source**: Related source files (imports, callers, interfaces) that would have prevented errors.
   - **Unused skills/rules**: Available `.cursor/skills/` or `.cursor/rules/` that were relevant but not consulted.
   - **Skipped verification**: Test results, linter output, or runtime checks that would have caught issues earlier.
   - **Unasked questions**: Ambiguities the agent resolved by guessing instead of asking the user.

6. **Analyze Context: Redundant Information**
   Identify what the agent loaded but *didn't need*:
   - **Read-but-unused files**: Files opened via `read_file`/`list_dir` but never referenced in the solution.
   - **Over-reading**: Large files read entirely when only a small fragment (function, config key) was needed.
   - **Repeated reads**: The same unchanged file read multiple times, wasting context window.
   - **Irrelevant tool output**: Command outputs (e.g., verbose logs, full `git diff`) that added noise without value.
   - **Off-task files**: Files from unrelated domains or previous tasks still in context.

7. **Formulate Report**
   - **Process Summary**: What went wrong in the *process*?
   - **Root Cause**: Why did the agent make this mistake? (e.g., "Assumed file existed").
   - **Context Gaps**: What missing information led to errors or wasted effort?
   - **Context Waste**: What unnecessary information consumed context budget?
   - **Corrective Actions**: What should the agent do differently? Format as table:

   | # | Category | Issue | Suggested Fix |
   |---|----------|-------|---------------|
   | 1 | Process  | Retried 3x without strategy change | Add backoff rule to AGENTS.md |
   | 2 | Missing  | Never read AGENTS.md before starting | Add "read project docs first" rule |
   | 3 | Redundant | Read entire 2000-line log file | Use grep/search instead of full read |

8. **Report Findings**
   - Present the report from step 7.
   - List the proposed actionable items.
   - Ask the user if they want to apply these changes immediately.
</step_by_step>
