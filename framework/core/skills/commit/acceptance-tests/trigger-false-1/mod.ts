import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: vocabulary match ("committed") but the user is talking about a
// deadline commitment, not requesting a git commit.
export const CommitTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "commit-trigger-false-1";
  name = "deadline commitment, not git commit";
  skill = "commit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We're committed to shipping the dashboard on Friday — given the open issues, do you think that timeline is realistic?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `commit`? For this query the skill is not appropriate; the agent should respond directly without reading `commit/SKILL.md` or calling the `Skill` tool with `commit`.",
    critical: true,
  }];
}();
