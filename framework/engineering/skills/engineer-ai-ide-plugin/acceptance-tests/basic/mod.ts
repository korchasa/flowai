import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerAiIdePluginBasic = new class
  extends AcceptanceTestScenario {
  id = "engineer-ai-ide-plugin-basic";
  name = "Design an AI IDE Plugin";
  skill = "engineer-ai-ide-plugin";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "PluginKit",
    TOOLING_STACK: "- TypeScript\n- Node.js\n- Deno",
  };

  userQuery =
    "Design an AI IDE plugin named review-guard for Claude Code and Codex. It should expose one MCP tool, block dangerous shell commands through hooks, package skills and assets, and install from a local marketplace.";

  checklist = [
    {
      id: "target_ide_contract",
      description:
        "Did the agent define the plugin contract for the requested target IDEs instead of claiming one universal plugin format?",
      critical: true,
    },
    {
      id: "official_docs_first",
      description:
        "Did the agent state that host-specific manifest, hook, MCP, packaging, and validation details must be verified against current official documentation links before implementation?",
      critical: true,
    },
    {
      id: "packaging_included",
      description:
        "Did the agent include packaging, manifests, marketplace files, assets, and root/data discovery in the main plugin plan instead of delegating packaging to a separate skill?",
      critical: true,
    },
    {
      id: "surface_adapters",
      description:
        "Did the agent separate shared implementation from host-specific MCP wiring and hook adapters?",
      critical: true,
    },
    {
      id: "validation_plan",
      description:
        "Did the agent include per-IDE validation steps, including interactive or trust-review caveats for plugin hooks?",
      critical: false,
    },
  ];
}();
