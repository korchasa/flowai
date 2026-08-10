import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Positive: the user wants a review gate followed by a commit in one flow —
// `review-and-commit` should activate without being named.
export const ReviewAndCommitTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-trigger-pos-1";
  name = "review-then-commit request";
  skill = "review-and-commit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Go over my uncommitted changes as a reviewer, and if they pass, commit them — all in one go.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `review-and-commit` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `review-and-commit`.",
    critical: true,
  }];
}();
