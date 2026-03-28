# Claude Code CLI — Features & Instruction System

Source: auto-flow ADR-001 research (2026-03).

## CLI Reference (claude --help)

```
Usage: claude [options] [command] [prompt]

Arguments:
  prompt                                            Your prompt

Options:
  --add-dir <directories...>                        Additional directories to allow tool access to
  --agent <agent>                                   Agent for the current session. Overrides the 'agent' setting.
  --agents <json>                                   JSON object defining custom agents
  --allow-dangerously-skip-permissions              Enable bypassing permission checks as an option
  --allowedTools, --allowed-tools <tools...>        Comma or space-separated list of tool names to allow
  --append-system-prompt <prompt>                   Append a system prompt to the default system prompt
  --betas <betas...>                                Beta headers to include in API requests
  --brief                                           Enable SendUserMessage tool for agent-to-user communication
  --chrome                                          Enable Claude in Chrome integration
  -c, --continue                                    Continue the most recent conversation
  --dangerously-skip-permissions                    Bypass all permission checks
  -d, --debug [filter]                              Enable debug mode with optional category filtering
  --debug-file <path>                               Write debug logs to a specific file path
  --disable-slash-commands                          Disable all skills
  --disallowedTools, --disallowed-tools <tools...>  Comma or space-separated list of tool names to deny
  --effort <level>                                  Effort level (low, medium, high, max)
  --fallback-model <model>                          Auto fallback when default model overloaded (--print only)
  --file <specs...>                                 File resources to download at startup
  --fork-session                                    Create new session ID on resume
  --from-pr [value]                                 Resume session linked to PR
  -h, --help                                        Display help
  --ide                                             Auto connect to IDE on startup
  --include-partial-messages                        Include partial chunks (--print + stream-json)
  --input-format <format>                           Input format: "text" | "stream-json" (--print only)
  --json-schema <schema>                            JSON Schema for structured output validation
  --max-budget-usd <amount>                         Max dollar spend per invocation (--print only)
  --mcp-config <configs...>                         Load MCP servers from JSON files or strings
  --model <model>                                   Model alias ("sonnet","opus") or full name
  -n, --name <name>                                 Display name for session
  --no-chrome                                       Disable Chrome integration
  --no-session-persistence                          Disable session persistence (--print only)
  --output-format <format>                          Output: "text" | "json" | "stream-json" (--print only)
  --permission-mode <mode>                          acceptEdits | bypassPermissions | default | dontAsk | plan | auto
  --plugin-dir <path>                               Load plugins from directory
  -p, --print                                       Print response and exit (non-interactive)
  --replay-user-messages                            Re-emit user messages on stdout (stream-json)
  -r, --resume [value]                              Resume conversation by session ID
  --session-id <uuid>                               Use specific session ID
  --setting-sources <sources>                       Setting sources to load (user, project, local)
  --settings <file-or-json>                         Load additional settings from file/JSON
  --strict-mcp-config                               Only use MCP servers from --mcp-config
  --system-prompt <prompt>                          System prompt for the session
  --tmux                                            Create tmux session for worktree
  --tools <tools...>                                Available tools: "" | "default" | tool names
  --verbose                                         Override verbose mode
  -v, --version                                     Output version
  -w, --worktree [name]                             Create git worktree for session

Commands:
  agents [options]                                  List configured agents
  auth                                              Manage authentication
  doctor                                            Check auto-updater health
  install [options] [target]                        Install native build
  mcp                                               Configure MCP servers
  plugin|plugins                                    Manage plugins
  setup-token                                       Set up auth token
  update|upgrade                                    Check/install updates
```

---

## Instruction System — Priority Hierarchy

From highest to lowest priority:

1. **Managed settings** (server/MDM policies) — cannot be overridden
2. **`--system-prompt`** — full system prompt replacement
3. **`--append-system-prompt`** — appends to system prompt (or to replacing prompt if `--system-prompt` also set)
4. **Output styles** (`.claude/output-styles/`) — part of system prompt
5. **CLAUDE.md files** — injected as first user message after system prompt
6. **Auto memory** (`MEMORY.md`, first 200 lines)
7. **User prompt** (positional argument / stdin) — lowest priority

