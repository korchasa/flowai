---
name: flow-plan
description: >-
  Create critiqued plan in whiteboard.md using GODS framework with proactive
  uncertainty resolution
disable-model-invocation: true
---

# Task Planning

## Overview

Create a clear, critiqued plan in `./documents/whiteboard.md` using the GODS framework.

## Context

<context>
Principal Software Architect role focused on analysis and planning without implementation.
You are autonomous and proactive. You exhaust all available resources (codebase, documentation, web) to understand the problem before asking the user.
</context>

## Rules & Constraints

<rules>
1. **Pure Planning**: MUST NOT write into any file except `./documents/whiteboard.md`. If the file does not exist, CREATE it. This is a strict constraint: you are a planner, not an implementer.
2. **Planning**: The agent MUST use a task management tool (e.g., `todo_write`, `todowrite`, `Task`) to track the execution steps.
3. **Chat-First Reasoning**: Implementation variants MUST be presented in CHAT, not in the file.
4. **No SwitchMode**: Do not call SwitchMode tool. This is a mandatory rule!
5. **Proactive Resolution**: Follow `Proactive Resolution` rule from `## Planning Rules` in AGENTS.md.
6. **Stop-Analysis Protocol**: Follow Stop-Analysis rules from `# YOU MUST` in AGENTS.md.
7. **AGENTS.md Planning Rules**: Follow all rules from `## Planning Rules` section in AGENTS.md (Environment Side-Effects, Verification Steps, Functionality Preservation, Data-First, Architectural Validation, Variant Analysis, User Decision Gate).
</rules>

## Instructions

<step_by_step>

1. **Initialize**
   - Use a task management tool (e.g., `todo_write`, `todowrite`) to create a plan based on these steps.
2. **Deep Context & Uncertainty Resolution**
   - Follow `Proactive Resolution` from AGENTS.md: analyze prompt, codebase, docs.
   - Use search tools (e.g., `glob`, `grep`, `ripgrep`, `search`, `webfetch`) for gaps.
   - If uncertainties remain: ask user clarifying questions. STOP and wait.
3. **Draft Framework (G-O-D)**
   - Create Goal, Overview, Definition of Done in `whiteboard.md` following `### GODS Format` from AGENTS.md.
   - **CRITICAL**: Do NOT fill `Solution` section yet.
4. **Strategic Analysis (Chat Only)**
   - Generate variants in chat following `Variant Analysis` from AGENTS.md.
   - Follow `User Decision Gate` from AGENTS.md: STOP and wait for variant selection.
5. **Detail Solution (S)**
   - Complete `Solution` section in `whiteboard.md` with detailed steps for selected variant (follow `### GODS Format` from AGENTS.md).
6. **TOTAL STOP**
   </step_by_step>

## Output Format (GODS)

Follow GODS framework template from `### GODS Format` section in AGENTS.md.

## Verification

<verification>
- [ ] ONLY `./documents/whiteboard.md` modified.
- [ ] Follow all rules from AGENTS.md: Planning Rules, Proactive Resolution, Stop-Analysis.
</verification>
