# IDE Differences (AssistFlow R&D)

## Official Documentation
- **Cursor**: docs.cursor.com [^1]
- **Claude Code**: code.claude.com/docs [^2]
- **OpenCode**: opencode.ai/docs [^3]
- **Antigravity**: antigravity.im/documentation [^4]
- **OpenAI Codex**: developers.openai.com/codex [^5]

## 1. Built-in Tools Comparison

### Cursor
- **Files**: `read_file`, `Write`, `StrReplace`, `delete_file`, `Glob`, `grep`, `codebase_search`, `read_lints`.
- **System**: `Shell` (git, deno, etc.).
- **Process**: `todo_write`, `Task` (subagents), `SwitchMode` (Plan).
- **Other**: `AskQuestion`, `web_search`, `WebFetch`, `generate_image` [^1]

### Claude Code
- **Files**: `Read` (img/PDF/NB), `Write`, `Edit`, `Glob`, `Grep`, `NotebookEdit`.
- **System**: `Bash` (persistent session).
- **Process**: `EnterPlanMode`/`ExitPlanMode`, `TaskCreate`/`Get`/`Update`/`List`, `Task` (subagents), `TaskOutput`/`Stop`.
- **Other**: `AskUserQuestion`, `WebSearch`, `WebFetch`, `Skill` [^11]

### OpenCode
- **Files**: `read`, `glob`, `grep`, `list`, `edit`, `write`, `patch`, `multiedit`.
- **System**: `bash`.
- **Process**: `todowrite`, `todoread`, `task` (subagents), `skill`, `parallel`.
- **Other**: `question`, `webfetch`, `websearch` (when `OPENCODE_ENABLE_EXA=1`), `lsp` (experimental) [^8]

### OpenAI Codex
- **Files**: `read_file`, `apply_patch` (via `shell` for edits).
- **System**: `shell` (bwrap sandbox).
- **Process**: plan mode, web search (cached/live).
- **Other**: skills via `$skill` or `/` invocation [^13]

### Antigravity
- Multi-surface (editor, terminal, browser). Agent-specific tooling; no public tool list documented [^4]

---

## 2. Context Control Primitives

### 2.1 Persistent Instructions
- **Cursor**: `AGENTS.md` (root/subdir), `.cursor/rules/` (`alwaysApply: true`).[^21]
- **Claude Code**: `CLAUDE.md` (root/subdir), `~/.claude/CLAUDE.md` (global).[^2]
- **OpenCode**: `AGENTS.md` > `CLAUDE.md`. `opencode.json` (`instructions`).[^3]
- **OpenAI Codex**: `AGENTS.md` + `AGENTS.override.md`.[^17]
- **Antigravity**: `GEMINI.md`, `.agent/rules/`.[^4]

### 2.2 Conditional Instructions
- **Cursor**: `.cursor/rules/` (`globs`, `description`).[^21]
- **Claude Code**: `.claude/rules/` (`paths`).[^2]
- **OpenCode**: `opencode.json` (`instructions` with globs).[^3]
- **Antigravity**: `.agent/rules/` (glob, model decision, always on, manual).[^20]

### 2.3 Custom Commands (`/command`)
- **Cursor**: `.cursor/commands/*.md`.
- **Claude Code**: `.claude/commands/*.md` (supports args, frontmatter: `allowed-tools`, `model`).[^2]
- **OpenCode**: `.opencode/commands/*.md` (supports `$ARGUMENTS`, shell interpolation).[^3]
- **OpenAI Codex**: `~/.codex/prompts/*.md` (deprecated, use skills).[^18]
- **Antigravity**: `.agent/workflows/*.md` (project), global via UI → `~/.gemini/antigravity/`.[^20]

### 2.4 Event Hooks / Plugins
- **Cursor**: `hooks.json` (scripts/prompts).[^14]
- **Claude Code**: `settings.json` (commands/LLM calls).[^15]
- **OpenCode**: Plugin system (`.opencode/plugins/*.ts`). Events: `tool.execute.*`, `file.edited`, etc.[^3]

### 2.5 Skills (SKILL.md)
- **Cursor**: `.cursor/skills/<name>/SKILL.md`; also `.claude/skills/`, `.codex/skills/` (compat).[^10]
- **Claude Code**: `~/.claude/skills/`, `.claude/skills/` (project).[^11]
- **OpenCode**: `.opencode/skills/` (fallbacks: `.claude/skills/`, `.agents/skills/`).[^12]
- **OpenAI Codex**: `.agents/skills`, `~/.agents/skills`, `/etc/codex/skills`.[^13]

