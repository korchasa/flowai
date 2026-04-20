# Runtime cheatsheet

Exact flags per runtime, verified against `<binary> --help` on 2026-04-20.
When a flag behaves oddly, re-run `<binary> --help` — these CLIs evolve
and this file can drift.

## Claude Code (`claude`)

Non-interactive: `claude -p "<prompt>"`

Key flags:

- `-p, --print` — non-interactive, print final response and exit.
- `--model <name>` — accepts aliases (`opus`, `sonnet`, `haiku`) or full
  model IDs (see [models.md](models.md)).
- `--permission-mode <mode>` — one of `default`, `plan` (read-only),
  `acceptEdits`, `bypassPermissions`, `auto`, `dontAsk`.
- `--dangerously-skip-permissions` — hard YOLO; only for isolated sandboxes.
- `--output-format <fmt>` — `text` (default), `json` (single final
  object), `stream-json` (NDJSON; requires `--verbose`).
- `--input-format <fmt>` — `text` (default) or `stream-json` (streaming
  input, for multi-turn headless).
- `--append-system-prompt <text>` — extend the default system prompt.
- `--system-prompt <text>` — replace the default system prompt entirely.
- `--agent <name>` — use a named agent from `~/.claude/agents/` or
  `.claude/agents/`.
- `--agents <json>` — define custom agents inline.
- `--mcp-config <files|json…>` — load MCP servers.
- `--strict-mcp-config` — ignore all other MCP config sources.
- `--settings <file-or-json>` — additional settings.
- `--setting-sources <csv>` — limit which sources load: `user`,
  `project`, `local`. `--setting-sources ""` gives a cleanroom run.
- `-r, --resume <session-id>` — resume a session; omit value for picker.
- `-c, --continue` — continue most recent session in the cwd.
- `--session-id <uuid>` — use a specific session ID.
- `--fork-session` — create a new ID when resuming (with `-r`/`-c`).
- `--from-pr [number-or-url]` — resume a PR-linked session.
- `--max-budget-usd <amount>` — stop at a dollar cap (requires `-p`).
- `--json-schema <schema>` — constrain final JSON response to a schema.
- `--allowedTools <csv>` / `--disallowedTools <csv>` — tool allow/deny list.
- `--add-dir <dirs…>` — additional read-access directories.
- `--bare` — minimal mode (skip hooks, LSP, plugin sync, CLAUDE.md
  auto-discovery). Auth strictly via `ANTHROPIC_API_KEY` or
  `apiKeyHelper`.
- `-w, --worktree [name]` — run in a new git worktree.
- `--tmux` — open inside a tmux session (requires `-w`).

Env:

- `CLAUDECODE` — set to empty string (`CLAUDECODE=""`) to allow nested
  `claude` runs; deleting the var doesn't help because the parent env
  still propagates.
- `CLAUDE_CONFIG_DIR` — redirect config reads to a custom dir (useful
  for per-invocation isolation).
- `ANTHROPIC_API_KEY` — API-key auth fallback when OAuth is unavailable.

Examples:

```bash
# Flagship, read-only, text output:
claude -p "Summarize this repo layout" --model opus --permission-mode plan

# JSON-schema-constrained response:
claude -p "Return JSON: {languages: string[]}" --model sonnet \
  --output-format json \
  --json-schema '{"type":"object","properties":{"languages":{"type":"array","items":{"type":"string"}}},"required":["languages"]}'

# Cleanroom (no user/project/local settings):
claude -p "Reply with 'ok'" --setting-sources "" --model haiku
```

## OpenCode (`opencode`)

Non-interactive: `opencode run "<prompt>"`

Key flags on the `run` subcommand:

- `-m, --model <provider/model>` — **mandatory format**, e.g.
  `openai/gpt-5.4`, `anthropic/claude-opus-4.7`, `openrouter/…`.
- `--agent <name>` — use a named agent.
- `--format <default|json>` — `json` emits NDJSON lifecycle events.
- `-c, --continue` — continue last session in cwd.
- `-s, --session <id>` — continue a specific session id.
- `--fork` — fork before continuing (requires `-c` or `-s`).
- `--share` — expose session as shareable link.
- `--dangerously-skip-permissions` — YOLO.
- `--thinking` — show reasoning/thinking blocks in the stream.
- `--variant <low|high|max|minimal>` — provider-specific reasoning effort.
- `-f, --file <path…>` — attach file(s) to message.
- `--title <string>` — session title.
- `--attach <url>` — attach to a running opencode server.
- `--dir <path>` — working dir (on the remote when using `--attach`).
- `--port <number>` — server port (random if omitted).
- `--pure` — run without external plugins.
- `--print-logs` — print logs to stderr.
- `--log-level <DEBUG|INFO|WARN|ERROR>` — log verbosity.

