---
name: flow-init
description: Initialize project with AGENTS.md and rules, handling both Greenfield (new) and Brownfield (existing) projects.
disable-model-invocation: true
---

# Task: Initialize Project Agent Documentation

## Overview

Analyze the project, conduct an interview (for Greenfield projects), and
generate `AGENTS.md`, rules, and scaffolding.

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
3. **Idempotency (Brownfield)**: If components (AGENTS.md, rules, documents) already exist, ask for confirmation before overwriting.
4. **Greenfield/Brownfield Detection**: The agent determines project type autonomously by analyzing output of the analysis script (file count, stack, file tree, presence of config files). Do NOT rely on an `is_new` flag from any script.
5. **Scripts are read-only**: Analysis scripts must NOT create, write, or modify any files. All file creation is the agent's responsibility.
6. **No rule copying**: Do NOT copy rules to IDE-specific rules directories. Rule management is outside flow-init scope.
7. **Mandatory**: The agent MUST use a task management tool (e.g., todo write) to track the execution steps.
</rules>

## Instructions

<step_by_step>

1. **Initialize**
   - Use a task management tool (e.g., todo write) to create a plan based on these steps.

2. **Analyze Project**
   - Run the analysis script to detect stack and project state.
     ```bash
     python3 scripts/analyze_project.py . > project_info.json
     ```
   - Read `project_info.json`.
   - **Decision Point** (agent judgment, NOT a script flag):
     - Analyze file count, presence of source files, config files and existing documentation.
     - If project appears empty or minimal (no source files, no meaningful configs) → treat as **Greenfield**.
     - If project has existing code, configs, or documentation → treat as **Brownfield**.

3. **Greenfield Workflow (Interview)**
   - **Condition**: Only if **Greenfield**.
   - **Action**: Launch the `interviewer` subagent (or conduct Q&A inline if subagent unavailable).
     - **Prompt**: "You are helping initialize a new (Greenfield) project.
       Conduct a brief interview to gather:
       1. **Project Name**: Name?
       2. **Vision Statement**: What is the long-term goal and value?
       3. **Target Audience**: Who is this for?
       4. **Problem Statement**: What problem are we solving?
       5. **Solution & Differentiators**: How do we solve it and why is it better?
       6. **Risks & Assumptions**: What could go wrong?
       7. **Tech Stack**: Languages/Frameworks? (If not detected)
       8. **Architecture**: Patterns?
       9. **Key Decisions**: Tools/Methodologies?
       10. **Deno Tooling**: Do you want to build tooling around the project on Deno? (yes/no)

       Return a SINGLE JSON object: {
       "project_name": "...",
       "vision_statement": "...",
       "target_audience": "...",
       "problem_statement": "...",
       "solution_differentiators": "...",
       "risks_assumptions": "...",
       "stack": ["..."],
       "architecture": "...",
       "key_decisions": "...",
       "preferences": ["tdd", "strict-mode", ...],
       "use_deno_tooling": boolean
       }"
   - **Save Output**: Save to `interview_data.json`.

4. **Brownfield Workflow (Discovery)**
   - **Condition**: Only if **Brownfield**.
   - **Action**: Analyze the project to infer architecture and key decisions.
     - Read `project_info.json` and key config files (`package.json`, `deno.json`, `README.md`, etc.).
     - Infer:
       - **Architecture**: (e.g., "React SPA", "Express API", "CLI Tool").
       - **Key Decisions**: (e.g., "Tailwind for styling", "Jest for testing").
     - **Extract PROJECT_RULES**: If `AGENTS.md` exists, extract content between two `---` markers (excluding the markers) as `project_rules`.
     - **Create `interview_data.json`** with inferred data (write using file editing tools, not shell redirection).

5. **Component Inventory (Brownfield only)**
   - **Condition**: Only if **Brownfield**.
   - **Action**: Check existence of each component:
     - `AGENTS.md` - exists?
     - `documents/` - exists? Which files inside?
     - IDE rules directory (e.g., `.cursor/rules/`, `.claude/rules/`, etc.) - exists? Which rules?
     - `scripts/` or dev command config - exists?
   - Report findings to user as a checklist and ask: "Create missing components? Override existing? [create missing / override all / select]"

6. **Generate Assets & Scaffolding**
   - Determine flags for `generate_agents.py` based on Component Inventory (e.g., `--no-overwrite-agents`, `--no-overwrite-rules`).
   - Run the generation script (path depends on IDE, same as step 2):
     ```bash
     python3 scripts/generate_agents.py project_info.json interview_data.json assets/AGENTS.template.md AGENTS.md assets/rules <ide-rules-dir> [--no-overwrite-agents] [--no-overwrite-rules]
     ```
   - Where `<ide-rules-dir>` is the IDE-specific rules directory (e.g., `.cursor/rules`, `.claude/rules`, `.agent/rules`).

7. **Generate Documentation**
   - **Action**: Generate the core documentation files in `documents/` using the templates defined in `AGENTS.md`.
   - **Files to Generate**:
     - `documents/requirements.md` (SRS): Fill based on `interview_data.json` (Greenfield) or inferred context (Brownfield).
     - `documents/design.md` (SDS): Create initial structure.
     - `documents/whiteboard.md`:
       - For **Brownfield**: Include "Discovered Context" (file tree from `project_info.json`) and a summary of the README.
       - For **Greenfield**: Initialize with empty notes.
   - **Note**: Do NOT use a script for this. Use LLM capabilities to generate high-quality, context-aware content from actual project data — not empty placeholders.

8. **Configure Development Commands**
   - Read `project_info.json` to get detected stack.
   - **Check Interview Data**: If `interview_data.json` has `use_deno_tooling: true`, FORCE usage of `flow-skill-configure-deno-commands`.
   - **Skill Lookup**: For each stack item, check if a specialized skill exists (e.g., `Deno` -> `flow-skill-configure-deno-commands`).
   - If specialized skill exists: Read and follow its `SKILL.md`.
   - If NO specialized skill:
     1. Ask user for preferred scripting language (shell/python/stack-native).
     2. Analyze existing config files.
     3. Create standard command interface (`check`, `test`, `dev`, `prod`) in `scripts/`.
     4. Update project config (e.g., `package.json`) to reference these scripts.
   - **Skip condition**: If `scripts/` already exists with standard commands and user chose "create missing" -> skip.
   - **Verify**: Run `check` command to ensure it works.

9. **Cleanup & Verify**
   - Remove temporary files: `project_info.json`, `interview_data.json`.
   - Verify `AGENTS.md` exists.
   - Verify `documents/` folder exists.
   - Verify development commands are configured and the `check` command runs successfully. </step_by_step>

## Verification

<verification>
[ ] `project_info.json` generated and read.
[ ] Greenfield/Brownfield determined by agent judgment (not `is_new` flag).
[ ] Interview conducted (Greenfield) or skipped (Brownfield).
[ ] Component inventory checked (Brownfield).
[ ] Existing components preserved unless user confirmed overwrite.
[ ] `documents/` folder populated with generated content from actual project data.
[ ] `AGENTS.md` generated (or preserved).
[ ] Rules generated into IDE-appropriate directory (or preserved).
[ ] Development commands configured (scripts created + config updated).
[ ] Check command runs successfully.
[ ] Temporary files cleaned up.
</verification>
