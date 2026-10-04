import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: a question about the practice, with no diff to review or commit.
export const ReviewAndCommitTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-trigger-false-1";
  name = "review-before-commit as a practice";
  skill = "review-and-commit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  userQuery =
    "Should a team review code before committing it or after? Give me the trade-offs.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `review-and-commit`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `review-and-commit/SKILL.md` or calling the `Skill` tool with `review-and-commit`.",
    critical: true,
  }];
}();
