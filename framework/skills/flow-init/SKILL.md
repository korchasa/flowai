---
name: flow-init
description: Initialize project with AGENTS.md and rules, handling both Greenfield (new) and Brownfield (existing) projects.
disable-model-invocation: true
---

# Task: Initialize Project Agent Documentation

## Overview

Analyze the project, conduct an interview (for Greenfield projects), and
generate 3 AGENTS.md files (root, documents/, scripts/), rules, and scaffolding.
Uses a declarative manifest (`manifest.json`) to define target file structure and
diff-based per-file updates for brownfield projects.

## Context

<context>
The user wants to bootstrap an AI agent's understanding of the project. The agent needs to autonomously explore the codebase, recognize the technology stack, understand the directory structure, and infer key architectural patterns.
- **Greenfield (New Projects)**: Requires interviewing the user, creating scaffolding (`documents/`, configs), and setting up rules.
- **Brownfield (Existing Projects)**: Requires discovery, reverse-engineering architecture into `documents/`, and indexing the project.

**File Structure**: flow-init generates 3 AGENTS.md files:
- `./AGENTS.md` — core agent rules, project metadata, planning rules, TDD flow
- `./documents/AGENTS.md` — documentation system rules (SRS/SDS/GODS formats, compressed style)
- `./scripts/AGENTS.md` — development commands (standard interface, detected commands)
</context>

## Rules & Constraints

<rules>
1. **No Hallucinations**: Only document tooling and architecture that is explicitly found in the codebase or provided by the user.
2. **Standard Format**: Generated files must follow the provided templates.
3. **Idempotency (Brownfield)**: If components already exist, show diffs and ask for per-file confirmation before applying changes.
4. **Greenfield/Brownfield Detection**: The agent determines project type autonomously by analyzing output of the analysis script (file count, stack, file tree, presence of config files). Do NOT rely on an `is_new` flag from any script.
5. **Scripts are read-only**: Analysis scripts must NOT create, write, or modify any files. All file creation is the agent's responsibility.
6. **No rule copying**: Do NOT copy rules to IDE-specific rules directories. Rule management is outside flow-init scope.
7. **Mandatory**: The agent MUST use a task management tool (e.g., todo write) to track the execution steps.
8. **Manifest-Driven**: Read `manifest.json` to determine which files to generate. Do NOT hardcode file paths or template names.
9. **Per-File Diff Confirmation**: For existing files, always show the diff to the user and ask for confirmation before applying. Never silently overwrite.
10. **Preserve User Content**: Content between `---` markers in root AGENTS.md (PROJECT_RULES) must be extracted and re-injected during updates.
</rules>

## Instructions

<step_by_step>

1. **Initialize**
   - Use a task management tool (e.g., todo write) to create a plan based on these steps.

2. **Analyze Project**
   - Run the analysis script to detect stack and project state.
     ```bash
     deno run --allow-read scripts/generate_agents.ts analyze . > project_info.json
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

5. **Read Manifest & Component Inventory**
   - Read `manifest.json` from skill assets directory.
   - For each file in `manifest.files`: check if target path exists in the project.
   - Also check:
     - `documents/` — exists? Which files inside?
     - IDE rules directory (e.g., `.cursor/rules/`, `.claude/rules/`, etc.) — exists?
     - `scripts/` or dev command config — exists?
   - Report findings to user as a checklist.
   - For **Brownfield**: ask "Create missing components? Update existing via diff? [create missing / update all / select]"

6. **Generate & Apply (Manifest-Driven, Per-File Diff Confirmation)**
   - Run the render command to generate all files and compute diffs:
     ```bash
     deno run --allow-read --allow-write scripts/generate_agents.ts render manifest.json interview_data.json .
     ```
   - Parse the JSON output. For each result:
     - **status: "created"** → File was missing. Report to user: "Created `<path>`."
       - Run apply: `deno run --allow-read --allow-write scripts/generate_agents.ts apply manifest.json interview_data.json <path> .`
     - **status: "up-to-date"** → No changes needed. Report: "`<path>` is up to date."
     - **status: "diff"** → File exists with differences.
       - Show the diff to the user.
       - Ask: "Apply changes to `<path>`? [y/n]"
       - If user confirms: run apply command for that file.
       - If user declines: skip, preserve existing file.

7. **OpenCode Compatibility Check**
   - Explain to user: "I need to check your OpenCode config to ensure subdirectory AGENTS.md files are discoverable by the IDE."
   - If `.opencode/` directory or `opencode.json` file exists:
     - Read `opencode.json`.
     - Check if `instructions` field includes globs for `documents/AGENTS.md` and `scripts/AGENTS.md`.
     - If missing: warn user and propose adding them (subdirectory AGENTS.md files won't be loaded by OpenCode without explicit config).

8. **Generate Documentation**
   - **Action**: Generate the core documentation files in `documents/` using the `generated_by_llm` entries in the manifest.
   - For each entry in `manifest.generated_by_llm`:
     - If the file exists and has more lines than `skip_if_lines_gt` → skip, notify user.
     - Otherwise, generate content using LLM capabilities:
       - `documents/requirements.md` (SRS): Fill based on `interview_data.json` (Greenfield) or inferred context (Brownfield).
       - `documents/design.md` (SDS): Create initial structure.
       - `documents/whiteboard.md`:
         - For **Brownfield**: Include "Discovered Context" (file tree from `project_info.json`) and a summary of the README.
         - For **Greenfield**: Initialize with empty notes.
   - **Note**: Do NOT use a script for this. Use LLM capabilities to generate high-quality, context-aware content from actual project data — not empty placeholders.

9. **Configure Development Commands**
   - Read `project_info.json` to get detected stack.
   - **Check Interview Data**: If `interview_data.json` has `use_deno_tooling: true`, FORCE usage of `flow-skill-configure-deno-commands`.
   - **Skill Lookup**: For each stack item, check if a specialized skill exists (e.g., `Deno` -> `flow-skill-configure-deno-commands`).
   - If specialized skill exists: Read and follow its `SKILL.md`.
   - If NO specialized skill:
     1. Ask user for preferred scripting language (shell/python/stack-native).
     2. Analyze existing config files.
     3. Create standard command interface (`check`, `test`, `dev`, `prod`) in `scripts/`.
     4. Update project config (e.g., `package.json`) to reference these scripts.
   - **Skip condition**: If `scripts/` already exists with standard commands and user chose "create missing" → skip.
   - **Verify**: Run `check` command to ensure it works.

10. **Cleanup & Verify**
    - Remove temporary files: `project_info.json`, `interview_data.json`.
    - Verify all 3 AGENTS.md files exist (root, documents/, scripts/).
    - Verify `documents/` folder exists with generated content.
    - Verify development commands are configured and the `check` command runs successfully.

</step_by_step>

## Verification

<verification>
[ ] `project_info.json` generated and read.
[ ] Greenfield/Brownfield determined by agent judgment (not `is_new` flag).
[ ] Interview conducted (Greenfield) or skipped (Brownfield).
[ ] Manifest read and component inventory checked.
[ ] For existing files: diffs shown and per-file confirmation requested.
[ ] Existing user content preserved (PROJECT_RULES, custom sections).
[ ] 3 AGENTS.md files generated: root, documents/, scripts/.
[ ] `documents/` folder populated with generated content from actual project data.
[ ] Development commands configured (scripts created + config updated).
[ ] OpenCode compatibility checked (if applicable).
[ ] Check command runs successfully.
[ ] Temporary files cleaned up.
</verification>
