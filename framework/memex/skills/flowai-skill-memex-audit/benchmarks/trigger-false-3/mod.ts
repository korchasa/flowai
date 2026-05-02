import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: in-domain phrasing but the user is asking how to set up a memex,
// not asking us to audit one that already exists.
export const MemexAuditTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-audit-trigger-false-3";
  name = "how-to-set-up question (wrong intent)";
  skill = "flowai-skill-memex-audit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We don't have a knowledge bank yet — what folder layout and naming convention would you recommend before we start filling one?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-audit`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-audit/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-audit`.",
    critical: true,
  }];
}();
