# Model catalogue

Flagship / commonly-used models per runtime, last verified 2026-04-20.
Vendors ship new models frequently — when the user names a model not
listed here, run the runtime's discovery command (bottom of this file)
to re-check, then fall back to the defaults below if discovery fails.

## Claude Code — `claude --model <…>`

Aliases (recommended — latest stable in each tier):

- `opus` → Claude Opus (top reasoning, highest cost).
- `sonnet` → Claude Sonnet (balanced, default for most tasks).
- `haiku` → Claude Haiku (fast, cheap, tool subset).

Full IDs also work:

- `claude-opus-4-7` — flagship Opus, 1M context.
- `claude-opus-4-6` — previous generation.
- `claude-sonnet-4-6` — current Sonnet.
- `claude-haiku-4-5` — current Haiku.

Effort modifier: `--effort <low|medium|high|xhigh|max>` adjusts reasoning
depth for the session (independent of model choice).

## Codex — `codex exec -m <…>`

Flagship picks:

- `gpt-5` — OpenAI frontier model (general reasoning).
- `gpt-5-codex` — Codex-tuned variant (coding agents).
- `o3` — high-reasoning model.
- `gpt-5.1-codex`, `gpt-5.2-codex` — newer Codex generations.

Reasoning effort is expressed as a TOML override rather than model
suffix: `-c model_reasoning_effort="high"`.

Sandbox + approval policy matter as much as model choice here:

- `-s read-only` — inspect only.
- `-s workspace-write` — edit inside cwd (default for `--full-auto`).
- `-s danger-full-access` — full fs + network; sandbox-free.

## Cursor — `cursor-agent --model <…>`

From `cursor-agent --list-models` (live catalogue). Flagship picks:

- `auto` — Cursor's router (picks per task; default entry point).
- `composer-2-fast` — Cursor's own model, default, agent-optimised.
- `composer-2` — higher-quality Cursor model.
- `gpt-5.4-high` — OpenAI flagship via Cursor proxy.
- `gpt-5.4-xhigh-fast` — higher-reasoning, faster variant.
- `gpt-5.3-codex-high` — Codex-tuned, high reasoning.
- `claude-opus-4-7-thinking-high` — Claude Opus 4.7 (1M context) with
  thinking.
- `claude-opus-4-7-low` — cheaper Opus 4.7 variant.
- `claude-sonnet-4.6` — Claude Sonnet 4.6.

Cursor names carry suffixes (`-low`, `-high`, `-xhigh`, `-thinking-high`,
`-fast`) that map to reasoning effort and latency knobs — no separate
effort flag.

## OpenCode — `opencode run -m <provider>/<model>`

Format is always `<provider>/<model>`. Flagship picks:

- `anthropic/claude-opus-4.7`
- `anthropic/claude-sonnet-4.6`
- `anthropic/claude-haiku-4.5`
- `openai/gpt-5.4`
- `openai/gpt-5-codex`
- `openai/gpt-5.1-codex`
- `openai/gpt-5.2-codex`
- `openai/gpt-5.3-codex`
- `openrouter/anthropic/claude-opus-4.7` — same model, routed via
  OpenRouter (different billing path).
- `openrouter/deepseek/deepseek-r1` — DeepSeek R1 reasoning.
- `openrouter/deepseek/deepseek-chat-v3.1` — DeepSeek Chat.
- `opencode/gpt-5-nano` — OpenCode's free tier routing (rate-limited).
- `opencode/big-pickle` — OpenCode's own routed model.

Reasoning effort: `--variant <low|high|max|minimal>` (provider-specific;
not all combinations are valid — check `opencode models`).

## Discovery commands

When the user asks for a model not listed above, fetch the live list:

- Cursor: `cursor-agent --list-models` (or `cursor-agent models`).
- OpenCode: `opencode models` (add a provider arg to scope,
  e.g. `opencode models openai`).
- Codex: no built-in `list` subcommand. Sources of truth:
  - `~/.codex/config.toml` — user's model profiles.
  - `codex exec --help` — shows the `-m` flag surface only.
  - OpenAI's model documentation for the latest available IDs.
- Claude: `claude --help | head -80` — shows alias hints. Full model
  list at the Anthropic Claude docs.

Rules:

1. Do not invent model IDs. If a requested model isn't in discovery
   output, stop and ask the user.
2. If the user names a provider-agnostic label (e.g. "Opus"), map it:
   - Claude → `opus`.
   - Cursor → `claude-opus-4-7-thinking-high` (or `-low` for cheap).
   - OpenCode → `anthropic/claude-opus-4.7`.
   - Codex → not applicable; ask the user to pick an OpenAI model.
3. Mention the resolved model in the final output so the user can see
   what actually ran.
