import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginMarketplaceBasic = new class
  extends AcceptanceTestScenario {
  id = "engineer-plugin-marketplace-basic";
  name = "Design a plugin marketplace";
  skill = "engineer-plugin-marketplace";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "PluginKit",
    TOOLING_STACK: "- TypeScript\n- Deno\n- Node.js",
  };

  userQuery =
    "Create requirements for a Claude Code and Codex plugin marketplace. Include constraints, anti-patterns, validation gates, local dogfood flow, and links to related skills for plugin packaging, MCP, hooks, and skill authoring.";

  checklist = [
    {
      id: "host_specific_marketplaces",
      description:
        "Did the agent require host-specific marketplace roots and manifests for Claude Code and Codex instead of one universal marketplace format?",
      critical: true,
    },
    {
      id: "official_docs_and_evidence",
      description:
        "Did the agent require checking current official host docs and separating verified facts from local-project inferences before implementation?",
      critical: true,
    },
    {
      id: "requirements_constraints_antipatterns",
      description:
        "Did the agent produce a structured list of requirements, constraints, anti-patterns, risks, and validation gates for plugin marketplace work?",
      critical: true,
    },
    {
      id: "related_skills_links",
      description:
        "Did the agent include related skill references for `engineer-ai-ide-plugin`, `engineer-plugin-mcp`, `engineer-plugin-hooks`, and `engineer-skill` or equivalent skill-authoring guidance?",
      critical: true,
    },
    {
      id: "install_smoke",
      description:
        "Did the agent include local dogfood and install-smoke validation, including Codex marketplace registration plus plugin add/materialization?",
      critical: false,
    },
  ];
}();
