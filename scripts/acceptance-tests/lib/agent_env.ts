/**
 * Launch environment for the agent under test.
 *
 * Codex reads its reasoning effort and model from `~/.codex/config.toml`, so an
 * un-pinned run would inherit whatever the maintainer's machine happens to set
 * (this host: `model_reasoning_effort = "xhigh"`, `model = "gpt-5.6-sol"`) and
 * two runs days apart could differ by effort alone. `CODEX_CONFIG` is the ACP
 * bridge's documented override: a JSON object merged into the Codex session
 * config, which wins over the file. Shared by the acceptance runner and the
 * SWE-bench runner so both pin the same way.
 */
export function codexAgentEnv(
  effort: string,
  model: string,
): Record<string, string> {
  return {
    CODEX_CONFIG: JSON.stringify({
      model_reasoning_effort: effort,
      model,
    }),
  };
}

/**
 * Reasoning effort, expressed the only way the Claude bridge accepts it.
 *
 * `@agentclientprotocol/claude-agent-acp` reads `MAX_THINKING_TOKENS` and
 * translates it into the SDK's `thinking` option: `0` disables thinking, any
 * positive integer enables it with that budget, and anything else is ignored
 * with a warning. So "effort" has to be spent as a token budget here, while
 * codex takes the word itself.
 *
 * The budgets are Claude Code's own published tiers — 4000 for `think`, 10000
 * for `think hard`, 31999 for `ultrathink` — so a run pinned at an effort gets
 * the same budget a person would get by typing that phrase. `xhigh` shares the
 * ceiling with `high` because the bridge caps there; it is listed so the same
 * `agent_effort` value configures either arm instead of failing on one.
 */
export const CLAUDE_THINKING_BUDGET: Readonly<Record<string, number>> = {
  none: 0,
  low: 4000,
  medium: 10000,
  high: 31999,
  xhigh: 31999,
};

/**
 * Claude's launch env for a pinned reasoning effort.
 *
 * Throws on an unknown effort rather than falling back to a default: a silent
 * fallback would report an effort the run never used, and the cache key records
 * the configured word, not the budget actually spent.
 */
export function claudeAgentEnv(effort: string): Record<string, string> {
  const budget = CLAUDE_THINKING_BUDGET[effort];
  if (budget === undefined) {
    throw new Error(
      `Unknown agent effort "${effort}" for the claude arm. ` +
        `Accepted: ${Object.keys(CLAUDE_THINKING_BUDGET).join(", ")}.`,
    );
  }
  return { MAX_THINKING_TOKENS: String(budget) };
}

/**
 * Adapter env plus the IDE-specific model/effort pin.
 *
 * Codex takes both through `CODEX_CONFIG`; claude takes the model through
 * `ANTHROPIC_MODEL` (set by `AcpAgent`) and the effort through the thinking
 * budget here. Cursor and opencode expose no effort knob, so their env is
 * passed through untouched.
 */
export function agentLaunchEnv(opts: {
  ide: string;
  model: string;
  effort: string;
  base: Record<string, string>;
}): Record<string, string> {
  switch (opts.ide) {
    case "codex":
      return { ...opts.base, ...codexAgentEnv(opts.effort, opts.model) };
    case "claude":
      return { ...opts.base, ...claudeAgentEnv(opts.effort) };
    default:
      return { ...opts.base };
  }
}
