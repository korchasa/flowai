import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginMcpTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-plugin-mcp-trigger-adj-1";
  name = "plugin packaging without MCP (adjacent)";
  skill = "engineer-plugin-mcp";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Create only the Claude Code and Codex plugin manifests for my plugin. The MCP server already exists.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-plugin-mcp`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `engineer-plugin-mcp/SKILL.md` or calling the `Skill` tool with `engineer-plugin-mcp`.",
    critical: true,
  }];
}();
