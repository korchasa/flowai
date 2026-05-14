import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-engineer-skill (authoring an agent-invocable
// SKILL.md package, not a separate subagent definition).
export const EngineerSubagentTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-engineer-subagent-trigger-adj-1";
  name = "agent-invocable skill (adjacent)";
  skill = "flowai-engineer-subagent";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Bundle our incident-postmortem workflow into a reusable capability the assistant can auto-discover and follow step by step.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-engineer-subagent`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-engineer-subagent/SKILL.md` or calling the `Skill` tool with `flowai-engineer-subagent`.",
    critical: true,
  }];
}();
