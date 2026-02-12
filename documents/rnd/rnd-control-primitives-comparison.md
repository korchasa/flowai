# Context Control File Primitives in AI Coding Tools

## 1) Persistent Instructions (Auto-mixing into context)

Automatically add stable "work agreements" and project norms (like README for agent), without copy-pasting in every request.

### Claude Code

- `~/.claude/CLAUDE.md` (Global user rules).
- `CLAUDE.md` (Root project rules).
- `subdir/CLAUDE.md` (Rules for specific subdirectories).
- `CLAUDE.local.md` (often used for developer personal notes, excluded from git).
- `.claude/rules/*.md`

### Antigravity

- `~/.gemini/GEMINI.md`.
- `.agent/rules/*.md` (rules active in specific project/workspace).

### Cursor

- `AGENTS.md` (global project rules)
- `subdir/AGENTS.md` (Rules for specific subdirectories)
- `.cursor/rules/*/RULE.md` with `alwaysApply: true`
- `.cursor/rules/*.mdc` with `alwaysApply: true` **Legacy!**

> TODO: Find out merge rules

### OpenAI Codex

- `~/.codex/AGENTS.md` (global user rules) with CODEX_HOME support
- `~/.codex/AGENTS.override.md` (global user rules) with CODEX_HOME support
- `AGENTS.md` (global project rules override)
- `AGENTS.override.md` (global project rules)
- `subdir/AGENTS.md` (Rules for specific subdirectories)
- `subdir/AGENTS.override.md` (override rules for specific subdirectories)

> Files are concatenated from the root down. Later files override earlier guidance because they appear closer to your current task.

### OpenCode

- `~/.config/opencode/AGENTS.md` (Global user rules)
- `~/.claude/CLAUDE.md` (Global user rules, Claude Code compatibility fallback)
- `AGENTS.md` (Root project rules, priority over CLAUDE.md)
- `CLAUDE.md` (Root project rules, fallback)
- `opencode.json` field `"instructions"` (array of paths/globs/URLs)

> Priority: `AGENTS.md` > `CLAUDE.md`. Local > Global. Walks directories up to git worktree root.
> Compatibility with Claude Code disabled via: `OPENCODE_DISABLE_CLAUDE_CODE=1` (all), `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT=1` (only `~/.claude/CLAUDE.md`), `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1` (only `.claude/skills`).

---

## 2) Conditional Instructions

Instructions included in context only under certain conditions. Allow to reduce the size of occupied context.

### Claude Code

- `.claude/rules/` with `paths: src/api/**/*.ts`

### Cursor

- `.cursor/rules/*/RULE.md` with `globs: src/api/**/*.ts`
- `.cursor/rules/*.mdc` with `globs: src/api/**/*.ts` **Legacy!**
- `.cursor/rules/*/RULE.md` with `description: This rule provides standards for frontend components and API validation`
- `.cursor/rules/*.mdc` with `description: This rule provides standards for frontend components and API validation` **Legacy!**

### OpenCode

- `opencode.json` field `"instructions"` with glob patterns
- Supports `.cursor/rules/*.md` via instructions field

---

## 3) Custom "Commands"

Store repeatable scenarios as files called as command: `/command-name`. These are not "persistent rules", but **explicitly launched** procedures.

### Claude Code

- `~/.claude/commands/*.md` - user commands
- `.claude/commands/*.md` - project commands
- `.claude/commands/<namespace>/*.md` - namespace commands

> Argument substitution is supported. For example, `Review PR #$1 with priority $2 and assign to $3`

#### frontmatter parameters:

- `allowed-tools`: List of tools the command can use. Inherits from the conversation | Default: []
- `argument-hint`: The arguments expected for the slash command. Example: `argument-hint: add [tagId] | remove [tagId] | list`. This hint is shown to the user when auto-completing the slash command. | Default: `None`
- `description`: Brief description of the command | Default: Uses the first line from the prompt
- `model`: Specific model string (see Models overview) | Default: Inherits from the conversation
- `disable-model-invocation`: Whether to prevent SlashCommand tool from calling this command | Default: `false`

### Antigravity

- `~/.gemini/antigravity/global_workflows/global-workflow.md`
- `.agent/workflows/*.md`

### Cursor

- `~/.cursor/commands/*.md`
- `.cursor/commands/*.md`

