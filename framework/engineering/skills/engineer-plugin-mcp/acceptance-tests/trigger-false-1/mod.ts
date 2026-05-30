import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginMcpTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-plugin-mcp-trigger-false-1";
  name = "general API comparison";
  skill = "engineer-plugin-mcp";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Compare REST, GraphQL, and MCP at a high level for an architecture discussion. Do not implement a plugin server.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-plugin-mcp`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `engineer-plugin-mcp/SKILL.md` or calling the `Skill` tool with `engineer-plugin-mcp`.",
    critical: true,
  }];
}();
