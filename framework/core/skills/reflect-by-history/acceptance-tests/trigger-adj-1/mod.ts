import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent request: a self-review of the current session, not a
// historical multi-session pattern audit. No skill owns it since the
// standalone `reflect` skill was removed on 2026-11-10.
export const ReflectByHistoryTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "reflect-by-history-trigger-adj-1";
  name = "current-session reflection (adjacent)";
  skill = "reflect-by-history";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Reflect on what we just did in this session — what worked, what was inefficient, what should I do differently next time?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `reflect-by-history`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `reflect-by-history/SKILL.md` or calling the `Skill` tool with `reflect-by-history`.",
    critical: true,
  }];
}();
