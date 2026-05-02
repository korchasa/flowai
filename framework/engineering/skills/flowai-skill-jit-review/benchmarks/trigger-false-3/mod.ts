import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: post-merge historical commit audit (no live diff, no parent-vs-HEAD
// JiTTest synthesis). Not a JIT review.
export const JitReviewTriggerFalse3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-jit-review-trigger-false-3";
  name = "post-merge historical audit (false-use)";
  skill = "flowai-skill-jit-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Read through last quarter's merged commits in the billing module and write me a retro on the kinds of bugs we shipped.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-jit-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-jit-review/SKILL.md` or calling the `Skill` tool with `flowai-skill-jit-review`.",
    critical: true,
  }];
}();