Other subcommands worth knowing:

- `opencode export <session-id> [--sanitize]` — dump full session
  transcript as JSON on stdout.
- `opencode models [provider]` — list available models.
- `opencode mcp` — manage MCP servers.

Env:

- `OPENCODE_CONFIG_CONTENT` — JSON config blob injected into the run
  (commonly used to register per-invocation local MCP servers).
- `OPENCODE_SERVER_PASSWORD` — basic-auth password when using `--attach`.
- Vendor keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
  `OPENROUTER_API_KEY`, etc., depending on the `provider/` prefix.

Examples:

```bash
# Simple one-shot:
opencode run "Suggest refactor for this file" -m openai/gpt-5.4 --thinking

# Structured JSON events:
opencode run --format json -m anthropic/claude-sonnet-4.6 "Explain this diff"

# Export session transcript:
opencode export "<session-id>" --sanitize > transcript.json
```

## Cursor (`cursor-agent`)

Non-interactive: `cursor-agent -p "<prompt>"` — binary is
`cursor-agent`, not `cursor`.

Key flags:

- `-p, --print` — non-interactive (required for scripting). Has full
  tool access by default (shell + edit).
- `--model <id>` — e.g. `auto`, `composer-2`, `gpt-5.4-high`,
  `claude-opus-4-7-thinking-high`. Full list: `cursor-agent --list-models`.
- `--list-models` — print available models and exit.
- `--mode <plan|ask>` — read-only modes (`plan` = propose, no edits;
  `ask` = Q&A).
- `--plan` — shorthand for `--mode plan`.
- `--sandbox <enabled|disabled>` — override config sandbox setting.
- `-f, --force` / `--yolo` — auto-approve all commands.
- `--output-format <text|json|stream-json>` — structured output (with
  `-p`).
- `--stream-partial-output` — stream partial text deltas
  (`stream-json` only).
