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
        'Did the agent include Codex app integration packaging through an `.app.json` file referenced by an `apps` manifest field — either `extensions.com.openai.apps` in a root `plugin.json` (the portable format) or `apps` in `.codex-plugin/plugin.json` (the legacy fallback)? A placeholder such as "the app file" in place of `.app.json` does not count.',
      critical: true,
    },
    {
      id: "codex_mcp_manifest",
      description:
        "Did the agent include Codex MCP server packaging — either a root `mcp.json` next to a root `plugin.json` (the portable format) or an `.mcp.json` file referenced by the `mcpServers` field of `.codex-plugin/plugin.json` (the legacy fallback)?",
      critical: false,
    },
  ];
}();
