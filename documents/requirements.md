# Software Requirements Specification (SRS)

## 1. Introduction

- **Document purpose:** Define requirements for the AI-First IDE Rules and
  Commands project.
- **Scope:** A collection of skills, agents, and commands to standardize and
  enhance development workflows in AI-first IDEs (Cursor, Claude Code, OpenCode).
- **Audience:** Developers and AI agents working in supported AI IDEs.
- **Definitions and abbreviations:**
  - **IDE:** Integrated Development Environment.
  - **MCP:** Model Context Protocol.
  - **MDC:** Markdown Configuration (Cursor rules format).
  - **GODS:** Goal, Overview, Done, Solution (planning framework).
  - **SPOT:** Single Point of Truth.

## 2. General description

- **System context:** A set of configuration files (`.md`, SKILL.md) stored in
  `framework/` (product) and `.claude/` (dev resources). Distributed to end users
  via flowai. Interpreted by AI agents in supported IDEs.
- **Assumptions and constraints:**
  - **Assumptions:** Developer uses Claude Code. macOS/Linux environment.
    flowai installed for framework resource sync.
  - **Constraints:** Agent's context window limits apply.
    Hook/plugin systems differ per IDE (Cursor hooks, Claude Code hooks with
    17+ events, OpenCode plugins) — format transformation needed.

## 3. Functional requirements

### Implementation Order (open requirements)

Dependencies between unclosed requirements define execution order:

1. **FR-23** Pack System — restructure framework, update flowai CLI
2. **FR-24** Hook Resources — depends on FR-23 (pack structure)
3. **FR-25** Script Resources — depends on FR-23 (pack structure)
4. **FR-26** Skill Renaming — depends on FR-23 (migration)
5. **FR-21.3–21.6** Universal Skill & Script Requirements — standardize before distribution
6. **FR-12.5** flowai-init idempotent re-run — independent, can run in parallel with 5
7. **FR-7.1** Co-locate benchmarks with skills — can run in parallel with 5–6

```
FR-23 (pack system)
  → FR-24 (hooks), FR-25 (scripts), FR-26 (renaming) — parallel after FR-23
FR-21.3–21.6 (parallel with above)
FR-12.5 (parallel)
FR-7.1 (parallel)
FR-10.9 open questions (parallel)
```

Note: FR-20 (Devcontainer) is complete for the framework's own dev workflow.
FR-10 (Global Framework Distribution) has been delegated to flowai (external tool).
FR-10.9 defines cross-IDE resource mapping; open questions need user decisions before command sync implementation.

### 3.1 Command Execution (FR-1)

- **Description:** The system must provide executable workflows for common
  development tasks, accessible via chat commands.
- **Use case scenario:** User types `/commit` to start a commit workflow. Agent
  reads the command file and follows the steps.
- **Acceptance criteria:**
  - [x] Support for task commands including planning, execution, investigation,
        review, and documentation. Evidence: `framework/skills/flowai-plan/SKILL.md:9`,
        `framework/skills/flowai-commit/SKILL.md:7`,
        `framework/skills/flowai-review/SKILL.md:7`,
        `framework/skills/flowai-investigate/SKILL.md:7`,
        `framework/skills/flowai-answer/SKILL.md:9`
  - [x] Commands follow `/<command>` naming convention (file name without
        `task-` prefix). Evidence: `framework/skills/flowai-plan/SKILL.md:2`,
        `framework/skills/flowai-commit/SKILL.md:2`,
        `framework/skills/flowai-investigate/SKILL.md:2`
  - [x] Each command provides guided workflow with checklist. Evidence:
        `framework/skills/flowai-plan/SKILL.md:36-63`,
        `framework/skills/flowai-commit/SKILL.md:54-97`
  - [x] flowai-init configures development commands via specialized skills (see FR-8).
        Evidence: `framework/skills/flowai-init/SKILL.md` step 10 "Configure Development Commands"

### 3.2 Rule Enforcement (FR-2)

- **Description:** The system must automatically apply development rules and
  coding standards.
- **Use case scenario:** Agent writes code. The system provides context on
  coding style (e.g., TypeScript, Swift) and principles (e.g., Zen, TDD).
- **Acceptance criteria:**
  - [x] Code style rules (TS, Swift, etc.). Evidence:
        `framework/skills/flowai-setup-agent-code-style-ts-deno/SKILL.md:17-35`,
        `framework/skills/flowai-setup-agent-code-style-ts-strict/SKILL.md:17-105`
  - [x] Development principles (Autonomous, Zen, TDD). Evidence:
        `AGENTS.md:92-105`, `AGENTS.md:1-20`
  - [x] Documentation standards. Evidence: `documents/AGENTS.md:1-127`,
        `AGENTS.md:87-90`
  - [x] Translation of all project documentation and benchmarks README to English.
        Evidence: `AGENTS.md:9`, `documents/AGENTS.md:119`

### 3.3 Documentation Management (FR-3)

- **Description:** The system must define and enforce documentation schemas to
  maintain project knowledge.
- **Use case scenario:** Agent updates project documentation. The system ensures
  it follows the RDS-SDS or Cline-bank schema.
- **Acceptance criteria:**
  - [x] Support for different documentation schemas. Evidence:
        `documents/AGENTS.md:21-49` (SRS), `documents/AGENTS.md:50-76` (SDS)
  - [x] Instructions for compact documentation. Evidence:
        `documents/AGENTS.md:116-127`

### 3.4 Automation & How-To (FR-4)

- **Description:** The system must provide guides for complex or situational
  tasks.
- **Use case scenario:** User asks how to fix tests. Agent retrieves
  `flowai-skill-fix-tests/SKILL.md` and follows the procedure.
- **Acceptance criteria:**
  - [x] Support for 19 how-to guides covering QA, testing, diagrams, prompts,
        GitHub management, Deno tooling, research, benchmarks, and documentation.
        Evidence: `framework/skills/flowai-skill-*/SKILL.md` (19 directories)
  - [x] Guides follow `flowai-skill-*/` directory naming convention with `SKILL.md`
        files. Evidence: `framework/skills/flowai-skill-conduct-qa-session/SKILL.md`,
        `framework/skills/flowai-skill-draw-mermaid-diagrams/SKILL.md`,
        `framework/skills/flowai-skill-deep-research/SKILL.md`
  - [x] Each guide provides step-by-step instructions for specific scenarios.
        Evidence: `framework/skills/flowai-skill-draw-mermaid-diagrams/SKILL.md:8-16`,
        `framework/skills/flowai-skill-deep-research/SKILL.md:28-210`

### 3.5 Project Maintenance (FR-5)

- **Description:** The system must provide automated project maintenance
  capabilities through scripts.
- **Use case scenario:** Developer runs `deno task check` to validate project
  integrity. Tasks perform linting, testing, and other checks.
- **Acceptance criteria:**
  - [x] Deno tasks configured in `deno.json`. Evidence: `deno.json:11-18`
  - [x] Task scripts stored in `./scripts/` and invoked via `deno task`. Evidence:
        `scripts/task-check.ts`, `scripts/task-test.ts`, `scripts/task-dev.ts`,
        `deno.json:12-17`
  - [x] Support for check, test, and dev commands. Evidence: `deno.json:12-14`
  - [x] Automated quality assurance workflows. Evidence:
        `framework/skills/flowai-review/SKILL.md:56-140`
  - [x] Development commands are set up during project initialization (see FR-8).
        Evidence: `framework/skills/flowai-init/SKILL.md` step 10 "Configure Development Commands"

### 3.6 Developer Onboarding & Workflow Clarity (FR-6)

- **Description:** The project's `README.md` must provide clear, actionable
  instructions for developers on when and how to use the available tools.
- **Use case scenario:** A new developer joins the project and reads the
  `README.md` to understand the workflow for starting the project, implementing
  a task, and performing periodic maintenance.
- **Acceptance criteria:**
  - [x] Instructions for project initialization and environment verification.
        Evidence: `README.md:73-99`, `README.md:120-126`
  - [x] Step-by-step workflow for task implementation (Plan -> Execute -> Verify
        -> Commit). Evidence: `README.md:127-135`
  - [x] Schedule for periodic maintenance (Health Check, Docs Audit, Agent
        Updates). Evidence: `README.md:137-141`
  - [x] Guidance for specific cases (Investigate, Answer, Engineer). Evidence:
        `README.md:139-140`, `README.md:156-162`

### 3.7 Benchmarking (FR-7)

- **Description:** The system must provide an evidence-based benchmarking system to
  evaluate agent performance objectively.
- **Use case scenario:** Developer runs `deno task bench` to see how well the
  agent handles specific scenarios.
- **Acceptance criteria:**
- [x] Isolated sandbox execution for scenarios using `SpawnedAgent` (direct `Deno.Command` based).
      Evidence: `scripts/benchmarks/lib/spawned_agent.ts:32`,
      `scripts/benchmarks/lib/runner.ts:28-38`
- [x] Evidence collection (git status, logs, file changes). Evidence:
      `scripts/benchmarks/lib/runner.ts:286-330`,
      `scripts/benchmarks/lib/trace.ts:984-996`
- [x] LLM-based Judge for semantic verification. Evidence:
      `scripts/benchmarks/lib/judge.ts:4-124`,
      `scripts/benchmarks/lib/runner.ts:332-340`
- [x] Financial cost calculation per scenario and per run. Evidence:
      `scripts/benchmarks/lib/types.ts:117`,
      `scripts/task-bench.ts:163-178`, `scripts/task-bench.ts:304-306`
- [x] Detailed token usage breakdown (Input, Output, Cache Read, Cache Write).
      Evidence: `scripts/benchmarks/lib/usage.ts:4-16`,
      `scripts/benchmarks/lib/usage.ts:54-141`,
      `scripts/benchmarks/lib/runner.ts:267-275`
- [x] **Parallel Execution Protection**: Prevents multiple benchmark processes from
      running simultaneously using a lock file (`benchmarks/benchmarks.lock`).
      Evidence: `scripts/task-bench.ts:63-92`
- [x] Meaningful metrics: Errors, Warnings, Steps, Time, and Cost. Evidence:
      `scripts/benchmarks/lib/types.ts:103-123`,
      `scripts/task-bench.ts:261-324`
- [x] Rich HTML tracing with step-by-step timeline and syntax highlighting. Evidence:
      `scripts/benchmarks/lib/trace.ts:31-868`,
      `scripts/benchmarks/lib/trace.ts:229-234`,
      `scripts/benchmarks/lib/trace.ts:438-444`
- [x] Unified data block UI with smart blur, line numbering, and word wrap. Evidence:
      `scripts/benchmarks/lib/trace.ts:48-61`,
      `scripts/benchmarks/lib/trace.ts:677-731`
- [x] JSON-based configuration for model presets. Evidence:
      `benchmarks/config.json:1-25`,
      `scripts/benchmarks/lib/llm.ts:16-39`
  - [x] **Support for direct model names**: Allows using model names directly if no
        preset matches. Evidence: `scripts/benchmarks/lib/llm.ts:41-65`
  - [x] **Simplified Model Selection**: Replaced presets with direct model selection
        in `deno task bench` via `-m, --model` flag. Evidence:
        `scripts/task-bench.ts:55`, `scripts/task-bench.ts:96-99`
  - [x] **Native Context Discovery**: Benchmarks rely on `cursor-agent`'s native
        context discovery by ensuring the sandbox structure mimics a real project
        (including `.cursor/` folder). Evidence:
        `scripts/benchmarks/lib/runner.ts:118-134`
