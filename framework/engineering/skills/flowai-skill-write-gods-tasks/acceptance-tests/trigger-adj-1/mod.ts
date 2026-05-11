import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-skill-plan (do the actual planning act — variants,
// critique, then save the chosen variant; not just the format guide).
export const WriteGodsTasksTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-write-gods-tasks-trigger-adj-1";
  name = "plan a task with variants (adjacent)";
  skill = "flowai-skill-write-gods-tasks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Plan how I should add idempotency keys to the payment endpoint — give me variants with pros and cons, then a detailed plan once I pick one.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-gods-tasks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-gods-tasks/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-gods-tasks`.",
    critical: true,
  }];
}();
