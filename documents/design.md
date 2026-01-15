# Software Design Specification (SDS)

## 1. Introduction
- **Document purpose:** Detail the implementation and architecture of the AI-First IDE Rules and Commands project.
- **Relation to SRS:** Implements requirements defined in `documents/requirements.md`.

## 2. System Architecture
- **Overview diagram:**
  ```mermaid
  graph TD
    User[User] -->|Chat Input| Cursor[Cursor IDE]
    Cursor -->|Reads| Commands[.cursor/commands/*.md]
    Cursor -->|Reads| Rules[.cursor/rules/*/RULE.md]
    Cursor -->|Updates| Docs[documents/*.md]
    Cursor -->|Executes| Actions[Code/Git/MCP]
  ```
- **Main subsystems and their roles:**
  - **Commands Subsystem:** Defines procedural workflows (tasks).
  - **Rules Subsystem:** Defines static constraints and knowledge (context).
  - **Documentation Subsystem:** Stores project state and memory.

## 3. Components
### 3.1 Task Commands (`.cursor/commands/`)
- **Purpose:** Provide step-by-step instructions for specific development activities.
- **Interfaces:** Markdown files without the `task-` prefix (e.g., `check.md`).
- **Dependencies:** User input, existing codebase.
- **Key Files:**
  - `answer.md`: Question answering with codebase context.
  - `build-agents-md.md`: AGENTS.md generation workflow.
  - `check.md`: Quick project validation.
  - `commit.md`: Conventional Commits workflow.
  - `create-run-ts-script.md`: Maintenance script generation.
  - `create-vision-doc.md`: Vision document creation workflow.
  - `do.md`: General task execution workflow.
  - `engineer-command.md`: Command engineering (Create/Edit) utility.
  - `engineer-rule.md`: Rule creation utility.
  - `execute.md`: Task implementation workflow.
  - `init.md`: Project initialization workflow.
  - `investigate.md`: Investigation workflow.
  - `migrate-run-ts.md`: Migration workflow to Deno tasks.
  - `plan.md`: Task planning and breakdown.
  - `update-docs.md`: Documentation maintenance.
  - `write-skill.md`: Skill documentation workflow.

### 3.2 Context Rules (`.cursor/rules/`)
- **Purpose:** Provide automatic context to the LLM for code generation, style, and behavior.
- **Interfaces:** Directory-based `RULE.md` files with YAML frontmatter, loaded by Cursor based on file globs or context.
- **Dependencies:** None.
- **Key Directories:**
  - `rules-code-style-*/`: Language-specific coding standards (TypeScript strict/deno, Swift, Go, Fullstack).
  - `rules-*/`: Core behavioral frameworks (Autonomous, TDD, Zen, PoC).
  - `rules-design-style-guide/`: Design principles and guidelines.
  - `howto-*/`: Practical guides for workflows and tools (12 guides total).
  - `docs-schema-*/`: Documentation templates and schemas (RDS-SDS, vision RDS-SDS, Cline-bank).
  - `rules-run-commands/`: Command execution rules.
  - `skill-creator/`: Skill authoring guide with templates and scripts.

### 3.3 Project Documentation (`documents/`)
- **Purpose:** Serve as the long-term memory of the project.
- **Interfaces:** Markdown files following SRS/SDS or Cline-bank schema.
- **Dependencies:** Updated by `update-docs`.

### 3.4 Project Maintenance
- **Purpose:** Provide automated project maintenance and quality assurance.
- **Status:** Implemented - Deno tasks and scripts available.
- **Interfaces:** Deno tasks (`deno task check`, `deno task test`, `deno task dev`).
- **Dependencies:** Deno runtime, scripts in `./scripts/`.
- **Features:**
  - Automated code checking and validation
  - Test execution framework
  - Development server management

## 4. Data and Storage
- **Entities and attributes:**
  - **Rule:** Name, Content, Glob Pattern.
  - **Command:** Name, Steps, Checklist.
- **ER diagram:** N/A (File-based storage).
- **Migration policies:** Manual updates via git.

## 5. Algorithms and Logic
- **Key algorithms:**
  - **Command Parsing:** Cursor detects `/` and matches against `.cursor/commands` filenames.
  - **Rule Matching:** Cursor matches open files/context against RULE.md globs.
- **Business rules:**
  - All commands must start with `/` and match `.cursor/commands` filenames.
  - Documentation must be kept up-to-date with code changes.
  - Code changes must follow defined style rules.

## 6. Non-functional Aspects
- **Scalability:** Modular file structure allows easy addition of new rules.
- **Fault tolerance:** Text-based instructions are robust; agent error recovery is handled via interactive chat and the `AskQuestion` tool.
- **Security:** Rules are local to the project; no external data leakage unless explicitly configured via MCP.
- **Monitoring and logging:** Git history tracks changes to rules and docs.
- **Interactivity:** Support for explicit mode switching and structured questioning via dedicated tools.

## 7. Constraints and Trade-offs
- **Simplified:** No centralized database; relies on file system.
- **Deferred:** Automated regression testing of rules (currently manual/heuristic).

## 8. Future Extensions
- Integration with other AI IDEs.
- Automated validation scripts for rule syntax.
- Dynamic rule generation based on project analysis.

