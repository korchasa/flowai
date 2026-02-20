---
name: flow-reflect
description: Analyze agent's process, logic, technical decisions, and context usage to find behavioral errors, poor engineering choices, and inefficiencies.
disable-model-invocation: true
---

# Task: Reflect on Process, Technical Decisions & Context

## Overview

Analyze the task execution (either current history or a provided transcript) to identify errors in the **agent's process and logic**, weaknesses in **technical decisions**, and inefficiencies in **context usage**.
Focus on *how* the agent attempted to solve the problem, *whether the chosen technical approach was sound*, and *what information it used or missed*.

## Context

<context>
The goal is to perform a "Root Cause Analysis" of the agent's behavior, evaluate the quality of its technical decisions, AND audit its information gathering.

### Behavioral Errors
- **Logic Loops**: Repeating the same failing action.
- **False Assumptions**: Assuming a state without verifying.
- **Ignoring Feedback**: Ignoring tool error messages.
- **Process Violations**: Skipping required steps (like reading docs or verifying).
- **Hallucinations**: Inventing facts or file contents.

### Technical Decision Errors
- **Overcomplexity**: Solution more complex than necessary (extra abstractions, unnecessary indirection, premature generalization).
- **Wrong Abstraction Level**: Solving at the wrong layer (e.g., app-level fix for an infra problem, or vice versa).
- **Ignoring Existing Patterns**: Not following established project conventions, reinventing what already exists in the codebase.
- **Poor Error Handling**: Missing error paths, swallowing exceptions, unclear failure modes.
- **Fragile Design**: Solution tightly coupled, hard to test, or brittle to future changes.
- **Performance Anti-patterns**: O(n^2) where O(n) is trivial, unnecessary I/O, missing caching for repeated operations.
- **Security Gaps**: Unsanitized input, hardcoded secrets, excessive permissions.
- **Wrong Tool/Library Choice**: Using a dependency where stdlib suffices, or picking a deprecated/unmaintained library.
- **Unrequested Fallbacks**: Adding fallback/default behavior the user never asked for (e.g., silent retries, default values masking errors, graceful degradation where fail-fast was expected).

### Context Inefficiencies
- **Missing Context**: Information the agent needed but never obtained.
- **Redundant Context**: Information the agent loaded but never used.
</context>

## Rules & Constraints

<rules>
1. **Evidence-Based**: Base all observations on the actual conversation history and tool outputs from the current session.
2. **Specific References**: When suggesting improvements, cite the specific file (e.g., a rules or commands file in the project's IDE configuration directory) or the command name.
3. **Constructive**: Focus on actionable improvements (additions, clarifications, removals).
4. **Do not make changes to the agent's instructions or rules**. Only suggest improvements.
5. **Mandatory**: The agent MUST use a task management tool (e.g., `todo_write`, `todowrite`, `Task`) to track the execution steps.
</rules>

## Instructions

<step_by_step>
1. **Initialize**
   - Use a task management tool (e.g., `todo_write`, `todowrite`) to create a plan for the reflection process.

2. **Identify Source**
   - If the user points to a transcript file, read it using available file reading tools.
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

5. **Evaluate Technical Decisions**
   Review the actual code/changes produced by the agent:
   - **Complexity Check**: Is the solution proportional to the problem? Could it be simpler?
   - **Pattern Conformance**: Does it follow existing project patterns (naming, structure, error handling)? Or does it introduce inconsistencies?
   - **Abstraction Fit**: Is the problem solved at the right layer? Is there unnecessary indirection or missing encapsulation?
   - **Error Handling**: Are failure modes explicit and handled? Are errors swallowed or masked?
   - **Robustness**: Is the solution fragile to edge cases, concurrency, or future changes?
   - **Performance**: Are there obvious inefficiencies (quadratic loops, redundant I/O, missing caching)?
   - **Security**: Is input validated? Are secrets/permissions handled correctly?
   - **Dependency Choice**: Are dependencies justified? Could stdlib or existing project code suffice?
   - **Unrequested Fallbacks**: Did the agent add fallback/default behavior not asked for (silent retries, default values masking errors, graceful degradation where fail-fast was expected)?

6. **Analyze Context: Missing Information**
   Identify what the agent *should have* read/checked but didn't:
   - **Unread docs**: Project docs (README, AGENTS.md, design docs) relevant to the task but never opened.
   - **Unread source**: Related source files (imports, callers, interfaces) that would have prevented errors.
   - **Unused skills/rules**: Available skills or rules that were relevant but not consulted.
   - **Skipped verification**: Test results, linter output, or runtime checks that would have caught issues earlier.
   - **Unasked questions**: Ambiguities the agent resolved by guessing instead of asking the user.

7. **Analyze Context: Redundant Information**
   Identify what the agent loaded but *didn't need*:
   - **Read-but-unused files**: Files opened via file reading tools but never referenced in the solution.
   - **Over-reading**: Large files read entirely when only a small fragment (function, config key) was needed.
   - **Repeated reads**: The same unchanged file read multiple times, wasting context window.
   - **Irrelevant tool output**: Command outputs (e.g., verbose logs, full `git diff`) that added noise without value.
   - **Off-task files**: Files from unrelated domains or previous tasks still in context.

8. **Formulate Report**
   - **Process Summary**: What went wrong in the *process*?
   - **Technical Summary**: What was wrong with the *technical approach*?
   - **Root Cause**: Why did the agent make this mistake? (e.g., "Assumed file existed", "Didn't check existing patterns").
   - **Context Gaps**: What missing information led to errors or wasted effort?
   - **Context Waste**: What unnecessary information consumed context budget?
   - **Corrective Actions**: What should the agent do differently? Format as table:

   | # | Category  | Issue | Suggested Fix |
   |---|-----------|-------|---------------|
   | 1 | Process   | Retried 3x without strategy change | Add backoff rule to AGENTS.md |
   | 2 | Technical | Added 3 abstractions for a 10-line task | Prefer simplest solution that works |
   | 3 | Technical | Ignored existing error handling pattern | Check similar code before implementing |
   | 4 | Missing   | Never read AGENTS.md before starting | Add "read project docs first" rule |
   | 5 | Redundant | Read entire 2000-line log file | Use grep/search instead of full read |

9. **Report Findings**
   - Present the report from step 8.
   - List the proposed actionable items.
   - Ask the user if they want to apply these changes immediately.
</step_by_step>
