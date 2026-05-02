import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about what JIT review is, not a request to run one.
export const JitReviewTriggerFalse1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-jit-review-trigger-false-1";
  name = "meta question about JIT review";
  skill = "flowai-skill-jit-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What's the difference between a JIT review and a regular code review? When would I prefer one over the other?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-jit-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-jit-review/SKILL.md` or calling the `Skill` tool with `flowai-skill-jit-review`.",
    critical: true,
  }];
}();
