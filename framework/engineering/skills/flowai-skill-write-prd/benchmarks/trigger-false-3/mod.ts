import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: implementing the feature is engineering execution, not authoring
// a product requirements document about it.
export const WritePrdTriggerFalse3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-prd-trigger-false-3";
  name = "implement the feature directly (false-use)";
  skill = "flowai-skill-write-prd";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Skip the spec — just go build the bulk-export endpoint and wire it up to the existing job queue, then send me the diff.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-prd`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-prd/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-prd`.",
    critical: true,
  }];
}();
