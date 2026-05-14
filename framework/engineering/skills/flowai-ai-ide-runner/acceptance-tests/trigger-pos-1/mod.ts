import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const AiIdeRunnerTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-ai-ide-runner-trigger-pos-1";
  name = "run prompt in another IDE";
  skill = "flowai-ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Take this prompt and run it in OpenCode for me, then show me the raw output.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-ai-ide-runner` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-ai-ide-runner`.",
    critical: true,
  }];
}();
