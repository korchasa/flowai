---
name: opencode-guide
description: Guide for using OpenCode features including AGENTS.md, Config, Rules, Skills, Commands, Agents, and MCP. Use when the user asks about OpenCode configuration, features, or how to set up the environment.
---

# OpenCode Guide

## Context Architecture

Understand the priority of context loading to effectively manage the agent's knowledge:

1. **Project Config** (`opencode.json`) - Highest priority for settings.
2. **Project Rules** (`AGENTS.md`) - Project-specific instructions.
3. **Global Config** (`~/.config/opencode/opencode.json`) - User preferences.
4. **Global Rules** (`~/.config/opencode/AGENTS.md`) - User-wide instructions.
5. **Remote Config** (`.well-known/opencode`) - Org defaults.

## Core Components

### AGENTS.md

- **Purpose**: Global instructions and context for the project.
- **Creation**: Run `/init` to auto-generate based on project analysis.
- **Location**: Project root (`AGENTS.md`) or global config.
- **External References**: Use `@path/to/file` in content or `instructions` array in `opencode.json`.

### Configuration (`opencode.json`)

- **Purpose**: Configure models, providers, tools, themes, etc.
- **Locations**: Project root, `~/.config/opencode/`, or via `OPENCODE_CONFIG` env var.
- **Key Options**:
  - `instructions`: Array of rule files (e.g., `[".cursor/rules/*.md"]`).
  - `mcp`: Configure MCP servers.
  - `agent`: Define specialized agents.
  - `command`: Define custom commands.

### Agents (`.opencode/agents/`)

- **Purpose**: Specialized AI assistants (e.g., code reviewer, QA).
- **Definition**: Markdown files or `agent` block in `opencode.json`.
- **Usage**: Selectable in TUI/CLI.

### Commands (`.opencode/commands/`)

- **Purpose**: Reusable prompts/workflows.
- **Definition**: Markdown files or `command` block in `opencode.json`.
- **Usage**: Run via `/command_name`.

### Skills (`.opencode/skills/`)

- **Purpose**: Domain-specific capabilities.
- **Location**: `.opencode/skills/` or `~/.config/opencode/skills/`.

### Modes

- **Plan Mode**: Disables editing, focuses on architectural planning. Toggle with `<TAB>`.
- **Build Mode**: Standard mode for executing changes.

## Best Practices

1. **Commit Configuration**: `AGENTS.md` and `opencode.json` should be in Git.
2. **Modular Rules**: Use `instructions` in `opencode.json` to load rules from `.cursor/rules/` or other paths.
3. **Plan First**: Use Plan mode for complex features before building.
4. **Context Management**: Use `@` to reference specific files; drag & drop images for visual context.
5. **Iterative Workflow**: Use `/undo` and `/redo` to refine changes.
6. **Sharing**: Use `/share` to collaborate on context.

## References

- Full documentation: [references/REFERENCE.md](references/REFERENCE.md)
- Online up-to-date documentation: [https://opencode.ai/docs](https://opencode.ai/docs)