- [x] **Agent Under Test**: Benchmarks execute the `cursor-agent` binary in headless
      CLI mode within a dedicated sandbox environment, with interaction via standard
      input/output and arguments (e.g., `--resume` for multi-turn conversations).
      Evidence: `scripts/benchmarks/lib/spawned_agent.ts:168-216`
- [x] **Single-Turn Benchmark**: User query is embedded in the system prompt to
      simulate real-world single-turn agent invocation. Evidence:
      `scripts/benchmarks/lib/runner.ts:235-249`,
      `scripts/benchmarks/lib/spawned_agent.ts:211-213`
- [x] **Mandatory agentsTemplateVars**: Every scenario MUST declare `agentsTemplateVars`
      (required field in `BenchmarkScenario`). Runner generates `AGENTS.md` from
      `flowai-init` templates at runtime (single source of truth). Legacy mechanisms
      (`agentsMarkdown` string, fixture `AGENTS.md` files) are removed. Scenarios
      without `agentsTemplateVars` fail at compile time (TypeScript) and at runtime
      (explicit error in runner). Evidence: `scripts/benchmarks/lib/types.ts`,
      `scripts/benchmarks/lib/runner.ts`
- [x] **Secure Execution**: Benchmarks run in an isolated environment (Docker or
      local process). Evidence: `scripts/benchmarks/lib/runner.ts:27-40`,
      `scripts/benchmarks/lib/spawned_agent.ts:171-173`
- [x] **Simulated User**: Support for interactive flows via `UserEmulator` LLM.
      Evidence: `scripts/benchmarks/lib/user_emulator.ts:10-62`,
      `scripts/benchmarks/lib/runner.ts:237-253`
- [x] **Environment Management**: `.env` support for API keys in benchmarks. Evidence:
      `scripts/benchmarks/lib/llm.ts:2-61`, `.env`
- [x] **FR-7.1 Co-located Benchmarks**: Benchmark scenarios MUST be stored alongside
      the skills they test, inside `framework/skills/<skill-name>/benchmarks/` instead
      of the top-level `benchmarks/<skill-name>/`. This keeps scenarios, fixtures, and
      the skill definition in a single SPOT, simplifies discovery, and ensures benchmarks
      are distributed/versioned together with their skill.
      Evidence: `framework/skills/*/benchmarks/*/mod.ts` (all scenarios moved),
      `scripts/task-bench.ts:32-34` (discovery walks `framework/skills/`),
      `benchmarks/AGENTS.md` (updated responsibility docs)
- [x] **FR-7.2 Pack-Scoped Sandbox**: Benchmark sandbox contains only primitives
      from the tested skill's pack (+ core), not all packs. Core benchmark → core only;
      non-core benchmark → core + that pack. Cross-pack references validated by TS test.
      Evidence: `scripts/benchmarks/lib/types.ts` (`pack?: string` field),
      `scripts/task-bench.ts` (`scenario.pack = packEntry.name`),
      `scripts/benchmarks/lib/utils.ts` (`allowedPacks` parameter in `copyFrameworkToIdeDir`),
      `scripts/benchmarks/lib/runner.ts` (pack filter logic),
      `scripts/check-pack-refs.ts` + `scripts/check-pack-refs_test.ts` (cross-pack validation)
- [x] **FR-7.3 Claude CLI Judge**: Judge and user emulator use Claude CLI (`cliChatCompletion`)
      instead of OpenRouter API. Eliminates `OPENROUTER_API_KEY` dependency. Uses
      `--output-format json` + `--json-schema` for structured judge output.
      Evidence: `scripts/benchmarks/lib/llm.ts` (`cliChatCompletion()`),
      `scripts/benchmarks/lib/judge.ts` (imports `cliChatCompletion`),
      `scripts/benchmarks/lib/user_emulator.ts` (imports `cliChatCompletion`)

### 3.8 Component Coverage Matrix

The benchmarking system must cover all core flowai components to ensure reliability across all workflows.

#### Skills (`framework/skills/`)

| Skill ID                                   | Description                          | Benchmarked | Scenario ID              |
| :----------------------------------------- | :----------------------------------- | :---------: | :----------------------- |
| **Commands (`flowai-*`)**                  |                                      |             |                          |
| `flowai-answer`                              | Answering user questions             |     [ ]     |                          |
| `flowai-commit`                              | Atomic commits and QA                |     [x]     | `flowai-commit-*`          |
| `flowai-init`                                | Project initialization               |     [x]     | `flowai-init-*`            |
| `flowai-investigate`                         | Code investigation/debugging         |     [ ]     |                          |
| `flowai-maintenance`                         | Periodic project health checks       |     [ ]     |                          |
| `flowai-plan`                                | Task planning (GODS)                 |     [x]     | `flowai-plan-*`            |
| `flowai-review`                              | QA + code review of changes          |     [ ]     |                          |
| `flowai-review-and-commit`                   | Review quality then commit           |     [x]     | `flowai-review-and-commit-approve`, `flowai-review-and-commit-reject` |
| `flowai-reflect`                             | Self-reflection on task              |     [x]     | `flowai-reflect-*`         |
| `flowai-spec`                                | Feature specification (phased)       |     [ ]     |                          |
| **Setup (`flowai-setup-agent-*`)**           |                                      |             |                          |
| `flowai-setup-agent-code-style-ts-deno`            | Setup Deno/TS code style             |     [ ]     |                          |
| `flowai-setup-agent-code-style-ts-strict`          | Setup strict TypeScript              |     [ ]     |                          |
| **Skills (`flowai-skill-*`)**                |                                      |             |                          |
| `flowai-skill-engineer-command`              | Creating new AF commands             |     [ ]     |                          |
| `flowai-skill-engineer-hook`                 | Creating hooks                       |     [x]     | `flowai-skill-engineer-hook-*` |
| `flowai-skill-engineer-rule`                 | Creating rules                       |     [ ]     |                          |
| `flowai-skill-engineer-skill`               | Creating skills                      |     [ ]     |                          |
| `flowai-skill-engineer-subagent`            | Creating subagents                   |     [ ]     |                          |
| `flowai-skill-analyze-context`              | Analyze token usage in context       |     [x]     |                          |
| `flowai-skill-conduct-qa-session`           | Conducting QA sessions               |     [ ]     |                          |
| `flowai-skill-configure-deno-commands`      | Configure Deno development commands  |     [ ]     |                          |
| `flowai-skill-cursor-agent-integration`     | Integration with cursor-agent CLI    |     [x]     |                          |
| `flowai-skill-deep-research`                | Multi-directional web-based research |     [ ]     |                          |
| `flowai-skill-deno-cli`                     | Manage Deno via CLI                  |     [ ]     |                          |
| `flowai-skill-deno-deploy`                  | Manage Deno Deploy                   |     [ ]     |                          |
| `flowai-skill-draw-mermaid-diagrams`        | Drawing Mermaid diagrams             |     [ ]     |                          |
| `flowai-skill-engineer-prompts-for-instant` | Prompt engineering (Instant models)  |     [ ]     |                          |
| `flowai-skill-engineer-prompts-for-reasoning` | Prompt engineering (Reasoning models) | [ ]     |                          |
| `flowai-skill-fix-tests`                    | Fixing broken tests                  |     [ ]     |                          |
| `flowai-skill-setup-ai-ide-devcontainer`    | AI devcontainer setup                |     [x]     | `flowai-skill-setup-ai-ide-devcontainer-*` |
| `flowai-skill-manage-github-tickets-by-mcp` | Managing GitHub via MCP              |     [ ]     |                          |
| `flowai-skill-playwright-cli`               | Browser automation via CLI           |     [ ]     |                          |
| `flowai-skill-write-agent-benchmarks`       | Writing agent benchmarks             |     [x]     |                          |
| `flowai-skill-write-dep`                    | Writing DEP documents                |     [ ]     |                          |
| `flowai-skill-write-gods-tasks`             | Writing GODS tasks                   |     [ ]     |                          |
| `flowai-skill-write-in-informational-style` | Writing in info style                |     [ ]     |                          |
| `flowai-skill-write-prd`                    | Writing PRDs                         |     [ ]     |                          |

#### Agents (`framework/agents/`)

Canonical agent definitions (IDE-agnostic). `name` + `description` frontmatter, shared body. IDE-specific transformation handled by flowai.

| Agent ID                | Description                              | Benchmarked | Scenario ID |
| :---------------------- | :--------------------------------------- | :---------: | :---------- |
| `deep-research-worker`  | Single-direction research worker         |     [ ]     |             |
| `flowai-console-expert`   | Complex console tasks without code edits |     [ ]     |             |
| `flowai-diff-specialist`  | Analyze git diffs and plan commits       |     [ ]     |             |
| `flowai-skill-executor`   | Execute specific skills or prompts       |     [ ]     |             |

### 3.8 Project Initialization — flowai-init (FR-8)

- **Description:** The `flowai-init` skill bootstraps AI agent understanding of a
  project by analyzing codebase, generating 3 AGENTS.md files (root,
  `documents/`, `scripts/`), and scaffolding documentation. Uses
  `generate_agents.ts` (Deno/TS, read-only) for project analysis and template
  files from `assets/` as reference for agent-driven file generation.
- **Use case scenario:** User runs `/flowai-init` on existing or new project. Agent
  runs the analysis script, determines Greenfield vs Brownfield by its own
  judgment, interviews user (Greenfield) or reverse-engineers architecture
  (Brownfield), generates 3 AGENTS.md files, documentation (SRS, SDS,
  whiteboard), and configures development commands.
