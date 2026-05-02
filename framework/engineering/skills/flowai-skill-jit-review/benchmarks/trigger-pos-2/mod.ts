import { BenchmarkSkillScenario } from "@bench/types.ts";

export const JitReviewTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-jit-review-trigger-pos-2";
  name = "JIT review explicit ask";
  skill = "flowai-skill-jit-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run a JIT review across the unstaged diff and surface anything the existing tests would miss.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-jit-review` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-jit-review`.",
    critical: true,
  }];
}();
