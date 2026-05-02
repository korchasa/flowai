import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-maintenance — user asks for a project-wide health
// audit (lint, tests, dead code), not a memex-specific structural check.
export const MemexAuditTriggerAdj1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-audit-trigger-adj-1";
  name = "project-wide maintenance sweep (adjacent)";
  skill = "flowai-skill-memex-audit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Do a maintenance sweep on the whole project — lint debt, dead code, flaky tests, anything that needs cleanup before the release.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-audit`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-audit/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-audit`.",
    critical: true,
  }];
}();
