import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: review-and-commit (the user wants a review gate BEFORE
// committing — the two-phase workflow is the right match, not standalone commit).
export const CommitTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "commit-trigger-adj-1";
  name = "review-then-commit (adjacent)";
  skill = "commit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Review my uncommitted changes first and only commit them if they pass your QA review.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading standalone `commit`? For this query a review-gated workflow is appropriate; the agent should invoke a different skill or respond directly without reading `commit/SKILL.md` or calling the `Skill` tool with `commit`.",
    critical: true,
  }];
}();
