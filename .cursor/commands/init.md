---
description: Analyze project structure and tooling to generate AGENTS.md
---

# Task: Initialize Project Agent Documentation

## Overview
Analyze the project (or specified folder) to identify tooling and architectural decisions, then generate an `AGENTS.md` file.

## Context
<context>
The user wants to bootstrap an AI agent's understanding of the project. The agent needs to autonomously explore the codebase, recognize the technology stack, understand the directory structure, and infer key architectural patterns. This information must be synthesized into a clear, structured `AGENTS.md` file that serves as a reference for future agent interactions.
</context>

## Rules & Constraints
<rules>
1. **No Hallucinations**: Only document tooling and architecture that is explicitly found in the codebase.
2. **Standard Format**: The `AGENTS.md` file must follow a consistent Markdown structure.
3. **Overwrite Safety**: If `AGENTS.md` exists, ask for confirmation before overwriting or append/merge if appropriate (default to asking).
4. **Mandatory**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.

2. **Analyze Tooling**
   - **Search** for dependency/configuration files:
     - Node/JS: `package.json`, `tsconfig.json`, `.eslintrc*`, `vite.config.*`, `next.config.*`.
     - Python: `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile`.
     - Rust: `Cargo.toml`.
     - Go: `go.mod`.
     - Docker: `Dockerfile`, `docker-compose.yml`.
     - CI/CD: `.github/workflows/`, `.gitlab-ci.yml`.
   - **Extract** key dependencies (frameworks, libraries) and scripts (build, test, lint).

3. **Analyze Architecture**
   - **List** the root directory structure to identify key folders (e.g., `src`, `app`, `components`, `api`, `lib`, `docs`).
   - **Read** `README.md` (if it exists) to understand the stated project purpose and architecture.
   - **Infer** patterns based on structure (e.g., `pages/` + `app/` -> Next.js App Router; `controllers/` + `models/` -> MVC).

4. **Synthesize AGENTS.md Content**
   - Draft the content starting with the **Mandatory Header**:
     ```markdown
     # YOU MUST

     - STRICTLY FOLLOW YOUR ROLE.
     - START PROCESSING USER INPUT BY READING THE DOCUMENTATION IN \`./documents\` AT BEGIN OF THE TASK.
     - FINISH PROCESSING USER INPUT BY RUNNING \`deno task check\` AND FIXING ALL FOUND ERRORS, WARNINGS, AND LINTING PROBLEMS.
     - YOU WILL BE REWARDED FOR FOLLOWING INSTRUCTIONS AND GOOD ANSWERS.
     - DO NOT USE STUBS IN THE CODE, AS I HAVE NO FINGERS, AND THIS IS A TRAUMA.
     - ALWAYS INDEPENDENTLY CHECK HYPOTHESES.
     - ALWAYS CHECK THE CHANGES MADE BY RUNNING THE APPROPRIATE TESTS OR SCRIPTS.
     - ALWAYS KEEP THE PROJECT IN WORKING CONDITION: WITHOUT ERRORS, WARNINGS, AND PROBLEMS IN THE FORMATER AND LINTER OUTPUT
     - STRICTLY FOLLOW TDD RULES.
     - ANSWER IN LANGUAGE OF THE USER QUERY.
     - WRITE ALL DOCUMENTATION IN ENGLISH IN INFORMATIONAL STYLE.
     - IF YOU SEE CONTRADICTIONS IN THE REQUEST OR CONTEXT, SAY ABOUT THEM, ASK THE NECESSARY QUESTIONS AND STOP.
     - DO NOT USE STUBS, "CRUTCHES", DECEPTIONS, OR OTHER PREMODS TO BYPASS CHECKS.

     ## REMEMBER

     AFTER EACH MEMORY RESET, YOU START COMPLETELY FROM SCRATCH. DOCUMENTATION IS THE ONLY LINK TO PREVIOUS WORK. IT MUST BE MAINTAINED WITH ACCURACY AND CLARITY, AS EFFECTIVENESS ENTIRELY DEPENDS ON ITS ACCURACY.
     ```
   - Follow with the dynamic sections:
     - `# Agent Reference: [Project Name]`
     - `## Tooling Stack`: List of languages, frameworks, build tools, and key libraries found.
     - `## Architecture`: Description of the folder structure and inferred design patterns.
     - `## Key Decisions`: Any explicit architectural choices found in docs or inferred (e.g., "Uses Tailwind for styling", "Uses Jest for testing").

5. **Create AGENTS.md**
   - **Write** the file to the project root (or specified folder).
   - `file_path`: `AGENTS.md` (or `[target_dir]/AGENTS.md`).

6. **Verify**
   - Check that `AGENTS.md` exists and contains the analyzed information.
</step_by_step>

## Verification
<verification>
[ ] Tooling analysis covers major package managers and config files.
[ ] Architecture analysis identifies key directories and patterns.
[ ] `AGENTS.md` is created in the correct location.
[ ] `AGENTS.md` contains "Tooling Stack" and "Architecture" sections.
</verification>
