import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: asks how to undo a push; nothing is to be reviewed, committed or pushed.
export const ReviewCommitPushTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "review-commit-push-trigger-false-1";
  name = "question about undoing a push";
  skill = "review-commit-push";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "How do I undo a push I made to a shared branch by mistake? Just explain, don't run anything.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `review-commit-push`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `review-commit-push/SKILL.md` or calling the `Skill` tool with `review-commit-push`.",
    critical: true,
  }];
}();
