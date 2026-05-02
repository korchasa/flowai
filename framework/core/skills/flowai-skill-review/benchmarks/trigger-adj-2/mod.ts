import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-maintenance (broad multi-category project
// audit, not focused on a current diff before commit).
export const ReviewTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-review-trigger-adj-2";
  name = "broad project audit (adjacent)";
  skill = "flowai-skill-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run a full lead-engineer maintenance sweep on the repo — architecture, deps, tests, docs — and walk me through each finding.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-review/SKILL.md` or calling the `Skill` tool with `flowai-skill-review`.",
    critical: true,
  }];
}();
