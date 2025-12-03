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
    Cursor -->|Reads| Rules[.cursor/rules/*.mdc]
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
- **Interfaces:** Markdown files starting with `task-` or `alpha-task-`.
- **Dependencies:** User input, existing codebase.
- **Key Files:**
  - `task-analyze-error.md`: Error analysis workflow.
  - `task-answer.md`: Question answering with codebase context.
  - `task-check.md`: Quick project validation.
  - `task-commit.md`: Conventional Commits workflow.
  - `task-create-command.md`: Command creation utility.
  - `task-create-run-ts-script.md`: Maintenance script generation.
  - `task-execute.md`: Task implementation workflow.
  - `task-fix.md`: Error fixing and testing.
  - `task-github-issue-create.md`: GitHub issue management.
  - `task-investigate.md`: Deep codebase investigation.
  - `task-plan.md`: Task planning and breakdown.
  - `task-review.md`: Code review workflow.
  - `task-update-docs.md`: Documentation maintenance.
  - `alpha-task-build-claude-md.md`: Experimental Claude.md generation.

### 3.2 Context Rules (`.cursor/rules/`)
- **Purpose:** Provide automatic context to the LLM for code generation, style, and behavior.
- **Interfaces:** `.mdc` files loaded by Cursor based on file globs or context.
- **Dependencies:** None.
- **Key Files:**
  - `rules-code-style-*.mdc`: Language-specific coding standards (TypeScript, Swift, Fullstack).
  - `rules-*.mdc`: Core behavioral frameworks (Autonomous, TDD, Zen, GODS, PoC).
  - `howto-*.mdc`: Practical guides for workflows and tools (9 guides total).
  - `docs-schema-*.mdc`: Documentation templates and schemas.
  - `rule-design-style-guide.mdc`: Design principles and guidelines.
  - `run-commands.mdc`: Command execution rules.

### 3.3 Project Documentation (`documents/`)
- **Purpose:** Serve as the long-term memory of the project.
- **Interfaces:** Markdown files following SRS/SDS or Cline-bank schema.
- **Dependencies:** Updated by `task-update-docs`.

### 3.4 Project Maintenance (`run.ts`)
- **Purpose:** Provide automated project maintenance and quality assurance.
- **Interfaces:** Deno-based CLI script with commands (check, test, dev).
- **Dependencies:** Deno runtime, project source files.
- **Key Features:**
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
  - **Rule Matching:** Cursor matches open files/context against `.mdc` globs.
- **Business rules:**
  - All commands must start with `/task-`.
  - Documentation must be kept up-to-date with code changes.
  - Code changes must follow defined style rules.

## 6. Non-functional Aspects
- **Scalability:** Modular file structure allows easy addition of new rules.
- **Fault tolerance:** Text-based instructions are robust; agent error recovery is handled via interactive chat.
- **Security:** Rules are local to the project; no external data leakage unless explicitly configured via MCP.
- **Monitoring and logging:** Git history tracks changes to rules and docs.

## 7. Constraints and Trade-offs
- **Simplified:** No centralized database; relies on file system.
- **Deferred:** Automated regression testing of rules (currently manual/heuristic).

## 8. Future Extensions
- Integration with other AI IDEs.
- Automated validation scripts for rule syntax.
- Dynamic rule generation based on project analysis.

