import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const AdaptInstructionsTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-adapt-instructions-trigger-pos-1";
  name = "post-sync template drift";
  skill = "flowai-adapt-instructions";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I just ran flowai sync and it says the AGENTS template changed. Can you re-align our AGENTS.md with the new template, keeping our project-specific sections?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-adapt-instructions` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-adapt-instructions`.",
    critical: true,
  }];
}();
