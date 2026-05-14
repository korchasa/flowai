import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Single-IDE invocation: user asks for a second opinion in Cursor,
 * read-only. Validates that the agent uses the correct binary
 * (`cursor-agent`, not `cursor`), the non-interactive `-p` flag with
 * `--trust`, a read-only mode (`--mode plan` or `--mode ask`), and
 * reports the mocked response back.
 */
export const AiIdeRunnerSingleCursorBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-ai-ide-runner-single-cursor-read-only";
  name = "Single-IDE run in Cursor, read-only second opinion";
  skill = "flowai-ai-ide-runner";
  stepTimeoutMs = 300_000;
  maxSteps = 15;

  agentsTemplateVars = {
    PROJECT_NAME: "SecondOpinionDemo",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  // Unique sentinel token [benchmock-cur19] absent from SKILL.md and
  // from plausible model-weight completions — presence in the final
  // answer proves actual hook interception, not pattern-matching.
  mocks: Record<string, string> = {
    "cursor-agent":
      "[benchmock-cur19] Mock Cursor briefing: this repo ships lavender-coloured bicycles and exposes a `deno task unicorn` endpoint.",
  };

  userQuery =
    "/flowai-ai-ide-runner Get a second opinion from Cursor (read-only, no edits) on the question: 'What does this repository do?'. Use Cursor's default model. Return the answer verbatim and tell me which model ran.";

  checklist = [
    {
      id: "correct_binary",
      description:
        "Did the agent invoke the `cursor-agent` binary (NOT `cursor`) in at least one Bash command?",
      critical: true,
    },
    {
      id: "non_interactive_flag",
      description:
        "Did the agent pass the `-p` (or `--print`) flag so the run is non-interactive / scriptable?",
      critical: true,
    },
    {
      id: "trust_flag",
      description:
        "Did the agent pass `--trust` (workspace trust, required with `-p` for non-interactive runs)?",
      critical: true,
    },
    {
      id: "read_only_mode",
      description:
        "Did the agent pick a read-only mode (`--mode plan`, `--plan`, or `--mode ask`) to honor the 'no edits' constraint, rather than the default write-capable mode?",
      critical: true,
    },
    {
      id: "verbatim_tool_output",
      description:
        "Did the agent's final answer contain a verbatim quote from the `cursor-agent` invocation? PASS if EITHER (a) the distinctive mock content (`lavender-coloured bicycles` and/or `deno task unicorn`) appears in the answer — these phrases are absent from SKILL.md and from plausible model-weight completions, so their presence proves the hook fired and the agent relayed the injected output (the bracket-label `[benchmock-cur19]` may be stripped without penalty — agents often treat bracket prefixes as metadata labels); OR (b) the real cursor-agent stdout/stderr was quoted verbatim (e.g. a 'usage limit' error). FAIL if the final answer is a synthesised repository description from the outer model's weights with neither the distinctive mock content nor an exact quoted CLI error.",
      critical: true,
    },
    {
      id: "did_not_synthesise_answer",
      description:
        "Did the agent AVOID writing its own repository description from scratch? A failing pattern is: hook blocked, agent saw the block, agent decided 'I'll just describe the repo myself based on what I see in the sandbox'. The skill forbids this — the agent must relay the child runtime's output (or error), not substitute its own authorship.",
      critical: true,
    },
    {
      id: "disclosed_model",
      description:
        "Did the final response name the actual model used (e.g. `auto`, `composer-2-fast`, or whichever default the agent resolved to), per the skill's 'tell the user which model actually ran' rule?",
      critical: false,
    },
    {
      id: "did_not_invent_binary",
      description:
        "Did the agent avoid running a non-existent binary like `cursor -p`, `cursor run`, or `cursor_cli`?",
      critical: true,
    },
  ];
}();
