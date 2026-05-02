import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about the workflow itself, not a research request.
export const DeepResearchTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-deep-research-trigger-false-2";
  name = "meta question about the skill";
  skill = "flowai-skill-deep-research";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Conceptually, how does flowai's research workflow score sources and decide when synthesis is good enough — I am writing internal docs.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deep-research`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deep-research/SKILL.md` or calling the `Skill` tool with `flowai-skill-deep-research`.",
    critical: true,
  }];
}();
