import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ReviewTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-review-trigger-pos-3";
  name = "QA pass on current changes";
  skill = "flowai-skill-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Do a QA-style pass on my current uncommitted changes — give me a verdict and a list of follow-ups before I commit.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-review` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-review`.",
    critical: true,
  }];
}();
