import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: post-merge historical commit review, explicitly excluded — the
// skill targets CURRENT uncommitted changes only.
export const ReviewTriggerFalse2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-review-trigger-false-2";
  name = "post-merge historical review";
  skill = "flowai-skill-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Look at commit a1b2c3d from last month and tell me what was wrong with it — it's already merged, just curious.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-review/SKILL.md` or calling the `Skill` tool with `flowai-skill-review`.",
    critical: true,
  }];
}();
