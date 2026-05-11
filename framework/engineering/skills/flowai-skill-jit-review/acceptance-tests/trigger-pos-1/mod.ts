import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const JitReviewTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-jit-review-trigger-pos-1";
  name = "hidden regressions in staged diff";
  skill = "flowai-skill-jit-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "My tests are green but I'm nervous — check my staged changes for hidden regressions before I push.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-jit-review` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-jit-review`.",
    critical: true,
  }];
}();
