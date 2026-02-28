# AssistFlow

An Assisted Engineering framework: the developer remains the architect and reviewer, while AI handles implementation under supervision.

The developer sets the task, approves the plan, and controls every diff.

> **WARNING:** Do not use these files as-is. Adapt them to your project and working style.

## The Assisted Engineering Paradigm

Assisted Engineering is a development model where the human retains full authority over architecture, design decisions, and final acceptance. AI acts as an executor — it writes code, runs checks, and proposes changes, but every meaningful action requires explicit developer approval.

**Division of responsibility:**

- **Developer (Architect + Reviewer)**
  - Defines goals and constraints
  - Reviews and approves plans before implementation
  - Inspects every diff before commit
  - Makes architectural decisions
  - Accepts or rejects results

- **AI Agent (Executor)**
  - Analyzes the codebase and gathers context
  - Proposes implementation plans
  - Writes code following approved plan
  - Runs tests and verification
  - Prepares atomic commits for review

**Control flow:**

```
Developer: sets task
    → AI: proposes plan
        → Developer: reviews plan, approves or adjusts
            → AI: implements step by step
                → Developer: reviews each diff
                    → AI: commits approved changes
```

## Installation

Install AssistFlow skills and agents into your IDE config directories (`~/.cursor/`, `~/.claude/`, `~/.config/opencode/`).

