import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about the hook system, not a request to author one.
export const EngineerHookTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-hook-trigger-false-2";
  name = "meta question about hooks";
  skill = "flowai-skill-engineer-hook";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Which IDEs even support agent hooks, and what events can they react to? Just curious how the model differs across tools.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-hook`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-hook/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-hook`.",
    critical: true,
  }];
}();
