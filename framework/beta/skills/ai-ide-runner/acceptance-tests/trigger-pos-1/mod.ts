import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * The prompt to relay is IN the query. It was not, until 2026-08-20: the old
 * wording said "take this prompt and run it in OpenCode" and then supplied no
 * prompt, so all three runs ended `blocked` with the agent asking "Could you
 * share the prompt text you want executed in OpenCode?". That is a malformed
 * scenario, not a routing miss — and it was briefly recorded as an unreachable
 * positive trigger on the strength of a tool-call count of zero, read off the
 * summary table without opening the session. Zero calls means the agent had
 * nothing to work on just as easily as it means the agent needed nothing.
 */
export const AiIdeRunnerTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "ai-ide-runner-trigger-pos-1";
  name = "run prompt in another IDE";
  skill = "ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  userQuery =
    'Run this prompt in OpenCode and show me its raw output, word for word: "Name the three hardest parts of writing a JSON parser by hand."';
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `ai-ide-runner` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `ai-ide-runner`.",
    critical: true,
  }];
}();
