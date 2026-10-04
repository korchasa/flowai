import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: asks ABOUT commit messages; nothing is to be committed.
export const CommitTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "commit-trigger-false-1";
  name = "question about commit messages";
  skill = "commit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  userQuery =
    "What makes a good conventional commit message for a bug fix? Just explain, I don't want anything committed.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `commit`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `commit/SKILL.md` or calling the `Skill` tool with `commit`.",
    critical: true,
  }];
}();
