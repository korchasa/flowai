import { BenchmarkSkillScenario } from "@bench/types.ts";

/**
 * Fan-out comparison across two IDEs. Validates that the agent:
 *   - picks the correct binaries (`claude`, `opencode`);
 *   - launches the runs concurrently (background `&` + `wait`, or
 *     parallel Bash tool calls), not sequentially;
 *   - uses OpenCode's mandatory `provider/model` format;
 *   - prefixes nested `claude -p` with `CLAUDECODE=""` (gotcha called
 *     out by the skill) when the caller itself runs under Claude Code;
 *   - presents a side-by-side / comparative summary at the end.
 */
export const AiIdeRunnerFanoutBench = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-ai-ide-runner-fanout-parallel-claude-opencode";
  name = "Fan-out compare: Claude Code + OpenCode in parallel";
  skill = "flowai-skill-ai-ide-runner";
  stepTimeoutMs = 420_000;
  maxSteps = 20;

  agentsTemplateVars = {
    PROJECT_NAME: "CompareIdesDemo",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  mocks: Record<string, string> = {
    claude:
      "CLAUDE-MOCK: prefer immutable data structures; push validation to the boundary.",
    opencode:
      "OPENCODE-MOCK: favour small pure functions; keep I/O at the edge.",
  };

  userQuery =
    "/flowai-skill-ai-ide-runner Ask the same question to Claude Code AND OpenCode at the same time (run them in parallel, don't wait sequentially). Question: 'What's one rule of thumb for writing maintainable TypeScript?'. Use each IDE's flagship Claude model. Present the two answers side-by-side so I can compare them.";

  checklist = [
    {
      id: "both_binaries_invoked",
      description:
        "Did the agent invoke BOTH `claude` (Claude Code) and `opencode` (OpenCode) binaries in Bash commands?",
      critical: true,
    },
    {
      id: "parallel_execution",
      description:
        "Were the two runs launched concurrently — either via shell backgrounding (`&` followed by `wait`) or via two Bash tool calls issued in the same assistant turn — and NOT one after the other in strict sequence?",
      critical: true,
    },
    {
      id: "claude_non_interactive",
      description:
        "Did the agent pass `-p` (or `--print`) to `claude` for a non-interactive run?",
      critical: true,
    },
    {
      id: "opencode_provider_model_format",
      description:
        "Did the OpenCode invocation use the mandatory `provider/model` format (e.g. `anthropic/claude-opus-4.7`, `anthropic/claude-sonnet-4.6`), and NOT a bare model name like `claude-opus` or `sonnet`?",
      critical: true,
    },
    {
      id: "claudecode_env_override",
      description:
        "Did the agent prefix the nested `claude -p` command with `CLAUDECODE=\"\"` (empty string, not unset) to avoid the 'already in a Claude session' refusal when running under a Claude Code parent?",
      critical: true,
    },
    {
      id: "side_by_side_comparison",
      description:
        "Did the final answer present BOTH outputs together (labelled per IDE) so the user can compare — not just one of them, and not a merged paraphrase that hides per-IDE provenance?",
      critical: true,
    },
    {
      id: "did_not_invent_models",
      description:
        "Did the agent stick to real, documented model IDs from the skill's catalogue (models.md) rather than fabricating IDs like `claude-5-ultra` or `opus-pro`?",
      critical: false,
    },
  ];
}();
