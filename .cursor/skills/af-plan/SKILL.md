---
name: af-plan
description: >-
  Create critiqued plan in whiteboard.md using GODS framework with proactive
  uncertainty resolution
disable-model-invocation: true
---

# Task Planning

## Overview

Create a clear, critiqued plan in `./documents/whiteboard.md` using the GODS
framework.

## Context

<context>
Principal Software Architect role focused on analysis and planning without implementation.
You are autonomous and proactive. You exhaust all available resources (codebase, documentation, web) to understand the problem before asking the user.
</context>

## Rules & Constraints

<rules>
1. **Pure Planning**: MUST NOT write not into any file except `./documents/whiteboard.md`.
2. **Planning**: The agent MUST use `todo_write` to track the execution steps.
3. **Chat-First Reasoning**: Implementation variants MUST be presented in CHAT, not in the file.
4. **No SwitchMode**: Do not call SwitchMode tool. This is a mandatory rule!
5. **Proactive Resolution**: Before asking the user, you MUST attempt to answer the question yourself using search tools.
</rules>

## Instructions

<step_by_step>

1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Deep Context & Uncertainty Resolution**
   - **Analyze**: Read the prompt, codebase, and local documentation.
   - **Identify Gaps**: List explicit requirements vs. implied/missing details.
   - **Autonomous Research**:
     - Use `codebase_search` / `grep` / `Glob` to find existing patterns, types,
       and logic.
     - Use `web_search` for external docs/libraries if mentioned or needed.
   - **Validation Loop**:
     - _If uncertainties remain_: Ask the user clarifying questions. STOP and
       wait for answers.
     - _If resolved_: Proceed to Step 3.
3. **Draft Framework (G-O-D)**
   - Create Goal, Overview, and Definition of Done in `whiteboard.md`.
   - Ensure `Overview` includes the "Why", "Context", and "Constraints" found
     during research.
4. **Strategic Analysis (Chat Only)**
   - Generate implementation variants **in the chat** based on task complexity.
   - **Quality over quantity**: Provide 1 robust variant if the path is obvious, or multiple if real architectural trade-offs exist. Do NOT create "filler" variants to meet a quota.
   - Compare them (Pros/Cons) based on the researched context (if multiple).
   - **CRITICAL**: STOP and wait for user input. Explicitly ask the user to
     select a variant. Do NOT proceed to Step 5.
5. **Detail Solution (S)**
   - **Pre-condition**: User has selected a variant.
   - Complete the **Solution** section in `whiteboard.md` with detailed steps
     for the _selected_ variant.
6. **TOTAL STOP**\
   </step_by_step>

## Output Format (GODS)

<output_format>

# [Task Title]

## Goal

[Why are we doing this? Business value.]

## Overview

### Context

[Exhaustive context analysis. MUST include: 1) The full problematics and pain
points, 2) The operational environment/context, 3) All gathered constraints and
existing technical debt, 4) All external URLs, 5) @-mentions for all relevant
files and documentation.]

### Current State

[Technical description of the existing system/code relevant to the task]

### Constraints

[Hard limits, anti-patterns, and requirements (e.g., "Must use Deno", "No
external libs")]

## Definition of Done

- [ ] [Criteria 1]
- [ ] [Criteria 2]

## Solution

[Detailed step-by-step implementation plan for the SELECTED variant]
</output_format>

## Verification

<verification>
- [ ] ONLY `./documents/whiteboard.md` modified.
- [ ] Context gaps were researched before asking user.
- [ ] Variants presented in CHAT, not in file.
- [ ] User explicitly selected a variant.
- [ ] Plan follows GODS framework strictly.
</verification>
