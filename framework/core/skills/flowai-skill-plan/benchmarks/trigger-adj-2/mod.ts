import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-epic (multi-session feature spec — the user
// describes a long-horizon feature with multiple phases, not a single
// task plan).
export const PlanTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-trigger-adj-2";
  name = "spec a multi-session feature (adjacent)";
  skill = "flowai-skill-plan";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We're rolling out a full multi-tenant authentication and authorization system across the API, web, and mobile clients over the next quarter — write the epic specification with phases, milestones, and per-area deliverables.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-plan`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-plan/SKILL.md` or calling the `Skill` tool with `flowai-skill-plan`.",
    critical: true,
  }];
}();
