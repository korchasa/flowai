import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReviewTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-review-trigger-pos-1";
  name = "review staged diff before commit";
  skill = "flowai-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I have a staged diff ready for commit. Review it as QA + lead engineer — verdict on completion, code quality, architecture, leftovers.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-review` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-review`.",
    critical: true,
  }];
}();
