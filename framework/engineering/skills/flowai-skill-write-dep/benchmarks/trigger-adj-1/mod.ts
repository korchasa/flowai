import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: /flowai-plan-exp-permanent-tasks (record an already-chosen
// architectural decision as a committed task, not propose a new technical
// improvement).
export const WriteDepTriggerAdj1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-dep-trigger-adj-1";
  name = "record a decision as a task (adjacent)";
  skill = "flowai-skill-write-dep";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We've decided to standardise on Postgres over MySQL — capture that decision as a committed task with the rejected alternatives and the reasoning.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-dep`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-dep/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-dep`.",
    critical: true,
  }];
}();
