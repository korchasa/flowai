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
- `/check` - **Quick check**: run `deno task check` + read-only error analysis without code modifications
- `/commit` - Git commit workflow following Conventional Commits
- `/create-command` - Create a new Cursor command
- `/create-run-ts-script` - Create the Deno task scripts
- `/do` - General task execution workflow
- `/execute` - Execute and implement planned tasks
- `/github-issue-create` - Create GitHub issues using GODS framework
- `/investigate-autonomous` - **Deep investigation**: autonomous root cause diagnosis
- `/investigate-step-by-step` - **Deep investigation**: user-controlled root cause diagnosis
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
  - Documentation (Always Apply): documentation guidelines (`docs-*`);
  - Project Maintenance (Always Apply): list of console commands for project maintenance (`run-commands.mdc`);
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
- `check.md` - **Quick check**: run `deno task check` + read-only error analysis without code modifications. Proposes solutions to user
- `commit.md` - Commit workflow following Conventional Commits (strict)
- `create-command.md` - Create a new Cursor command
- `create-run-ts-script.md` - Create the Deno task scripts
- `do.md` - General task execution workflow
- `execute.md` - Execute and implement planned tasks
- `github-issue-create.md` - Create GitHub issues using GODS framework
- `investigate-autonomous.md` - **Deep investigation**: autonomous root cause diagnosis
- `investigate-step-by-step.md` - **Deep investigation**: user-controlled root cause diagnosis
- `plan.md` - Plan and break down complex development tasks
- `update-docs.md` - Update project documentation

### Documentation Rules
Documentation schemas and guidelines:

- `docs-schema-cline-bank.mdc` - Cline-bank documentation schema (7 files)
- `docs-schema-rds-sds.mdc` - RDS-SDS documentation schema (4 files)

### How-to Guides
Practical guides for common development scenarios:

- `howto-commit-changes.mdc` - How to commit changes following repository rules
- `howto-compact-docs.mdc` - How to write documentation in compact style
- `howto-debug-by-playwright.mdc` - Manually test or debug using Playwright MCP tools
- `howto-fix-tests.mdc` - How to fix failing tests
- `howto-manage-github-tickets-by-mcp.mdc` - How to manage GitHub tickets using MCP
- `howto-working-with-git.mdc` - How to work with git in this repository
- `howto-write-in-informational-style.mdc` - How to write in informational style

### Development Rules
Rules that govern development practices and code quality:

- `rule-design-style-guide.mdc` - Design style guide rules
- `rules-autonomous.mdc` - Autonomous mode development principles
- `rules-code-style-fullstack.mdc` - Fullstack code style guidelines
- `rules-code-style-swift.mdc` - Swift code style rules
- `rules-code-style-ts-strict.mdc` - TypeScript strict mode rules
- `rules-code-style-ts-deno.mdc` - TypeScript Deno-specific rules
- `rules-gods.mdc` - GODS framework for issue creation and management
- `rules-poc.mdc` - Proof of Concept (PoC) mode rules
- `rules-tdd.mdc` - Test-Driven Development rules and flow
- `rules-zen.mdc` - Zen principles for clean development

### Project Maintenance
- `main-example.mdc` - Example main configuration file
- `run-commands.mdc` - CLI commands description (`deno task`)

## License

The project is distributed under the MIT license.
