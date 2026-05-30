import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginHooksTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-plugin-hooks-trigger-adj-1";
  name = "MCP tool server (adjacent)";
  skill = "engineer-plugin-hooks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Add a stdio MCP tool to my plugin. There are no lifecycle hooks or command-blocking policies involved.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-plugin-hooks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `engineer-plugin-hooks/SKILL.md` or calling the `Skill` tool with `engineer-plugin-hooks`.",
    critical: true,
  }];
}();