- `--trust` — non-interactive workspace trust (required with `-p` if
  workspace trust isn't cached).
- `--workspace <path>` — override cwd.
- `-w, --worktree [name]` — run in an isolated git worktree at
  `~/.cursor/worktrees/<repo>/<name>`.
- `--worktree-base <branch>` — base branch for the new worktree.
- `--skip-worktree-setup` — skip setup scripts from
  `.cursor/worktrees.json`.
- `--resume [chatId]` — resume a session.
- `--continue` — continue the previous session.
- `--api-key <key>` / `CURSOR_API_KEY` env — API-key auth.
- `-H, --header "Name: Value"` — custom header (repeatable).
- `--mcp` / `--approve-mcps` — MCP management.
- `-c, --cloud` — start in cloud mode (composer picker).

Other subcommands worth knowing:

- `cursor-agent models` — same as `--list-models`.
- `cursor-agent status` / `whoami` — auth state.
- `cursor-agent create-chat` — new empty chat, prints its ID.
- `cursor-agent login` / `logout`.

Env:

- `CURSOR_API_KEY` — API-key auth fallback.
- `NO_OPEN_BROWSER=1` — suppress browser during `cursor-agent login`.

Examples:

```bash
# Read-only, specific model:
cursor-agent -p --trust --mode plan --model claude-opus-4-7 "Explain this module"

# Sandboxed worktree run:
cursor-agent -p --trust --worktree compare-run --model auto "Apply suggested fix"

# Structured output:
cursor-agent -p --trust --output-format json --model composer-2 "List TODO files"
```

## Codex (`codex`)

Non-interactive: `codex exec "<prompt>"` (argv) or
`echo "<prompt>" | codex exec -` (stdin; trailing `-` optional).

Key flags on the `exec` subcommand:

- `-m, --model <name>` — model ID, e.g. `gpt-5`, `gpt-5-codex`, `o3`.
  Alt form: `-c model="<name>"`.
- `-c, --config key=value` — TOML config override (repeatable). Useful:
  - `-c approval_policy="never"` — no approval prompts.
  - `-c model_reasoning_effort="high"` — reasoning depth.
  - `-c web_search=true` — enable Codex's web search.
  - `-c openai_base_url="…"` — route via proxy.
  - `-c sandbox_workspace_write.network_access=true` — allow network in
    `workspace-write` sandbox.
- `-C, --cd <dir>` — working directory.
- `-s, --sandbox <mode>` — `read-only`, `workspace-write`,
  `danger-full-access`.
- `--full-auto` — alias for `--sandbox workspace-write`.
- `--dangerously-bypass-approvals-and-sandbox` — skip all prompts and
  sandboxing; only for externally-sandboxed environments.
- `-p, --profile <name>` — load a named profile from `~/.codex/config.toml`.
- `--enable <feature>` / `--disable <feature>` — feature flags
  (`-c features.<name>=true`).
- `-i, --image <path…>` — attach image(s) to initial prompt.
- `--add-dir <dir…>` — additional writable workspace directories.
- `--skip-git-repo-check` — allow running outside a git repo.
- `--ephemeral` — no on-disk session persistence.
- `--output-schema <file>` — JSON-schema response shape.
- `--color <always|never|auto>` — output colour.
- `--experimental-json` — emit NDJSON lifecycle events (used by
  `@korchasa/ai-ide-cli`).
- `--oss` — use open-source provider.
- `--local-provider <lmstudio|ollama>` — local-model routing (with `--oss`).

Positional subcommands:

- `codex exec resume <thread-id>` — resume by thread ID.
- `codex exec resume --last` — resume most recent thread.
- `codex exec review` — run code review against current repo.

Env:

- `CODEX_HOME` — base dir (defaults to `~/.codex`). Session transcripts
  live at `<CODEX_HOME>/sessions/YYYY/MM/DD/rollout-*-<thread_id>.jsonl`.
- `CODEX_API_KEY` — primary API key.
- `OPENAI_API_KEY` — fallback.

Examples:

```bash
# Read-only, no approvals:
codex exec --model gpt-5-codex --sandbox read-only \
  -c approval_policy="never" "Audit this diff"

# High reasoning, web search enabled:
codex exec --model gpt-5 \
  -c model_reasoning_effort="high" -c web_search=true \
  "Research the latest SIMD intrinsics for AArch64"

# JSON-schema response:
codex exec --model gpt-5 --output-schema schema.json "Extract TODO items"

# Resume latest thread:
codex exec resume --last
```

## Capturing output

- **Text**: redirect stdout. Stderr may contain warnings/logs:
  `<binary> … > out.txt 2>&1` for a single-file dump, or
  `> out.txt 2> err.txt` to keep them separate.
- **Structured events**: each CLI has a JSON/NDJSON mode:
  - Claude: `--output-format json` (single object) or
    `--output-format stream-json --verbose` (NDJSON).
  - OpenCode: `--format json` (NDJSON).
  - Cursor: `--output-format json` or `stream-json`.
  - Codex: `--experimental-json` (NDJSON).
- **Final assistant text** sits in the last `assistant`/`text`/
  `agent_message`/`result` event depending on the runtime. Field-level
  shapes documented in `@korchasa/ai-ide-cli` source:
  - `claude/stream.ts`
  - `opencode/process.ts` (`OpenCodeStreamEvent` union)
  - `cursor/process.ts`
  - `codex/process.ts` (snake_case items;
    `codex app-server` uses camelCase — do not cross-reference)

## Transcripts

- Claude: `~/.claude/projects/<project>/<session-id>/…` (managed by CLI).
- OpenCode: `opencode export <session-id> [--sanitize]` dumps the
  full transcript on stdout.
- Cursor: session files in `~/.cursor/…`; surface via
  `cursor-agent --resume <chatId>`.
- Codex: `<CODEX_HOME>/sessions/YYYY/MM/DD/rollout-*-<thread_id>.jsonl`.
  `CODEX_HOME` defaults to `~/.codex`.

## Killing a hung run

Each CLI reacts to `SIGTERM` (Ctrl-C sends `SIGINT` which most treat
the same). Graceful kill then force if needed:

```bash
kill -TERM <pid>
kill -KILL <pid>
```

If you lost the PID:

```bash
pkill -TERM -f "claude|opencode|cursor-agent|codex"
```
