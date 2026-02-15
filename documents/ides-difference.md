# IDE Differences (AssistFlow R&D)

## Official Documentation
- **Cursor**: [docs.cursor.com](https://docs.cursor.com/)
- **Claude Code**: [code.claude.com/docs](https://code.claude.com/docs)
- **OpenCode**: [github.com/opencode-ai/opencode](https://github.com/opencode-ai/opencode)
- **Antigravity**: [antigravity.im/documentation](https://antigravity.im/documentation)
- **OpenAI Codex**: [platform.openai.com/docs/guides/code](https://platform.openai.com/docs/guides/code) (Legacy/API)

## 1. Built-in Tools Comparison

### Cursor
- **Files**: `read_file`, `Write`, `StrReplace`, `delete_file`, `Glob`, `grep`, `codebase_search`, `read_lints`.
- **System**: `Shell` (git, deno, etc.).
- **Process**: `todo_write`, `Task` (subagents), `SwitchMode` (Plan).
- **Other**: `AskQuestion`, `web_search`, `WebFetch`, `generate_image`.

### Claude Code
- **Files**: `Read` (img/PDF/NB), `Write`, `Edit`, `Glob`, `Grep`, `NotebookEdit`.
- **System**: `Bash`.
- **Process**: `EnterPlanMode`/`ExitPlanMode`, `TaskCreate`/`Get`/`Update`/`List`, `Task` (subagents), `TaskOutput`/`Stop`.
- **Other**: `AskUserQuestion`, `WebSearch`, `WebFetch`, `Skill`.

### OpenCode
- **Files**: `read`, `glob`, `grep`, `apply_patch`.
- **System**: `bash`.
- **Process**: `todowrite`, `task` (subagents), `skill`, `parallel`.
- **Other**: `question`, `webfetch`.

---

## 2. Context Control Primitives

### 2.1 Persistent Instructions
- **Cursor**: `AGENTS.md` (root/subdir), `.cursor/rules/` (`alwaysApply: true`).
- **Claude Code**: `CLAUDE.md` (root/subdir), `~/.claude/CLAUDE.md` (global).
- **OpenCode**: `AGENTS.md` > `CLAUDE.md`. `opencode.json` (`instructions`).
- **OpenAI Codex**: `AGENTS.md` + `AGENTS.override.md`.
- **Antigravity**: `GEMINI.md`, `.agent/rules/`.

### 2.2 Conditional Instructions
- **Cursor**: `.cursor/rules/` (`globs`, `description`).
- **Claude Code**: `.claude/rules/` (`paths`).
- **OpenCode**: `opencode.json` (`instructions` with globs).

### 2.3 Custom Commands (`/command`)
- **Cursor**: `.cursor/commands/*.md`.
- **Claude Code**: `.claude/commands/*.md` (supports args, frontmatter: `allowed-tools`, `model`).
- **OpenCode**: `.opencode/commands/*.md` (supports `$ARGUMENTS`, shell interpolation).
- **OpenAI Codex**: `~/.codex/prompts/*.md`.

### 2.4 Event Hooks / Plugins
- **Cursor**: `hooks.json` (scripts/prompts).
- **Claude Code**: `settings.json` (commands/LLM calls).
- **OpenCode**: Plugin system (`.opencode/plugins/*.ts`). Events: `tool.execute.*`, `file.edited`, etc.

### 2.5 Skills (SKILL.md)
- **Cursor**: `.cursor/skills/<name>/SKILL.md`.
- **OpenCode**: `.opencode/skills/` (fallbacks to `.claude/skills/`, `.agents/skills/`).

### 2.6 MCP Integration
- **Cursor**: `mcp.json`.
- **Claude Code**: `.mcp.json`, `managed-mcp.json`.
- **OpenCode**: `opencode.json` (`mcp` field, local/remote).

### 2.7 Context Ignoring
- **Cursor**: `.cursorignore`.
- **Claude Code**: `.claude/settings.json`.
- **OpenCode**: `.gitignore`, `.ignore`, `opencode.json` (`watcher.ignore`).

### 2.8 Custom Agents (Subagents)
- **Cursor**: `~/.cursor/agents/*.md`.
- **OpenCode**: `.opencode/agents/*.md`.

### 2.9 Custom Tools
- **OpenCode**: `.opencode/tools/*.{ts,js}`.

---

## 3. Comparative Summary

| Primitive | Cursor | Claude Code | OpenCode | Antigravity | OpenAI Codex |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Global Rules** | - | `~/.claude/CLAUDE.md` | `~/.config/opencode/AGENTS.md` | `~/.gemini/GEMINI.md` | `~/.codex/AGENTS.md` |
| **Project Rules** | `AGENTS.md` | `CLAUDE.md` | `AGENTS.md` | `.agent/rules/` | `AGENTS.md` |
| **Folder Rules** | `subdir/AGENTS.md` | `subdir/CLAUDE.md` | - | - | `subdir/AGENTS.md` |
| **Hooks** | `hooks.json` | `settings.json` | `.opencode/plugins/` | - | - |
| **Skills** | Yes | - | Yes | - | - |
| **Subagents** | `Task` | `Task` | `task` | - | - |
| **Custom Tools** | MCP | MCP | `.opencode/tools/` | - | - |
| **Custom Agents** | Yes | - | Yes | - | - |

