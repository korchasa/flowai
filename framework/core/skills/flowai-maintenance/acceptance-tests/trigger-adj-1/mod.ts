import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-review (review of CURRENT uncommitted diff,
// not a broad project-wide audit).
export const MaintenanceTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-maintenance-trigger-adj-1";
  name = "review my staged diff (adjacent)";
  skill = "flowai-maintenance";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I have a staged diff ready to commit. Review it as QA + lead engineer and tell me if I'm missing anything.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-maintenance`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-maintenance/SKILL.md` or calling the `Skill` tool with `flowai-maintenance`.",
    critical: true,
  }];
}();
