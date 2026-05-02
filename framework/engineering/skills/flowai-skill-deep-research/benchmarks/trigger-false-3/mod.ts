import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: trivial fact lookup — no synthesis, no scoring, no sub-agents needed.
export const DeepResearchTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-deep-research-trigger-false-3";
  name = "trivial fact lookup";
  skill = "flowai-skill-deep-research";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Quick one — what year was the Rust language first publicly released? Just the number, no report.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deep-research`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deep-research/SKILL.md` or calling the `Skill` tool with `flowai-skill-deep-research`.",
    critical: true,
  }];
}();
