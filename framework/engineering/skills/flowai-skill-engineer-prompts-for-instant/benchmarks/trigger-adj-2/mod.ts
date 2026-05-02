import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-skill (authoring a SKILL.md package, which
// uses prompt-engineering ideas but is a different artifact).
export const EngineerPromptsForInstantTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-instant-trigger-adj-2";
  name = "author a skill package (adjacent)";
  skill = "flowai-skill-engineer-prompts-for-instant";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me author a brand-new SKILL.md for my repo that captures our changelog-writing workflow as a reusable agent skill.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-prompts-for-instant`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-prompts-for-instant/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-prompts-for-instant`.",
    critical: true,
  }];
}();
