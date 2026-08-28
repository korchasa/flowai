import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Repairing pre-existing failing tests, with no plan involved: `implement`
// explicitly excludes this case in its description. There is no neighbouring
// skill to defer to — `fix-tests` was deleted on 2026-08-27 — so the passing
// answer is the agent doing the repair itself without loading `implement`.
export const ImplementTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "implement-trigger-adj-1";
  name = "fix existing failing tests (adjacent)";
  skill = "implement";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Three tests have been failing on main for a week. Track down the root cause and fix them.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `implement`? For this query the skill is not appropriate (no plan, generic test fixing); the agent should either invoke a different skill or respond directly without reading `implement/SKILL.md` or calling the `Skill` tool with `implement`.",
    critical: true,
  }];
}();
