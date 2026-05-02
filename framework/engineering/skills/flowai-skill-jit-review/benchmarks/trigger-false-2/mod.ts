import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: writing brand-new tests for a brand-new feature is a normal
// authoring task, not synthesising regression-catching JiTTests over a diff.
export const JitReviewTriggerFalse2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-jit-review-trigger-false-2";
  name = "author new feature tests (false-use)";
  skill = "flowai-skill-jit-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I'm starting work on a new pricing module — write me a baseline unit-test suite covering the happy paths I should support.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-jit-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-jit-review/SKILL.md` or calling the `Skill` tool with `flowai-skill-jit-review`.",
    critical: true,
  }];
}();
