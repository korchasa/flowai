# IDE Differences (flowai R&D)

## Official Documentation
- **Cursor**: docs.cursor.com [^1]
- **Claude Code**: code.claude.com/docs [^2]
- **OpenCode**: opencode.ai/docs [^3]

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


---

## 2. Context Control Primitives

### 2.1 Persistent Instructions
- **Cursor**: `AGENTS.md` (root/subdir), `.cursor/rules/` (`alwaysApply: true`).[^21]
- **Claude Code**: `CLAUDE.md` (root/subdir), `~/.claude/CLAUDE.md` (global).[^2]
- **OpenCode**: `AGENTS.md` > `CLAUDE.md`. `opencode.json` (`instructions`).[^3]

### 2.2 Conditional Instructions
- **Cursor**: `.cursor/rules/` (`globs`, `description`).[^21]
- **Claude Code**: `.claude/rules/` (`paths`).[^2]
- **OpenCode**: `opencode.json` (`instructions` with globs).[^3]

### 2.3 Custom Commands (`/command`)
- **Cursor**: `.cursor/commands/*.md`. Arguments passed in free form.
- **Claude Code**: `.claude/commands/*.md`, `.claude/commands/<namespace>/*.md`. Supports `$1`–`$N` args. Frontmatter: `allowed-tools`, `argument-hint`, `description`, `model`, `disable-model-invocation`.[^2]
- **OpenCode**: `.opencode/commands/*.md`. Supports `$ARGUMENTS`, `$1`–`$N`, `` !`shell` ``, `@filepath`. Frontmatter: `description`, `agent`, `model`, `subtask` (boolean).[^3]

### 2.4 Event Hooks / Plugins

#### Cursor Hooks [^14]

**Config**: `.cursor/hooks.json` (project), `~/.cursor/hooks.json` (user), enterprise MDM paths.

**Schema**:
```json
{ "version": 1, "hooks": { "<event>": [{ "command": "script.sh", "type": "command"|"prompt", "timeout": 30, "matcher": "regex" }] } }
```

**Hook types** (2):
- `command` — shell script; receives JSON via stdin, returns JSON via stdout. Exit 0 = ok, exit 2 = block.
- `prompt` — LLM evaluation; `$ARGUMENTS` placeholder auto-replaced with input JSON. Returns `{ ok, reason }`.

**Events** (20):
- Agent (18): `sessionStart`, `sessionEnd`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `subagentStart`, `subagentStop`, `beforeShellExecution`, `afterShellExecution`, `beforeMCPExecution` (fail-closed), `afterMCPExecution`, `beforeReadFile` (fail-closed), `afterFileEdit`, `beforeSubmitPrompt`, `preCompact`, `stop`, `afterAgentResponse`, `afterAgentThought`.
- Tab (2): `beforeTabFileRead`, `afterTabFileEdit`.

**Matcher**: Regex on tool name (`Shell|Read|Write`), subagent type, or command string.

**Env vars**: `CURSOR_PROJECT_DIR`, `CURSOR_VERSION`, `CURSOR_USER_EMAIL`, `CLAUDE_PROJECT_DIR` (compat).

**Fail mode**: Fail-open (action proceeds on hook error), except `beforeMCPExecution` and `beforeReadFile` (fail-closed).

#### Claude Code Hooks [^24]

**Config**: `.claude/settings.json` (`hooks` key), `~/.claude/settings.json` (global), `.claude/settings.local.json`, managed policy, skill/agent frontmatter.

**Schema** (3 levels of nesting):
```json
{ "hooks": { "<Event>": [{ "matcher": "regex", "hooks": [{ "type": "command", "command": "script.sh", "timeout": 600, "statusMessage": "...", "async": false }] }] } }
```

**Hook types** (4):
- `command` — shell script; stdin JSON, exit 0/2. `async: true` for background.
- `http` — POST to URL; `headers` with `$VAR` interpolation, `allowedEnvVars`.
- `prompt` — single-turn LLM evaluation; `$ARGUMENTS` placeholder. Returns `{ ok, reason }`.
- `agent` — spawns subagent with tools (Read, Grep, Glob); multi-turn verification.

