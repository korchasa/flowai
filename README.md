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

Install AssistFlow skills and agents into your IDE config directories (`~/.cursor/`, `~/.claude/`, `~/.config/opencode/`) using [flow-cli](https://github.com/korchasa/flow-cli):

```sh
# Install flow-cli (see flow-cli README for full instructions)
# Then run:
flow-cli install
```

**What happens:**

1. flow-cli reads canonical skill and agent definitions from this repository
2. Detects which IDEs you have installed (Cursor, Claude Code, OpenCode)
3. Transforms resources into IDE-specific format (adds required frontmatter per IDE)
4. Copies files into IDE config directories — your own files are never touched

Re-running is safe (idempotent). See the [flow-cli README](https://github.com/korchasa/flow-cli) for detailed usage.

## Development Setup

For contributors working on AssistFlow itself (not end-user installation):

**Prerequisites:** [Deno](https://deno.land), Git

```sh
git clone https://github.com/korchasa/flow.git
cd flow
deno task check
```

Dev-only skills and agents live directly in `.claude/skills/` and `.claude/agents/` (tracked in git). Framework skills/agents are installed by flow-cli from remote via `.flow.yaml`.

## How It Works

AssistFlow is a set of **Skills** and **Agents** — markdown instruction files that AI coding assistants (Cursor, Claude Code, OpenCode, etc.) load into context to follow structured workflows.

- **Skills** (`SKILL.md`) — step-by-step workflows for specific tasks
- **Agents** (`.md`) — role definitions with specialized capabilities
- **Documentation** (`documents/`) — persistent project memory across sessions

AI models lose context between sessions. AssistFlow compensates by storing all decisions, requirements, and architecture in structured docs that the agent reads at the start of every session.

### Product vs. Development Tooling

This repository contains two distinct layers. Do not confuse them:

- **`framework/`** — **the product itself**. Skills and agents that users install into their projects via `flow-cli`. This is what AssistFlow distributes.
- **`.claude/skills/`, `.claude/agents/`** — **internal development tooling**. Skills and agents used to develop AssistFlow itself (benchmark runner, cursor-agent integration, code generation helpers). These are NOT distributed to users. Tracked in git directly.

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
5. **Review & Commit** (`flow-review-and-commit`) — AI reviews changes, then prepares atomic commits. You review before push

### 3. Maintenance

- `flow-maintenance` — project health audit
- `flow-investigate` — root cause analysis for complex bugs
- `flow-answer` — codebase Q&A without modifications

## Available Skills

### Core Workflow (daily use)

- `flow-init` — project initialization
- `flow-plan` — task planning (GODS format)
- `flow-commit` — atomic commits with QA
- `flow-review` — QA + code review of current changes
- `flow-review-and-commit` — review quality, then commit if approved
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
- `flow-skill-cursor-agent-integration` — cursor-agent CLI integration
- `flow-skill-setup-ai-ide-devcontainer` — AI IDE devcontainer setup

## Key Principles

1. **Developer controls, AI executes** — no autonomous commits, no unsupervised architectural changes
2. **Explicit workflows** — every task type has a defined skill with clear steps
3. **Persistent memory** — documentation in `documents/` bridges the gap between sessions
4. **Single verification gate** — `deno task check` is the source of truth for project health
5. **IDE-agnostic** — skills work across Cursor, Claude Code, OpenCode, and other AI-assisted editors

## Project Structure

```
framework/              # THE PRODUCT — distributed to users via flow-cli
  skills/               #   Skills (SKILL.md per folder)
  agents/               #   Agents (universal .md files with all IDE fields)
flow-cli/               # Git submodule — distribution tool (transforms & installs)
documents/              # Project documentation (SRS, SDS, whiteboard)
scripts/                # Deno task scripts
benchmarks/             # Evidence-based agent benchmarks
AGENTS.md               # Project vision, rules, agent instructions
.flow.yaml              # flow-cli config (claude only)

.claude/                # INTERNAL — dev tooling + flow-cli installed resources
  skills/               #   Dev-only skills (tracked) + framework skills (via flow-cli)
  agents/               #   Dev-only agents (tracked) + framework agents (via flow-cli)
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
