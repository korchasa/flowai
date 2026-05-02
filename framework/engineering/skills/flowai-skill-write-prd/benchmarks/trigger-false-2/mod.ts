import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: critique of an existing PRD is review work, not authoring a new
// requirements document.
export const WritePrdTriggerFalse2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-prd-trigger-false-2";
  name = "review existing PRD (false-use)";
  skill = "flowai-skill-write-prd";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Read docs/prd/checkout-v3.md and tell me where the success metrics feel weak — don't rewrite the doc, just point out the holes.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-prd`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-prd/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-prd`.",
    critical: true,
  }];
}();