Note: `prompt`/`agent` only on: `PermissionRequest`, `PostToolUse`, `PostToolUseFailure`, `PreToolUse`, `Stop`, `SubagentStop`, `TaskCompleted`, `UserPromptSubmit`. Others: `command` only.

**Events** (22): `SessionStart`, `InstructionsLoaded`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PostToolUseFailure`, `Notification`, `SubagentStart`, `SubagentStop`, `Stop`, `StopFailure`, `TeammateIdle`, `TaskCompleted`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `Elicitation`, `ElicitationResult`, `SessionEnd`.

**Matcher**: Regex on tool name (`Bash`, `Edit|Write`, `mcp__.*`), session source, notification type, agent type, compaction trigger, config source. Some events have no matcher (`UserPromptSubmit`, `Stop`, etc.).

**Decision control**:
- `PreToolUse`: `hookSpecificOutput.permissionDecision` (allow/deny/ask), `updatedInput`.
- `PermissionRequest`: `hookSpecificOutput.decision.behavior` (allow/deny), `updatedInput`.
- Others: top-level `decision: "block"` + `reason`, or exit 2 + stderr.

**Env vars**: `$CLAUDE_PROJECT_DIR`, `$CLAUDE_PLUGIN_ROOT`, `$CLAUDE_ENV_FILE` (SessionStart only).

**Fail mode**: Fail-open. Exit 2 = blocking error (stderr fed to Claude).

#### OpenCode Plugins [^3]

**Config**: `.opencode/plugins/*.{js,ts}` (project), `~/.config/opencode/plugins/` (global), npm packages in `opencode.json` (`"plugin": ["pkg-name"]`).

**Format**: JS/TS modules exporting async plugin functions. TypeScript: `import type { Plugin } from "@opencode-ai/plugin"`.

```typescript
export const MyPlugin: Plugin = async ({ project, client, $, directory, worktree }) => {
  return {
    "tool.execute.before": async (input, output) => { /* mutate output */ },
    event: async ({ event }) => { /* handle event.type */ },
    tool: { mytool: tool({ description: "...", args: { ... }, execute(args, ctx) { ... } }) },
  }
}
```

**Hook types**: Programmatic (code-based). No declarative JSON config — logic in JS/TS.
- Event handlers: `event: async ({ event }) => {}` — check `event.type`.
- Tool hooks: `tool.execute.before` / `tool.execute.after` — `(input, output)` signature; mutate `output.args`, `throw` to block.
- Shell hooks: `shell.env` — inject env vars via `output.env`.
- Custom tools: `tool` key with `tool()` helper from `@opencode-ai/plugin`.
- Compaction: `experimental.session.compacting` — inject context or replace prompt.

**Events** (30+): `command.executed`, `file.edited`, `file.watcher.updated`, `installation.updated`, `lsp.client.diagnostics`, `lsp.updated`, `message.part.removed`, `message.part.updated`, `message.removed`, `message.updated`, `permission.asked`, `permission.replied`, `server.connected`, `session.created`, `session.compacted`, `session.deleted`, `session.diff`, `session.error`, `session.idle`, `session.status`, `session.updated`, `todo.updated`, `shell.env`, `tool.execute.after`, `tool.execute.before`, `tui.prompt.append`, `tui.command.execute`, `tui.toast.show`, `experimental.session.compacting`.

**Blocking**: `throw new Error("message")` in `tool.execute.before`.

**Dependencies**: `package.json` in config dir; `bun install` at startup.

**Custom tools**: Override built-in tools by using same name.


### 2.5 Skills (SKILL.md)
- **Cursor**: `.cursor/skills/<name>/SKILL.md`; also `.claude/skills/`, `.codex/skills/` (compat).[^10]
- **Claude Code**: `~/.claude/skills/`, `.claude/skills/` (project).[^11]
- **OpenCode**: `.opencode/skills/` (fallbacks: `.claude/skills/`, `.agents/skills/`). Frontmatter: `name`, `description` (required); `license`, `compatibility`, `metadata` (optional). Name regex: `^[a-z0-9]+(-[a-z0-9]+)*$`, 1–64 chars, must match dir name.[^12]

### 2.6 MCP Integration
- **Cursor**: `.cursor/mcp.json` (project/user). Transports: stdio, SSE, Streamable HTTP. OAuth. Config interpolation (`${env:NAME}`, `${workspaceFolder}`). MCP Marketplace (one-click install).[^1]
- **Claude Code**: `.mcp.json` (project), `~/.claude.json` (user/local), `managed-mcp.json` (org). Transports: HTTP (recommended), SSE (deprecated), stdio. OAuth 2.0. Tool Search (auto >10% context). `claude mcp serve` (self as MCP server). Channels (push messages). Plugins can bundle MCP servers.[^15]
- **OpenCode**: `opencode.jsonc` (`mcp` field). Types: local (command) and remote (URL). OAuth (RFC 7591). Glob-based tool permissions. CLI: `opencode mcp auth|list|logout|debug`.[^3]

### 2.7 Context Ignoring

**Dedicated AI ignore files** (gitignore syntax, project-local):
- **Cursor**: `.cursorignore` — additive on top of `.gitignore`; negation `!pattern` un-ignores gitignored files.[^16]
- **Aider**: `.aiderignore` — same syntax; `--no-gitignore` disables `.gitignore` reading entirely; `--add-gitignore-files` forces gitignored files into scope.

**Config-based exclusion** (no dedicated file):
- **Claude Code**: `permissions.deny: ["Read(path)"]` in `settings.json`; `respectGitignore: true` (default) — set to `false` to surface gitignored files.[^15]
- **GitHub Copilot**: Server-side YAML in GitHub org/enterprise Settings → Content Exclusion (Business/Enterprise only; 30 min sync lag; independent of `.gitignore`).[^25]
- **OpenCode**: `.gitignore`, `.ignore`, `opencode.json` (`watcher.ignore`).[^3]

**Rely on `.gitignore` only** (no dedicated mechanism documented):
- Windsurf, Zed, JetBrains AI Assistant, Continue.dev.

### 2.8 Custom Agents (Subagents)
- **Cursor**: `~/.cursor/agents/*.md`, `.cursor/agents/*.md`.
- **Claude Code**: `.claude/agents/*.md` (project), `~/.claude/agents/*.md` (user). Built-in: Explore (Haiku, read-only), Plan (inherit, read-only), general-purpose. Frontmatter: `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation` (worktree). No subagent nesting.[^23]
- **OpenCode**: `~/.config/opencode/agents/*.md`, `.opencode/agents/*.md`. Frontmatter: `description`, `mode` (`primary`/`subagent`/`all`), `model`, `temperature`, `top_p`, `steps`, `tools`, `permission`, `color`, `hidden`, `disable`.[^3]

### 2.9 Custom Tools
- **OpenCode**: `.opencode/tools/*.{ts,js}` (project), `~/.config/opencode/tools/` (user). Uses `tool()` from `@opencode-ai/plugin`. Filename = tool name. Multiple exports create `<filename>_<exportname>`. Can override built-in tools by using same name.[^3]

### 2.10 Plugin Bundles & Distribution

Plugins = packaging format that bundles multiple primitives (skills, agents, hooks, MCP servers, etc.) into a single distributable unit.

#### Cursor [^26]

**Manifest**: `.cursor-plugin/plugin.json` (required: `name`; optional: `description`, `version`, `author`, `homepage`, `repository`, `license`, `keywords`, `logo`).

**Bundled components**: Rules (`.mdc`), Skills (`SKILL.md`), Agents, Commands, MCP servers, Hooks.

**Dir structure**: `rules/`, `skills/`, `agents/`, `commands/`, `hooks/hooks.json`, `.mcp.json`, `assets/`, `scripts/`. Auto-discovery from default dirs when manifest paths omitted.

**Distribution**: Git repositories. Official Cursor Marketplace (manual security review). Team/Enterprise private marketplaces (1 for Teams, unlimited Enterprise). Multi-plugin repos via `.cursor-plugin/marketplace.json`.

**Local testing**: `~/.cursor/plugins/local/`.

**VSCode extensions**: Via Open VSX registry (NOT Microsoft Marketplace — blocked for forks). Cursor maintains own forks of popular extensions.

#### Claude Code [^27]

**Manifest**: `.claude-plugin/plugin.json` (`name`, `description`, `version`, `author`, `homepage`, `repository`, `license`).

**Bundled components**: Skills, Agents, Commands, Hooks (`hooks/hooks.json`), MCP servers (`.mcp.json`), LSP servers (`.lsp.json`), Settings (`settings.json` — currently only `agent` key).

**Namespacing**: `/plugin-name:skill-name` prevents conflicts between plugins.

**Distribution**: Official Anthropic Marketplace (~101 plugins, ~33 Anthropic-built, as of 2026-03). Submission via `claude.ai/settings/plugins/submit` or `platform.claude.com/plugins/submit`.

**Local testing**: `--plugin-dir ./my-plugin`. Hot reload: `/reload-plugins`.

**Security**: Plugin subagents cannot use `hooks`, `mcpServers`, or `permissionMode` frontmatter fields.

**Env vars**: `$CLAUDE_PLUGIN_ROOT` (plugin dir), `${CLAUDE_PLUGIN_DATA}` (persistent data dir).

#### OpenCode [^3]

**No manifest/bundle format**. Plugins are JS/TS code modules, not declarative packages.

**Format**: `import type { Plugin } from "@opencode-ai/plugin"`. Exports async function returning hooks object.

**Distribution**: npm packages in `opencode.jsonc` (`"plugin": ["pkg-name"]`). Auto-installed via Bun to `~/.cache/opencode/node_modules/`.

**Local plugins**: `.opencode/plugins/*.{js,ts}` (project) or `~/.config/opencode/plugins/` (global). Dependencies in `.opencode/package.json` (bun install at startup).

**SDKs**: JS/TS, Go, Python.


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

Note: Claude Code also supports user-invoked workflows as skills with `disable-model-invocation: true` in SKILL.md frontmatter (see 2.5). Commands and skill-commands coexist; commands are simpler (flat md), skill-commands support extra files (references/, scripts/).

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
# Cursor (flat: event → array of hooks)
{ "version": 1, "hooks": { "eventName": [{ "command": "script.sh", "matcher": "regex" }] } }

# Claude Code (nested: event → matchers → hooks array)
{ "hooks": { "EventName": [{ "matcher": "regex", "hooks": [{ "type": "command", "command": "script.sh" }] }] } }
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
| `afterAgentResponse` | — | No equivalent |
| `afterAgentThought` | — | No equivalent |
| `beforeTabFileRead` | — | Tab-only, no equivalent |
| `afterTabFileEdit` | — | Tab-only, no equivalent |
| — | `PermissionRequest` | Cursor lacks equivalent |
| — | `Notification` | Cursor lacks equivalent |
| — | `TeammateIdle` | Cursor lacks equivalent |
| — | `TaskCompleted` | Cursor lacks equivalent |
| — | `ConfigChange` | Cursor lacks equivalent |
| — | `WorktreeCreate` | Cursor lacks equivalent |
| — | `WorktreeRemove` | Cursor lacks equivalent |

**Hook type mapping:**

| Cursor type | Claude Code type | Notes |
| :--- | :--- | :--- |
| `command` | `command` | Same semantics; exit 0/2 behavior identical |
| `prompt` | `prompt` | Both use `$ARGUMENTS` placeholder |
| — | `http` | Cursor lacks HTTP hooks |
| — | `agent` | Cursor lacks agent hooks (subagent-based verification) |

**Hook response mapping:**

| Cursor stdout | Claude Code equivalent |
| :--- | :--- |
| `{ "decision": "allow" }` | `exit 0` |
| `{ "decision": "deny" }` | `exit 2` + message to stderr |
| `{ "decision": "ask" }` | `hookSpecificOutput.permissionDecision: "ask"` |
| `{ "updated_input": {...} }` | `hookSpecificOutput.updatedInput: {...}` |

**Env var mapping:**

| Cursor | Claude Code |
| :--- | :--- |
| `CURSOR_PROJECT_DIR` | `CLAUDE_PROJECT_DIR` |
| `CURSOR_VERSION` | — |
| `CURSOR_USER_EMAIL` | — |
| — | `CLAUDE_PLUGIN_ROOT` |
| — | `CLAUDE_ENV_FILE` |

Script paths: `.cursor/hooks/` → `.claude/hooks/`.

### 3.7 MCP Config

`mcp.json` → `.mcp.json` — rename (format identical). [^15]

### 3.8 Context Ignoring

`.cursorignore` — **no direct equivalent** in Claude Code. [^16][^15]

Claude Code respects `.gitignore` by default (`respectGitignore: true`). Migration options:
- Exclusion patterns → add to `.gitignore` or `permissions.deny` in `.claude/settings.json`.
- Negation patterns (`!pattern`, un-ignoring gitignored files) → set `"respectGitignore": false` in `.claude/settings.json` (global effect, not per-pattern).

---

## 3.9 IDE Detection (Environment Variables)

Verified empirically (2026-03-22, `scripts/detect-ide-env.sh`):

- **Claude Code**: `CLAUDECODE=1`
- **Cursor Agent**: `CURSOR_AGENT=1`
- **OpenCode**: `OPENCODE=1`

Detection order: `CURSOR_AGENT` first (may co-exist with `CLAUDECODE` in nested envs), then `CLAUDECODE`, then `OPENCODE`.

### 3.10 Session/Conversation History Storage

#### Cursor [^28][^29]

**Format**: SQLite (`state.vscdb`, schema `ItemTable(key TEXT, value TEXT)` with JSON blobs) + JSON (agent transcripts).

**Scope**: Per-workspace (SQLite) + per-project (agent transcripts).

**Paths**:
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`, `~/Library/Application Support/Cursor/User/workspaceStorage/<hash>/state.vscdb`
- Linux: `~/.config/Cursor/User/globalStorage/state.vscdb`, `~/.config/Cursor/User/workspaceStorage/<hash>/state.vscdb`
- Windows: `%APPDATA%\Cursor\User\globalStorage\state.vscdb`, `%APPDATA%\Cursor\User\workspaceStorage\<hash>\state.vscdb`
- Agent transcripts (newer): `~/.cursor/projects/{project_name}/agent-transcripts/`

**SQLite keys**: `composer.composerData` (current), migrated from `aichat` keys.

#### Claude Code [^30]

**Format**: JSONL (one JSON object per line per message).

**Scope**: Per-project + global index.

**Paths** (all OS, Unix notation):
- Global index: `~/.claude/history.jsonl` (prompt text, timestamp, project path, session ID per line)
- Per-project: `~/.claude/projects/{project-path-with-dashes}/` — `.jsonl` session files + `sessions-index.json`
- Windows: `%USERPROFILE%\.claude\` (assumed, not officially confirmed)

#### OpenCode [^31]

**Format**: SQLite (`opencode.db`, Drizzle ORM).

**Scope**: Per-project (tied to `ProjectID`).

**Paths**:
- Linux/macOS: `~/.local/share/opencode/opencode.db` (XDG standard)
- Windows: not documented
- Auth: `~/.local/share/opencode/auth.json`

**Env vars**: `OPENCODE_DATA_DIR` (unconfirmed).

**Data**: Messages, cost summaries, timestamps per session.

---

## 4. Comparative Summary

| Primitive | Cursor | Claude Code | OpenCode |
| :--- | :--- | :--- | :--- |
| **Global Rules** | — | `~/.claude/CLAUDE.md` | `~/.config/opencode/AGENTS.md` |
| **Project Rules** | `AGENTS.md` | `CLAUDE.md` | `AGENTS.md` |
| **Folder Rules** | `subdir/AGENTS.md` | `subdir/CLAUDE.md` | — |
| **Hooks** | `hooks.json` (20 events, 2 types) | `settings.json` (22 events, 4 types) | `.opencode/plugins/` (30+ events, code) |
| **Skills** | Yes [^10] | Yes [^11] | Yes [^12] |
| **Subagents** | `Task` | `Task` | `task` |
| **Custom Tools** | MCP | MCP | `.opencode/tools/` + MCP |
| **Custom Agents** | `.cursor/agents/` | `.claude/agents/` | `.opencode/agents/` |
| **Commands** | `.cursor/commands/` | `.claude/commands/` | `.opencode/commands/` |
| **Plugin Bundles** | `.cursor-plugin/` [^26] | `.claude-plugin/` [^27] | npm packages |
| **Marketplace** | cursor.com/marketplace | claude.ai (~101 plugins) | npm |
| **MCP Config** | `.cursor/mcp.json` | `.mcp.json` | `opencode.jsonc` |
| **Session Storage** | SQLite `state.vscdb` + `agent-transcripts/` [^28] | JSONL `~/.claude/projects/` [^30] | SQLite `opencode.db` [^31] |

---

## References (footnotes)

[^1]: https://docs.cursor.com/ — Cursor docs
[^2]: https://code.claude.com/docs — Claude Code docs
[^3]: https://opencode.ai/docs/ — OpenCode docs
[^8]: https://opencode.ai/docs/tools/ — OpenCode built-in tools
[^10]: https://cursor.com/docs/context/skills — Cursor skills, tools: `.cursor/skills/`, `.claude/skills/`, `.codex/skills/`
[^11]: https://code.claude.com/docs/en/skills — Claude Code skills: `~/.claude/skills/`, `.claude/skills/`; Bash: https://platform.claude.com/docs/en/agents-and-tools/tool-use/bash-tool
[^12]: https://opencode.ai/docs/skills — OpenCode skills: `.opencode/skills/`, `.claude/skills/`, `.agents/skills/`
[^14]: https://cursor.com/docs/agent/hooks — Cursor hooks.json
[^15]: https://code.claude.com/docs/en/settings — Claude Code settings
[^16]: https://docs.cursor.com/en/context/ignore-files — Cursor .cursorignore
[^21]: https://docs.cursor.com/en/context/rules — Cursor rules, AGENTS.md
[^22]: https://code.claude.com/docs/en/memory — Claude Code memory: CLAUDE.md, `.claude/rules/` with `paths` frontmatter
[^23]: https://code.claude.com/docs/en/sub-agents — Claude Code subagents: `.claude/agents/*.md`, frontmatter fields
[^24]: https://code.claude.com/docs/en/hooks — Claude Code hooks reference: events, matchers, input/output schema
[^25]: https://docs.github.com/en/copilot/how-tos/configure-content-exclusion/exclude-content-from-copilot — GitHub Copilot content exclusion
[^26]: https://cursor.com/docs/plugins — Cursor plugins: .cursor-plugin/plugin.json manifest, Marketplace (manual security review)
[^27]: https://code.claude.com/docs/en/plugins — Claude Code plugins: .claude-plugin/plugin.json manifest, Anthropic Marketplace (~101 plugins)
[^28]: https://dasarpai.com/dsblog/cursor-chat-architecture-data-flow-storage/ — Cursor chat architecture, SQLite schema, storage paths
[^29]: https://github.com/specstoryai/docs/blob/main/faqs.mdx — SpecStory FAQ: cross-IDE storage path comparison
[^30]: https://kentgigger.com/posts/claude-code-conversation-history — Claude Code conversation history: JSONL format, per-project paths
[^31]: https://deepwiki.com/sst/opencode/2.1-session-management — OpenCode session management: SQLite with Drizzle ORM
