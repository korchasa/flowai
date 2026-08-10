import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: review (the user wants ONLY a review verdict and explicitly
// does NOT want a commit — standalone review is the right match).
export const ReviewAndCommitTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-trigger-adj-1";
  name = "review only, no commit (adjacent)";
  skill = "review-and-commit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Review my uncommitted changes and tell me whether they're ready — do not commit anything.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `review-and-commit`? For this query a review-only skill is appropriate; the agent should invoke a different skill or respond directly without reading `review-and-commit/SKILL.md` or calling the `Skill` tool with `review-and-commit`.",
    critical: true,
  }];
}();
