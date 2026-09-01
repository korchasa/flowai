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

/** Adapter env plus the IDE-specific model/effort pin (codex only today). */
export function agentLaunchEnv(opts: {
  ide: string;
  model: string;
  effort: string;
  base: Record<string, string>;
}): Record<string, string> {
  return opts.ide === "codex"
    ? { ...opts.base, ...codexAgentEnv(opts.effort, opts.model) }
    : { ...opts.base };
}
