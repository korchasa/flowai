# flowai

An Assisted Engineering framework: the developer remains the architect and reviewer, while AI handles implementation under supervision.

The developer sets the task, approves the plan, and controls every diff.

> **Note:** Multi-agent SDLC pipelines have been moved to a separate project: [flowai-pipelines](https://github.com/korchasa/flowai-pipelines).

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

# Recommended: install primitives once for all projects (user-level)
flowai sync --global

# Or install per-project (legacy, useful for team-wide or repo-tracked skills)
flowai
```

### Global vs per-project

`flowai` / `flowai sync` select the install scope via three mutually exclusive flags:

- `--global` / `-g` — force global install into IDE user-level dirs (`~/.claude/`, `~/.cursor/`, `~/.config/opencode/`, `~/.codex/`, `~/.agents/skills/`). Config at `~/.flowai.yaml`. One sync updates every project at once.
- `--local` / `-l` — force project-local install into `<cwd>/.{ide}/`. Config at `<cwd>/.flowai.yaml`. Use when you want team-wide skills tracked in the repo, or per-project overrides.
- `--auto` — default. Auto-resolves scope by probing config files:
  1. `<cwd>/.flowai.yaml` exists → project scope.
  2. Otherwise `~/.flowai.yaml` exists → global scope (CLI prints `Using global config at ~/.flowai.yaml`).
  3. Neither exists → CLI asks which scope to set up (defaults to global in `-y`).

**Opting a project into local install:** create a `<cwd>/.flowai.yaml` (or run `flowai --local` to generate one). The mere presence of that file is the opt-in marker — subsequent runs without flags will use it.

Framework primitives MAY declare `scope: project-only` or `scope: global-only` in their SKILL.md frontmatter; the filter runs automatically (e.g. `/flowai-update` is `project-only` because it requires project context).

`flowai migrate <from> <to>` requires an explicit `--global` or `--local` flag — it never auto-resolves, since cross-IDE migrations have different semantics in each scope.

### Quick Start Prompt

Copy and paste the following prompt into your AI IDE (Claude Code, Cursor, OpenCode, OpenAI Codex) to install and initialize flowai in your project:

> Install the flowai framework in this project:
> 1. Check if Deno v2.x is installed (`deno --version`). If not, ask the user which OS they are on and install Deno using the official method for their platform (macOS: `brew install deno` or `curl -fsSL https://deno.land/install.sh | sh`, Windows: `irm https://deno.land/install.ps1 | iex`, Linux: `curl -fsSL https://deno.land/install.sh | sh`).
> 2. Run `deno install -g -A jsr:@korchasa/flowai` to install the CLI (skip if already installed).
> 3. Run `flowai` in the project root to sync skills and agents into the IDE config directory.
> 4. Run `/flowai-init` to analyze the codebase and generate AGENTS.md files, documentation scaffolding, and development commands.

## Updating

Run `/flowai-update` in your AI IDE. It handles the full update cycle:

1. Updates the `flowai` CLI to the latest version (wraps `flowai update`)
2. Syncs skills and agents into IDE config directories
3. Detects convention changes in framework templates
4. Proposes per-file migrations for scaffolded artifacts (AGENTS.md, devcontainer, deno.json tasks) — with diffs and confirmation for each file

To self-update the CLI binary only (no sync, no migration), run `flowai update` directly. `flowai` and `flowai sync` only notify when a new version is available and never install it.

## How It Works

flowai is a set of **Commands**, **Skills**, and **Agents** — markdown instruction files that AI coding assistants (Cursor, Claude Code, OpenCode, OpenAI Codex, etc.) load into context to follow structured workflows.

- **Commands** (`framework/<pack>/commands/<name>/SKILL.md`) — user-invoked workflows (e.g. `/flowai-commit`, `/flowai-plan`). The agent does not auto-discover them.
- **Skills** (`framework/<pack>/skills/<name>/SKILL.md`) — agent-invocable capabilities. The agent picks them up automatically when relevant.
- **Agents** (`framework/<pack>/agents/<name>/SUBAGENT.md`) — role definitions with specialized capabilities.
- **Documentation** (`documents/`) — persistent project memory across sessions.

Both commands and skills install into `.{ide}/skills/`. The only IDE-visible difference is a `disable-model-invocation: true` flag on commands, added automatically by the CLI writer based on the source directory.

AI models lose context between sessions. flowai compensates by storing all decisions, requirements, and architecture in structured docs that the agent reads at the start of every session.

### Product vs. Development Tooling

This repository contains two distinct layers. Do not confuse them:

- **`framework/`** — **the product itself**. Skills and agents organized into packs that users install into their projects via `flowai`. This is what flowai distributes.
- **`.claude/skills/`, `.claude/agents/`** — **internal development tooling**. Skills and agents used to develop flowai itself (benchmark runner, cursor-agent integration, code generation helpers). These are NOT distributed to users. Tracked in git directly.

## Packs

The framework is organized into **packs** — modular groups of skills, agents, hooks, and scripts. Each pack has a `pack.yaml` with metadata. Users select which packs to install via `.flowai.yaml`.

### core

Base commands for development workflows (commit, plan, review, init, etc.).

**Commands:**
- `flowai-init` — project initialization (AGENTS.md, docs scaffolding, dev commands)
- `flowai-plan` — task planning (GODS format)
- `flowai-commit` — atomic commits with QA and self-reflection
- `flowai-commit-beta` — streamlined commit (targeted doc sync, inline grouping)
- `flowai-review` — QA + code review of current changes
- `flowai-review-and-commit` — review quality, then commit if approved
- `flowai-review-and-commit-beta` — streamlined review + commit (reuses diff across phases)
- `flowai-reflect` — self-analysis of the current session
- `flowai-reflect-by-history` — cross-session analysis of past IDE transcripts
- `flowai-maintenance` — project health check
- `flowai-investigate` — deep bug investigation
- `flowai-epic` — structured feature specification
- `flowai-update` — update flowai framework (sync skills/agents, migrate artifacts)
- `flowai-adapt` — adapt installed skills/agents/hooks/assets to project specifics (standalone)
- `flowai-adapt-instructions` — re-adapt root AGENTS.md after upstream template change

**Setup:**
- `flowai-skill-setup-ai-ide-devcontainer` — AI IDE devcontainer setup
- `flowai-skill-configure-deno-commands` — configure Deno tasks

**Agents:**
- `flowai-console-expert` — complex console tasks and command execution
- `flowai-diff-specialist` — git diff analysis and atomic commit preparation
- `flowai-skill-adapter` — adapts a single skill to project specifics after upstream update
- `flowai-agent-adapter` — adapts a single agent to project specifics after upstream update

### engineering

Procedural engineering knowledge (research, diagrams, writing, testing, etc.).

**Skills:**
- `flowai-skill-deep-research` — multi-source web research with sub-agents
- `flowai-skill-draw-mermaid-diagrams` — Mermaid diagrams
- `flowai-skill-fix-tests` — fix failing tests
- `flowai-skill-write-prd` — Product Requirements Documents
- `flowai-skill-write-dep` — Development Enhancement Proposals
- `flowai-skill-write-gods-tasks` — GODS-format tasks
- `flowai-skill-write-in-informational-style` — informational writing style
- `flowai-skill-manage-github-tickets` — GitHub issue management
- `flowai-skill-browser-automation` — browser automation
- `flowai-skill-conduct-qa-session` — Q&A sessions
- `flowai-skill-analyze-context` — token usage analysis
- `flowai-skill-engineer-prompts-for-instant` — prompts for fast models
- `flowai-skill-engineer-prompts-for-reasoning` — prompts for reasoning models
- `flowai-skill-interactive-teaching-materials` — interactive HTML teaching materials

**Agents:**
- `flowai-deep-research-worker` — research worker for deep research sub-tasks

### devtools

Skill and agent authoring tools.

**Skills:**
- `flowai-skill-engineer-skill` — create/modify a skill
- `flowai-skill-engineer-command` — create/modify a command
- `flowai-skill-engineer-rule` — create/modify a rule
- `flowai-skill-engineer-hook` — create/modify a hook
- `flowai-skill-engineer-subagent` — create/modify a subagent
- `flowai-skill-write-agent-benchmarks` — agent benchmarks

### deno

Deno-specific skills.

**Skills:**
- `flowai-skill-deno-cli` — Deno CLI operations
- `flowai-skill-deno-deploy` — Deno Deploy management

### typescript

TypeScript-specific setup skills.

**Setup:**
- `flowai-setup-agent-code-style-ts-deno` — Deno/TS code style
- `flowai-setup-agent-code-style-ts-strict` — strict TypeScript

## CLI Commands

The `flowai` CLI provides commands beyond interactive skill sync:

### `flowai sync`

Sync framework skills/agents into project-local IDE config dirs. Primary command for installation and updates.

Supports installing from a git branch or local path via `.flowai.yaml`:

```yaml
# Install from a branch (uses official repo by default)
source:
  ref: feat/new-skill

# Install from a fork
source:
  git: https://github.com/someone/flowai-fork.git
  ref: main

# Install from local directory
source:
  path: /path/to/flowai/framework
```

`flowai sync` only notifies when a newer CLI is published (`Update available: X → Y. Run \`flowai update\` to install.`). It never installs — the sole install entry point is `flowai update`. Suppress the check with `--skip-update-check`; preview a run without writes via `-n` / `--dry-run`.

### `flowai update`

Self-update the CLI binary. Checks JSR for a newer version; installs via `deno install -g -A -f jsr:@korchasa/flowai@<version>`. In `-y` (non-interactive) mode prints the update command instead of running it. Fail-open on network errors.

```sh
flowai update           # interactive prompt
flowai update -y        # print command only
```

### `flowai migrate <from> <to>`

One-way migration of installed primitives (skills, agents, commands) from one IDE config dir to another — e.g. `flowai migrate claude cursor`. Use when switching primary IDE. `--dry-run` previews without writing; `-y` overwrites conflicts non-interactively.

### `flowai loop <prompt>`

Run Claude Code non-interactively with real-time stream-json output. Base primitive for automation (CI, cron, scripts).

```sh
# Simple prompt
flowai loop "read deno.json and tell me the version"

# Invoke a skill via prompt
flowai loop "/flowai-skill-analyze-context"

# With agent and auto-approve
flowai loop --yolo --agent console-expert "list all TODO comments"

# Repeated execution with pause
flowai loop --yolo --interval 5m --max-iterations 10 "/flowai-maintenance"
```

Options: `--agent`, `--model`, `--cwd`, `--yolo`, `--timeout`, `--interval`, `--max-iterations`. Run `flowai loop --help` for details.

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

## Key Principles

1. **Developer controls, AI executes** — no autonomous commits, no unsupervised architectural changes
2. **Explicit workflows** — every task type has a defined skill with clear steps
3. **Persistent memory** — documentation in `documents/` bridges the gap between sessions
4. **Single verification gate** — `deno task check` is the source of truth for project health
5. **IDE-agnostic** — skills work across Cursor, Claude Code, OpenCode, OpenAI Codex, and other AI-assisted editors

## Project Structure

```
framework/              # THE PRODUCT — distributed to users via flowai CLI
  core/                 #   Core workflow commands and agents
  engineering/          #   Procedural engineering knowledge
  devtools/             #   Skill/agent authoring tools
  deno/                 #   Deno-specific skills
  typescript/           #   TypeScript-specific setup skills
cli/                    # Distribution tool — published to JSR as @korchasa/flowai
  src/                  #   CLI source (BundledSource, sync, transform, plan)
  scripts/              #   Bundle script (generates bundled.json + _version.ts)
documents/              # Project documentation (SRS, SDS, tasks)
scripts/                # Deno task scripts + benchmark infrastructure
benchmarks/             # Benchmark runs, config, lock (scenarios in framework/<pack>/{commands,skills}/*/benchmarks/)
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
- **`tasks/`** — task plans per session (GODS: Goal, Overview, Done, Solution)

The agent reads these at session start. If the docs are outdated, the agent works with wrong assumptions. Keep them accurate.

## Development Setup

For contributors working on flowai itself (not end-user installation):

**Prerequisites:** [Deno](https://deno.land), Git

```sh
git clone https://github.com/korchasa/flowai.git
cd flowai
deno task check
```

Dev-only skills and agents live in `.claude/skills/` and `.claude/agents/` (tracked in git). Framework skills/agents are installed by flowai from bundled source.

## License

MIT