### System Prompt Flags

| Flag | Action | Recommendation |
|------|--------|----------------|
| `--system-prompt` | Replaces entire system prompt | Full control only |
| `--system-prompt-file` | Replaces from file | Reproducible pipelines |
| `--append-system-prompt` | Appends to system prompt | **Recommended for most cases** |
| `--append-system-prompt-file` | Appends from file | Long instructions |

`--system-prompt` and `--system-prompt-file` are **mutually exclusive**. Append flags **can be combined** with either replacing flag.

**Caveat (GitHub issue #4523):** `--append-system-prompt` may inject content as user message, not strictly system prompt. In long sessions, appended instructions may degrade during context compaction. For critical persistent rules, use `CLAUDE.md`.

### Positional Argument & stdin Piping

Positional `[prompt]` — user task/question, lowest priority. Without `-p` starts interactive session; with `-p` executes and exits.

stdin piping (`echo "prompt" | claude -p`) passes content from other commands. **Requires `-p` flag**. Stdin and positional argument combine: stdin = context, argument = instruction.

**Limitations:** no simultaneous pipe + interactive mode (feature request #6009); possible empty responses for stdin >~7000 chars (bug #7263); TTY issues on headless servers.

### CLAUDE.md — Persistent Project Rules

CLAUDE.md content is injected as **first user message after system prompt** (not part of system prompt). This means `--append-system-prompt` has structural priority over CLAUDE.md.

Hierarchical loading (general → specific):

| Location | Scope | Loading | Team-shared? |
|---|---|---|---|
| `~/.claude/CLAUDE.md` | Global | Always | No, personal |
| `~/.claude/rules/*.md` | Global rules | Always | No |
| `./CLAUDE.md` (project root) | Project | Always | Yes, via git |
| `./.claude/CLAUDE.md` | Project | Always | Yes |
| `./.claude/rules/*.md` | Project rules | Always | Yes |
| `./CLAUDE.local.md` | Personal project | Always | No, gitignored |
| `./subdir/CLAUDE.md` | Subdirectory | On demand | Yes |

More specific files win on conflict, but all levels **combine** (no replacement). Rules in `.claude/rules/` support path targeting via YAML frontmatter (`paths: ["src/api/**/*.ts"]`). `@path/to/file` import syntax, recursive up to 5 levels. **Recommended size — up to 200 lines.**

### `--agent` Flag & Agent System

`--agent <name>` loads custom agent config as primary session mode. Unlike subagents invoked during work, `--agent` turns **entire session** into specialized agent with its own model, tools, and rules.

Agents defined as Markdown files with YAML frontmatter in `.claude/agents/` (project) or `~/.claude/agents/` (global). Key frontmatter fields: `name`, `description`, `model`, `tools`, `permissionMode`.

`--agents` (plural) — defines subagents via JSON in CLI. Available to main agent for delegation during session.

### settings.json, Environment Variables & MCP

`.claude/settings.json` manages permissions, env vars, hooks, tool behavior. **Does not contain prompt text** — use CLAUDE.md for instructions. Hierarchy: **Managed > Project > User > Local**. Arrays concatenate; scalars — higher priority wins.

Key env vars:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_MODEL` | Default model |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | Max response tokens |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Subagent model |
| `MAX_THINKING_TOKENS` | Thinking tokens |
| `BASH_DEFAULT_TIMEOUT_MS` | Bash timeout |
| `MCP_TIMEOUT` / `MCP_TOOL_TIMEOUT` | MCP server timeouts |

Priority: CLI args > env vars > `env` in settings.json.

MCP config stored in `.mcp.json` (project), `~/.claude.json` (user), or managed via `claude mcp add/remove/list`.

---

## Feature Analysis for auto-flow Integration

### Already Used in Engine

| Flag | Where | Purpose |
|---|---|---|
| `-p` / `--print` | `claude-process.ts` | Non-interactive mode (core) |
| `--output-format stream-json` | `claude-process.ts:110` | Real-time NDJSON processing |
| `--resume` | `claude-process.ts:93` | Session continuation + HITL |
| `--system-prompt-file` | `claude-process.ts:102` | Agent system prompt injection (ADR-001) |
| `--model` | `claude-process.ts:107` | Per-node model selection |
| `--verbose` | `claude-process.ts:110` | Extended output |
| `--dangerously-skip-permissions` | via `claude_args` | Permission bypass (sandbox) |

### Candidates for Integration

#### High Priority

- **`--effort <low|medium|high|max>`** — thinking depth per-node.
  Use case: PM/QA = high, simple merge/formatting = low. Token/time savings.
  Integration: add `effort` field to `PipelineDefaults` + `NodeConfig`, same pattern as `model`.

- **`--max-budget-usd <amount>`** — per-invocation spend cap.
  Use case: guard against runaway agents. Configurable per-node or in defaults.
  Integration: add `max_budget_usd` field to `PipelineDefaults` + `NodeConfig`.

- **`--allowedTools` / `--disallowedTools`** — tool restrictions per agent.
  Use case: QA can't Edit, Architect can't Bash. Least-privilege principle.
  Integration: add `allowed_tools` / `disallowed_tools` to `NodeConfig`.

- **`--json-schema <schema>`** — structured output validation at CLI level.
  Use case: guarantee artifact format without post-hoc parsing. Could replace manual `output_schema` validation.
  Integration: add `output_schema` field to `NodeConfig`, pass as `--json-schema`.

#### Medium Priority

- **`--permission-mode <mode>`** — granular permission control.
  Use case: replace blanket `--dangerously-skip-permissions` with `plan`, `acceptEdits`, etc. Safer for production.
  Integration: add `permission_mode` to `PipelineDefaults` + `NodeConfig`.

- **`--fallback-model <model>`** — auto-fallback on model overload.
  Use case: pipeline resilience without manual retry. E.g., opus → sonnet fallback.
  Integration: add `fallback_model` to `PipelineDefaults` + `NodeConfig`.

- **`--name <name>`** — session display name.
  Use case: readable session list for debugging. Auto-generate from `<pipeline>/<node-id>/<run-id>`.
  Integration: pass in `buildClaudeArgs`.

- **`--no-session-persistence`** — disable session save to disk.
  Use case: one-shot nodes (merge, simple checks) that never resume. Disk savings.
  Integration: add `session_persistence: false` to `NodeConfig`.

- **`--settings <file-or-json>`** — per-pipeline/per-node Claude settings.
  Use case: inject MCP servers, tool configs, custom settings per agent.
  Integration: add `settings` field to `NodeConfig`.

#### Low Priority / Research

- **`--mcp-config` / `--strict-mcp-config`** — MCP server injection.
  Use case: agents access external tools (DB, API, browser) via MCP.
  Consideration: security implications, config management complexity.

- **`--agents` / `--agent`** — Claude Code's built-in custom agents.
  Use case: delegate sub-orchestration to Claude's own agent system.
  Consideration: overlap with auto-flow's own orchestration.

- **`--add-dir`** — grant access to additional directories.
  Use case: artifacts stored outside working directory.
  Integration: add `extra_dirs` to `NodeConfig`.

- **`--worktree`** — isolated git worktree per agent.
  Use case: parallel agent execution without git conflicts.
  Consideration: significant complexity; needs worktree lifecycle management.

- **`--input-format stream-json`** — bidirectional streaming.
  Use case: advanced HITL with real-time agent↔engine communication.
  Consideration: requires rewrite of stdin handling (`stdin: "null"` currently).

### Recommended Implementation Order

1. `effort` + `max_budget_usd` — quick win, minimal code change, immediate value
2. `allowed_tools` / `disallowed_tools` — security improvement
3. `json-schema` — artifact validation simplification
4. `permission_mode` — safety improvement over current blanket bypass
5. `fallback_model` — resilience improvement
