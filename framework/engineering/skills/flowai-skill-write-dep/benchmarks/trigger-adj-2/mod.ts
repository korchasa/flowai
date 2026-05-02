import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-write-prd (product requirements document for a
// user-facing product feature — not a technical-improvement proposal).
export const WriteDepTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-dep-trigger-adj-2";
  name = "PRD for user-facing feature (adjacent)";
  skill = "flowai-skill-write-dep";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write me a comprehensive product requirements document for a new shared-shopping-list feature, with personas, user stories, and success metrics.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-dep`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-dep/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-dep`.",
    critical: true,
  }];
}();
