import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-investigate (diagnose root cause of a known
// production bug, not synthesise tests over a local diff).
export const JitReviewTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-jit-review-trigger-adj-3";
  name = "diagnose production bug (adjacent)";
  skill = "flowai-skill-jit-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Something in production is intermittently dropping orders — investigate the root cause but don't apply any fixes yet.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-jit-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-jit-review/SKILL.md` or calling the `Skill` tool with `flowai-skill-jit-review`.",
    critical: true,
  }];
}();
