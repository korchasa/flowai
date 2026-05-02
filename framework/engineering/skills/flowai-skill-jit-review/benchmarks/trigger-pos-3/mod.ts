import { BenchmarkSkillScenario } from "@bench/types.ts";

export const JitReviewTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-jit-review-trigger-pos-3";
  name = "synthesise tests for commit range";
  skill = "flowai-skill-jit-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "For the last three commits on this branch, synthesise ephemeral tests that pass on main and fail on HEAD so I know what slipped through.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-jit-review` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-jit-review`.",
    critical: true,
  }];
}();