> Arguments are passed to the command in free form

### OpenAI Codex

- `~/.codex/prompts/*.md`

#### frontmatter parameters:

- `description`: Brief description of the command | Example: `Prep a branch, commit, and open a draft PR`
- `argument-hint`: The arguments expected for the slash command. | Example: `[FILES=<paths>] [PR_TITLE="<title>"]`

### OpenCode

- `~/.config/opencode/commands/*.md` - user commands
- `.opencode/commands/*.md` - project commands

> Filename = command name (e.g., `test.md` -> `/test`). Supports `$ARGUMENTS`, `$1`-`$N`, `` !`shell command` ``, `@filepath`.

#### frontmatter parameters:

- `description`: Brief description of the command
- `agent`: Target agent for execution
- `model`: Specific model string
- `subtask`: boolean, run as subtask

---

## 4) Event Hooks (automatic actions at agent cycle stages)

### Function

Run external commands/scripts/LLM on events (before/after agent actions).

### Claude Code

- `~/.claude/settings.json` - User settings
- `.claude/settings.json` - Project settings
- `.claude/settings.local.json` - Local project settings (not committed)

Supports both command execution and LLM calls.

### Cursor

- `~/.cursor/hooks.json` - User hooks
- `.cursor/hooks.json` - Project hooks

Supports command-based (scripts via stdin/stdout JSON) and prompt-based (LLM-evaluated) hooks.

### OpenCode

- `~/.config/opencode/plugins/*.js` or `*.ts` - User plugins
- `.opencode/plugins/*.js` or `*.ts` - Project plugins
- `opencode.json` field `"plugin"` - npm packages

Uses **plugin system** instead of hooks files. Available events:
- `tool.execute.before` / `tool.execute.after`
- `session.created` / `session.idle` / `session.error` / `session.compacted`
- `file.edited` / `file.watcher.updated`
- `message.updated` / `message.part.updated`
- `permission.asked` / `permission.replied`
- `shell.env` — inject env variables
- TUI-specific: `tui.prompt.append`, `tui.command.execute`, `tui.toast.show`

Plugin dependencies: `.opencode/package.json` (installed via `bun install` at start).

---

## 5) MCP Integration

### Claude Code

- `settings.json` - user level
- `managed-mcp.json` - user level
- `.mcp.json` - project level

### Cursor

- `~/.cursor/mcp.json` - global config
- `.cursor/mcp.json` - project level

### Antigravity

- Only through settings.

### OpenAI Codex

- `~/.codex/config.toml` - global

### OpenCode

- `opencode.json` field `"mcp"` - supports `local` (command-based) and `remote` (URL-based with OAuth)
- OAuth tokens stored in `~/.local/share/opencode/mcp-auth.json`

---

## 6) Context Ignoring

Specify files that should not get into agent context, even if they are not excluded from git.

### Cursor

- **`.cursorignore`**

### Claude Code

- `.claude/settings.json`

### Antigravity

- `.gitignore`

### OpenAI Codex

- **`.gitignore`**

### OpenCode

- `.gitignore` (respected by ripgrep)
- `.ignore` (explicit include/exclude overrides)
- `opencode.json` field `"watcher.ignore"` (glob patterns for file watcher)

---

## 7) Skills

### Cursor

- `~/.cursor/skills/<name>/SKILL.md` - user skills
- `.cursor/skills/<name>/SKILL.md` - project skills

### Claude Code

- `~/.claude/skills/<name>/SKILL.md` - user skills (if supported)
- `.claude/skills/<name>/SKILL.md` - project skills (if supported)

### OpenCode

- `~/.config/opencode/skills/<name>/SKILL.md` - user skills
- `.opencode/skills/<name>/SKILL.md` - project skills
- `~/.claude/skills/<name>/SKILL.md` - Claude-compatible (fallback)
- `.claude/skills/<name>/SKILL.md` - Claude-compatible (fallback)
- `~/.agents/skills/<name>/SKILL.md` - Agent-compatible (fallback)
- `.agents/skills/<name>/SKILL.md` - Agent-compatible (fallback)

> Frontmatter: `name`, `description` (required), `license`, `compatibility`, `metadata` (optional).
> Name regex: `^[a-z0-9]+(-[a-z0-9]+)*$`, 1-64 chars. Must match directory name.

---

## 8) Agents (custom agent definitions)

