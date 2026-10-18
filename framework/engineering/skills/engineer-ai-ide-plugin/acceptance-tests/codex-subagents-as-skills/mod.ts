import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerAiIdePluginCodexSubagentsAsSkills = new class
  extends AcceptanceTestScenario {
  id = "engineer-ai-ide-plugin-codex-subagents-as-skills";
  name = "Codex plugin subagents are designed as skills";
  skill = "engineer-ai-ide-plugin";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TriageKit",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Design an AI IDE plugin named triage-squad for Claude Code and Codex. It should include a reusable worker/subagent that classifies incoming bug reports, plus one app integration and one MCP server. Give me the canonical file layout and per-IDE packaging plan.";

  checklist = [
    {
      id: "codex_subagent_as_skill",
      description:
        "Did the agent explicitly avoid packaging a Codex `agents/` or `subagents/` plugin component and instead represent the Codex worker/subagent behavior as one or more bundled plugin skills under `skills/<name>/SKILL.md`?",
      critical: true,
    },
    {
      id: "host_specific_agent_split",
      description:
        "Did the agent keep Claude Code agent/subagent packaging separate from Codex packaging instead of claiming one shared agents directory works for both IDEs?",
      critical: true,
    },
    {
      id: "codex_apps_manifest",
      description:
        "Did the agent include Codex app integration packaging through an `.app.json` file referenced by the `apps` manifest field?",
      critical: true,
    },
    {
      id: "codex_mcp_manifest",
      description:
        "Did the agent include Codex MCP server packaging through an `.mcp.json` file referenced by the `mcpServers` manifest field?",
      critical: false,
    },
  ];
}();
