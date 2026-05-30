import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginMcpBasic = new class extends AcceptanceTestScenario {
  id = "engineer-plugin-mcp-basic";
  name = "Create AI IDE Plugin MCP Element";
  skill = "engineer-plugin-mcp";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "PluginKit",
    TOOLING_STACK: "- Node.js\n- TypeScript",
  };

  userQuery =
    "Design the MCP element for an AI IDE plugin. It needs a stdio JSON-RPC server exposing review_guard.analyze, and wiring for Claude Code plus Codex.";

  checklist = [
    {
      id: "official_docs_first",
      description:
        "Did the agent consult or explicitly require current official MCP protocol and host documentation links before fixing JSON-RPC methods, schemas, host config fields, or validation commands?",
      critical: true,
    },
    {
      id: "stdio_jsonrpc",
      description:
        "Did the agent design a stdio MCP server while deferring exact protocol and schema details to the current MCP specification or SDK docs?",
      critical: true,
    },
    {
      id: "stable_tool_schema",
      description:
        "Did the agent define stable tool names and result contracts without copying a full protocol schema into the skill output?",
      critical: true,
    },
    {
      id: "host_wiring",
      description:
        "Did the agent separate Claude Code and Codex MCP wiring and cite current host docs for exact config fields?",
      critical: true,
    },
    {
      id: "tool_name_mapping",
      description:
        "Did the agent mention host-specific exposed tool names or event naming differences?",
      critical: false,
    },
  ];
}();