- **Acceptance criteria:**
  - [x] **FR-8.1 Agent-driven Greenfield/Brownfield detection**: Script
        (`generate_agents.ts`) outputs `is_new` flag but SKILL.md explicitly
        instructs the agent to NOT rely on it. Agent determines project type
        based on file count, stack, file tree, and presence of config files.
        Evidence: `framework/skills/flowai-init/scripts/generate_agents.ts:93-96`,
        `framework/skills/flowai-init/SKILL.md` rule 4 "Greenfield/Brownfield Detection", step 2 "Analyze Project"
  - [x] **FR-8.2 Scripts are read-only (Deno/TS)**: Single script
        `generate_agents.ts` (command: `analyze`) only reads filesystem and
        outputs JSON to stdout. No file creation/modification. Evidence:
        `framework/skills/flowai-init/scripts/generate_agents.ts:5-9`,
        `framework/skills/flowai-init/scripts/generate_agents.ts:110`,
        `framework/skills/flowai-init/SKILL.md` rule 5 "Scripts are read-only"
  - [x] **FR-8.3 No rule copying**: SKILL.md rule 6 explicitly prohibits
        copying rules to IDE-specific directories. Rule management outside
        flowai-init scope. Evidence: `framework/skills/flowai-init/SKILL.md` rule 6 "No rule copying"
  - [x] **FR-8.4 Auto-generation of missing documentation**: SKILL.md step 8
        generates `documents/requirements.md` (SRS), `documents/design.md`
        (SDS), `documents/whiteboards/` (brownfield: init-context file) from
        actual project data using LLM capabilities. Skips existing files
        exceeding line thresholds (50 for SRS/SDS). Evidence:
        `framework/skills/flowai-init/SKILL.md` step 9 "Generate Documentation"
  - [x] **FR-8.5 Greenfield workflow**: SKILL.md step 3 defines structured
        interview collecting 10 data points (project name, vision, audience,
        problem, solution, risks, stack, architecture, key decisions, Deno
        tooling preference). Returns JSON for template filling. Evidence:
        `framework/skills/flowai-init/SKILL.md` step 3 "Greenfield Workflow (Interview)"
  - [x] **FR-8.6 Brownfield workflow**: SKILL.md step 4 defines discovery
        (read config files, infer architecture/decisions) and extraction
        (semantically identify doc/script sections in existing `./AGENTS.md`,
        move to subdirectory files, remove from root). Evidence:
        `framework/skills/flowai-init/SKILL.md` step 4 "Brownfield Workflow (Discovery & Extraction)"
  - [x] **FR-8.7 Multi-file architecture**: Produces 3 AGENTS.md files:
        `./AGENTS.md` (core rules, project metadata), `./documents/AGENTS.md`
        (documentation system rules), `./scripts/AGENTS.md` (development
        commands). Templates in `assets/` directory (3 files with
        `{{PLACEHOLDER}}` variables). Evidence:
        `framework/skills/flowai-init/assets/AGENTS.template.md`,
        `framework/skills/flowai-init/assets/AGENTS.documents.template.md`,
        `framework/skills/flowai-init/assets/AGENTS.scripts.template.md`,
        `framework/skills/flowai-init/SKILL.md` step 6 "Generate AGENTS.md Files"
  - [x] **FR-8.8 Per-file diff confirmation**: SKILL.md rules 3 and 8 require
        showing diffs and asking per-file confirmation before applying changes
        to existing files. Never silently overwrite. Evidence:
        `framework/skills/flowai-init/SKILL.md` rule 3 "Idempotency",
        rule 8 "Per-File Diff Confirmation",
        step 6 "For each file"
  - [x] **FR-8.9 User content preservation**: SKILL.md rule 9 requires
        preserving user's existing instructions in brownfield. Extracted
        content takes priority over template content. Templates are fallbacks
        for greenfield only. Evidence:
        `framework/skills/flowai-init/SKILL.md` rule 9 "Preserve User Content",
        step 4 "Important: extracted content...takes priority"
  - [x] **FR-8.10 Configure development commands**: SKILL.md step 10 detects
        stack, looks up specialized skills (e.g., `flowai-skill-configure-deno-commands`),
        creates standard command interface (`check`, `test`, `dev`, `prod`).
        Verifies `check` command works. Evidence:
        `framework/skills/flowai-init/SKILL.md` step 10 "Configure Development Commands"
  - [x] **FR-8.11 Cleanup**: SKILL.md step 12 removes temporary files
        (`project_info.json`, `interview_data.json`), verifies all 3
        AGENTS.md files exist, verifies no duplication between root and
        subdirectory files. Evidence:
        `framework/skills/flowai-init/SKILL.md` step 11 "Cleanup & Verify"
  - [x] **FR-8.16 CLAUDE.md symlink**: Create `./CLAUDE.md` symlink to
        `./AGENTS.md` for Claude Code compatibility (see FR-19).
        Evidence: `framework/skills/flowai-init/SKILL.md` step 7 "Claude Code Compatibility"
  - [x] **FR-8.12 OpenCode compatibility check**: SKILL.md step 8 checks
        `opencode.json` for subdirectory AGENTS.md glob entries, warns if
        missing. Evidence: `framework/skills/flowai-init/SKILL.md` step 8 "OpenCode Compatibility Check"
  - [x] **FR-8.13 Stack detection**: `generate_agents.ts` detects 6 stacks
        (Node.js, Deno, Go, Rust, Python, Swift) via marker files. Skips 11
        directories (`.git`, `node_modules`, `.cursor`, `.claude`, `.opencode`,
        `dist`, `build`, `coverage`, `.dev`, `__pycache__`, `vendor`). Evidence:
        `framework/skills/flowai-init/scripts/generate_agents.ts:76-92`
  - [x] **FR-8.14 Unit tests**: `generate_agents.test.ts` covers 8 scenarios
        (Deno/Node.js/Go detection, empty project, README reading, directory
        skipping, multi-stack, type exports). Evidence:
        `framework/skills/flowai-init/scripts/generate_agents.test.ts`
  - [x] **FR-8.15 Benchmark coverage**: 5 benchmark scenarios: `greenfield`
        (interview flow), `brownfield` (discovery from scratch), `brownfield-update`
        (re-run with diffs and user content preservation), `brownfield-idempotent`
        (preserve files when user declines changes), `vision-integration`
        (pre-filled interview data). Evidence:
        `framework/skills/flowai-init/benchmarks/greenfield/mod.ts`,
        `framework/skills/flowai-init/benchmarks/brownfield/mod.ts`,
        `framework/skills/flowai-init/benchmarks/brownfield-update/mod.ts`,
        `framework/skills/flowai-init/benchmarks/brownfield-idempotent/mod.ts`,
        `framework/skills/flowai-init/benchmarks/vision-integration/mod.ts`

### 3.9 Multi-IDE Dev Resource Distribution (FR-9)

- **Description:** Dev resources (skills, agents) stored directly in `.claude/skills/`
  and `.claude/agents/` (tracked in git). Framework resources installed by flowai
  (bundled source, `cli/` monorepo directory).
- **Use case scenario:** Developer clones project, runs `flowai sync`, and framework
  skills/agents are installed into `.claude/`. Dev resources already present from git.
- **Acceptance criteria:**
  - [x] Dev skills in `.claude/skills/`, dev agents in `.claude/agents/` (tracked in git). Evidence:
        `.claude/skills/`, `.claude/agents/`
  - [x] `check-skills.ts` validates `.claude/skills/` (dev skills). Evidence:
        `scripts/check-skills.ts:308-311`
  - [x] `.cursor/` and `.opencode/` in `.gitignore` (no longer used). Evidence:
        `.gitignore`
  - [x] Post-clone setup documented in README. Evidence: `README.md`

### 3.10 Global Framework Distribution — flowai (FR-10)

- **Description:** `flowai` CLI tool (`cli/` monorepo directory, published to JSR as `@korchasa/flowai`) syncs framework skills/agents into project-local IDE config dirs. Single command, no subcommands. Reads bundled framework data (no network dependency at runtime).
- **Def/Abbr:** CLI = flowai, BundledSource = JSON artifact with all framework files baked at publish time.

#### FR-10.1 Sync Command (`flowai`)
- **Desc:** Single command `flowai` run in project dir. Reads bundled framework, syncs skills/agents to IDE config dirs.
- **Scenario A (no config, interactive):** `flowai` without `.flowai.yaml` → interactive prompts (IDEs, packs) → generates `.flowai.yaml` → syncs.
- **Scenario A2 (no config, non-interactive):** `flowai -y` without `.flowai.yaml` → auto-detect IDEs, select all packs → generates `.flowai.yaml` with defaults → syncs.
- **Scenario B (with config):** `flowai` with `.flowai.yaml` → disclaimer → sync. Bundled files compared with local. Unchanged silently, locally modified → prompt.
- **Acceptance:**
  - [x] Without `.flowai.yaml` → interactive config generation → sync. Evidence: `cli/src/cli.ts:30-36`, `cli/src/config_generator.ts:20-100`
  - [x] With `.flowai.yaml` → disclaimer → sync. Evidence: `cli/src/cli.ts:39-56`, `cli/src/sync.ts:52-138`
  - [x] Files read from `BundledSource` (bundled.json). Evidence: `cli/src/source.ts:12-50`, `cli/src/source_test.ts:7-42`
  - [x] Skills written to `{ide_dir}/skills/{name}/`. Evidence: `cli/src/sync.ts:94-100`, `cli/src/main_test.ts:56-69`
  - [x] Agents transformed per-IDE via `transformAgent()`. Evidence: `cli/src/sync.ts:108-136`, `cli/src/transform.ts:31-60`
  - [x] Idempotent: safe on repeated runs. Evidence: `cli/src/plan.ts:17-30`
  - [x] `--yes` / `-y` flag for non-interactive mode. Evidence: `cli/src/cli.ts:21-23`
  - [x] `-y` without config → non-interactive config generation (auto-detect IDEs, all packs). Evidence: `cli/src/cli.ts:88-90`, `cli/src/config_generator.ts:13-54`

#### FR-10.2 Config Generation
- **Desc:** Interactive `.flowai.yaml` creation when config missing.
- **Acceptance:**
  - [x] Prompts: IDEs (auto-detected), skills include/exclude, agents include/exclude. Evidence: `cli/src/config_generator.ts:27-100`
  - [x] Reads available skills/agents from BundledSource. Evidence: `cli/src/config_generator.ts:47-58`
  - [x] Writes valid `.flowai.yaml`. Evidence: `cli/src/config.ts:71-80`

#### FR-10.3 Selective Sync
- **Desc:** `.flowai.yaml` controls which skills/agents to sync.
- **Acceptance:**
  - [x] Include/exclude filters for skills and agents. Evidence: `cli/src/sync.ts:186-191`, `cli/src/sync_test.ts:5-18`
  - [x] Include + exclude mutually exclusive. Evidence: `cli/src/config.ts:55-65`

#### FR-10.4 CLAUDE.md Symlinks
- **Desc:** When `claude` IDE configured, create `CLAUDE.md -> AGENTS.md` symlinks wherever `AGENTS.md` exists.
- **Acceptance:**
  - [x] Scans project, creates/updates symlinks. Evidence: `cli/src/symlinks.ts:21-55`, `cli/src/symlinks_test.ts`
  - [x] Skips existing regular files. Evidence: `cli/src/symlinks.ts:41-43`

#### FR-10.5 IDE Auto-Detection
- **Desc:** Detect IDEs by config dir presence (`.cursor/`, `.claude/`, `.opencode/`).
- **Acceptance:**
  - [x] Detects 3 IDEs. Evidence: `cli/src/types.ts:46-48`, `cli/src/ide_test.ts`
  - [x] Used as default when `ides` not in `.flowai.yaml`. Evidence: `cli/src/ide.ts:19-30`

#### FR-10.6 Self-Update Check
- **Desc:** Before sync, checks JSR for newer version. Fail-open (network errors ignored).
- **Acceptance:**
  - [x] Fetches JSR meta, compares semver. Evidence: `cli/src/version.ts:36-62`
  - [x] `--skip-update-check` flag. Evidence: `cli/src/cli.ts:22-25`
  - [x] 5s timeout, fail-open. Evidence: `cli/src/version.ts:9`, `cli/src/version_test.ts`

#### FR-10.7 Bundled Source
- **Desc:** Framework files bundled into `cli/src/bundled.json` at publish time. No network dependency during sync.
- **Acceptance:**
  - [x] `scripts/bundle-framework.ts` generates bundle from `../framework/`. Evidence: `cli/scripts/bundle-framework.ts`
  - [x] `BundledSource` reads bundle. Evidence: `cli/src/source.ts:12-50`, `cli/src/source_test.ts:33-42`
  - [x] Guard: `task-check.ts` runs bundle before tests. Evidence: `scripts/task-check.ts:10-13`

#### FR-10.8 Cross-IDE User Resource Sync

- **Desc:** When `user_sync: true` in `.flowai.yaml` and ≥2 IDEs configured, propagate user-created resources (non-`flowai-*`, non-framework) across IDE config dirs. Canonical source = newest mtime.
- **Acceptance:**
  - [x] Scans skills/agents in each IDE dir, skips `flowai-*` prefix. Evidence: `cli/src/user_sync.ts:77-78`, `cli/src/user_sync_test.ts:39-53`
  - [x] Skips framework-bundled resources by name (e.g., `deep-research-worker`). Evidence: `cli/src/user_sync.ts:77-78`, `cli/src/sync.ts:148-150`
  - [x] Merges by `(type, name)` across IDEs, picks canonical by newest mtime. Evidence: `cli/src/user_sync.ts:284-293`
  - [x] Agent frontmatter transformed per IDE via `crossTransformAgent()`. Evidence: `cli/src/user_sync.ts:219-226`
  - [x] Invalid YAML frontmatter: copies as-is with warning (no crash). Evidence: `cli/src/transform.ts:113-128`, `cli/src/transform_test.ts`
  - [x] Skills copied as-is (no frontmatter transform). Evidence: `cli/src/user_sync.ts:218-228`
  - [x] Conflict prompt in interactive mode; `--yes` overwrites. Evidence: `cli/src/sync.ts:198-223`
  - [x] Skipped when <2 IDEs. Evidence: `cli/src/user_sync.ts:318-321`
  - [x] Idempotent: repeated runs produce 0 writes. Evidence: manual verification