**One-liner (requires [Deno](https://deno.land)):**

```sh
deno run --reload -A https://raw.githubusercontent.com/korchasa/flow/main/scripts/install.ts
```

**Update to latest version:**

```sh
deno run --reload -A https://raw.githubusercontent.com/korchasa/flow/main/scripts/install.ts --update
```

**What happens:**

1. The installer clones the repository into `~/.assistflow/` (shallow, ~1MB)
2. Detects which IDEs you have installed (Cursor, Claude Code, OpenCode)
3. Shows a plan of symlinks to create and asks for confirmation
4. Creates per-item symlinks for each skill and agent — your own files are never touched

Re-running is safe (idempotent). Stale symlinks from removed framework items are cleaned up automatically.

**From a local clone:**

```sh
git clone https://github.com/korchasa/flow.git
cd flow
deno task install
```

## Development Setup

For contributors working on AssistFlow itself (not end-user installation):

**Prerequisites:** [Deno](https://deno.land), Git

```sh
git clone https://github.com/korchasa/flow.git
cd flow
deno task link
```

`deno task link` creates symlinks from `.dev/` (the single source of truth for dev resources) to IDE-specific directories:

- `.dev/skills/` -> `.cursor/skills/`, `.claude/skills/`, `.opencode/skills/`
- `.dev/agents/` -> `.cursor/agents/`, `.claude/agents/`, `.opencode/agents/`
- `.dev/hooks/`, `.dev/hooks.json` -> `.cursor/hooks/`, `.cursor/hooks.json` (Cursor-only)

The command is idempotent — safe to run multiple times. It will not overwrite existing real files (warns and skips instead).

Alternatively, `deno task dev` runs `link` automatically on startup.

**Verify setup:**

```sh
deno task check
```

## How It Works

AssistFlow is a set of **Skills** and **Agents** — markdown instruction files that AI coding assistants (Cursor, Claude Code, OpenCode, etc.) load into context to follow structured workflows.

- **Skills** (`SKILL.md`) — step-by-step workflows for specific tasks
- **Agents** (`.md`) — role definitions with specialized capabilities
- **Documentation** (`documents/`) — persistent project memory across sessions

AI models lose context between sessions. AssistFlow compensates by storing all decisions, requirements, and architecture in structured docs that the agent reads at the start of every session.

### Product vs. Development Tooling

This repository contains two distinct layers. Do not confuse them:

- **`framework/`** — **the product itself**. Skills and agents that users copy into their projects (into `.cursor/skills/`, `.claude/`, etc.). This is what AssistFlow distributes.
- **`.cursor/`, `.claude/`** — **internal development tooling**. Skills and agents used to develop AssistFlow itself (benchmark runner, cursor-agent integration, code generation helpers). These are not part of the product and are not distributed to users.

## Developer Workflow

### 1. Project Setup

Initialize the project structure and documentation:

- Run `flow-init` to analyze the codebase and generate `AGENTS.md`, SRS, SDS
- Configure development commands for your stack

### 2. Task Cycle

Every task follows the same supervised loop:

1. **Task** — describe what needs to be done
2. **Plan** (`flow-plan`) — AI proposes a plan in GODS format. You review, adjust, approve
3. **Execute** — AI implements the approved plan. You watch the diffs
4. **Verify** — `deno task check` (or your project's equivalent) must pass. No exceptions
5. **Commit** (`flow-commit`) — AI prepares atomic commits. You review before push

### 3. Maintenance

- `flow-maintenance` — project health audit
- `flow-investigate` — root cause analysis for complex bugs
- `flow-answer` — codebase Q&A without modifications

## Available Skills

### Core Workflow (daily use)

- `flow-init` — project initialization
- `flow-plan` — task planning (GODS format)
- `flow-commit` — atomic commits with QA
- `flow-qa` — quality assurance checks
- `flow-reflect` — self-analysis of recent work
- `flow-maintenance` — project health check
- `flow-investigate` — deep bug investigation
- `flow-answer` — codebase questions

### Extending AssistFlow

- `flow-engineer-command` — create/modify a command
- `flow-engineer-skill` — create/modify a skill
- `flow-engineer-rule` — create/modify a rule
- `flow-engineer-hook` — create/modify a hook
- `flow-engineer-subagent` — create/modify a subagent

### Setup & Configuration

- `flow-setup-code-style-ts-deno` — Deno/TS code style
- `flow-setup-code-style-ts-strict` — strict TypeScript
- `flow-skill-configure-deno-commands` — configure Deno tasks
- `flow-skill-ai-skel-ts` — scaffold AI agent skeleton

### Specialized Skills

- `flow-skill-draw-mermaid-diagrams` — Mermaid diagrams
- `flow-skill-write-agent-benchmarks` — agent benchmarks
- `flow-skill-write-dep` — Development Enhancement Proposals
- `flow-skill-write-gods-tasks` — GODS-format tasks
- `flow-skill-write-prd` — Product Requirements Documents
- `flow-skill-write-in-informational-style` — informational writing style
- `flow-skill-manage-github-tickets-by-mcp` — GitHub issue management
- `flow-skill-playwright-cli` — browser automation
- `flow-skill-fix-tests` — fix failing tests
- `flow-skill-conduct-qa-session` — Q&A sessions
- `flow-skill-analyze-context` — token usage analysis
- `flow-skill-deep-research` — multi-source web research
- `flow-skill-engineer-prompts-for-instant` — prompts for fast models
- `flow-skill-engineer-prompts-for-reasoning` — prompts for reasoning models
- `flow-skill-deno-cli` — Deno CLI operations
- `flow-skill-deno-deploy` — Deno Deploy management

## Key Principles

1. **Developer controls, AI executes** — no autonomous commits, no unsupervised architectural changes
2. **Explicit workflows** — every task type has a defined skill with clear steps
3. **Persistent memory** — documentation in `documents/` bridges the gap between sessions
4. **Single verification gate** — `deno task check` is the source of truth for project health
5. **IDE-agnostic** — skills work across Cursor, Claude Code, OpenCode, and other AI-assisted editors

## Project Structure

```
framework/              # THE PRODUCT — distributed to users
  skills/               #   Skills (SKILL.md per folder)
  agents/               #   Agents (.md files)
documents/              # Project documentation (SRS, SDS, whiteboard)
scripts/                # Deno task scripts
benchmarks/             # Evidence-based agent benchmarks
AGENTS.md               # Project vision, rules, agent instructions

.cursor/                # INTERNAL — AssistFlow development tooling (not distributed)
  skills/               #   Dev-only skills (benchmarks, code generation, etc.)
  agents/               #   Dev-only agents (benchmark-runner, etc.)
.claude/                # INTERNAL — Claude Code settings for this repo
```

## Documentation as Memory

Documentation is not optional — it is the only mechanism that preserves context between AI sessions.

- **`AGENTS.md`** — project vision, constraints, mandatory rules
- **`requirements.md` (SRS)** — functional and non-functional requirements
- **`design.md` (SDS)** — architecture, components, data models
- **`whiteboard.md`** — current task plan (GODS: Goal, Overview, Done, Solution)

The agent reads these at session start. If the docs are outdated, the agent works with wrong assumptions. Keep them accurate.

## License

MIT
