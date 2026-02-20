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

**Dedicated AI ignore files** (gitignore syntax, project-local):
- **Cursor**: `.cursorignore` — additive on top of `.gitignore`; negation `!pattern` un-ignores gitignored files.[^16]
- **Aider**: `.aiderignore` — same syntax; `--no-gitignore` disables `.gitignore` reading entirely; `--add-gitignore-files` forces gitignored files into scope.

**Config-based exclusion** (no dedicated file):
- **Claude Code**: `permissions.deny: ["Read(path)"]` in `settings.json`; `respectGitignore: true` (default) — set to `false` to surface gitignored files.[^15]
- **GitHub Copilot**: Server-side YAML in GitHub org/enterprise Settings → Content Exclusion (Business/Enterprise only; 30 min sync lag; independent of `.gitignore`).[^25]
- **OpenCode**: `.gitignore`, `.ignore`, `opencode.json` (`watcher.ignore`).[^3]

**Rely on `.gitignore` only** (no dedicated mechanism documented):
- Windsurf, Zed, JetBrains AI Assistant, Continue.dev, OpenAI Codex.

### 2.8 Custom Agents (Subagents)
- **Cursor**: `~/.cursor/agents/*.md`, `.cursor/agents/*.md`.
- **OpenCode**: `~/.config/opencode/agents/*.md`, `.opencode/agents/*.md`.[^3]
- **Antigravity**: Agent Manager (built-in agents; no file-based custom agents).[^4]

### 2.9 Custom Tools
- **OpenCode**: `.opencode/tools/*.{ts,js}`.[^3]

---

## 3. Cursor → Claude Code Conversion

### 3.1 Project Rules

`AGENTS.md` → `CLAUDE.md` (rename). [^21][^2]

Subdir rules: `subdir/AGENTS.md` → `subdir/CLAUDE.md`.

### 3.2 Conditional Rules

Path: `.cursor/rules/*.md` → `.claude/rules/*.md` [^21][^22]

Frontmatter transform:

| Cursor field | Cursor semantics | Claude Code equivalent |
| :--- | :--- | :--- |
| `alwaysApply: true` | Always load | Remove frontmatter (rules without `paths` load unconditionally) |
| `globs: [...]` | Scope to file patterns | `paths: [...]` |
| `alwaysApply: false` + `description` only | Agent decides by relevance | No equivalent — becomes always-apply or drop |
| No frontmatter (manual) | Triggered via `@rule-name` | No direct equivalent |

### 3.3 Custom Commands

`.cursor/commands/*.md` → `.claude/commands/*.md` — copy as-is. [^2]

`$ARGUMENTS` placeholder works the same way. Claude Code adds optional frontmatter: `allowed-tools`, `model`, `description`, `argument-hint`, `disable-model-invocation`.

### 3.4 Skills (SKILL.md)

`.cursor/skills/<name>/` → `.claude/skills/<name>/` — copy entire directory. [^10][^11]

Format is the same (Agent Skills open standard). Supporting files, scripts, and references travel with the skill unchanged.

### 3.5 Custom Agents

`.cursor/agents/*.md` → `.claude/agents/*.md` [^23]

Frontmatter transform:

| Cursor field | Claude Code field | Notes |
| :--- | :--- | :--- |
| `name` | `name` | Unchanged |
| `description` | `description` | Unchanged |
| `model: inherit` | `model: inherit` | Unchanged |
| `model: fast` | `model: haiku` | Cursor "fast" = haiku-class |
| `readonly: true` | `disallowedTools: Write, Edit, NotebookEdit` | Or `permissionMode: plan` |

Claude Code agent additional fields: `tools`, `disallowedTools`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`.

### 3.6 Hooks

`.cursor/hooks.json` → `hooks` key inside `.claude/settings.json` [^14][^24]

**Structure transform:**

```
# Cursor
{ "version": 1, "hooks": { "eventName": [{ "command": "script.sh" }] } }

# Claude Code
{ "hooks": { "EventName": [{ "matcher": "ToolName", "hooks": [{ "type": "command", "command": "script.sh" }] }] } }
```

**Event name mapping:**

| Cursor event | Claude Code event | Recommended `matcher` |
| :--- | :--- | :--- |
| `beforeShellExecution` | `PreToolUse` | `"Bash"` |
| `afterShellExecution` | `PostToolUse` | `"Bash"` |
| `preToolUse` | `PreToolUse` | — |
| `postToolUse` | `PostToolUse` | — |
| `postToolUseFailure` | `PostToolUseFailure` | — |
| `sessionStart` | `SessionStart` | — |
| `sessionEnd` | `SessionEnd` | — |
| `subagentStart` | `SubagentStart` | — |
| `subagentStop` | `SubagentStop` | — |
| `stop` | `Stop` | — |
| `preCompact` | `PreCompact` | — |
| `afterFileEdit` | `PostToolUse` | `"Edit\|Write"` |
| `beforeSubmitPrompt` | `UserPromptSubmit` | — |
| `beforeMCPExecution` | `PreToolUse` | `"mcp__.*"` |
| `afterMCPExecution` | `PostToolUse` | `"mcp__.*"` |
| `beforeReadFile` | `PreToolUse` | `"Read"` |

**Hook response mapping:**

| Cursor stdout | Claude Code equivalent |
| :--- | :--- |
| `{ "decision": "allow" }` | `exit 0` |
| `{ "decision": "deny" }` | `exit 2` + message to stderr |
| `{ "decision": "ask" }` | `hookSpecificOutput.permissionDecision: "ask"` |

Script paths: `.cursor/hooks/` → `.claude/hooks/`.

### 3.7 MCP Config

`mcp.json` → `.mcp.json` — rename (format identical). [^15]

### 3.8 Context Ignoring

`.cursorignore` — **no direct equivalent** in Claude Code. [^16][^15]

Claude Code respects `.gitignore` by default (`respectGitignore: true`). Migration options:
- Exclusion patterns → add to `.gitignore` or `permissions.deny` in `.claude/settings.json`.
- Negation patterns (`!pattern`, un-ignoring gitignored files) → set `"respectGitignore": false` in `.claude/settings.json` (global effect, not per-pattern).

---

## 4. Comparative Summary

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
[^22]: https://code.claude.com/docs/en/memory — Claude Code memory: CLAUDE.md, `.claude/rules/` with `paths` frontmatter
[^23]: https://code.claude.com/docs/en/sub-agents — Claude Code subagents: `.claude/agents/*.md`, frontmatter fields
[^24]: https://code.claude.com/docs/en/hooks — Claude Code hooks reference: events, matchers, input/output schema
[^25]: https://docs.github.com/en/copilot/how-tos/configure-content-exclusion/exclude-content-from-copilot — GitHub Copilot content exclusion
