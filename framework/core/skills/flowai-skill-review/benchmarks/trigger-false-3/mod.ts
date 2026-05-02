import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: review of a PR on someone else's branch on GitHub — different
// workflow than reviewing CURRENT uncommitted local changes.
export const ReviewTriggerFalse3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-review-trigger-false-3";
  name = "github PR review";
  skill = "flowai-skill-review";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "There's an open PR #842 on GitHub from a teammate. Pull it down and tell me what to comment on.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-review`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-review/SKILL.md` or calling the `Skill` tool with `flowai-skill-review`.",
    critical: true,
  }];
}();
