import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-skill-engineer-command (user-invoked workflow, not an
// event-triggered hook).
export const EngineerHookTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-engineer-hook-trigger-adj-1";
  name = "user-invoked workflow (adjacent)";
  skill = "flowai-skill-engineer-hook";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want a slash command I can call to walk through our standard release-prep checklist with the agent. Help me create it.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-hook`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-hook/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-hook`.",
    critical: true,
  }];
}();