### 2.6 MCP Integration
- **Cursor**: `mcp.json` (project/user).
- **Claude Code**: `.mcp.json`, `managed-mcp.json`.[^15]
- **OpenCode**: `opencode.json` (`mcp` field, local/remote).[^3]
- **OpenAI Codex**: `~/.codex/config.toml`, `.codex/config.toml` (`[mcp_servers.*]`).[^19]

### 2.7 Context Ignoring
- **Cursor**: `.cursorignore`.[^16]
- **Claude Code**: `.claude/settings.json` (gitignore respected).[^15]
- **OpenCode**: `.gitignore`, `.ignore`, `opencode.json` (`watcher.ignore`).[^3]

### 2.8 Custom Agents (Subagents)
- **Cursor**: `~/.cursor/agents/*.md`, `.cursor/agents/*.md`.
- **OpenCode**: `~/.config/opencode/agents/*.md`, `.opencode/agents/*.md`.[^3]
- **Antigravity**: Agent Manager (built-in agents; no file-based custom agents).[^4]

### 2.9 Custom Tools
- **OpenCode**: `.opencode/tools/*.{ts,js}`.[^3]

---

## 3. Comparative Summary

| Primitive | Cursor | Claude Code | OpenCode | Antigravity | OpenAI Codex |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Global Rules** | - | `~/.claude/CLAUDE.md` | `~/.config/opencode/AGENTS.md` | `~/.gemini/GEMINI.md` | `~/.codex/AGENTS.md` |
| **Project Rules** | `AGENTS.md` | `CLAUDE.md` | `AGENTS.md` | `.agent/rules/` | `AGENTS.md` |
| **Folder Rules** | `subdir/AGENTS.md` | `subdir/CLAUDE.md` | - | - | `subdir/AGENTS.md` |
| **Hooks** | `hooks.json` | `settings.json` | `.opencode/plugins/` | - | - |
| **Skills** | Yes [^10] | Yes [^11] | Yes [^12] | - | Yes [^13] |
| **Subagents** | `Task` | `Task` | `task` | - | - |
| **Custom Tools** | MCP | MCP | `.opencode/tools/` | - | - |
| **Custom Agents** | Yes | - | Yes | - | - |
| **Commands/Workflows** | `.cursor/commands/` | `.claude/commands/` | `.opencode/commands/` | `.agent/workflows/` [^20] | skills |
| **MCP Config** | `mcp.json` | `.mcp.json` | `opencode.json` | - | `config.toml` [^19] |

---

## References (footnotes)

[^1]: https://docs.cursor.com/ — Cursor docs
[^2]: https://code.claude.com/docs — Claude Code docs
[^3]: https://opencode.ai/docs/ — OpenCode docs
[^4]: https://antigravity.im/documentation — Antigravity docs
[^5]: https://developers.openai.com/codex/local-config — Codex config
[^8]: https://opencode.ai/docs/tools/ — OpenCode built-in tools
[^10]: https://cursor.com/docs/context/skills — Cursor skills, tools: `.cursor/skills/`, `.claude/skills/`, `.codex/skills/`
[^11]: https://code.claude.com/docs/en/skills — Claude Code skills: `~/.claude/skills/`, `.claude/skills/`; Bash: https://platform.claude.com/docs/en/agents-and-tools/tool-use/bash-tool
[^12]: https://opencode.ai/docs/skills — OpenCode skills: `.opencode/skills/`, `.claude/skills/`, `.agents/skills/`
[^13]: https://developers.openai.com/codex/skills/create-skill — Codex skills: `.agents/skills`, `~/.agents/skills`, `/etc/codex/skills`
[^14]: https://cursor.com/docs/agent/hooks — Cursor hooks.json
[^15]: https://code.claude.com/docs/en/settings — Claude Code settings
[^16]: https://docs.cursor.com/en/context/ignore-files — Cursor .cursorignore
[^17]: https://developers.openai.com/codex/guides/agents-md — Codex AGENTS.md, AGENTS.override.md
[^18]: https://developers.openai.com/codex/custom-prompts — Codex custom prompts (deprecated, use skills)
[^19]: https://developers.openai.com/codex/mcp — Codex MCP: config.toml
[^20]: https://antigravity.google/docs/rules-workflows — Antigravity rules (.agent/rules/), workflows (.agent/workflows/)
[^21]: https://docs.cursor.com/en/context/rules — Cursor rules, AGENTS.md
