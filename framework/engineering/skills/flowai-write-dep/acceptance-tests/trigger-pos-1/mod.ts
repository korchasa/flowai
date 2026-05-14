import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const WriteDepTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-write-dep-trigger-pos-1";
  name = "draft DEP for tech improvement";
  skill = "flowai-write-dep";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Draft a Development Enhancement Proposal for replacing our hand-rolled job runner with a queue-based scheduler — full motivation and trade-offs.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-write-dep` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-write-dep`.",
    critical: true,
  }];
}();