#### FR-10.9 Cross-IDE Resource Mapping (universal representation)

- **Desc:** Defines how each logical resource type maps to IDE-specific paths and formats. flowai uses these mappings during framework sync (FR-10.1) and user sync (FR-10.8).

**Resource type mapping:**

| Logical type | Cursor | Claude Code | OpenCode |
|:---|:---|:---|:---|
| **Command** (user-invoked only) | `.cursor/commands/foo.md` — flat md, no frontmatter | `.claude/commands/foo.md` — flat md, optional frontmatter (`allowed-tools`, `model`) | `.opencode/commands/foo.md` — flat md, `$ARGUMENTS` + shell interpolation |
| **Skill** (model-invocable) | `.cursor/skills/foo/SKILL.md` — dir, frontmatter `name`+`description` | `.claude/skills/foo/SKILL.md` — dir, frontmatter `name`+`description` | `.opencode/skills/foo/SKILL.md` — dir, same format |
| **Skill-command** (user-invoked skill) | `.cursor/skills/foo/SKILL.md` with `disable-model-invocation: true` | `.claude/skills/foo/SKILL.md` with `disable-model-invocation: true` | `.opencode/skills/foo/SKILL.md` with `disable-model-invocation: true` |
| **Agent** | `.cursor/agents/foo.md` — frontmatter: `name`, `description`, `readonly` | `.claude/agents/foo.md` — frontmatter: `name`, `description`, `tools`, `disallowedTools` | `.opencode/agents/foo.md` — frontmatter: `description`, `mode`, `tools` (map) |

**Agent frontmatter field mapping (universal → IDE):**

| Universal field | Cursor | Claude Code | OpenCode |
|:---|:---|:---|:---|
| `name` | kept | kept | dropped |
| `description` | kept | kept | kept |
| `tools` (string) | dropped | kept | dropped |
| `disallowedTools` | dropped | kept | dropped |
| `readonly` | kept | dropped | dropped |
| `mode` | dropped | dropped | kept |
| `opencode_tools` (map) | dropped | dropped | renamed → `tools` |
| unknown fields | pass-through | pass-through | pass-through |

**Cross-IDE sync transformations (user_sync):**

| Source → Target | Resource type | Transform |
|:---|:---|:---|
| Skill (any IDE pair) | skill | Copy dir as-is (format identical across IDEs) |
| Skill with extra files (references/, scripts/) | skill | Copy entire dir tree |
| Agent (cursor → claude) | agent | Frontmatter: keep `name`+`description`+`tools`+`disallowedTools`, drop `readonly` |
| Agent (claude → cursor) | agent | Frontmatter: keep `name`+`description`+`readonly`, drop `tools`+`disallowedTools` |
| Agent (any → opencode) | agent | Frontmatter: keep `description`+`mode`, rename `opencode_tools`→`tools`, drop rest |
| Agent (invalid YAML) | agent | Copy as-is, log warning |
| Command (cursor → claude) | command | Copy `.cursor/commands/foo.md` → `.claude/commands/foo.md` as-is |
| Command (cursor → opencode) | command | Copy `.cursor/commands/foo.md` → `.opencode/commands/foo.md` as-is |

**Not synced (by design):**

- Framework resources (`flowai-*` prefix or matching bundled names) — managed by framework sync (FR-10.1)
- Rules (`.cursor/rules/` ↔ `.claude/rules/`) — frontmatter differs fundamentally (globs vs paths), no automated transform
- Hooks (`.cursor/hooks.json` ↔ `.claude/settings.json` hooks key) — structure and event names differ, no automated transform
- MCP config (`mcp.json` ↔ `.mcp.json`) — trivial rename, user responsibility

**Open questions:**

- [ ] Should `user_sync` also propagate `.cursor/commands/` ↔ `.claude/commands/` ↔ `.opencode/commands/`?
- [ ] Should skills with `disable-model-invocation: true` in one IDE map to commands in another?

- **Acceptance:**
  - [x] Agent transform implemented per mapping table above. Evidence: `cli/src/transform.ts:38-70`, `cli/src/transform_test.ts`
  - [x] Skill copy preserves dir structure with extra files. Evidence: `cli/src/user_sync.ts:89-104`
  - [x] Framework resources excluded from user sync. Evidence: `cli/src/user_sync.ts:77-78`, `cli/src/sync.ts:148-150`
  - [ ] Command sync across IDEs (pending open question resolution)

### 3.11 Conventional Commits — `agent` Type (FR-11)

- **Description:** Add `agent:` as a new commit type in Conventional Commits convention
  used by `flowai-commit`. Covers changes to agents, skills, `AGENTS.md`, and other
  AI-agent-related configuration in IDE directories.
- **Use case scenario:** Developer modifies a skill's `SKILL.md` or updates an agent
  definition. On commit, the message is prefixed with `agent:` (e.g.,
  `agent: update flowai-commit skill with atomic grouping rules`).
- **Acceptance criteria:**
  - [x] **FR-11.1 New type recognized**: `flowai-commit` skill recognizes `agent:` as a
        valid Conventional Commits type. Evidence:
        `framework/skills/flowai-commit/SKILL.md:37-38`
  - [x] **FR-11.2 Scope**: `agent:` type applies to changes in: `framework/agents/`,
        `framework/skills/`, `.claude/agents/`, `.claude/skills/`, `**/AGENTS.md`,
        `**/CLAUDE.md`. Evidence:
        `framework/skills/flowai-commit/SKILL.md:39`
  - [x] **FR-11.3 Auto-detection**: `flowai-commit` SKILL.md rule 4 instructs agent to
        auto-select `agent:` when ALL staged files match scope paths. Mixed changes
        (agent + app code) use the application type. Evidence:
        `framework/skills/flowai-commit/SKILL.md:40-41`
  - [x] **FR-11.4 Documentation**: The `agent:` type is documented in `flowai-commit`
        SKILL.md rule 4 (scope, auto-detection, examples) and in step 4 type list.
        Evidence: `framework/skills/flowai-commit/SKILL.md:37-42`

### 3.12 flowai-init Idempotency with User Edit Preservation (FR-12)

- **Description:** `flowai-init` must be fully idempotent: re-running on an already
  initialized project must preserve user's manual edits in `AGENTS.md` and other
  generated files. Framework-managed sections are updated; user-added sections are
  kept intact.
- **Use case scenario:** User runs `/flowai-init` on a project that already has
  `AGENTS.md` with custom rules added by the user. The agent updates
  framework-generated sections (e.g., templates, stack info) but preserves all
  user-added content.
- **Acceptance criteria:**
  - [x] **FR-12.1 Multi-file architecture**: `AGENTS.md` split into 3 domain-scoped
        files: `./AGENTS.md` (core rules + project metadata), `./documents/AGENTS.md`
        (doc system rules), `./scripts/AGENTS.md` (dev commands). Agent reads templates
        from `assets/` and generates files directly (no manifest). Evidence:
        `framework/skills/flowai-init/SKILL.md` Context "File Structure",
        `framework/skills/flowai-init/assets/AGENTS.template.md`,
        `framework/skills/flowai-init/assets/AGENTS.documents.template.md`,
        `framework/skills/flowai-init/assets/AGENTS.scripts.template.md`
  - [x] **FR-12.2 No data loss**: In brownfield, agent semantically extracts
        documentation/script sections from existing `./AGENTS.md` into subdirectory
        files. Per-file diff shown before applying. User confirms each file
        individually. Evidence: `framework/skills/flowai-init/SKILL.md`
        rule 3 "Idempotency", rule 8 "Per-File Diff Confirmation",
        step 6 "For each file"
  - [x] **FR-12.3 Documents preservation**: Existing files exceeding line thresholds
        (50 for SRS/SDS, 10 for whiteboard) are not overwritten. Evidence:
        `framework/skills/flowai-init/SKILL.md` step 9 "Generate Documentation"
  - [x] **FR-12.4 Diff-based update**: Agent shows diff per file, asks for
        confirmation. Evidence: `framework/skills/flowai-init/SKILL.md`
        step 6 "For each file", step 5 "Report findings to user"
  - [ ] **FR-12.5 Idempotent re-run**: Running `flowai-init` twice in a row with no
        manual changes produces no modifications on the second run.
  - [x] **FR-12.6 Deno/TS scripts**: `generate_agents.ts` — analyze-only (Deno).
        Template rendering removed; agent handles generation natively. Evidence:
        `framework/skills/flowai-init/scripts/generate_agents.ts:1-10`,
        `framework/skills/flowai-init/scripts/generate_agents.ts:126-138`
  - [x] **FR-12.7 OpenCode compatibility**: Agent checks `opencode.json` for
        subdirectory AGENTS.md glob entries. Warns if missing. Evidence:
        `framework/skills/flowai-init/SKILL.md` step 8 "OpenCode Compatibility Check"

### 3.13 Migrate Framework-Specific Python Scripts to Deno/TypeScript (FR-13)

- **Description:** Python scripts in `framework/skills/` are split into two categories:
  **framework-specific** (flowai lifecycle tooling: init, validate, package for
  commands/skills/rules) — must be migrated to Deno/TS to eliminate Deno users'
  Python dependency. **General-purpose** (universally useful utilities: token counting,
  Mermaid validation) — remain in Python as they serve any project regardless of
  framework.
- **Use case scenario:** User installs flowai framework. Framework lifecycle
  scripts (scaffolding, validation, packaging) execute via `deno run`. General-purpose
  utility scripts remain as `python3` invocations (Python available in target
  environments).
