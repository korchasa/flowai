# AI Roles Collection

A collection of Cursor rules, designed to standardize work across various software development contexts.

!!!WARNING!!!
DO NOT USE THIS FILES AS IS. YOU MUST MODIFY THEM TO FIT YOUR PROJECT AND YOUR STYLE OF WORK.

## Developer Workflow

This section provides clear instructions on when and what tools to use during the development lifecycle.

### 1. Start of Project
**Goal**: Ensure the environment is ready and the project base is solid.

*   **Initialize Project**: Use `/init` to set up the project structure and initial documentation if starting fresh.
*   **Define Vision**: Use `/create-vision-doc` to create or update the project vision in `documents/vision.md`.

### 2. For Each Task
**Goal**: Implement features or fixes with high quality and documentation coverage.

1.  **Plan**: Use `/plan` to analyze the request, break it down into steps, and create a plan.
2.  **Execute**: Use `/do` (or `/execute`) to write code. This ensures adherence to TDD and documentation updates.
3.  **Verify**:
    *   Run `deno task test` to check specific tests.
    *   **MANDATORY**: Run `deno task check` before completion to ensure the entire project is healthy.
4.  **Commit**: Use `/commit` to generate a Conventional Commits compliant message and commit changes.
   
### 3. Periodic Maintenance
**Goal**: Keep the project clean, documented, and up-to-date.

*   **Health Check**: Run `/check` or `deno task check` regularly to catch regressions.
*   **Documentation Audit**: Use `/docs-check` to verify documentation integrity and consistency.
*   **Update Agents**: Run `deno task check` to ensure all rules are consistent. (Note: `build-agents-md` is deprecated).

### 4. Specific cases
*   **Deep Investigation**: Use `/investigate` if you encounter complex bugs or unexplained behavior.
*   **Engineering Utilities**: Use `/engineer-prompt`, `/engineer-rule`, or `/engineer-command` when creating or refining AI instructions.
*   **Codebase Q&A**: Use `/answer` to get explanations or find logic within the project.
*   **Maintenance Audit**: Use `/maintenance` for a comprehensive project health check and optimization suggestions.

## Using Commands in Cursor

Cursor supports custom commands that create reusable workflows launched with `/` prefix in chat input. This helps standardize team processes and speeds up typical tasks.

### How Commands Work

1. Commands are stored in `.cursor/commands/` directory as `.md` files
2. Type `/` in chat to see available commands
3. Commands provide structured workflows for development activities
4. Each command contains detailed instructions for specific tasks

### Available Commands

Use these commands by typing `/` in Cursor chat:

- `/answer` - Answer questions with context from codebase
- `/check` - **Quick check**: run `deno task check` + read-only error analysis
- `/commit` - Git commit workflow following Conventional Commits
- `/create-deno-scripts` - Create the Deno task scripts
- `/create-vision-doc` - Create vision documentation
- `/do` - General task execution workflow
- `/docs-check` - Documentation consistency and integrity check
- `/engineer-command` - Command engineering (Create/Edit) utility
- `/engineer-prompt` - Prompt engineering utility
- `/engineer-rule` - Rule engineering utility
- `/execute` - Execute and implement planned tasks
- `/init` - Project initialization workflow
- `/investigate` - Deep investigation and root cause diagnosis
- `/maintenance` - Project maintenance and health audit
- `/migrate-run-ts` - Migration to Deno tasks
- `/plan` - Plan and break down complex development tasks
- `/update-docs` - Update project documentation

For more information, see [Cursor Commands Documentation](https://cursor.com/docs/agent/chat/commands).

## Framework

The core philosophy is to collaborate with the agent using explicit workflows and rigid verification, while maintaining all context in the repository.

### Key Principles

1.  **Agent-Driven Workflow**: The agent operates within defined boundaries using `/` to switch contexts (Planning, Execution, Review).
2.  **Structured Knowledge**:
    *   **Commands** (`.cursor/commands/`): Interactive workflows for the agent.
    *   **Rules** (`.cursor/rules/`): Best practices, code styles, and how-to guides.
    *   **Documentation** (`documents/`): The "Long-Term Memory" of the project. All architectural decisions and requirements must be recorded here.
3.  **Unified Verification**:
    *   `deno task check` is the single source of truth for project health.
    *   If `deno task check` fails, the task is not complete.
4.  **Zero-Config Dev**:
    *   All project scripts are centralized in `deno.json`.
    *   No hidden dependencies or manual setup steps.

### Architecture

*   **Stages** (`.md`): Manual entry points for different phases of work.
*   **Rules** (`rules-*`): Always-active guidelines (TDD, Code Style).
*   **Docs Schemas** (`docs-schema-*`): Templates for documentation.
*   **How-To** (`howto-*`): Context-sensitive guides for specific problems.

## Available Components

### Task Commands
Task commands provide guided workflows for specific development activities (use with `/` in Cursor chat):

- `answer.md` - Answer questions with context
- `check.md` - **Quick check**: run `deno task check` + read-only error analysis
- `commit.md` - Commit workflow following Conventional Commits (strict)
- `create-deno-scripts.md` - Create the Deno task scripts
- `create-vision-doc.md` - Create vision documentation
- `do.md` - General task execution workflow
- `docs-check.md` - Documentation consistency and integrity check
- `engineer-command.md` - Command engineering (Create/Edit) utility
- `engineer-prompt.md` - Prompt engineering utility
- `engineer-rule.md` - Rule engineering utility
- `execute.md` - Execute and implement planned tasks
- `init.md` - Project initialization workflow
- `investigate.md` - Deep investigation and root cause diagnosis
- `maintenance.md` - Project maintenance and health audit
- `migrate-run-ts.md` - Migration to Deno tasks
- `plan.md` - Plan and break down complex development tasks
- `update-docs.md` - Update project documentation

### Documentation Rules
Documentation schemas and guidelines (stored in `.cursor/rules/`):

- `docs-schema-rds-sds/` - RDS-SDS documentation schema (4 files)
- `docs-schema-vision-rds-sds/` - Vision RDS-SDS documentation schema

### How-to Guides
Practical guides for common development scenarios (stored in `.cursor/rules/`):

- `howto-commit-changes/` - How to commit changes following repository rules
- `howto-compact-docs/` - How to write documentation in compact style
- `howto-conduct-qa-session/` - How to conduct a QA session
- `howto-debug-by-playwright/` - Manually test or debug using Playwright MCP tools
- `howto-engineer-prompts-*/` - Prompt engineering guides (instant/reasoning)
- `howto-fix-tests/` - How to fix failing tests
- `howto-manage-github-tickets-by-mcp/` - How to manage GitHub tickets using MCP
- `howto-working-with-git/` - How to work with git in this repository
- `howto-write-gods-tasks/` - How to write tasks using GODS framework
- `howto-write-in-informational-style/` - How to write in informational style
- `howto-write-prd/` - How to write PRD

### Development Rules
Rules that govern development practices and code quality (stored in `.cursor/rules/`):

- `rules-autonomous/` - Autonomous mode development principles
- `rules-code-style-*/` - Language-specific code style guidelines (Fullstack, Go, Swift, TS strict, TS deno)
- `rules-design-style-guide/` - Design style guide rules
- `rules-poc/` - Proof of Concept (PoC) mode rules
- `rules-run-commands/` - Command execution rules
- `rules-tdd/` - Test-Driven Development rules and flow
- `rules-zen/` - Zen principles for clean development
- `skill-creator/` - Skill authoring guide with templates and scripts

### Project Maintenance
- `run-commands/` - CLI commands description (`deno task`)

## License

The project is distributed under the MIT license.