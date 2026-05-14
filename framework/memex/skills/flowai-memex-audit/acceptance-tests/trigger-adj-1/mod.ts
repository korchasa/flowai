import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-maintenance — user asks for a project-wide health
// audit (lint, tests, dead code), not a memex-specific structural check.
export const MemexAuditTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-memex-audit-trigger-adj-1";
  name = "project-wide maintenance sweep (adjacent)";
  skill = "flowai-memex-audit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Do a maintenance sweep on the whole project — lint debt, dead code, flaky tests, anything that needs cleanup before the release.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-memex-audit`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-memex-audit/SKILL.md` or calling the `Skill` tool with `flowai-memex-audit`.",
    critical: true,
  }];
}();