- **Acceptance criteria:**
  - [x] **FR-13.1 Framework scripts migrated** (8 files → Deno/TS). Evidence:
    - `framework/skills/flowai-skill-engineer-command/scripts/init_command.ts`
    - `framework/skills/flowai-skill-engineer-command/scripts/validate_command.ts`
    - `framework/skills/flowai-skill-engineer-command/scripts/package_command.ts`
    - `framework/skills/flowai-skill-engineer-rule/scripts/init_rule.ts`
    - `framework/skills/flowai-skill-engineer-rule/scripts/validate_rule.ts`
    - `framework/skills/flowai-skill-engineer-skill/scripts/init_skill.ts`
    - `framework/skills/flowai-skill-engineer-skill/scripts/validate_skill.ts`
    - `framework/skills/flowai-skill-engineer-skill/scripts/package_skill.ts`
  - [x] **FR-13.2 General-purpose scripts remain Python** (2 files). Evidence:
    - `framework/skills/flowai-skill-analyze-context/scripts/count_tokens.py`
    - `framework/skills/flowai-skill-draw-mermaid-diagrams/scripts/validate.py`
  - [x] **FR-13.3 Behavioral parity**: Each migrated `.ts` script produces identical
        output (stdout messages, exit codes) as the Python original. Verified via
        56 unit tests covering all validation logic. Evidence:
        `framework/skills/flowai-skill-engineer-command/scripts/command_scripts_test.ts`,
        `framework/skills/flowai-skill-engineer-rule/scripts/rule_scripts_test.ts`,
        `framework/skills/flowai-skill-engineer-skill/scripts/skill_scripts_test.ts`
  - [x] **FR-13.4 SKILL.md references updated**: `flowai-skill-engineer-command`,
        `flowai-skill-engineer-rule`, `flowai-skill-engineer-skill` SKILL.md files reference
        `deno run -A scripts/*.ts` instead of `python3 scripts/*.py`. Evidence:
        `framework/skills/flowai-skill-engineer-command/SKILL.md:292`,
        `framework/skills/flowai-skill-engineer-rule/SKILL.md:215`,
        `framework/skills/flowai-skill-engineer-skill/SKILL.md:259-282`
  - [x] **FR-13.5 Stack update**: `AGENTS.md` tooling stack notes Python as
        "general-purpose utility scripts only" (not removed entirely). Evidence:
        `AGENTS.md:54`
  - [x] **FR-13.6 Tests**: 56 unit tests across 3 test files:
        `command_scripts_test.ts` (18), `skill_scripts_test.ts` (19),
        `rule_scripts_test.ts` (19). All pass. Evidence:
        `framework/skills/flowai-skill-engineer-command/scripts/command_scripts_test.ts`,
        `framework/skills/flowai-skill-engineer-rule/scripts/rule_scripts_test.ts`,
        `framework/skills/flowai-skill-engineer-skill/scripts/skill_scripts_test.ts`

### 3.14 Cross-IDE Hook/Plugin Format Transformation (FR-14)

- **Description:** All three supported IDEs have hook/plugin systems with
  different formats: Cursor hooks (`.cursor/hooks.json`), Claude Code hooks
  (`settings.json`, 18 event types), and OpenCode plugins
  (`.opencode/plugins/*.ts` with `plugin()` API). The framework provides
  comprehensive cross-IDE documentation in `flowai-skill-engineer-hook` SKILL.md
  with IDE-specific reference files, enabling AI agents to generate correct
  hook configurations from natural language requests.
- **Use case scenario:** Developer asks the agent to create a hook. The agent
  detects the IDE, reads the corresponding reference file, and generates
  the correct IDE-native configuration using documented templates and examples.
- **Design decision:** Canonical format = documented templates in SKILL.md with
  IDE-specific reference files, not a separate schema. Rationale: LLMs reliably
  follow template patterns; a separate canonical schema adds maintenance burden
  without benefit and cannot capture the fundamental architectural differences
  (declarative JSON vs programmatic TS modules).
- **Acceptance criteria:**
  - [x] **FR-14.1 Canonical format**: IDE-agnostic hook documentation with
        cross-IDE mapping tables, type availability matrix, and per-IDE
        reference files in `flowai-skill-engineer-hook/references/`. Evidence:
        `framework/skills/flowai-skill-engineer-hook/SKILL.md:33-68` (mapping table,
        availability matrix),
        `framework/skills/flowai-skill-engineer-hook/references/hooks_api.md`,
        `framework/skills/flowai-skill-engineer-hook/references/claude_code_hooks_api.md`,
        `framework/skills/flowai-skill-engineer-hook/references/opencode_plugins_api.md`
  - [x] **FR-14.2 Cursor output**: SKILL.md + reference provide templates for
        generating correct Cursor `hooks.json` configuration. Evidence:
        `framework/skills/flowai-skill-engineer-hook/SKILL.md:80-104` (Cursor section),
        `framework/skills/flowai-skill-engineer-hook/references/hooks_api.md`
  - [x] **FR-14.3 Claude Code output**: SKILL.md + reference provide templates
        for generating correct Claude Code `settings.json` hooks section.
        Cover all 18 event types. Evidence:
        `framework/skills/flowai-skill-engineer-hook/SKILL.md:106-147` (Claude Code section),
        `framework/skills/flowai-skill-engineer-hook/references/claude_code_hooks_api.md`,
        `framework/skills/flowai-skill-engineer-hook/benchmarks/basic-claude-code/mod.ts` (benchmark PASSED)
  - [x] **FR-14.4 OpenCode output**: SKILL.md + reference provide templates
        for generating correct OpenCode plugin `.ts` files using `Plugin` type
        and `tool()` helper. Evidence:
        `framework/skills/flowai-skill-engineer-hook/SKILL.md:149-184` (OpenCode section),
        `framework/skills/flowai-skill-engineer-hook/references/opencode_plugins_api.md`
  - [x] **FR-14.5 Hook types**: Documentation covers `command` (script-based),
        `prompt` (LLM-based), `agent` (subagent-based), `http` (webhook), and
        programmatic (OpenCode) hook types with availability matrix per IDE.
        Evidence: `framework/skills/flowai-skill-engineer-hook/SKILL.md:33-41`

### 3.15 Update `flowai-skill-engineer-hook` for Cross-IDE Support (FR-15)

- **Description:** The `flowai-skill-engineer-hook` skill currently documents hook
  creation primarily for Cursor. It must be updated to cover Claude Code's
  expanded hook system (17+ events, three hook types: command/prompt/agent)
  and OpenCode's plugin system.
- **Use case scenario:** User asks to create a hook. The skill guides them
  through authoring for their target IDE, covering all available event types
  and hook mechanisms.
- **Acceptance criteria:**
  - [x] **FR-15.1 Claude Code hooks**: Document all 18 event types, four hook
        types (command, prompt, agent, http), and `settings.json` configuration.
        Evidence: `framework/skills/flowai-skill-engineer-hook/references/claude_code_hooks_api.md`
        (277 lines, all events with I/O schemas, 4 hook types with examples)
  - [x] **FR-15.2 OpenCode plugins**: Document `.opencode/plugins/*.ts` format,
        `tool()` helper, event API, and npm package distribution. Evidence:
        `framework/skills/flowai-skill-engineer-hook/references/opencode_plugins_api.md`
        (207 lines, 17 hooks, 22+ system events, tool() helper, npm distribution)
  - [x] **FR-15.3 Cursor hooks**: Retain existing Cursor hook documentation.
        Evidence: `framework/skills/flowai-skill-engineer-hook/SKILL.md:80-104`,
        `framework/skills/flowai-skill-engineer-hook/references/hooks_api.md` (updated
        with failClosed, loop_limit, env vars, Claude Code compatibility),
        `framework/skills/flowai-skill-engineer-hook/assets/hook_template.sh`
  - [x] **FR-15.4 Cross-IDE guidance**: Skill provides IDE-specific examples
        and notes which events/types are available per IDE. Evidence:
        `framework/skills/flowai-skill-engineer-hook/SKILL.md:33-68` (event mapping
        table + type availability matrix),
        `framework/skills/flowai-skill-engineer-hook/SKILL.md:106-184` (same hook
        "block rm -rf" shown in all 3 IDE formats)

### 3.16 Update `flowai-skill-engineer-command` for Claude Code Unification (FR-16)

- **Description:** Claude Code has unified commands and skills under a single
  namespace — `.claude/commands/` and `.claude/skills/` are now merged, with
  skills as the recommended format. The `flowai-skill-engineer-command` skill must
  reflect this change.
- **Use case scenario:** User asks to create a command for Claude Code. The skill
  informs them that Claude Code uses skills (SKILL.md) as the unified format
  and guides them accordingly.
- **Acceptance criteria:**
  - [x] **FR-16.1 Documentation update**: `flowai-skill-engineer-command/SKILL.md` notes
        that Claude Code commands = skills (unified namespace). Evidence:
        `framework/skills/flowai-skill-engineer-command/SKILL.md:37` (Note about
        `.claude/commands/` legacy vs `.claude/skills/` recommended)
  - [x] **FR-16.2 IDE-specific guidance**: Skill provides correct path and format
        for each IDE (Cursor: `.cursor/commands/`, Claude Code: `.claude/skills/`,
        OpenCode: `.opencode/commands/`). Evidence:
        `framework/skills/flowai-skill-engineer-command/SKILL.md:31-37`
  - [x] **FR-16.3 No breaking changes**: Existing command creation workflow for
        Cursor and OpenCode remains unchanged. Scripts are IDE-agnostic, operate
        on generic directory paths. Evidence:
        `framework/skills/flowai-skill-engineer-command/scripts/init_command.ts`,
        `framework/skills/flowai-skill-engineer-command/scripts/validate_command.ts`,
        `framework/skills/flowai-skill-engineer-command/scripts/package_command.ts`

### 3.17 Resolve IDE Support Scope (FR-17)

- **Description:** Root `AGENTS.md` line 25 lists 5 IDEs (Cursor, Claude Code,
  Antigravity, OpenAI Codex, OpenCode) but all infrastructure (scripts, agent
  directories, flowai) supports only 3 (Cursor, Claude Code, OpenCode).
  Several skill SKILL.md files and their Python scripts reference Codex and
  Antigravity paths. This inconsistency must be resolved.
- **Use case scenario:** A contributor reads AGENTS.md, expects Codex/Antigravity
  support, but finds no corresponding agent directories or install logic.
- **Acceptance criteria:**
  - [x] **FR-17.1 Decision**: Codex and Antigravity are **unsupported**. Supported
        IDEs: Cursor, Claude Code, OpenCode. Evidence: removed from all SKILL.md
        files, scripts, and detection logic in `flowai-skill-engineer-rule/`,
        `flowai-skill-engineer-skill/`.
  - [x] **FR-17.2 AGENTS.md alignment**: Root `AGENTS.md` IDE list narrowed to
        3 supported IDEs (Cursor, Claude Code, OpenCode). Evidence:
        `AGENTS.md:25`, `AGENTS.md:37`, `AGENTS.md:73`
  - [x] **FR-17.3 Skill references**: `flowai-skill-engineer-rule`, `flowai-skill-engineer-skill`
        SKILL.md files and their scripts updated to 3-IDE scope. Antigravity/Codex
        columns, sections, detection logic, and IDE options removed.
        `flowai-skill-engineer-command` had no Codex/Antigravity references.
        Legacy Python scripts (`init_rule.py`, `validate_rule.py`) deleted.
        Evidence: `flowai-skill-engineer-rule/SKILL.md`, `flowai-skill-engineer-rule/scripts/init_rule.ts`,
        `flowai-skill-engineer-rule/scripts/validate_rule.ts`,
        `flowai-skill-engineer-rule/references/examples.md`,
        `flowai-skill-engineer-skill/SKILL.md`
  - [x] **FR-17.4 Design doc**: `design.md` replaced "Cursor" with generic
        "IDE/Agent" terminology in algorithms section. Evidence:
        `documents/design.md:14-23`, `documents/design.md:26`,
        `documents/design.md:38`

### 3.18 Review-and-Commit Workflow — `flowai-review-and-commit` (FR-18)

- **Description:** A composite command that first performs a quality review of the
  current implementation (using `flowai-review` logic) and then, if the review passes,
  automatically invokes `flowai-commit` to create atomic commits. Combines the review
  and commit steps into a single user action.
- **Use case scenario:** User completes a task and runs `/flowai-review-and-commit`.
  The agent reviews the diff for task completion and code quality. If the review
  verdict is **Approve**, the agent proceeds to the commit workflow. If
  **Request Changes** or **Needs Discussion**, the agent reports findings and stops
  without committing.
