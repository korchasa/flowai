# flowai

An Assisted Engineering framework: the human owns intent and decisions; AI implements the code **and reviews it**.

The developer initiates and reviews every decision above the level of individual classes/methods — business, architecture, key technical choices — without being required to read code. The agent reports upward in terms of requirements and the class/method structure it builds; diff-level review stays available but optional. The framework's purpose is to prevent **cognitive (mental) debt** — the silent erosion of the human's mental model when AI makes unsurfaced decisions.

> **The flowai project spans four sibling GitHub repositories:**
> - **this repo (`korchasa/flowai`)** — the framework: skills, commands, agents, packs.
> - **[`korchasa/flowai-cli`](https://github.com/korchasa/flowai-cli)** — the distribution CLI (`flowai` command). Bundles a SHA-256-pinned framework release tarball at publish time. Published to JSR as `@korchasa/flowai`.
> - **[`korchasa/flowai-workflow`](https://github.com/korchasa/flowai-workflow)** — universal DAG-based engine for orchestrating AI agents (YAML workflows, execution, validation, loops, resume). Published to JSR as `@korchasa/flowai-workflow`. Separate product, shares the flowai design philosophy.
> - **[`korchasa/flowai-experiments`](https://github.com/korchasa/flowai-experiments)** — parameterized empirical studies of AI agent platforms (e.g. max `CLAUDE.md`/`AGENTS.md` token budget at which an agent still follows an embedded rule). Informs framework design decisions.

## The Assisted Engineering Paradigm

Assisted Engineering is a development model where the human retains full authority over **every decision above the level of individual classes/methods** — business, architecture, design, key technical choices, final acceptance — while delegating implementation *and code review* to AI. The human is not required to read code: the agent reports upward in terms of requirements and the class/method structure it produces. Decisions above the class/method line are always initiated by the human; below it, the human trusts AI execution plus AI code review.

The model exists to prevent **cognitive (mental) debt** — the gap between what the system does and what the human understands it to do, which accrues silently whenever AI makes a decision the human never reviewed at any level.

**Division of responsibility:**

- **Developer (Intent owner: Architect + Decision-maker)**
  - Defines goals, constraints, and product decisions
  - Initiates every decision above class/method level
  - Reviews and approves plans and architecture
  - Reviews the agent's class/method-level narration (not the code)
  - Accepts or rejects results by behavior

- **AI Agent (Executor + Code reviewer)**
  - Analyzes the codebase and gathers context
  - Proposes implementation plans
  - Writes code following approved decisions
  - **Reviews its own code** and runs verification
  - Surfaces every above-class/method decision upward for approval
  - Narrates changes in class/method terms; keeps decision & architecture docs current

**Control flow:**

```
Developer: sets task, decides direction
    → AI: proposes plan + surfaces decisions above class/method level
        → Developer: reviews plan/architecture, approves or adjusts
            → AI: implements + reviews its own code, narrating in class/method terms
                → Developer: reviews the narration (diff optional)
                    → AI: commits approved changes
```

## Installation

flowai installs through two channels:

- **Claude Code & Codex → the plugin marketplace is the recommended channel.** Native install, per-IDE update flow, no Deno toolchain required. Jump to [Claude Code + Codex plugin marketplace](#claude-code--codex-plugin-marketplace).
- **Cursor & OpenCode → the `flowai` CLI** (these IDEs have no plugin marketplace).

The CLI also works on Claude Code / Codex as an alternative, but the two channels are mutually exclusive per IDE — pick one.

### flowai CLI (Cursor / OpenCode; alternative on any IDE)

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

Framework primitives MAY declare `scope: project-only` or `scope: global-only` in their SKILL.md frontmatter; the filter runs automatically. `/update` has no scope field because it is plugin/user-level installable and writes only current-project artifacts.

`flowai migrate <from> <to>` requires an explicit `--global` or `--local` flag — it never auto-resolves, since cross-IDE migrations have different semantics in each scope.

### Claude Code + Codex plugin marketplace

On Claude Code and Codex, installing flowai as a native plugin from the [korchasa/flowai-plugins](https://github.com/korchasa/flowai-plugins) marketplace is the **recommended** channel — native install, per-IDE updates, no Deno toolchain required. (The `flowai` CLI remains a supported alternative on these IDEs; see above.) All seven marketplace packs (`beta`, `core`, `deno`, `devtools`, `engineering`, `memex`, `typescript`) are published as separate plugins on every framework release:

```sh
# Inside a Claude Code session:
/plugin marketplace add korchasa/flowai-plugins
/plugin install flowai@flowai-plugins
# Optional, pick whichever stacks you use:
/plugin install flowai-deno@flowai-plugins
/plugin install flowai-typescript@flowai-plugins
/plugin install flowai-engineering@flowai-plugins
/plugin install flowai-devtools@flowai-plugins
/plugin install flowai-memex@flowai-plugins
/plugin install flowai-beta@flowai-plugins  # opt-in: select-llm-model skill + doc-anchors Stop hook (hook is Claude-only)
/reload-plugins
```

```sh
# From a shell with Codex CLI installed:
codex plugin marketplace add korchasa/flowai-plugins
codex plugin add flowai@flowai-plugins
# Optional, pick whichever stacks you use:
codex plugin add flowai-deno@flowai-plugins
codex plugin add flowai-typescript@flowai-plugins
codex plugin add flowai-engineering@flowai-plugins
codex plugin add flowai-devtools@flowai-plugins
codex plugin add flowai-memex@flowai-plugins
codex plugin add flowai-beta@flowai-plugins  # select-llm-model skill works on Codex; the doc-anchors Stop hook is inert there (no turn-end hook).
# Start a new Codex thread to load newly installed plugins. Edit individual
# `[plugins."<name>@flowai-plugins"]` tables in `~/.codex/config.toml` if you
# want to disable specific packs.
```

Skills are invoked under the plugin namespace: core uses `/flowai:`, while optional packs use `/flowai-<pack>:`, e.g. `/flowai:commit`, `/flowai:plan`, `/flowai:update`, `/flowai-engineering:deep-research`, `/flowai-memex:save`, `/flowai-devtools:engineer-skill`. Source primitive names are short kebab-case names; the plugin namespace carries the `flowai` brand. Cross-skill references inside skill bodies are rewritten to the namespaced form during build, and pack-level assets (e.g. `AGENTS.template.md`) ship inside each consuming skill — `/flowai:update` and `/flowai:init` work out of the box without a separate `flowai sync` step. Hooks declared by `devtools`, `memex`, and the opt-in `beta` pack (`doc-anchors-validate`, a turn-end SALP anchor/reference check) are translated to Claude Code's `hooks.json` format automatically.

> **`doc-anchors-validate` is Claude Code only, and ships in the opt-in `beta` pack** (`flowai-beta`) — install it deliberately; it is not bundled into core. This hook fires on turn-end (`Stop`) and feeds dangling/duplicate SALP anchor findings back to the agent; the reason prescribes delegating the mechanical fix to a subagent so the main agent resumes its primary task instead of fixing inline. Empirical probes (2026-06) show the mechanism is supported only on Claude Code: Codex does not emit a turn-end hook (`codex exec` fires `SessionStart` but never `Stop`; the feature flag also renamed `codex_hooks`→`hooks`), OpenCode's `session.idle` is observation-only (no way to send the agent back to fix), and the `cursor-agent` CLI does not execute `.cursor/hooks.json` hooks at all (those are a Cursor IDE-app feature). On those IDEs the hook is simply not installed/active — no degraded fallback.
>
> A consuming project that hits false positives on its own fixture/example layout (anything not matching flowai's built-in skip patterns) narrows the scan two further ways, both additive to the built-ins. Preferred: commit a `.salpignore` dot-file (`.gitignore`-style globs) next to the fixtures it silences — patterns are matched relative to that file's directory, deeper files override shallower, `!` re-includes, `#`/blank lines are skipped, so the exclusion travels with the code. Ad-hoc/non-committed: set `FLOWAI_DOC_ANCHORS_SKIP` to a comma-separated list of path substrings, e.g. `FLOWAI_DOC_ANCHORS_SKIP=fixtures,examples/,vendor/`.

Codex receives the same generated `skills/` payload through `.agents/plugins/marketplace.json` and per-pack `.codex-plugin/plugin.json`. Codex hook execution is feature-gated; enable `[features].plugin_hooks = true` in Codex before relying on plugin hooks.

`deno task check` always rebuilds and validates the local plugin marketplace before running the rest of the project checks. By default it does NOT touch your installed plugins and emits the upstream marketplace name `flowai-plugins`. To dogfood your local framework edits in Claude Code / Codex run `deno task sync-plugins-local`: it rebuilds `./dist/claude-plugins` with the dogfood marketplace name `flowai-plugins-local`, re-points that namespace at the absolute dist path in each available CLI, and installs / refreshes every emitted pack at user scope as `<pack>@flowai-plugins-local` unless the user explicitly disabled that dogfood plugin. The upstream `flowai-plugins` marketplace registration is intentionally NOT touched, so any pre-existing `<pack>@flowai-plugins` install keeps working side-by-side. Revert to upstream-only by removing the local marketplace: `claude plugin marketplace remove flowai-plugins-local` (and the Codex equivalent). Missing `claude` or `codex` CLIs are reported as warnings and skipped, not fatal. Set `AUTO_INSTALL_PLUGINS=true` in env or `.env` to opt `deno task check` into rebuilding with the dogfood name and running the sync automatically after every successful build/validate prerequisite.

Local marketplace smoke:

```sh
# One-shot dogfood install of the local build into Claude Code + Codex at
# user scope under the `flowai-plugins-local` namespace (upstream
# `flowai-plugins` registration is left untouched):
deno task sync-plugins-local

# Or run the steps individually for inspection:
deno task build-plugins

# Claude Code, one-session smoke without installation:
claude --plugin-dir ./dist/claude-plugins/plugins/flowai

# Claude Code, persistent local user install:
claude plugin validate ./dist/claude-plugins
claude plugin marketplace add ./dist/claude-plugins
claude plugin install flowai@flowai-plugins --scope user

# Codex, persistent local user install:
codex plugin marketplace add ./dist/claude-plugins
codex plugin add flowai@flowai-plugins
```

After `codex plugin marketplace add`, run `codex plugin add <plugin>@flowai-plugins` for each pack you want active. `plugin add` materializes the plugin payload under `~/.codex/plugins/cache/` and writes `[plugins."<name>@flowai-plugins"] enabled = true`; a fresh Codex thread then loads its skills and hooks. Refresh happens by re-running `codex plugin marketplace upgrade flowai-plugins` and `codex plugin add <plugin>@flowai-plugins`. Disable individual packs by setting `enabled = false` (or removing the table) in `~/.codex/config.toml`.

> **CLI and plugin install are mutually exclusive:** if you install via the plugin marketplace, do NOT also run `flowai sync` for the same IDE in the same project — the CLI detects an installed flowai plugin and aborts to avoid dual installs. Pick one channel.

> **Security:** plugins execute arbitrary code at your user privilege. Only install marketplaces and plugins from sources you trust. The `korchasa/flowai-plugins` repository is a CI-generated mirror of this framework's packs and contains no human-authored content beyond `README.md` and `LICENSE`. See [REF:fr:dist.marketplace | FR-DIST.MARKETPLACE] for the build / distribution contract.

### Quick Start Prompt

Copy and paste the following prompt into your AI IDE (Claude Code, Cursor, OpenCode, OpenAI Codex) to install and initialize flowai in your project:

> Install the flowai framework in this project:
> 1. Check if Deno v2.x is installed (`deno --version`). If not, ask the user which OS they are on and install Deno using the official method for their platform (macOS: `brew install deno` or `curl -fsSL https://deno.land/install.sh | sh`, Windows: `irm https://deno.land/install.ps1 | iex`, Linux: `curl -fsSL https://deno.land/install.sh | sh`).
> 2. Run `deno install -g -A jsr:@korchasa/flowai` to install the CLI (skip if already installed).
> 3. Run `flowai` in the project root to sync skills and agents into the IDE config directory.
> 4. Run `/init` to analyze the codebase and generate AGENTS.md files, documentation scaffolding, and development commands.

## Updating

Run `/update` (or plugin namespaced `/flowai:update`) in your AI IDE. It reconciles the current project with the installed framework templates:

1. Reads framework templates from project-local assets, plugin-local assets, or user-level assets
2. Compares them with project-owned artifacts (`AGENTS.md`, `CLAUDE.md`, scaffolded docs/config)
3. Proposes per-file migrations with diffs and confirmation
4. Leaves installed skills, agents, plugin caches, and user-level dirs untouched

To update the CLI binary or sync project-local primitives, use the standalone `flowai` CLI. To adapt project-local installed primitives, run `/adapt`.

## How It Works

flowai is a set of **Commands**, **Skills**, and **Agents** — markdown instruction files that AI coding assistants (Cursor, Claude Code, OpenCode, OpenAI Codex, etc.) load into context to follow structured workflows.

- **Commands** (`framework/<pack>/commands/<name>/SKILL.md`) — user-invoked workflows (e.g. `/commit`). The agent does not auto-discover them.
- **Skills** (`framework/<pack>/skills/<name>/SKILL.md`) — agent-invocable capabilities. The agent picks them up automatically when relevant.
- **Agents** (`framework/<pack>/agents/<name>.md`) — role definitions with specialized capabilities.
- **Documentation** (`documents/`) — persistent project memory across sessions.

Both commands and skills install into `.{ide}/skills/`. The only IDE-visible difference is a `disable-model-invocation: true` flag on commands, added automatically by the CLI writer based on the source directory.

AI models lose context between sessions, and unsurfaced AI decisions erode the human's mental model (cognitive debt). flowai compensates by storing all decisions, requirements, and architecture in structured docs that the agent reads at the start of every session — and by surfacing every above-class/method decision to the human as work proceeds.

### Product vs. Development Tooling

This repository contains two distinct layers. Do not confuse them:

- **`framework/`** — **the product itself**. Skills and agents organized into packs that users install into their projects via `flowai`. This is what flowai distributes.
- **`.claude/skills/`, `.claude/agents/`** — **internal development tooling**. Skills and agents used to develop flowai itself (acceptance test runner, cursor-agent integration, code generation helpers). These are NOT distributed to users. Tracked in git directly.

## Packs

The framework is organized into **packs** — modular groups of skills, agents, hooks, and scripts. Each pack has a `pack.yaml` with metadata. Users select which packs to install via `.flowai.yaml`.

### core

Base commands for development workflows (commit, plan, review, init, etc.).

**Commands:**
- `init` — project initialization (AGENTS.md, docs scaffolding, dev commands)
- `commit` — streamlined atomic commits (targeted doc sync, inline grouping, auto-invoked reflect)
- `review-and-commit` — streamlined review + commit (reuses diff across phases)
- `push` — safe git push (no `--force`, explicit upstream confirmation, post-push `@{u}==HEAD` verification)
- `ship` — terminal full-cycle composite: plan → implement → review → commit → push (4 explicit gates)
- `ship-task` — SDLC continuation composite: takes a ready task file (with filled `## Solution`) and runs implement → review → commit → push (3 explicit gates; no planning phase)
- `update` — reconcile project AGENTS.md/CLAUDE.md/scaffolded artifacts with framework templates
- `adapt` — adapt project-local skills/agents/hooks/assets to project specifics (standalone)

**Skills:**
- `implement` — TDD implement skill (RED → GREEN → REFACTOR → CHECK over a written plan)
- `plan` — task planning; writes persistent GODS tasks at `documents/tasks/<YYYY>/<MM>/<slug>.md` with `date`, `status`, `implements`, `tags`, and `related_tasks` frontmatter
- `epic` — structured feature specification for multi-session features
- `review` — QA + code review of current changes
- `reflect` — self-analysis of the current session
- `reflect-by-history` — cross-session analysis of past IDE transcripts
- `investigate` — deep bug investigation via hypothesis-driven experiments
- `maintenance` — project health audit (16-category scan + interactive resolution)
- `setup-ai-ide-devcontainer` — AI IDE devcontainer setup
- `configure-deno-commands` — configure Deno tasks

**Agents:**
- `console-expert` — complex console tasks and command execution
- `diff-specialist` — git diff analysis and atomic commit preparation
- `skill-adapter` — adapts a single skill to project specifics after upstream update
- `agent-adapter` — adapts a single agent to project specifics after upstream update
- `maintenance-scan-hygiene` / `maintenance-scan-dependencies` / `maintenance-scan-contracts` / `maintenance-scan-docs` / `maintenance-scan-coverage` — self-contained read-only scan workers spawned in parallel by the `maintenance` skill, one per audit bucket

### engineering

Procedural engineering knowledge (research, diagrams, writing, testing, etc.).

**Skills:**
- `deep-research` — multi-source web research with sub-agents
- `draw-mermaid-diagrams` — Mermaid diagrams
- `fix-tests` — fix failing tests
- `diagnose-benchmark-failure` — diagnose a failed flowai benchmark from its run artifacts
- `write-prd` — Product Requirements Documents
- `write-dep` — Development Enhancement Proposals
- `write-gods-tasks` — GODS-format tasks
- `write-in-informational-style` — informational writing style
- `manage-github-tickets` — GitHub issue management
- `browser-automation` — browser automation
- `analyze-context` — token usage analysis
- `engineer-ai-ide-plugin` — AI IDE plugin design and packaging
- `engineer-plugin-marketplace` — AI IDE plugin marketplace design and validation
- `engineer-plugin-mcp` — AI IDE plugin MCP servers and host wiring
- `engineer-plugin-hooks` — AI IDE plugin hook adapters
- `engineer-prompts-for-instant` — prompts for fast models
- `engineer-prompts-for-reasoning` — prompts for reasoning models
- `interactive-teaching-materials` — interactive HTML teaching materials

**Agents:**
- `deep-research-worker` — research worker for deep research sub-tasks

### devtools

Skill and agent authoring tools.

**Skills:**
- `engineer-skill` — create/modify a skill
- `engineer-command` — create/modify a command
- `engineer-rule` — create/modify a rule
- `engineer-hook` — create/modify a hook
- `engineer-subagent` — create/modify a subagent
- `write-agent-benchmarks` — agent acceptance tests

### deno

Deno-specific skills.

**Skills:**
- `cli` — Deno CLI operations
- `deploy` — Deno Deploy management

### typescript

TypeScript-specific setup skills.

**Skills:**
- `setup-agent-code-style-deno` — Deno/TS code style
- `setup-agent-code-style-strict` — strict TypeScript

### memex

Memex — a long-term knowledge bank for AI agents: ingest sources, answer questions with citations, audit the bank for orphans/dead links/contradictions.

**Skills:**
- `save` — ingest a source (URL, file path, or free text) into the memex
- `ask` — answer a question from the memex with citations
- `audit` — audit a memex for orphans, dead links, and contradictions

**Hooks:**
- `status` — detect when the cwd is inside a memex and inject its status (pages, sources, recent log) as context

### beta

Opt-in beta capabilities not yet promoted to core. The `select-llm-model` skill and the cross-IDE delegation skills work on every IDE; the `doc-anchors-validate` hook is **Claude Code only**.

**Skills:**
- `select-llm-model` — task-driven LLM recommender. Give it a free-form task; it derives benchmark-category weights, then **live-fetches** current standings through two CLI tools with subcommands — `benchmarks.ts` (Artificial Analysis, which absorbs ~15 benchmarks incl. GPQA/HLE/LiveCodeBench/Terminal-Bench-hard/τ²; Aider Polyglot; Steel.dev WebArena/OSWorld/SWE-bench Verified) and `openrouter.ts` (real deployment input/output price, per-provider breakdown with reliability, model speed). Returns a ranked shortlist with per-axis rationale, source citations, and the fetch timestamp; fails fast (no fabrication) when it cannot fetch. (LMArena, ARC-AGI, LLM-Stats and other no-stable-endpoint sources are reported as explicit Gaps.)
- `ai-ide-runner` — one-shot relay / fan-out comparison across Claude Code / OpenCode / Cursor / Codex CLIs; child's stdout relayed verbatim
- `delegate-to-ide` — delegate a task to another IDE via an isolated-context subagent so the child's transcript stays out of the parent's context

**Agents:**
- `worker` — single-shot cross-IDE CLI worker; spawned by `delegate-to-ide`

**Hooks:**
- `doc-anchors-validate` — turn-end (`Stop`) SALP anchor/reference integrity check; feeds dangling/duplicate findings back to the agent, which delegates the fix to a subagent and resumes its primary task. Extend its skip set per project via `FLOWAI_DOC_ANCHORS_SKIP` (comma-separated path substrings). See the Claude-Code-only note under [Installation](#claude-code--codex-plugin-marketplace).

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
flowai loop "/analyze-context"

# With agent and auto-approve
flowai loop --yolo --agent console-expert "list all TODO comments"

# Repeated execution with pause
flowai loop --yolo --interval 5m --max-iterations 10 "/maintenance"
```

Options: `--agent`, `--model`, `--cwd`, `--yolo`, `--timeout`, `--interval`, `--max-iterations`. Run `flowai loop --help` for details.

## Developer Workflow

### 1. Project Setup

Initialize the project structure and documentation:

- Run `init` to analyze the codebase and generate `AGENTS.md`, SRS, SDS
- Configure development commands for your stack

### 2. Task Cycle

Every task follows the same supervised loop:

1. **Task** — describe what needs to be done
2. **Plan** (`plan`) — AI proposes a plan in GODS format. You review, adjust, approve
3. **Execute** — AI implements the approved plan, narrating in class/method terms. You read the narration; diffs are optional
4. **Verify** — `deno task check` (or your project's equivalent) must pass. No exceptions
5. **Review & Commit** (`review-and-commit`) — AI reviews its own code, then prepares atomic commits. You confirm the decision-level summary before push

### 3. Maintenance

- `maintenance` — project health audit
- `investigate` — root cause analysis for complex bugs

## Key Principles

1. **Human owns decisions, AI executes & reviews code** — no autonomous decisions above class/method level; AI reviews its own code, the human reviews decisions (not diffs). Prevents cognitive debt
2. **Explicit workflows** — every task type has a defined skill with clear steps
3. **Persistent memory** — documentation in `documents/` bridges the gap between sessions
4. **Single verification gate** — `deno task check` is the source of truth for project health
5. **IDE-agnostic** — skills work across Cursor, Claude Code, OpenCode, OpenAI Codex, and other AI-assisted editors

## Project Structure

```
framework/              # THE PRODUCT — distributed to users via the flowai CLI
  core/                 #   Core workflow commands and agents
  engineering/          #   Procedural engineering knowledge
  devtools/             #   Skill/agent authoring tools
  deno/                 #   Deno-specific skills
  typescript/           #   TypeScript-specific setup skills
  memex/                #   Long-term knowledge bank skills
  beta/                 #   Opt-in: select-llm-model, doc-anchors hook, cross-IDE delegation
  atoms/ composites/    #   Composite-skill generator sources (not distributed)
documents/              # Project documentation (SRS, SDS, tasks)
scripts/                # Deno task scripts + acceptance test infrastructure
acceptance-tests/       # Acceptance test runs, config, lock, per-scenario result cache (scenarios in framework/<pack>/{commands,skills}/*/acceptance-tests/)
deno.json               # Imports, tasks, lint/fmt config
AGENTS.md               # Project vision, rules, agent instructions

.claude/                # INTERNAL — dev tooling + framework resources
  skills/               #   Dev-only skills (tracked) + framework skills (via flowai)
  agents/               #   Dev-only agents (tracked) + framework agents (via flowai)
```

### Distribution flow

The CLI is no longer in this repo (see [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli)). End-users still install the same JSR package (`@korchasa/flowai`); only the source-of-truth for CLI code moved.

```
korchasa/flowai (this repo)                  korchasa/flowai-cli
─────────────────────────────                ─────────────────────────────
feat/fix/refactor on main                    framework.lock (pinned version)
        │                                            │
        ▼                                            │
release job:                                         │
  • bump deno.json version                           │
  • upload framework.tar.gz +                        │
    framework.tar.gz.sha256 as                       │
    assets of framework-v<X> ─────────────┐          │
                                          │  GitHub  │
                                          │  release │
                                          ▼          ▼
                                       scripts/bundle-framework.ts
                                         (downloads tarball,
                                          verifies SHA-256, untars,
                                          bundles into src/bundled.json)
                                                     │
                                                     ▼
                                        tag v<Y> on flowai-cli
                                                     │
                                                     ▼
                                            JSR @korchasa/flowai
                                                     │
                                                     ▼
                                      deno install -g -A jsr:@korchasa/flowai
```

## Documentation as Memory

Documentation is not optional — it is the only mechanism that preserves context between AI sessions.

- **`AGENTS.md`** — project vision, constraints, mandatory rules
- **`requirements.md` (SRS)** — functional and non-functional requirements
- **`design.md` (SDS)** — architecture, components, data models
- **`tasks/`** — task plans per session (GODS: Goal, Overview, Done, Solution)

The agent reads these at session start. If the docs are outdated, the agent works with wrong assumptions. Keep them accurate.

## Development Setup

For contributors working on **the framework** (skills, commands, agents, packs):

**Prerequisites:** [Deno](https://deno.land), Git

```sh
git clone https://github.com/korchasa/flowai.git
cd flowai
deno task check
```

Dev-only skills and agents live in `.claude/skills/` and `.claude/agents/` (tracked in git). Framework skills/agents are installed by flowai from bundled source.

**Composite SKILL.md files are gitignored build artefacts.** Source of truth is `framework/composites.yaml` (manifest) + `framework/atoms/*.md` (parametrized step bodies) + `framework/composites/*.md` (wrappers). Every consumer (`deno task check`, `deno task acceptance-tests`, `deno task build-plugins`, CI tarball build) regenerates SKILL.md from source via `--write` before reading — so the rendered output is always current and there is no tracked rendered copy that can drift. The 8 generated paths are listed in `.gitignore`; the generator's `checkGitignoreParity` fails the build if that list goes out of sync with `--list-targets`. Generator inputs are excluded from `framework.tar.gz` via `tar --exclude` in `.github/workflows/ci.yml`, and re-verified by `scripts/check-pack-refs.ts --leakage`. See `framework/AGENTS.md § Composite Skill Authoring` for the canon rules.

For contributors working on **the CLI itself** (sync engine, IDE adapters, bundle pipeline) — go to [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli). That repo has its own `deno task check`, its own test suite, and publishes `@korchasa/flowai` to JSR on tag `v*`. It pins a framework revision via `framework.lock`; bump it with `deno task bump-framework <version>` after a new `framework-v*` release lands here.

## License

MIT
