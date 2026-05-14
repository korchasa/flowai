import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const MemexAskTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-memex-ask-trigger-pos-1";
  name = "recall a past decision from the knowledge bank";
  skill = "flowai-memex-ask";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What did we decide about the rate-limiter rollout last quarter? Check the project's knowledge bank before answering.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-memex-ask` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-memex-ask`.",
    critical: true,
  }];
}();
