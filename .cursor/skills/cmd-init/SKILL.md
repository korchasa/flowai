---
name: cmd-init
description: Initialize project with AGENTS.md and rules, handling both Greenfield (new) and Brownfield (existing) projects.
disable-model-invocation: true
---
# Task: Initialize Project Agent Documentation

## Overview
Analyze the project, conduct an interview (for Greenfield projects), and generate `AGENTS.md`, rules, and scaffolding.

## Context
<context>
The user wants to bootstrap an AI agent's understanding of the project. The agent needs to autonomously explore the codebase, recognize the technology stack, understand the directory structure, and infer key architectural patterns.
- **Greenfield (New Projects)**: Requires interviewing the user, creating scaffolding (`documents/`, configs), and setting up rules.
- **Brownfield (Existing Projects)**: Requires discovery, reverse-engineering architecture into `documents/`, and indexing the project.
</context>

## Rules & Constraints
<rules>
1. **No Hallucinations**: Only document tooling and architecture that is explicitly found in the codebase or provided by the user.
2. **Standard Format**: The `AGENTS.md` file must follow the provided template.
3. **Overwrite Safety**: If `AGENTS.md` exists, ask for confirmation before overwriting or append/merge if appropriate (default to asking).
4. **Mandatory**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.

2. **Analyze Project**
   - Run the analysis script to detect stack and project state:
     ```bash
     python3 .cursor/skills/cmd-init/scripts/analyze_project.py . > project_info.json
     ```
   - Read `project_info.json`.
   - **Decision Point**:
     - If `is_new` is `true` -> Treat as **Greenfield**.
     - If `is_new` is `false` -> Treat as **Brownfield**.

3. **Greenfield Workflow (Interview)**
   - **Condition**: Only if **Greenfield**.
   - **Action**: Launch the `interviewer` subagent.
     - **Subagent Type**: `interviewer`
     - **Prompt**: 
       "You are helping initialize a new (Greenfield) project. Conduct a brief interview to gather:
       1. **Project Name**: Name?
       2. **Goal/Vision**: Purpose?
       3. **Tech Stack**: Languages/Frameworks? (If not detected)
       4. **Architecture**: Patterns?
       5. **Key Decisions**: Tools/Methodologies?
       
       Return a SINGLE JSON object:
       {
         "project_name": "...",
         "stack": ["..."],
         "architecture": "...",
         "key_decisions": "...",
         "preferences": ["tdd", "strict-mode", ...]
       }"
   - **Save Output**: Save to `interview_data.json`.

4. **Brownfield Workflow (Discovery)**
   - **Condition**: Only if **Brownfield**.
   - **Action**: Create an empty `interview_data.json` (discovery happens in generation script).
     ```bash
     echo "{}" > interview_data.json
     ```

5. **Generate Assets & Scaffolding**
   - Run the generation script. This script handles:
     - **Greenfield**: Creates `documents/`, `.gitignore`, `.editorconfig`, task runner configs, and `AGENTS.md`.
     - **Brownfield**: Creates `documents/` (if missing), populates `architecture.md` with file tree/README, generates `.cursorignore`, and `AGENTS.md`.
     ```bash
     python3 .cursor/skills/cmd-init/scripts/generate_agents.py project_info.json interview_data.json .cursor/skills/cmd-init/assets/AGENTS.template.md AGENTS.md .cursor/skills/cmd-init/assets/rules .cursor/rules
     ```

6. **Cleanup & Verify**
   - Remove temporary files: `rm project_info.json interview_data.json`.
   - Verify `AGENTS.md` exists.
   - Verify `documents/` folder exists.
   - Verify `.cursor/rules` are populated.
</step_by_step>

## Verification
<verification>
[ ] `project_info.json` generated.
[ ] Interview conducted (Greenfield) or skipped (Brownfield).
[ ] `documents/` folder created with placeholders.
[ ] `.cursorignore` created.
[ ] `AGENTS.md` generated.
[ ] Rules copied.
</verification>