### OpenCode

- `~/.config/opencode/agents/*.md` - user agents
- `.opencode/agents/*.md` - project agents
- `opencode.json` field `"agent"` - inline config

> Frontmatter: `description`, `mode` (`primary`/`subagent`/`all`), `model`, `temperature`, `top_p`, `steps`, `tools`, `permission`, `color`, `hidden`, `disable`.

---

## 9) Custom Tools

### OpenCode

- `~/.config/opencode/tools/*.ts` or `*.js` - user tools
- `.opencode/tools/*.ts` or `*.js` - project tools

> Uses `tool()` from `@opencode-ai/plugin`. Filename = tool name. Multiple exports create `<filename>_<exportname>`.

---

## 10) Comparative Table by Application Areas

| Primitive | Scope/Area | Claude Code | Antigravity | Cursor | OpenAI Codex | OpenCode |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Persistent Instructions** | User | `~/.claude/CLAUDE.md` | `~/.gemini/GEMINI.md` | - | `~/.codex/AGENTS.md`<br>`~/.codex/AGENTS.override.md` | `~/.config/opencode/AGENTS.md`<br>`~/.claude/CLAUDE.md` (fallback) |
| | Project | `CLAUDE.md`<br>`.claude/rules/*.md` | `.agent/rules/*.md` | `AGENTS.md`<br>`.cursor/rules/*/RULE.md`<br>~~`.cursor/rules/*.mdc`~~ | `AGENTS.md`<br>`AGENTS.override.md` | `AGENTS.md`<br>`CLAUDE.md` (fallback)<br>`opencode.json` `instructions` |
| | Folder | `subdir/CLAUDE.md`<br>`CLAUDE.local.md` | - | `subdir/AGENTS.md` | `subdir/AGENTS.md`<br>`subdir/AGENTS.override.md` | - |
| **Conditional Instructions** | Project | `.claude/rules/*.md` | - | `.cursor/rules/*/RULE.md`<br>~~`.cursor/rules/*.mdc`~~ | - | `opencode.json` `instructions` (globs) |
| **Custom Commands** | User | `~/.claude/commands/*.md` | `~/.gemini/antigravity/global_workflows/global-workflow.md` | `~/.cursor/commands/*.md` | `~/.codex/prompts/*.md` | `~/.config/opencode/commands/*.md` |
| | Project | `.claude/commands/*.md`<br>`.claude/commands/<namespace>/*.md` | `.agent/workflows/*.md` | `.cursor/commands/*.md` | - | `.opencode/commands/*.md` |
| **Skills** | User | - | - | `~/.cursor/skills/<name>/` | - | `~/.config/opencode/skills/<name>/`<br>`~/.claude/skills/<name>/` (fallback)<br>`~/.agents/skills/<name>/` (fallback) |
| | Project | - | - | `.cursor/skills/<name>/` | - | `.opencode/skills/<name>/`<br>`.claude/skills/<name>/` (fallback)<br>`.agents/skills/<name>/` (fallback) |
| **Event Hooks** | User | `~/.claude/settings.json` | - | `~/.cursor/hooks.json` | - | `~/.config/opencode/plugins/*.{js,ts}` |
| | Project | `.claude/settings.json`<br>`.claude/settings.local.json` | - | `.cursor/hooks.json` | - | `.opencode/plugins/*.{js,ts}`<br>`opencode.json` `plugin` |
| **MCP Integration** | User | `settings.json`<br>`managed-mcp.json` | - | `~/.cursor/mcp.json` | `~/.codex/config.toml` | `opencode.json` `mcp` |
| | Project | `.mcp.json` | - | `.cursor/mcp.json` | - | `opencode.json` `mcp` |
| **Context Ignoring** | User | `.claude/settings.json` | - | - | - | - |
| | Project | - | `.gitignore` | `.cursorignore` | `.gitignore` | `.gitignore`<br>`.ignore`<br>`opencode.json` `watcher.ignore` |
| **Custom Tools** | User | - | - | - | - | `~/.config/opencode/tools/*.{ts,js}` |
| | Project | - | - | - | - | `.opencode/tools/*.{ts,js}` |
| **Custom Agents** | User | - | - | - | - | `~/.config/opencode/agents/*.md` |
| | Project | - | - | - | - | `.opencode/agents/*.md` |
