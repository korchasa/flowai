import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReviewTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "review-trigger-adj-1";
  name = "JIT regression wording routes to review";
  skill = "review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Tests pass but I'm worried I broke something subtle. Synthesize JIT tests against my staged diff to catch hidden regressions.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load `review`? JiT regression probing is now part of the review workflow, so this diff-regression wording should route to `review` rather than being treated as a separate adjacent skill.",
    critical: true,
  }];
}();
