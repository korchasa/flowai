import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * User names a provider-agnostic label ("Claude Sonnet") for an OpenCode
 * run. Per the skill's catalogue (references/models.md), the agent MUST:
 *   - map it to a real `<provider>/<model>` ID (e.g. `anthropic/claude-sonnet-4.6`);
 *   - NOT pass a bare `-m sonnet` / `-m claude-sonnet` (OpenCode will not
 *     resolve it);
 *   - NOT invent a speculative ID when unsure — prefer discovery
 *     (`opencode models`) or the catalogue fallback.
 *
 * The mock returns a static string for any `opencode` invocation, so the
 * judge's verdict is driven by the command shape the agent chose, not by
 * the mocked tool output.
 */
export const AiIdeRunnerOpencodeProviderFormatBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-ai-ide-runner-opencode-provider-format";
  name = "OpenCode run resolves label to provider/model, never bare";
  skill = "flowai-ai-ide-runner";
  stepTimeoutMs = 300_000;
  maxSteps = 15;

  agentsTemplateVars = {
    PROJECT_NAME: "ProviderFormatDemo",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  // Unique sentinel [benchmock-ocpf42] is absent from SKILL.md; if it
  // ever appears in the agent's final answer, that proves the hook
  // actually intercepted an `opencode` call (rather than the agent
  // pattern-matching on skill examples). This scenario tests the
  // fail-closed path, so we do not actually expect the sentinel to
  // surface — the checks below target the routing decision, not the
  // content.
  mocks: Record<string, string> = {
    opencode:
      "[benchmock-ocpf42] Stub OpenCode output — production invocation would stream here.",
  };

  userQuery =
    "/flowai-ai-ide-runner Run this prompt in OpenCode with 'Claude Sonnet' and give me the answer: 'What is one rule of thumb for writing maintainable TypeScript?'. Use the **native `anthropic/` provider** — do NOT route through OpenRouter or any `openrouter/...` / `opencode/...` prefix. If the native anthropic provider is unavailable for any reason, report the failure and STOP rather than silently falling back. Tell me which exact model ID you ended up passing to `opencode run`.";

  // Two acceptable outcomes given the userQuery:
  //
  //   (A) Native path: agent ran `opencode run -m anthropic/claude-sonnet-<...>`,
  //       the native provider worked, and the response relayed the tool's
  //       stdout with the anthropic/ model ID disclosed.
  //
  //   (B) Fail-closed path: native anthropic was unavailable (e.g. mock
  //       hook produced no usable model list, discovery didn't confirm
  //       anthropic/claude-sonnet-*); the agent reported that to the user
  //       and STOPPED per the explicit "do not silently fall back"
  //       instruction — without retrying under `openrouter/...` or
  //       `opencode/...`.
  //
  // Both paths share the critical anti-pattern the scenario exists to
  // catch: silently switching to a routed provider after a native
  // failure. So the checklist items treat the "stopped cleanly" path
  // as a valid alternative rather than an automatic failure.
  checklist = [
    {
      id: "no_silent_routed_fallback",
      description:
        "Did the agent AVOID silently falling back to an `openrouter/...` or `opencode/...` (routed) provider after a native `anthropic/` attempt failed? Passes both when (A) the agent's final invocation used `anthropic/`, OR (B) the agent stopped and reported the native failure to the user without running the routed retry. Fails if the final `opencode run` used `openrouter/anthropic/...` or another routed variant.",
      critical: true,
    },
    {
      id: "attempted_anthropic_native",
      description:
        "Did the agent make a good-faith attempt to use the native `anthropic/` provider BEFORE concluding it was unavailable or stopping? PASS if EITHER (a) the agent invoked `opencode run -m anthropic/...` (and that invocation produced an error it then reported), OR (b) the agent ran discovery (`opencode models anthropic` / `opencode models` / equivalent) and that discovery clearly showed the native `anthropic/` provider was not configured / unavailable, which the agent then reported as the reason to stop. Discovery-first is an acceptable substitute for a doomed `run` attempt — the anti-pattern this item exists to catch is 'jumped straight to `openrouter/...` without ever considering native', NOT 'used discovery instead of a guaranteed-to-fail run'.",
      critical: true,
    },
    {
      id: "provider_model_format_when_invoked",
      description:
        "If the agent DID reach `opencode run -m ...`, did the argument use the mandatory `<provider>/<model>` format (e.g. `anthropic/claude-sonnet-4.6`)? If the agent never invoked `opencode run` (fail-closed path), mark this PASS — the format rule doesn't apply when no invocation happened.",
      critical: true,
    },
    {
      id: "no_bare_model_id",
      description:
        "Did the agent AVOID passing a bare model name like `-m sonnet`, `-m claude-sonnet`, or `-m claude-sonnet-4.6` (no provider prefix) in ANY invocation? If the agent never ran `opencode run` at all, mark PASS.",
      critical: true,
    },
    {
      id: "no_invented_id",
      description:
        "Did the agent stick to an ID present in the skill catalogue (models.md) or confirmed via discovery (`opencode models`), rather than fabricating something like `anthropic/sonnet-xl` or `anthropic/claude-sonnet-5`? If the agent never ran `opencode run`, mark PASS.",
      critical: true,
    },
    {
      id: "reported_outcome_to_user",
      description:
        "Did the final response clearly tell the user EITHER (A) the exact model ID passed to `opencode run -m ...` (for the happy path), OR (B) that the native `anthropic/` provider was unavailable / the discovery failed AND that the agent stopped per the user's instruction (for the fail-closed path)? Silent output or an unrelated answer fails this.",
      critical: true,
    },
    {
      id: "used_run_subcommand_when_invoked",
      description:
        "If the agent invoked `opencode` at all with the intent of running the prompt, did it use the `run` subcommand (not `opencode exec`, not `opencode chat`, not bare `opencode`)? Discovery-only calls like `opencode models` don't count as 'running the prompt' and do not fail this. If the agent never ran the prompt (fail-closed path), mark PASS.",
      critical: true,
    },
  ];
}();
