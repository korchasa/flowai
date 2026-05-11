import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: generic "is this code good?" question with no diff, explicitly
// excluded by the description.
export const ReviewTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-review-trigger-false-1";
  name = "generic code-quality question";
  skill = "flowai-skill-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Is this snippet idiomatic Go? `func add(a, b int) int { return a + b }` — what would you change?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-review/SKILL.md` or calling the `Skill` tool with `flowai-skill-review`.",
    critical: true,
  }];
}();
