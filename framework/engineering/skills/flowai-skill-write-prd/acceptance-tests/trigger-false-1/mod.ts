import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: technical-writing surface match, but the artifact is marketing,
// not a PRD.
export const WritePrdTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-write-prd-trigger-false-1";
  name = "marketing one-pager";
  skill = "flowai-skill-write-prd";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write a marketing one-pager for our new mobile app focused on benefits for end users — keep it punchy.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-prd`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-prd/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-prd`.",
    critical: true,
  }];
}();
