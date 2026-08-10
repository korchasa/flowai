import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: vocabulary match ("review the commits") but the user wants to study
// historical commit history to understand architecture, not run the
// review-then-commit workflow on a current diff.
export const ReviewAndCommitTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-trigger-false-1";
  name = "study historical commits, not the workflow";
  skill = "review-and-commit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Can you review the last 20 commits in this repo's history to help me understand how the auth module evolved?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `review-and-commit`? For this query the skill is not appropriate; the agent should respond directly without reading `review-and-commit/SKILL.md` or calling the `Skill` tool with `review-and-commit`.",
    critical: true,
  }];
}();
