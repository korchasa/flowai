import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-review (general lead-engineer review of a diff
// for quality/architecture/cleanup, not a synthesised regression-test pass).
export const JitReviewTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-jit-review-trigger-adj-2";
  name = "general pre-commit code review (adjacent)";
  skill = "flowai-skill-jit-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Before I commit this branch, give it a senior-engineer review — quality, architecture, anything sloppy I should fix.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-jit-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-jit-review/SKILL.md` or calling the `Skill` tool with `flowai-skill-jit-review`.",
    critical: true,
  }];
}();
