import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-review (review of CURRENT diff before commit
// — code review, not session-level self-reflection).
export const ReflectTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-trigger-adj-3";
  name = "review my diff (adjacent)";
  skill = "flowai-skill-reflect";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Look at my staged diff from this session and review it as a lead engineer — anything I should fix before commit?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-reflect`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-reflect/SKILL.md` or calling the `Skill` tool with `flowai-skill-reflect`.",
    critical: true,
  }];
}();
