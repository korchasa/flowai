import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Skill must invoke the `worker` subagent for delegation,
 * and MUST NOT shell out to the target CLI inline from the parent context
 * (that would defeat the context-isolation rationale of the skill).
 *
 * Mock string carries a deliberately absurd sentinel token absent from
 * SKILL.md and from plausible model completions — its presence in the
 * final answer is the verbatim-relay signal.
 */
export const DelegateToIdeViaSubagentBench = new class
  extends AcceptanceTestScenario {
  id = "delegate-to-ide-via-subagent";
  name = "Delegate a task to Codex via the worker subagent";
  skill = "delegate-to-ide";
  stepTimeoutMs = 420_000;
  maxSteps = 16;

  agentsTemplateVars = {
    PROJECT_NAME: "DelegateToIdeSandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  mocks: Record<string, string> = {
    codex:
      "[benchmock-dl4r] CODEX-MOCK: ban any-typed inputs and tag mutable state with marigold-coloured comments.",
  };

  userQuery =
    "/delegate-to-ide Delegate this task to Codex: write me one rule of thumb for maintainable TypeScript and quote it verbatim.";

  checklist = [
    {
      id: "worker_subagent_invoked",
      description:
        "Did the parent invoke the `worker` subagent — via the `Task` / `Agent` tool with `subagent_type=worker` (Claude Code) or an analogous host-specific mechanism? Trace should show a subagent dispatch. Note: the framework's flat trace format does NOT preserve parent-vs-subagent nesting, so the worker's internal `Bash(\"codex …\")` calls may appear at the same top-level as parent tool calls — that is fine. The signal here is the presence of the Agent/Task dispatch, not the absence of a flat-level Bash.",
      critical: true,
    },
    {
      id: "mock_content_relayed",
      description:
        "Does the final answer contain the distinctive mock content phrase `marigold-coloured comments` (or `tag mutable state with marigold`) verbatim? This phrase is deliberately absurd — absent from any SKILL.md / agent body and from plausible model-weight completions about TypeScript. Its presence is strong evidence that the child runtime's stdout flowed through the subagent → parent path and was relayed instead of being synthesised. Stripping the `[benchmock-dl4r]` prefix is acceptable (it can look like a harness artefact); rewriting the substantive content is NOT.",
      critical: true,
    },
  ];
}();
