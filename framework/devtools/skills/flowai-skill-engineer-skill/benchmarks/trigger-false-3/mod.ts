import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: invoking an existing skill is execution, not authoring or updating
// a SKILL.md.
export const EngineerSkillTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-skill-trigger-false-3";
  name = "use existing skill (false-use)";
  skill = "flowai-skill-engineer-skill";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Use our deep-research workflow to investigate the latest research on retrieval-augmented generation and produce a report.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-skill`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-skill/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-skill`.",
    critical: true,
  }];
}();