- **Acceptance criteria:**
  - [x] **FR-18.1 Review phase**: Executes the full `flowai-review` workflow (QA +
        code review) on current changes. Evidence:
        `framework/skills/flowai-review-and-commit/SKILL.md:55-58`
  - [x] **FR-18.2 Gate logic**: Proceeds to commit ONLY if the review verdict is
        **Approve** (no critical issues). Stops and reports findings otherwise.
        Evidence: `framework/skills/flowai-review-and-commit/SKILL.md:60-68`
  - [x] **FR-18.3 Commit phase**: Invokes `flowai-commit` workflow (documentation
        audit, pre-commit verification, atomic grouping, commit execution).
        Evidence: `framework/skills/flowai-review-and-commit/SKILL.md:70-73`
  - [x] **FR-18.4 Single command**: Available as `/flowai-review-and-commit` chat
        command. User does not need to run review and commit separately.
        Evidence: `framework/skills/flowai-review-and-commit/SKILL.md:1-4`
  - [x] **FR-18.5 Transparency**: Reports both review results and commit results
        to the user in a single output.
        Evidence: `framework/skills/flowai-review-and-commit/SKILL.md:75-78`

### 3.19 CLAUDE.md Symlink in flowai-init (FR-19)

- **Description:** `flowai-init` must create a `CLAUDE.md` symlink pointing to
  `./AGENTS.md` in the project root. This ensures Claude Code reads the same
  rules as other IDEs (SPOT — single point of truth). The project itself uses
  this pattern: `CLAUDE.md -> ./AGENTS.md`.
- **Use case scenario:** User runs `/flowai-init` on a project that uses Claude Code.
  In addition to the 3 `AGENTS.md` files, the agent creates a `./CLAUDE.md`
  symlink to `./AGENTS.md` so Claude Code picks up the project rules natively.
- **Acceptance criteria:**
  - [x] **FR-19.1 Symlink creation**: `flowai-init` creates `./CLAUDE.md` as a
        relative symlink to `./AGENTS.md` (both Greenfield and Brownfield).
        Evidence: `framework/skills/flowai-init/SKILL.md` step 7 "Claude Code Compatibility"
  - [x] **FR-19.2 Idempotency**: If `./CLAUDE.md` already exists as a correct
        symlink, skip silently. If it exists as a regular file or wrong symlink,
        warn the user and ask for confirmation before replacing.
        Evidence: `framework/skills/flowai-init/SKILL.md` step 7 "If CLAUDE.md exists..."
  - [x] **FR-19.3 Verification**: Cleanup step verifies `./CLAUDE.md` symlink
        exists and points to `./AGENTS.md`.
        Evidence: `framework/skills/flowai-init/SKILL.md` step 11 "Cleanup & Verify"

### 3.20 AI Devcontainer Setup — flowai-skill-setup-ai-ide-devcontainer (FR-20)

- **Description:** `flowai-skill-setup-ai-ide-devcontainer` skill creates a `.devcontainer/`
  configuration optimized for AI IDE development. Can be invoked by the agent
  or delegated from `flowai-init` step 11. Generates `devcontainer.json` (and optionally
  `Dockerfile` + `init-firewall.sh`) based on detected tech stack, with Claude Code CLI
  integration, secrets handling, and optional global skills mounting.
- **Use case scenario:** User runs `/flowai-skill-setup-ai-ide-devcontainer` on any project. The agent
  detects the stack, asks about AI CLI, global skills, and security hardening, then
  generates `.devcontainer/` configuration. Also invoked from `flowai-init` when user
  agrees to devcontainer setup.
- **Acceptance criteria:**
  - [x] **FR-20.1 User consent**: Agent asks the user before creating devcontainer
        files. Devcontainer is NOT created without explicit user agreement.
        Evidence: `framework/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md` Step 4 "Determine Capabilities",
        `framework/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/node-basic/mod.ts` (userPersona confirms prompts)
  - [x] **FR-20.2 Stack-aware generation**: `devcontainer.json` references a base
        image matching the detected stack (e.g., `mcr.microsoft.com/devcontainers/typescript-node`
        for Node/TS, community Deno feature for Deno). Extensions list includes
        relevant IDE extensions for the stack.
        Evidence: `framework/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md` Step 1 "Detect Project Stack",
        `framework/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md:152-176` (Stack Reference tables)
  - [x] **FR-20.3 Idempotency**: If `.devcontainer/` already exists, the agent shows
        diff and asks for per-file confirmation before overwriting (same pattern as
        other brownfield files).
        Evidence: `framework/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md` Step 3 "Detect Existing Configuration",
        `framework/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/brownfield-existing/mod.ts`
  - [x] **FR-20.4 Greenfield interview integration**: For greenfield projects via
        flowai-init, the devcontainer question is included in the interview (step 3).
        flowai-init delegates to flowai-skill-setup-ai-ide-devcontainer when user agrees.
        Evidence: `framework/skills/flowai-init/SKILL.md` step 3 (interview includes `use_devcontainer`),
        `framework/skills/flowai-init/SKILL.md` step 11 (delegation to devcontainer skill)
  - [x] **FR-20.5 Verification**: Generated `.devcontainer/devcontainer.json` is
        valid JSON. Dockerfile (if generated) has valid `FROM` line. No hardcoded
        secrets in any generated file.
        Evidence: `framework/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md` Step 7 "Verify"
  - [x] **FR-20.6 AI CLI integration**: When Claude Code selected, configures native
        installer or npm install, config persistence volume, and `ANTHROPIC_API_KEY`
        via `remoteEnv` with `${localEnv:}` (no hardcoded values).
        Evidence: `framework/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md:207-268` (AI CLI Setup Reference),
        `framework/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/opencode-multi-cli/mod.ts` (multi-CLI coverage)
  - [x] **FR-20.7 Global skills mounting**: Host `~/.claude/` is bind-mounted
        read-only to `~/.claude-host`. `~/.claude` itself is a Docker volume
        (isolates container state from host). `postStartCommand` syncs global
        user skills/commands from host into container on every start:
        `cp -rL ~/.claude-host/skills ~/.claude/skills` (dereferences symlinks
        into real files). Skills update on container restart, not real-time.
        Documents that bind mounts do not work in Codespaces.
        Evidence: `framework/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md:248-253` (Global Skills Mount Rules),
        `framework/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/deno-with-claude/mod.ts` (global_skills_mount check)
  - [x] **FR-20.8 Security hardening**: Optional firewall (`init-firewall.sh`) with
        default-deny policy, stack-aware domain allowlist, and verification tests.
        Evidence: `framework/skills/flowai-skill-setup-ai-ide-devcontainer/references/firewall-template.md`,
        `framework/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/deno-with-claude/mod.ts` (firewall_script check)
  - [x] **FR-20.9 Sync timing**: Global skill/command sync MUST happen in
        `postStartCommand` (not `postCreateCommand`), so updates from host
        are picked up on every container restart without rebuild.
        Evidence: `framework/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md:286-293` (Lifecycle Hooks Reference),
        `framework/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/deno-with-claude/mod.ts` (global_skills_sync_in_post_start check)
  - [x] **FR-20.10 Symlink dereferencing**: `cp -rL` MUST be used (not `cp -r`)
        because host skills may be symlinks with host-relative paths that are
        unresolvable inside the container.
        Evidence: `framework/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md:252` (cp -rL in Global Skills Mount Rules),
        `framework/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/deno-with-claude/mod.ts` (symlink_dereference check)
  - [x] **FR-20.11 Feature discovery**: Agent scans project files for indicators
        (lockfiles, config files, dependency manifests) and suggests relevant
        devcontainer features from the catalog (`references/features-catalog.md`).
        High-confidence matches (secondary runtimes, build tools) are auto-added;
        optional/heavy features (databases, Docker-in-Docker, cloud CLIs) are
        presented to the user for confirmation. Features already covered by the
        base image are excluded. The user sees a grouped list with detection
        rationale before generation.
        Evidence: `framework/skills/flowai-skill-setup-ai-ide-devcontainer/SKILL.md` Step 2 "Discover Relevant Features",
        `framework/skills/flowai-skill-setup-ai-ide-devcontainer/references/features-catalog.md`,
        `framework/skills/flowai-skill-setup-ai-ide-devcontainer/benchmarks/feature-discovery/mod.ts`

### 3.21 Universal Skill & Script Requirements (FR-21)

- **Description:** All framework skills MUST conform to the agentskills.io
  standard and work identically across supported IDEs (Cursor, Claude Code,
  OpenCode). Scripts bundled with skills MUST be cross-IDE compatible.
- **Use case scenario:** A developer installs flowai skills via
  flowai. Skills with bundled scripts work in any of the three
  supported IDEs without modification.
- **Priority:** High (foundational for multi-IDE support).

#### FR-21.1 agentskills.io Compliance

- **Acceptance criteria:**
  - [x] **FR-21.1.1 Directory structure**: Every skill is a directory with
        `SKILL.md` (required) and optional `scripts/`, `references/`, `assets/`,
        `evals/` subdirectories. No other top-level conventions (README.md, CHANGELOG.md).
        Enforced by `scripts/check-skills.ts`.
  - [x] **FR-21.1.2 Frontmatter**: `name` (required, max 64 chars, `[a-z0-9-]`,
        must match parent directory name) and `description` (required, max 1024
        chars). Optional: `license`, `compatibility`, `metadata`,
        `allowed-tools` (experimental), `disable-model-invocation`.
        Enforced by `scripts/check-skills.ts`.
  - [x] **FR-21.1.3 Progressive disclosure**: Metadata (~100 tokens) loaded at
        startup; full SKILL.md (<5000 tokens, <500 lines) on activation;
        scripts/references/assets loaded only when required.
        Enforced by `scripts/check-skills.ts`.
  - [x] **FR-21.1.4 File references**: One level deep from SKILL.md. No nested
        reference chains.
        Enforced by `scripts/check-skills.ts`.

#### FR-21.2 Cross-IDE Script Path Resolution

- **Acceptance criteria:**
  - [x] **FR-21.2.1 Relative paths**: SKILL.md MUST reference scripts using
        relative paths from the skill root (e.g., `scripts/validate.ts`,
        `python3 scripts/process.py`). Per agentskills.io client
        implementation guide, the IDE resolves relative paths against the
        skill's directory and converts to absolute paths in tool calls.
        All framework SKILL.md files migrated to relative paths.
  - [x] **FR-21.2.2 No custom path placeholders**: Do NOT use custom
        placeholders like `<this-skill-dir>` in framework skills. The
        agentskills.io standard defines relative paths as the canonical
        mechanism; IDEs are responsible for resolution. Existing skills
        using `<this-skill-dir>` MUST be migrated to plain relative paths.
        Enforced by `scripts/check-skills.ts`.
  - [x] **FR-21.2.3 No IDE-specific path variables**: Do NOT use
        `${CLAUDE_SKILL_DIR}` or other IDE-specific variables in framework
        skills. These are IDE extensions, not part of the agentskills.io
        standard, and break portability.
        Enforced by `scripts/check-skills.ts`.

#### FR-21.3 Script Requirements

