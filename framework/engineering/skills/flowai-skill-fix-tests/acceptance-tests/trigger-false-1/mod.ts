import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: tests pass — request is a perf optimization of the runner,
// not a failure fix.
export const FixTestsTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-fix-tests-trigger-false-1";
  name = "test runner perf request";
  skill = "flowai-skill-fix-tests";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "My test suite takes 12 minutes and they're all green — make it run in under 3. Profile and optimize the slow ones.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-fix-tests`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-fix-tests/SKILL.md` or calling the `Skill` tool with `flowai-skill-fix-tests`.",
    critical: true,
  }];
}();
