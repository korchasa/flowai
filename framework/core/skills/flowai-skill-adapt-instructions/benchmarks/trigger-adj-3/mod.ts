import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-review (review of CURRENT uncommitted edits to
// AGENTS.md, not a structural realignment with the template).
export const AdaptInstructionsTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-adapt-instructions-trigger-adj-3";
  name = "review my AGENTS.md edits (adjacent)";
  skill = "flowai-skill-adapt-instructions";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I edited AGENTS.md to tighten a few rules. Can you review the unstaged diff before I commit?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-adapt-instructions`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-adapt-instructions/SKILL.md` or calling the `Skill` tool with `flowai-skill-adapt-instructions`.",
    critical: true,
  }];
}();