- **Acceptance criteria:**
  - [x] **FR-21.3.1 Non-interactive**: Scripts MUST NOT use interactive prompts
        (stdin confirmation, interactive menus). All input via CLI flags, env
        vars, or stdin piping. Agents run in non-interactive shells.
        All 17 scripts use CLI args/env/stdin piping; none use interactive prompts.
  - [x] **FR-21.3.2 Structured output**: Scripts MUST output structured data
        (JSON preferred) to stdout. Diagnostics/progress to stderr. This
        enables reliable parsing by any agent implementation.
        All framework scripts output `{ "ok": bool, "result": {...} }` JSON to stdout. Diagnostics go to stderr via `console.error()`.
  - [x] **FR-21.3.3 Self-contained dependencies**: Scripts MUST declare
        dependencies inline (PEP 723 for Python, `npm:`/`jsr:` imports for
        Deno/TS). No implicit global installs required.
        All framework scripts use `jsr:` specifiers. No bare `@std/` imports remain in `framework/skills/`.
  - [N/A] **FR-21.3.4 Help output**: Scripts SHOULD implement `--help` flag as
        the primary way agents learn the script interface.
        Dropped: agents read SKILL.md for script interface; `--help` duplicates SKILL.md and adds maintenance burden.
  - [x] **FR-21.3.5 Meaningful exit codes**: Exit 0 on success, non-zero on
        failure. Scripts SHOULD use distinct codes for different error types.
        All 17 scripts exit 0/non-zero correctly. Verified across `scripts/` and `framework/skills/*/scripts/`.
  - [x] **FR-21.3.6 Read-only by default**: Analysis/validation scripts MUST
        NOT create, write, or modify project files. File creation is the
        agent's responsibility unless the script's explicit purpose is
        generation.
        Analysis scripts (`generate_agents.ts`, `check-skills.ts`, `check-agents.ts`) are read-only.
  - [x] **FR-21.3.7 Idempotent**: Scripts MUST be safe to run multiple times
        with the same input producing the same output.
        Validation/check scripts are inherently idempotent (read-only). Init scripts support `--skip-existing` flag for idempotent mode; default is fail-fast on conflict.
  - [x] **FR-21.3.8 Error messages**: Scripts MUST provide clear, actionable
        error messages to stderr. Include what failed, why, and how to fix.
        All 17 scripts write diagnostics to stderr via `console.error()`.
  - [x] **FR-21.3.9 Dry-run support**: Scripts performing destructive
        operations SHOULD support `--dry-run` flag.
        N/A — no framework scripts perform destructive operations. All are analysis/validation/symlink tools.

#### FR-21.4 Script Language Policy

- **Acceptance criteria:**
  - [x] **FR-21.4.1 Framework scripts in Deno/TS**: All framework product
        scripts (`framework/skills/*/scripts/`) MUST be written in
        Deno/TypeScript. Supersedes FR-13.2: the two remaining Python scripts
        (`count_tokens.py`, `validate.py`) must be migrated to Deno/TS.
        All 8 Python scripts removed. `count_tokens.ts` and `validate.ts` (Mermaid) written as replacements. Zero `.py` files in `framework/skills/`.
  - [x] **FR-21.4.2 General-purpose utilities in Python**: Utility scripts
        outside the framework product directory MAY use Python. Scripts inside
        `framework/skills/*/scripts/` MUST be Deno/TS per FR-21.4.1.
        Policy documented in SDS (section 3.1.2 "Script Language Policy"). Project uses Deno/TS exclusively — no Python.
  - [x] **FR-21.4.3 User-facing skills are language-agnostic**: The
        agentskills.io standard allows any language. Framework documentation
        (e.g., `flowai-skill-engineer-skill`) MUST NOT restrict users to a single
        language. Common options: Python, Bash, JavaScript/TypeScript.
        `flowai-skill-engineer-skill` does not restrict script language; examples mention multiple options.

#### FR-21.5 Script Execution Model

- **Acceptance criteria:**
  - [x] **FR-21.5.1 Agent-driven execution**: Scripts are NOT auto-executed.
        The agent reads SKILL.md instructions and decides when to run scripts
        using its standard code execution tool (Bash/terminal). This is
        consistent across all three IDEs.
        All SKILL.md files use imperative instructions ("Run…", "Execute…") directing the agent; no auto-execution hooks.
  - [x] **FR-21.5.2 No dedicated script runner**: There is no special "script
        runner" tool in any supported IDE. All script execution goes through
        the generic Bash/terminal tool.
        Confirmed: all three IDEs (Cursor, Claude Code, OpenCode) use Bash/terminal for script execution.
  - [x] **FR-21.5.3 allowed-tools hint**: Skills MAY use the `allowed-tools`
        frontmatter field (experimental) to pre-approve tools needed for
        script execution (e.g., `Bash(deno:*)`). This reduces permission
        prompts but is not guaranteed across all IDEs.
        Documented in SDS (section 3.1.3 "Skill Tool Hints"). Adoption is optional per agentskills.io spec.

#### FR-21.6 Skill Discovery Paths

- **Acceptance criteria:**
  - [x] **FR-21.6.1 Framework distribution**: Framework skills distributed
        from `framework/skills/` to IDE directories via flowai. See FR-10.
        Evidence: `cli/`, `cli/src/sync.ts`
  - [x] **FR-21.6.2 Cross-IDE discovery**: Skills discoverable by IDEs via
        IDE-specific config dirs (e.g., `.claude/skills/`). flowai handles
        placement per IDE.
  - [x] **FR-21.6.3 Name collision**: Project-level skills override user-level
        skills when names collide (per agentskills.io client implementation
        guide). flowai overwrites on sync. Documented in SDS (section 3.1.4).

### 3.22 Framework Update — `flowai-update` (FR-22)

- **Description:** Single entry point for updating the flowai framework in a
  project. Handles CLI update, skill/agent sync via `flowai sync`, and migration
  of scaffolded project artifacts using template diffs as migration source.
- **Use case scenario:** A new flowai version changes TDD conventions in
  `flowai-init` templates. The developer runs `/flowai-update`. The skill updates the
  CLI, syncs skills/agents, detects the convention drift in the project's
  `AGENTS.md`, shows a diff, and applies the change after confirmation.
- **Priority:** High (ensures projects stay aligned with framework conventions).

#### FR-22.1 CLI Update

- **Acceptance criteria:**
  - [x] **FR-22.1.1 Auto-update check**: `flowai-update` runs `flowai sync` which
        checks JSR for newer CLI version and offers to update. Evidence:
        `framework/skills/flowai-update/SKILL.md:42-47` step 1 "Sync framework"
        delegates to `flowai sync`, which has built-in update check
        (`cli/src/cli.ts:50-79`).
  - [x] **FR-22.1.2 Sync execution**: After CLI update, skills and agents are
        re-synced into IDE config directories. Evidence:
        `framework/skills/flowai-update/SKILL.md:43` runs `flowai sync` which
        performs full sync (`cli/src/sync.ts`).

#### FR-22.2 Scaffolded Artifact Migration

- **Acceptance criteria:**
  - [x] **FR-22.2.1 Drift detection**: Compares changed framework templates
        against scaffolded project artifacts (AGENTS.md, .devcontainer/,
        deno.json tasks, scripts/check.ts, documents/). Evidence:
        `framework/core/skills/flowai-update/SKILL.md` step 2 runs
        `flowai sync`; step 3 parses `>>> ACTIONS REQUIRED` output;
        step 4 migrates scaffolded artifacts listed in sync output
        (scaffolds declared in `pack.yaml`).
  - [x] **FR-22.2.2 Per-file confirmation**: Shows diff and asks user before
        modifying each scaffolded artifact. Never silently overwrites. Evidence:
        `framework/skills/flowai-update/SKILL.md:30` rule 2 "Per-file
        confirmation"; step 6 (`SKILL.md:75-78`) "Show per-file diff...
        Wait for user approval/rejection".
  - [x] **FR-22.2.3 User content preservation**: Only updates
        framework-originated sections. Project-specific customizations are
        preserved. Evidence: `framework/skills/flowai-update/SKILL.md:31`
        rule 3 "Preserve user content"; step 5 (`SKILL.md:71`)
        "Proposed update (preserving project-specific content)".
  - [x] **FR-22.2.4 Evidence-based changes**: Only proposes migrations when
        template diffs show relevant convention changes. Evidence:
        `framework/skills/flowai-update/SKILL.md:32` rule 4 "No changes
        without evidence"; step 3 (`SKILL.md:54-57`) parses template diffs
        before proposing.

#### FR-22.3 Cross-IDE Support

- **Acceptance criteria:**
  - [x] **FR-22.3.1 IDE detection**: Works for Cursor, Claude Code, and OpenCode
        projects. Detects IDE config dirs or reads `.flowai.yaml` `ides` field.
        Evidence: `framework/skills/flowai-update/SKILL.md:33` rule 5
        "Cross-IDE: Must work for Cursor, Claude Code, and OpenCode";
        step 2 (`SKILL.md:50`) checks `.claude/`, `.cursor/`, `.opencode/`
        or `.flowai.yaml`.

#### FR-22.4 Commit

- **Acceptance criteria:**
  - [x] **FR-22.4.1 Atomic commit**: Stages synced files + migrated artifacts
        together in one commit with message
        `chore(framework): update flowai framework`. Evidence:
        `framework/skills/flowai-update/SKILL.md:35` rule 7 "Atomic commit";
        step 7 (`SKILL.md:80-83`) stages all + commits with specified message.

### 3.23 Pack System — Modular Resource Installation (FR-23)

- **Description:** Reorganize framework resources into self-contained packs. Each pack is an autonomous directory containing skills, agents, hooks, and scripts. Users select packs in `.flowai.yaml` instead of listing individual resource names. Replaces flat `framework/skills/` and `framework/agents/` structure.
- **Use case scenario:** Developer runs `flowai sync` with `.flowai.yaml` containing `packs: [core, deno]`. Only resources from those packs are installed. Another developer with `packs: []` gets only core pack.
- **Priority:** High (enables scalable resource management, unblocks hooks/scripts).

#### FR-23.1 Pack Structure

- **Desc:** Each pack is a directory under `framework/<name>/` containing `pack.yaml` manifest and resource subdirectories (`skills/`, `agents/`, `hooks/`, `scripts/`). Resources discovered by convention (directory scan), not listed in manifest.
- **Acceptance:**
  - [x] **FR-23.1.1** `pack.yaml` format: `name` (string), `version` (semver), `description` (string). Evidence: `framework/core/pack.yaml`, `framework/deno/pack.yaml`, `framework/devtools/pack.yaml`, `framework/engineering/pack.yaml`, `framework/typescript/pack.yaml`
  - [x] **FR-23.1.2** Skills stored as `framework/<pack>/skills/<name>/SKILL.md`. Evidence: `framework/core/skills/flowai-commit/SKILL.md`, `framework/engineering/skills/flowai-skill-deep-research/SKILL.md`
  - [x] **FR-23.1.3** Agents stored as `framework/<pack>/agents/<name>.md`. Evidence: `framework/core/agents/flowai-console-expert.md`, `framework/engineering/agents/deep-research-worker.md`
  - [x] **FR-23.1.4** No dependencies between packs — each pack is self-contained. Evidence: by design, no cross-pack imports or references.
  - [x] **FR-23.1.5** `framework/skills/` and `framework/agents/` removed. All resources live in packs. Evidence: directories deleted, `cli/src/source.ts:109` regex `^framework\/([^/]+)\/pack\.yaml$`

#### FR-23.2 Config v1.1

- **Desc:** `.flowai.yaml` version `"1.1"` adds `packs:` field. `skills.include/exclude` applies after pack expansion.
- **Acceptance:**
  - [x] **FR-23.2.1** `packs:` field: list of pack names to install. Evidence: `cli/src/types.ts:19`, `cli/src/config.ts:84-86`
  - [x] **FR-23.2.2** `packs: []` (empty) = install only `core` pack. Evidence: `cli/src/sync.ts:69`, `cli/src/sync_test.ts` "packs: [] defaults to core only"
  - [x] **FR-23.2.3** `packs` absent + `version: "1.0"` = all resources (backward compat). Evidence: `cli/src/sync.ts:67-68`, `cli/src/sync_test.ts` "packs: undefined (v1 legacy) selects all"
  - [x] **FR-23.2.4** `skills.exclude`/`skills.include` applied AFTER pack expansion. Evidence: `cli/src/sync.ts:83-95`, `cli/src/sync_test.ts` "applies skills.exclude after pack expansion"

