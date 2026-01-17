# AI Roles Collection

A collection of Cursor rules, designed to standardize work across various software development contexts.

!!!WARNING!!!
DO NOT USE THIS FILES AS IS. YOU MUST MODIFY THEM TO FIT YOUR PROJECT AND YOUR STYLE OF WORK.

## Using Commands in Cursor

Cursor supports custom commands that create reusable workflows launched with `/` prefix in chat input. This helps standardize team processes and speeds up typical tasks.

### How Commands Work

1. Commands are stored in `.cursor/commands/` directory as `.md` files
2. Type `/` in chat to see available commands
3. Commands provide structured workflows for development activities
4. Each command contains detailed instructions for specific tasks

### Available Commands

Use these commands by typing `/<command>` in Cursor chat:

- `/answer` - Answer questions with context from codebase
- `/build-agents-md` - Generate optimized AGENTS.md from rules files
- `/check` - **Quick check**: run `deno task check` + read-only error analysis
- `/commit` - Git commit workflow following Conventional Commits
- `/create-run-ts-script` - Create the Deno task scripts
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

The main idea is to work together with the agent, keeping control over the process and acting as a guardrail between stages, explicitly switching them using `/<command>` syntax.

Key Principles:
- instruction unification (in progress): setting up a new project should boil down to selecting instructions and editing `main.mdc`;
- splitting instructions into types:
  - Stages (Manual Apply): stages of work over the project (`<command>.md`);
  - Rules (Always Apply): working rules: tdd, code style, etc (`rules-*`);
  - Documentation (Always Apply): documentation guidelines (`docs-schema-*`);
  - Project Maintenance (Always Apply): list of console commands for project maintenance (`rules-run-commands`);
  - Howto (Apply Intelligent): automatic instructions for situational tasks that may arise for the model during work (`howto-*`);
- documentation as the agent's long-term memory:
  - all project documentation must reside in the repository;
  - two documentation schema options: cline-bank (7 files) and simplified (Software Requirements Specification + Software Design Specification, 4 files);
  - documentation in a compact style, and there is a dedicated task for its compacting;
- saving the current task into a file (`./documents/whiteboard.md`) for transfer between chats and stages;
- maximum automatic regression control: the entire project verification reduces to a single command (`deno task check`), so the agent cannot perform only part of the checks; the same command is used in CI;
- a single list for invoking all project commands (`deno task`).

## Available Components

### Task Commands
Task commands provide guided workflows for specific development activities (use with `/<command>` in Cursor chat):

- `answer.md` - Answer questions with context
- `build-agents-md.md` - Generate optimized AGENTS.md from rules files
- `check.md` - **Quick check**: run `deno task check` + read-only error analysis
- `commit.md` - Commit workflow following Conventional Commits (strict)
- `create-run-ts-script.md` - Create the Deno task scripts
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

- `docs-schema-cline-bank/` - Cline-bank documentation schema (7 files)
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
