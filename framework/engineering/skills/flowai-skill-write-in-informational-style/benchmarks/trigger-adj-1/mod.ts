import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-write-prd (a PRD is a structured product
// document, not a tone/style transformation).
export const WriteInInformationalStyleTriggerAdj1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-in-informational-style-trigger-adj-1";
  name = "PRD for new feature (adjacent)";
  skill = "flowai-skill-write-in-informational-style";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write a comprehensive product requirements document for a new bulk-import feature, with personas, user stories, and success metrics.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-in-informational-style`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-in-informational-style/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-in-informational-style`.",
    critical: true,
  }];
}();