#### FR-23.3 Automigration v1 → v1.1

- **Desc:** `flowai sync` auto-migrates v1 config to v1.1 format, adding `packs:` with all packs listed (preserving current behavior).
- **Acceptance:**
  - [x] **FR-23.3.1** v1 config auto-migrated to v1.1 on `flowai sync`. Evidence: `cli/src/sync.ts` automigration block, `cli/src/config.ts:92-102`
  - [x] **FR-23.3.2** Migrated config lists all packs (equivalent to v1 "install everything"). Evidence: `cli/src/config.ts:100`, `cli/src/config_test.ts` "migrateV1ToV1_1 - adds all packs to v1 config"
  - [x] **FR-23.3.3** `flowai-update` skill can update `.flowai.yaml` structure. Evidence: `framework/core/skills/flowai-update/SKILL.md` step 3 parses CONFIG MIGRATED action; agent can edit `.flowai.yaml` directly.

#### FR-23.4 Pack Versioning

- **Desc:** `flowai sync` displays version changes informionally. No pinning — always installs latest from bundle.
- **Acceptance:**
  - [x] **FR-23.4.1** `flowai sync` output shows pack versions. Evidence: `cli/src/sync.ts` `readPackVersions()` + display loop

#### FR-23.5 Bundle Update

- **Desc:** `scripts/bundle-framework.ts` updated to scan `framework/*/` instead of `framework/skills/` + `framework/agents/`.
- **Acceptance:**
  - [x] **FR-23.5.1** Bundle includes pack definitions and all pack resources. Evidence: `cli/scripts/bundle-framework.ts` walks `framework/` recursively, bundle contains 298 files with `framework/<pack>/` paths
  - [x] **FR-23.5.2** Existing tests updated for new bundle structure. Evidence: `cli/src/source_test.ts` pack-aware tests, `cli/src/sync_test.ts` resolvePackResources tests

#### FR-23.6 Default Packs

- **Desc:** `flowai init` (interactive config generation) defaults to all packs.
- **Acceptance:**
  - [x] **FR-23.6.1** Generated `.flowai.yaml` includes all available packs. Evidence: `cli/src/config_generator.ts:55` `selectedPacks = [...availablePacks]`, version set to `PACKS_VERSION`

### 3.24 Hook Resources (FR-24)

- **Description:** Packs contain hooks — Deno TS scripts triggered by IDE events (PostToolUse, PreToolUse). Hooks are IDE-agnostic: stored as `hook.yaml` + `run.ts`, installed by flowai with IDE-specific configuration generation. Claude Code naming as canonical; flowai transforms for other IDEs.
- **Use case scenario:** Pack `core` contains `lint-on-write` hook. `flowai sync` for Claude Code adds entry to `settings.json` hooks section; for Cursor — generates `.cursor/hooks.json`; for OpenCode — generates plugin file.
- **Priority:** Medium (new resource type, depends on FR-23).

#### FR-24.1 Hook Format

- **Desc:** Hook = directory with `hook.yaml` (metadata) + `run.ts` (Deno script). Located at `framework/<pack>/hooks/<name>/`.
- **Acceptance:**
  - [x] **FR-24.1.1** `hook.yaml` fields: `event`, `matcher` (optional), `description`, `timeout` (optional, default 30/600). Evidence: `cli/src/types.ts:48-56`, `cli/src/hooks.ts:62-64`
  - [x] **FR-24.1.2** Supported events: PostToolUse, PreToolUse. Event/tool name mapping per IDE. Evidence: `cli/src/hooks.ts:18-28` (EVENT_MAP, TOOL_MAP)
  - [x] **FR-24.1.3** `run.ts` uses stdin JSON contract (Claude Code canonical format). Cursor/OpenCode wrappers normalize format. Evidence: `cli/src/hooks.ts:118-150` (generateOpenCodePlugin)
  - [x] **FR-24.1.4** 4 framework hooks: `lint-on-write` (core), `test-before-commit` (core), `skill-structure-validate` (devtools), `mermaid-validate` (engineering). Evidence: `framework/core/hooks/`, `framework/devtools/hooks/`, `framework/engineering/hooks/`

#### FR-24.2 IDE-Specific Installation

- **Desc:** flowai reads `hook.yaml` and generates IDE-specific configuration. Manifest tracks installed hooks for clean deinstallation.
- **Acceptance:**
  - [x] **FR-24.2.1** Claude Code: 3-level nested entry in `settings.json` hooks section. Evidence: `cli/src/hooks.ts:78-96` (transformHookForClaude), `cli/src/sync.ts:793-822` (writeHookConfig)
  - [x] **FR-24.2.2** Cursor: flat entry in `.cursor/hooks.json`. Evidence: `cli/src/hooks.ts:99-113` (transformHookForCursor), `cli/src/sync.ts:823-849`
  - [x] **FR-24.2.3** OpenCode: generated plugin file `.opencode/plugins/flowai-hooks.ts`. Evidence: `cli/src/hooks.ts:116-150` (generateOpenCodePlugin), `cli/src/sync.ts:850-863`
  - [x] **FR-24.2.4** Manifest `.{ide}/flowai-hooks.json` tracks installed hooks. Removed hooks cleaned from IDE config. Evidence: `cli/src/hooks.ts:258-322` (cleanupRemovedHooks, readManifest, buildManifest)
  - [x] **FR-24.2.5** Merge preserves user hooks (not in manifest). Evidence: `cli/src/hooks.ts:155-206` (mergeClaudeHooks, mergeCursorHooks), `cli/src/hooks_test.ts`

#### FR-24.3 Hook Sync Infrastructure

- **Desc:** flowai discovers, reads, copies hook files, generates IDE config, and tracks actions in SyncResult.
- **Acceptance:**
  - [x] **FR-24.3.1** Hook discovery: `extractPackHookNames()` extracts hooks from `framework/<pack>/hooks/`. Evidence: `cli/src/source.ts:159-172`, `cli/src/source_test.ts:201-213`
  - [x] **FR-24.3.2** Hook files copied to `.{ide}/scripts/` during sync. Evidence: `cli/src/sync.ts:322-362`
  - [x] **FR-24.3.3** `resolvePackResources()` includes `hookNames` in return. Evidence: `cli/src/sync.ts:62`, `cli/src/sync_test.ts:101-106`
  - [x] **FR-24.3.4** `SyncResult.hookActions` tracks per-hook actions. Evidence: `cli/src/sync.ts:69`, `cli/src/cli.ts:231-251`

### 3.25 Script Resources (FR-25)

- **Description:** Packs can contain scripts — utility shell/Deno scripts callable by skills via bash. Not tied to IDE events. Copied to `.{ide}/scripts/` at install time.
- **Priority:** Low (simple copy, depends on FR-23).
- **Acceptance:**
  - [x] **FR-25.1** Scripts stored at `framework/<pack>/scripts/<name>`. Evidence: `cli/src/source.ts:174-188` (extractPackScriptNames), `cli/src/source_test.ts:215-231`
  - [x] **FR-25.2** Copied to `.{ide}/scripts/` during sync. Evidence: `cli/src/sync.ts:327-344`, `cli/src/sync.ts:547-562`, `cli/src/sync_test.ts:108-118`

### 3.26 Skill Renaming: flow-* → flowai-* (FR-26)

- **Description:** Rename all skill prefixes from `flow-` to `flowai-` for brand consistency.
- **Priority:** Medium (brand alignment, part of pack migration).
- **Acceptance:**
  - [x] **FR-26.1** All installed skills use `flowai-*` prefix in IDE config dirs. Evidence: `framework/*/skills/flowai-*` directories, `cli/src/sync_test.ts:47`, `cli/src/cli_test.ts`
  - [x] **FR-26.2** Pack directories use full installed names (`flowai-*` prefix). No name transformation at install time — flowai copies as-is. Evidence: `framework/*/skills/flowai-*` directories, `documents/design.md:55`
  - [x] **FR-26.3** ~~flowai adds prefix during sync~~ Rejected: decided to store full names in packs for simplicity (no translation logic needed). Evidence: `documents/design.md:55,194`

### 3.27 Reflection with Session History Search (FR-27)

- **Description:** Reflection skills (`flowai-reflect`) must search the current
  project's session history for similar errors/mistakes before producing
  conclusions. The agent autonomously determines search depth (number of past
  sessions to inspect) based on error severity and recurrence signals.
- **Use case scenario:** After completing a task, the agent runs reflection. It
  scans prior session transcripts/logs for analogous failures, identifies
  patterns (repeated mistakes, recurring misunderstandings), and includes
  findings in the reflection output.
- **Priority:** Medium.
- **Acceptance:**
  - [ ] **FR-27.1** Reflection skill navigates project session history and searches for errors similar to the current one.
  - [ ] **FR-27.2** Search depth (number of sessions) is determined autonomously by the agent — not hardcoded or user-configured.
  - [ ] **FR-27.3** Reflection output includes a "Historical patterns" section listing matched past errors with session references.
  - [ ] **FR-27.4** If no similar errors found in history, the section states "No similar errors found" explicitly.

### 3.28 CI/CD Pipeline Security (FR-28)

- **Description:** GitHub Actions workflow (`.github/workflows/ci.yml`) must follow supply chain security and least privilege practices.
- **Scenario:** Contributor pushes to main or opens PR. CI runs checks with minimal permissions; release steps get elevated permissions only when needed. Third-party actions cannot modify repository files.
- **Acceptance:**
  - [x] **FR-28.1 SHA pinning**: All third-party GitHub Actions pinned to full commit SHA with version comment. Evidence: `.github/workflows/ci.yml:18,24,98`
  - [ ] **FR-28.2 Least privilege**: Check job uses `contents: read` only. Write permissions (`contents: write`, `id-token: write`) granted only to release job, gated on `push` to `main`.
  - [ ] **FR-28.3 File integrity**: After third-party setup steps (`checkout`, `setup-deno`) and after `deno task check`, verify no unexpected file modifications via `git diff --exit-code` + untracked file check. Fail pipeline if integrity violated.
  - [ ] **FR-28.4 Job separation**: Pipeline split into `check` (read-only) and `release` (write) jobs. `release` depends on `check` success.

## 4. Non-functional requirements


- **Reliability:** Benchmarks must use isolated sandboxes and evidence-based
  verification. Execution must be protected by timeouts (e.g., 60s per step) to
  ensure system stability.
- **Scalability:** The benchmarking system must support multiple evaluation modes
  (Quality, Selection, Comparison).
- **Usability:** Commands must be intuitive (e.g., `/flowai-commit`). Benchmark
  reports must be human-readable and provide actionable feedback via `trace.md`.

## 5. Interfaces

- **APIs and integrations:**
  - AI IDE Chat (Cursor, Claude Code, OpenCode): Primary interface for user-agent interaction.
  - File System: Storage for rules, commands, and documentation. Symlinks for multi-IDE distribution.
  - Git: Version control operations.
  - MCP: Integration with external tools (GitHub, etc.).
- **Protocols and data formats:** Markdown (`.md`, SKILL.md, RULE.md).
- **UI/UX constraints:** Text-based chat interface.

## 6. Acceptance criteria

- The system is considered accepted if the following are met:
  - All defined commands are executable by agents in supported IDEs.
  - Rules are correctly loaded and applied by agents.
  - Dev resources in `.claude/` are accessible to Claude Code.
  - Framework resources installable via flowai (`flowai sync`).
  - Documentation accurately reflects the project state.
