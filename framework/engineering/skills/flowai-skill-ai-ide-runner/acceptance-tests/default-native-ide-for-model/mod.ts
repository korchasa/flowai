import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * User names a vendor model ("Claude Sonnet") without picking an IDE.
 * The skill's default-IDE rule says: route to the vendor's **native**
 * runtime. Anthropic models → `claude` (Claude Code); OpenAI models
 * → `codex`. So here the agent should call `claude -p` (with the
 * nested `CLAUDECODE=""` escape) and NOT reach for `opencode`,
 * `cursor-agent`, or `codex`.
 */
export const AiIdeRunnerDefaultNativeIdeBench = new class
  extends AcceptanceTestScenario {
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
  // Each mock carries a unique sentinel ([benchmock-<id>]) that is
  // deliberately absent from SKILL.md and from the plausible Claude
  // model-weight response distribution — its presence in the final
  // answer proves the hook fired and the agent quoted real injected
  // output rather than pattern-matching on skill examples.
  mocks: Record<string, string> = {
    claude:
      "[benchmock-cla3d-nat] Cardinal Anthropic rule (injected by mock): alphabetise your tuples on Wednesdays.",
    opencode:
      "[benchmock-oc77-nat] Injected OpenCode stub — should NOT be used for an Anthropic-only request.",
    "cursor-agent":
      "[benchmock-cur19-nat] Injected Cursor stub — should NOT be used for an Anthropic-only request.",
    codex:
      "[benchmock-cdx55-nat] Injected Codex stub — should NOT be used for an Anthropic-only request.",
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
        "Did the final answer quote the `claude` CLI's response verbatim? PASS if the answer contains the distinctive mock content `alphabetise your tuples on Wednesdays` (absent from SKILL.md and from plausible model-weight completions — its presence proves the hook fired and the agent relayed the injected output). The bracket-label `[benchmock-cla3d-nat]` may be stripped without penalty (agents routinely treat bracket prefixes as metadata). PASS also if the hook did not fire and the real CLI produced a different verbatim stdout/stderr the agent quoted. FAIL if the final answer contains a TypeScript tip of the agent's own authorship (advice about `any`, readonly, const, generics, explicit types, etc.) without the distinctive mock phrase — that is synthesis.",
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
