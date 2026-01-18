# Context Control File Primitives in AI Coding Tools

## 1) Persistent Instructions (Auto-mixing into context)

Automatically add stable "work agreements" and project norms (like README for agent), without copy-pasting in every request.

### Claude Code

  * `~/.claude/CLAUDE.md` (Global user rules).
  * `CLAUDE.md` (Root project rules).
  * `subdir/CLAUDE.md` (Rules for specific subdirectories).
  * `CLAUDE.local.md` (often used for developer personal notes, excluded from git).
  * `.claude/rules/*.md`

### Antigravity

* `~/.gemini/GEMINI.md`.
* `.agent/rules/*.md` (rules active in specific project/workspace).

### Cursor

* `AGENTS.md` (global project rules)
* `subdir/AGENTS.md` (Rules for specific subdirectories)
* `.cursor/rules/*/RULE.md` with `alwaysApply: true`
* `.cursor/rules/*.mdc` with `alwaysApply: true` **Legacy!**

> TODO: Find out merge rules

### OpenAI Codex

* `~/.codex/AGENTS.md` (global user rules) with CODEX_HOME support
* `~/.codex/AGENTS.override.md` (global user rules) with CODEX_HOME support
* `AGENTS.md` (global project rules override)
* `AGENTS.override.md` (global project rules)
* `subdir/AGENTS.md` (Rules for specific subdirectories)
* `subdir/AGENTS.override.md` (override rules for specific subdirectories)

> Files are concatenated from the root down. Later files override earlier guidance because they appear closer to your current task.

---

## 2) Conditional Instructions

Instructions included in context only under certain conditions. Allow to reduce the size of occupied context.

### Claude Code

* `.claude/rules/` with `paths: src/api/**/*.ts`

### Cursor

* `.cursor/rules/*/RULE.md` with `globs: src/api/**/*.ts`
* `.cursor/rules/*.mdc` with `globs: src/api/**/*.ts` **Legacy!**
* `.cursor/rules/*/RULE.md` with `description: This rule provides standards for frontend components and API validation`
* `.cursor/rules/*.mdc` with `description: This rule provides standards for frontend components and API validation` **Legacy!**

---

## 3) Custom "Commands"

Store repeatable scenarios as files called as command: `/command-name`. These are not "persistent rules", but **explicitly launched** procedures.

### Claude Code

* `~/.claude/commands/*.md` - user commands
* `.claude/commands/*.md` - project commands
* `.claude/commands/<namespace>/*.md` - namespace commands

> Argument substitution is supported. For example, `Review PR #$1 with priority $2 and assign to $3`

#### frontmatter parameters:
- `allowed-tools`	List of tools the command can use	Inherits from the conversation | Default: []
- `argument-hint`	The arguments expected for the slash command. Example: argument-hint: add [tagId] | remove [tagId] | list. This hint is shown to the user when auto-completing the slash command. |	Default: `None`
- `description`	Brief description of the command | Default: Uses the first line from the prompt
- `model`	Specific model string (see Models overview) | Default: Inherits from the conversation
- `disable-model-invocation`	Whether to prevent SlashCommand tool from calling this command | Default: `false`

### Antigravity

* `~/.gemini/antigravity/global_workflows/global-workflow.md`
* `.agent/workflows/*.md`

### Cursor

* `~/.cursor/commands/*.md`
* `.cursor/commands/*.md`

> Arguments are passed to the command in free form

### OpenAI Codex

* `~/.codex/prompts/*.md`

#### frontmatter parameters:
- `description`: Brief description of the command | Example: `Prep a branch, commit, and open a draft PR`
- `argument-hint`: The arguments expected for the slash command. | Example: `[FILES=<paths>] [PR_TITLE="<title>"]`

---

## 4) Event Hooks (automatic actions at agent cycle stages)

### Function

Run external commands/scripts/LLM on events (before/after agent actions).

### Claude Code

* `~/.claude/settings.json` - User settings
* `.claude/settings.json` - Project settings
* `.claude/settings.local.json` - Local project settings (not committed)

Supports both command execution and LLM calls.

---

## 5) MCP Integration

### Claude Code

* `settings.json` - user level
* `managed-mcp.json` - user level
* `.mcp.json` - project level

### Cursor

* `~/.cursor/mcp.json` - global config
* `.cursor/mcp.json` - project level

### Antigravity

Only through settings.

### OpenAI Codex

* `~/.codex/config.toml` - global

---

## 6) Context Ignoring

Specify files that should not get into agent context, even if they are not excluded from git.

### Cursor

* **`.cursorignore`**

### Claude Code

* `.claude/settings.json`

### Antigravity

* `.gitignore`

### OpenAI Codex

* **`.gitignore`**

---

## Comparative Table by Application Areas

| Primitive | Scope/Area | Claude Code | Antigravity | Cursor | OpenAI Codex |
|-----------|------------|-------------|-------------|--------|--------------|
| **Persistent Instructions** | User | `~/.claude/CLAUDE.md` | `~/.gemini/GEMINI.md` | - | `~/.codex/AGENTS.md`<br>`~/.codex/AGENTS.override.md` |
| | Project | `CLAUDE.md`<br>`.claude/rules/*.md` | `.agent/rules/*.md` | `AGENTS.md`<br>`.cursor/rules/*/RULE.md`<br>~~`.cursor/rules/*.mdc`~~ | `AGENTS.md`<br>`AGENTS.override.md` |
| | Folder | `subdir/CLAUDE.md`<br>`CLAUDE.local.md` | - | `subdir/AGENTS.md` | `subdir/AGENTS.md`<br>`subdir/AGENTS.override.md` |
| **Conditional Instructions** | Project | `.claude/rules/*.md` | - | `.cursor/rules/*/RULE.md`<br>~~`.cursor/rules/*.mdc`~~| - |
| **Custom Commands** | User | `~/.claude/commands/*.md` | `~/.gemini/antigravity/global_workflows/global-workflow.md` | `~/.cursor/commands/*.md` | `~/.codex/prompts/*.md` |
| | Project | `.claude/commands/*.md`<br>`.claude/commands/<namespace>/*.md` | `.agent/workflows/*.md` | `.cursor/commands/*.md` | - |
| **Event Hooks** | User | `~/.claude/settings.json` | - | - | - |
| | Project | `.claude/settings.json`<br>`.claude/settings.local.json` | - | - | - |
| **MCP Integration** | User | `settings.json`<br>`managed-mcp.json` | - | `~/.cursor/mcp.json` | `~/.codex/config.toml` |
| | Project | `.mcp.json` | - | `.cursor/mcp.json` | - |
| **Context Ignoring** | User | `.claude/settings.json` | - | - | - |
| | Project | - | `.gitignore` | `.cursorignore` | `.gitignore` |
