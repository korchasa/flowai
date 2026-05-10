import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: request is a normal historical code review of merged commits,
// not a JIT scan of staged/unstaged diff.
export const JitReviewTriggerFalse1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-jit-review-trigger-false-1";
  name = "regular code review request";
  skill = "flowai-skill-jit-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Walk through the last 5 commits on this branch and tell me which ones look risky in a normal code review.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-jit-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-jit-review/SKILL.md` or calling the `Skill` tool with `flowai-skill-jit-review`.",
    critical: true,
  }];
}();
