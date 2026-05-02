import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-investigate (root-cause hunt for one specific
// failure, not a broad multi-category project audit).
export const MaintenanceTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-maintenance-trigger-adj-2";
  name = "diagnose one specific issue (adjacent)";
  skill = "flowai-skill-maintenance";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "The session token sometimes expires too early. Investigate the root cause and report back with evidence — don't apply a fix.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-maintenance`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-maintenance/SKILL.md` or calling the `Skill` tool with `flowai-skill-maintenance`.",
    critical: true,
  }];
}();
