import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: vocabulary match ("history") but the user wants git history,
// not IDE transcript history.
export const ReflectByHistoryTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-reflect-by-history-trigger-false-1";
  name = "git log lookup";
  skill = "flowai-reflect-by-history";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Show me the last 20 commits in git history with one-line summaries — I want to see what changed recently.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-reflect-by-history`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-reflect-by-history/SKILL.md` or calling the `Skill` tool with `flowai-reflect-by-history`.",
    critical: true,
  }];
}();
