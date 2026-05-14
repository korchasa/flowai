import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-jit-review (synthesize ephemeral tests to catch
// hidden regressions in a diff — narrower scope than full QA review).
export const ReviewTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-review-trigger-adj-1";
  name = "JIT regression test scan (adjacent)";
  skill = "flowai-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Tests pass but I'm worried I broke something subtle. Synthesize JIT tests against my staged diff to catch hidden regressions.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-review/SKILL.md` or calling the `Skill` tool with `flowai-review`.",
    critical: true,
  }];
}();
