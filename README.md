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

Requires [Deno](https://deno.land/) v2.x.

```sh
deno install -g -A jsr:@korchasa/flowai
flowai
```

On first run, `flowai` interactively creates `.flowai.yaml` to configure which skills/agents to sync.

## Updating

Run `/flowai-update` in your AI IDE. It handles the full update cycle:

1. Updates the `flowai` CLI to the latest version
2. Syncs skills and agents into IDE config directories
3. Detects convention changes in framework templates
4. Proposes per-file migrations for scaffolded artifacts (AGENTS.md, devcontainer, deno.json tasks) — with diffs and confirmation for each file

## Development Setup

For contributors working on AssistFlow itself (not end-user installation):

**Prerequisites:** [Deno](https://deno.land), Git

```sh
git clone https://github.com/korchasa/flowai.git
cd flowai
deno task check
```

Dev-only skills and agents live in `.claude/skills/` and `.claude/agents/` (tracked in git). Framework skills/agents are installed by flowai from bundled source.

## How It Works

AssistFlow is a set of **Skills** and **Agents** — markdown instruction files that AI coding assistants (Cursor, Claude Code, OpenCode, etc.) load into context to follow structured workflows.

- **Skills** (`SKILL.md`) — step-by-step workflows for specific tasks
- **Agents** (`.md`) — role definitions with specialized capabilities
- **Documentation** (`documents/`) — persistent project memory across sessions

AI models lose context between sessions. AssistFlow compensates by storing all decisions, requirements, and architecture in structured docs that the agent reads at the start of every session.

### Product vs. Development Tooling

This repository contains two distinct layers. Do not confuse them:

- **`framework/`** — **the product itself**. Skills and agents that users install into their projects via `flowai`. This is what AssistFlow distributes.
- **`.claude/skills/`, `.claude/agents/`** — **internal development tooling**. Skills and agents used to develop AssistFlow itself (benchmark runner, cursor-agent integration, code generation helpers). These are NOT distributed to users. Tracked in git directly.

## Developer Workflow

### 1. Project Setup

Initialize the project structure and documentation:

- Run `flowai-init` to analyze the codebase and generate `AGENTS.md`, SRS, SDS
- Configure development commands for your stack

### 2. Task Cycle

Every task follows the same supervised loop:

1. **Task** — describe what needs to be done
2. **Plan** (`flowai-plan`) — AI proposes a plan in GODS format. You review, adjust, approve
3. **Execute** — AI implements the approved plan. You watch the diffs
4. **Verify** — `deno task check` (or your project's equivalent) must pass. No exceptions
5. **Review & Commit** (`flowai-review-and-commit`) — AI reviews changes, then prepares atomic commits. You review before push

### 3. Maintenance

- `flowai-maintenance` — project health audit
- `flowai-investigate` — root cause analysis for complex bugs
- `flowai-answer` — codebase Q&A without modifications

## Available Skills

### Core Workflow (daily use)

- `flowai-init` — project initialization
- `flowai-plan` — task planning (GODS format)
- `flowai-commit` — atomic commits with QA and self-reflection
- `flowai-review` — QA + code review of current changes
- `flowai-review-and-commit` — review quality, then commit if approved
- `flowai-reflect` — self-analysis of recent work
- `flowai-maintenance` — project health check
- `flowai-investigate` — deep bug investigation
- `flowai-answer` — codebase questions
- `flowai-spec` — structured feature specification
- `flowai-update` — update AssistFlow framework (sync skills/agents, migrate artifacts)

### Extending AssistFlow (Skills)

- `flowai-skill-engineer-command` — create/modify a command
- `flowai-skill-engineer-skill` — create/modify a skill
- `flowai-skill-engineer-rule` — create/modify a rule
- `flowai-skill-engineer-hook` — create/modify a hook
- `flowai-skill-engineer-subagent` — create/modify a subagent

### Setup & Configuration

- `flowai-setup-agent-code-style-ts-deno` — Deno/TS code style
- `flowai-setup-agent-code-style-ts-strict` — strict TypeScript
- `flowai-skill-configure-deno-commands` — configure Deno tasks

### Specialized Skills

- `flowai-skill-draw-mermaid-diagrams` — Mermaid diagrams
- `flowai-skill-write-agent-benchmarks` — agent benchmarks
- `flowai-skill-write-dep` — Development Enhancement Proposals
- `flowai-skill-write-gods-tasks` — GODS-format tasks
- `flowai-skill-write-prd` — Product Requirements Documents
- `flowai-skill-write-in-informational-style` — informational writing style
- `flowai-skill-manage-github-tickets` — GitHub issue management
- `flowai-skill-browser-automation` — browser automation
- `flowai-skill-fix-tests` — fix failing tests
- `flowai-skill-conduct-qa-session` — Q&A sessions
- `flowai-skill-analyze-context` — token usage analysis
- `flowai-skill-deep-research` — multi-source web research
- `flowai-skill-engineer-prompts-for-instant` — prompts for fast models
- `flowai-skill-engineer-prompts-for-reasoning` — prompts for reasoning models
- `flowai-skill-deno-cli` — Deno CLI operations
- `flowai-skill-deno-deploy` — Deno Deploy management
- `flowai-skill-cursor-agent-integration` — cursor-agent CLI integration
- `flowai-skill-setup-ai-ide-devcontainer` — AI IDE devcontainer setup

### Agents

- `deep-research-worker` — research worker for deep research sub-tasks
- `flowai-console-expert` — complex console tasks and command execution
- `flowai-diff-specialist` — git diff analysis and atomic commit preparation
- `flowai-skill-executor` — executes specific skills by request

## Key Principles

1. **Developer controls, AI executes** — no autonomous commits, no unsupervised architectural changes
2. **Explicit workflows** — every task type has a defined skill with clear steps
3. **Persistent memory** — documentation in `documents/` bridges the gap between sessions
4. **Single verification gate** — `deno task check` is the source of truth for project health
5. **IDE-agnostic** — skills work across Cursor, Claude Code, OpenCode, and other AI-assisted editors

## Project Structure

```
framework/              # THE PRODUCT — distributed to users via flowai CLI
  skills/               #   Skills (SKILL.md per folder, benchmarks co-located)
  agents/               #   Agents (universal .md files with all IDE fields)
cli/                    # Distribution tool — published to JSR as @korchasa/flowai
  src/                  #   CLI source (BundledSource, sync, transform, plan)
  scripts/              #   Bundle script (generates bundled.json + _version.ts)
documents/              # Project documentation (SRS, SDS, whiteboard)
scripts/                # Deno task scripts + benchmark infrastructure
benchmarks/             # Benchmark runs, config, lock (scenarios in framework/skills/)
deno.json               # Single config: JSR metadata, imports, tasks
AGENTS.md               # Project vision, rules, agent instructions

.claude/                # INTERNAL — dev tooling + framework resources
  skills/               #   Dev-only skills (tracked) + framework skills (via flowai)
  agents/               #   Dev-only agents (tracked) + framework agents (via flowai)
```

## Documentation as Memory

Documentation is not optional — it is the only mechanism that preserves context between AI sessions.

- **`AGENTS.md`** — project vision, constraints, mandatory rules
- **`requirements.md` (SRS)** — functional and non-functional requirements
- **`design.md` (SDS)** — architecture, components, data models
- **`whiteboards/`** — task plans per session (GODS: Goal, Overview, Done, Solution)

The agent reads these at session start. If the docs are outdated, the agent works with wrong assumptions. Keep them accurate.

## License

MIT
