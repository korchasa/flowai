import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: /flowai-plan-exp-permanent-tasks (record an already-chosen
// architectural decision as a committed task, not propose a new technical
// improvement).
export const WriteDepTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-write-dep-trigger-adj-1";
  name = "record a decision as a task (adjacent)";
  skill = "flowai-write-dep";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We've decided to standardise on Postgres over MySQL — capture that decision as a committed task with the rejected alternatives and the reasoning.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-write-dep`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-write-dep/SKILL.md` or calling the `Skill` tool with `flowai-write-dep`.",
    critical: true,
  }];
}();
