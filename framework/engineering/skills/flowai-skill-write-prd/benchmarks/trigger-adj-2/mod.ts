import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-write-in-informational-style (the user wants a
// tone/style transformation, not a structured product requirements document).
export const WritePrdTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-prd-trigger-adj-2";
  name = "rewrite in informational style (adjacent)";
  skill = "flowai-skill-write-prd";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Rewrite this opinionated draft in a neutral, factual register — the kind of voice you'd expect on a reference wiki page.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-prd`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-prd/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-prd`.",
    critical: true,
  }];
}();
