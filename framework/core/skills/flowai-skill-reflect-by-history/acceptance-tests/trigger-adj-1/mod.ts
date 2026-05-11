import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-skill-reflect (current-session self-review, not a
// historical multi-session pattern audit).
export const ReflectByHistoryTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-reflect-by-history-trigger-adj-1";
  name = "current-session reflection (adjacent)";
  skill = "flowai-skill-reflect-by-history";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Reflect on what we just did in this session — what worked, what was inefficient, what should I do differently next time?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-reflect-by-history`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-reflect-by-history/SKILL.md` or calling the `Skill` tool with `flowai-skill-reflect-by-history`.",
    critical: true,
  }];
}();
