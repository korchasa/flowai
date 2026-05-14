import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const FixTestsTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-fix-tests-trigger-pos-1";
  name = "natural failing-test query";
  skill = "flowai-fix-tests";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "One of my tests started failing after my last refactor. Can you take a look and fix it?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-fix-tests` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-fix-tests`.",
    critical: true,
  }];
}();
