import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ReviewTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-review-trigger-pos-2";
  name = "review unstaged branch changes";
  skill = "flowai-skill-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Before I push my branch, please review the unstaged + staged changes — make sure the task is actually done and there's nothing sloppy left behind.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-review` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-review`.",
    critical: true,
  }];
}();
