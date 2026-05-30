import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginMcpTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-plugin-mcp-trigger-pos-1";
  name = "universal MCP element";
  skill = "engineer-plugin-mcp";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Build the MCP part of my AI IDE plugin so the same stdio server works from Claude Code and Codex.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `engineer-plugin-mcp` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `engineer-plugin-mcp`.",
    critical: true,
  }];
}();
