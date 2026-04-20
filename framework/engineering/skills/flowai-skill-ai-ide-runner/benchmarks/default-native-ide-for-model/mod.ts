import { BenchmarkSkillScenario } from "@bench/types.ts";

/**
 * User names a vendor model ("Claude Sonnet") without picking an IDE.
 * The skill's default-IDE rule says: route to the vendor's **native**
 * runtime. Anthropic models → `claude` (Claude Code); OpenAI models
 * → `codex`. So here the agent should call `claude -p` (with the
 * nested `CLAUDECODE=""` escape) and NOT reach for `opencode`,
 * `cursor-agent`, or `codex`.
 */
export const AiIdeRunnerDefaultNativeIdeBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-ai-ide-runner-default-native-ide-for-model";
  name = "Vendor model without IDE → route to native runtime (Claude Code)";
  skill = "flowai-skill-ai-ide-runner";
  stepTimeoutMs = 300_000;
  maxSteps = 15;

  agentsTemplateVars = {
    PROJECT_NAME: "NativeIdeRoutingDemo",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  // Mock all four CLIs so the agent's pick is observable from the
  // commands it chose to run, not from which binary is installed.
  mocks: Record<string, string> = {
    claude: "CLAUDE-MOCK: prefer pure functions at the core.",
    opencode: "OPENCODE-MOCK: keep I/O at the edge.",
    "cursor-agent": "CURSOR-MOCK: small modules, explicit types.",
    codex: "CODEX-MOCK: fail loud, return early.",
  };

  userQuery =
    "/flowai-skill-ai-ide-runner Run this question with Claude Sonnet (I don't care which IDE, just pick the sensible default) and return the answer verbatim: 'What is one rule of thumb for writing maintainable TypeScript?'. Tell me which IDE and which model you ended up using.";

  checklist = [
    {
      id: "used_claude_cli",
      description:
        "Did the agent invoke the `claude` binary (Claude Code) — the native runtime for Anthropic models — as the default choice?",
      critical: true,
    },
    {
      id: "did_not_use_opencode",
      description:
        "Did the agent AVOID routing this to `opencode` (non-native for Anthropic models when no explicit IDE was requested)?",
      critical: true,
    },
    {
      id: "did_not_use_cursor_or_codex",
      description:
        "Did the agent AVOID calling `cursor-agent` or `codex` for this Anthropic-model request?",
      critical: true,
    },
    {
      id: "sonnet_model_selected",
      description:
        "Did the agent pass a Sonnet model to `claude` — either the `sonnet` alias or a full Sonnet ID like `claude-sonnet-4-6` — rather than silently defaulting to Opus/Haiku?",
      critical: true,
    },
    {
      id: "claudecode_env_override",
      description:
        'Did the nested `claude -p` invocation carry the `CLAUDECODE=""` prefix required when running inside a Claude Code parent?',
      critical: true,
    },
    {
      id: "verbatim_relay",
      description:
        "Did the final answer quote the actual content of the `claude` CLI's response, with the content words unchanged? PASS if the answer contains the literal sentence `prefer pure functions at the core.` (or the full `CLAUDE-MOCK: prefer pure functions at the core.` — the label prefix is optional and stripping it is acceptable; what matters is the CONTENT). Also PASS if the hook did NOT fire and the real CLI produced a different verbatim stdout/stderr (e.g. a usage-limit error) that the agent then quoted verbatim. FAIL only if the final answer contains a different TypeScript tip of the agent's own authorship (e.g. advice about explicit types, `any`, readonly, const, generics, or any other topic the mocked CLI did NOT mention) — that is synthesis, the anti-pattern the skill forbids.",
      critical: true,
    },
    {
      id: "disclosed_ide_and_model",
      description:
        "Did the final response explicitly name BOTH the chosen IDE (Claude Code) and the resolved model ID?",
      critical: true,
    },
  ];
}();
